import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/admin/[...nextauth]'
import { connectToDatabase } from '/lib/minimal-mongodb'
import { ObjectId } from 'mongodb'
import Blog from '../../../../models/Blog'

export default async function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // OPTIONS isteği kontrolü
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Blog yazısı ID\'si gereklidir' 
    });
  }

  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);

  if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
      });
    }
    
    // Rol kontrolü
    const allowedRoles = ['admin', 'super_admin', 'editor'];
    const userRoles = session.user.roles || [];
    const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role));

    if (!hasAllowedRole && session.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu işlem için yetkiniz bulunmuyor.' 
      });
  }

    // Veritabanı bağlantısı
    let db;
    try {
      const dbConnection = await connectToDatabase();
      db = dbConnection.db;
      if (!db) {
        throw new Error('Veritabanı bağlantısı kurulamadı');
      }
    } catch (dbError) {
      console.error('Veritabanı bağlantı hatası:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Veritabanı bağlantısı sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      });
    }

    const collection = db.collection('blogs');
    
    // ObjectId'ye dönüştür
    let blogId;
    try {
      blogId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Geçersiz blog yazısı ID formatı' 
      });
    }

    switch (req.method) {
      case 'GET':
        try {
          const blog = await collection.findOne({ _id: blogId });
          if (!blog) {
            return res.status(404).json({ 
              success: false, 
              error: 'Blog yazısı bulunamadı' 
            });
          }
          return res.status(200).json({
            success: true,
            blog
          });
        } catch (error) {
          console.error('Blog yazısı yüklenirken hata:', error);
          return res.status(500).json({ 
            success: false, 
            error: 'Blog yazısı yüklenirken bir hata oluştu' 
          });
        }
        break;

      case 'PUT':
        try {
          console.log('Gelen blog ID:', id);
          console.log('Gelen veri:', req.body);
          
          const updateData = {
            ...req.body,
            updatedAt: new Date()
          };
          
          // ObjectId dönüşümünü kontrol et
          let blogId;
          try {
            blogId = new ObjectId(id);
          } catch (error) {
            console.error('ObjectId dönüşüm hatası:', error);
            return res.status(400).json({ 
              success: false, 
              error: 'Geçersiz blog yazısı ID formatı' 
            });
          }

          console.log('Aranacak blog ID:', blogId);
          
          // findOneAndUpdate yerine updateOne kullanıyoruz
          const result = await collection.updateOne(
            { _id: blogId },
            { $set: updateData }
          );
          
          console.log('Güncelleme sonucu:', result);
          
          if (result.matchedCount === 0) {
            return res.status(404).json({ 
              success: false, 
              error: 'Blog yazısı bulunamadı' 
            });
          }
          
          // Güncellenmiş blog yazısını getir
          const updatedBlog = await collection.findOne({ _id: blogId });
          
          return res.status(200).json({
            success: true,
            blog: updatedBlog
          });
        } catch (error) {
          console.error('Blog yazısı güncellenirken hata:', error);
          return res.status(500).json({ 
            success: false, 
            error: 'Blog yazısı güncellenirken bir hata oluştu' 
          });
        }
        break;

      case 'DELETE':
        try {
          const result = await collection.deleteOne({ _id: blogId });
          
          if (result.deletedCount === 0) {
            return res.status(404).json({ 
              success: false, 
              error: 'Blog yazısı bulunamadı' 
            });
          }
          
          return res.status(200).json({ 
            success: true, 
            message: 'Blog yazısı başarıyla silindi' 
          });
        } catch (error) {
          console.error('Blog yazısı silinirken hata:', error);
          return res.status(500).json({ 
            success: false, 
            error: 'Blog yazısı silinirken bir hata oluştu' 
          });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} Not Allowed`
        });
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 