import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/admin/[...nextauth].js'
import { connectToDatabase } from '/lib/minimal-mongodb'
import { ObjectId } from 'mongodb'

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
      error: 'Kampanya ID\'si gereklidir' 
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

    const collection = db.collection('campaigns');
    
    // ObjectId'ye dönüştür
    let campaignId;
    try {
      campaignId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Geçersiz kampanya ID formatı' 
      });
    }

    switch (req.method) {
      case 'GET':
        try {
          const campaign = await collection.findOne({ _id: campaignId });
          if (!campaign) {
            return res.status(404).json({ 
              success: false, 
              error: 'Kampanya bulunamadı' 
            });
          }
          return res.status(200).json({
            success: true,
            campaign
          });
        } catch (error) {
          console.error('Kampanya yüklenirken hata:', error);
          return res.status(500).json({ 
            success: false, 
            error: 'Kampanya yüklenirken bir hata oluştu' 
          });
        }
        break;

      case 'PUT':
        try {
          const updateData = req.body;
          const result = await collection.findOneAndUpdate(
            { _id: campaignId },
            { $set: { ...updateData, updatedAt: new Date() } },
            { returnDocument: 'after' }
          );
          
          if (!result.value) {
            return res.status(404).json({ 
              success: false, 
              error: 'Kampanya bulunamadı' 
            });
          }
          
          return res.status(200).json({
            success: true,
            campaign: result.value
          });
        } catch (error) {
          console.error('Kampanya güncellenirken hata:', error);
          return res.status(500).json({ 
            success: false, 
            error: 'Kampanya güncellenirken bir hata oluştu' 
          });
        }
        break;

      case 'DELETE':
        try {
          const result = await collection.findOneAndDelete({ _id: campaignId });
          
          if (!result.value) {
            return res.status(404).json({ 
              success: false, 
              error: 'Kampanya bulunamadı' 
            });
          }
          
          return res.status(200).json({ 
            success: true, 
            message: 'Kampanya başarıyla silindi' 
          });
        } catch (error) {
          console.error('Kampanya silinirken hata:', error);
          return res.status(500).json({ 
            success: false, 
            error: 'Kampanya silinirken bir hata oluştu' 
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