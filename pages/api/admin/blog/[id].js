import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
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
          const updateData = {
            ...req.body,
            updatedAt: new Date()
          };
          
          const result = await collection.findOneAndUpdate(
            { _id: blogId },
            { $set: updateData },
            { returnDocument: 'after' }
          );
          
          if (!result.value) {
            return res.status(404).json({ 
              success: false, 
              error: 'Blog yazısı bulunamadı' 
            });
          }
          
          return res.status(200).json({
            success: true,
            blog: result.value
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