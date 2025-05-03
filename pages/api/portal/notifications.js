import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/portal/[...nextauth].js';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

// CORS middleware
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  return await fn(req, res);
};

// Ana işleyici fonksiyonu
async function handler(req, res) {
  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
      });
    }

    // MongoDB bağlantısı
    try {
      const connection = await connectToDatabase();
      const db = connection.db;
      
      if (!db) {
        throw new Error('Veritabanı bağlantısı başarısız: DB nesnesi alınamadı');
      }
      
      // HTTP metodu kontrolü
      switch(req.method) {
        case 'GET':
          return await getNotifications(req, res, db, session);
        case 'PUT':
          return await updateNotification(req, res, db, session);
        default:
          return res.status(405).json({ success: false, message: 'Metod izni yok' });
      }
    } catch (dbError) {
      console.error('Veritabanı bağlantı hatası:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı bağlantı hatası', 
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Notifications API sunucu hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası', 
      error: error.message
    });
  }
}

// Bildirimleri getir
async function getNotifications(req, res, db, session) {
  try {
    const { limit = 10, page = 1, read } = req.query;
    
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Kullanıcı ID'sini al
    const userId = session.user.id;
    
    // Filtre oluştur
    // Bildirimleri getir:
    // 1. Bu kullanıcıya özel gönderilen bildirimler (userId === kullanıcının ID'si)
    // 2. Tüm taşıyıcılara gönderilen bildirimler (recipientType === 'all_carriers' veya recipientType === 'carriers')
    const filter = {
      $or: [
        { userId: userId },
        { recipientId: userId },
        { 
          recipientType: 'all_carriers',
          // Kullanıcı türü company olan kullanıcılar için tüm taşıyıcılara gönderilen bildirimler
          // session.user.userType bilgisini kontrol et, yalnızca taşıyıcı/şirketler
          ...(session.user.userType === 'company' ? {} : { _id: null }) // Taşıyıcı değilse boş sonuç döndür
        },
        { 
          recipientType: 'carriers',
          // Kullanıcı türü company olan kullanıcılar için tüm taşıyıcılara gönderilen bildirimler
          ...(session.user.userType === 'company' ? {} : { _id: null }) // Taşıyıcı değilse boş sonuç döndür
        }
      ]
    };
    
    // Okunma durumuna göre filtreleme (hem read hem isRead'i kontrol et)
    if (read === 'true' || read === 'false') {
      filter.$or = filter.$or.map(condition => ({
        ...condition,
        $or: [
          { read: read === 'true' },
          { isRead: read === 'true' }
        ]
      }));
    }
    
    // MongoDB debug log
    console.log('Portal notifications filter:', JSON.stringify(filter));
    
    // Toplam bildirim sayısını hesapla
    const totalCount = await db.collection('notifications').countDocuments(filter);
    
    // Bildirimleri getir
    const notifications = await db.collection('notifications')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .toArray();
    
    return res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map(notification => ({
          id: notification._id.toString(),
          title: notification.title || notification.text || '',
          message: notification.message || notification.description || '',
          type: notification.type || 'info',
          read: notification.read || notification.isRead || false,
          url: notification.url || '',
          createdAt: notification.createdAt || new Date(),
          timestamp: new Date(notification.createdAt || new Date()).toLocaleString('tr-TR')
        })),
        pagination: {
          total: totalCount,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(totalCount / limitNumber)
        },
        unreadCount: await db.collection('notifications').countDocuments({
          ...filter,
          $or: [
            { read: false },
            { isRead: false }
          ]
        })
      }
    });
  } catch (error) {
    console.error('Bildirim getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Bildirimler getirilirken bir hata oluştu',
      error: error.message
    });
  }
}

// Bildirimi güncelle (okundu olarak işaretle)
async function updateNotification(req, res, db, session) {
  try {
    const { id } = req.query;
    const { read } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Bildirim ID gerekiyor'
      });
    }
    
    // Kullanıcı ID'sini al
    const userId = session.user.id;
    
    // Bildirimi güncelle
    const result = await db.collection('notifications').updateOne(
      { 
        _id: new ObjectId(id),
        $or: [
          { userId: userId },
          { recipientId: userId },
          { recipientType: 'all_carriers' },
          { recipientType: 'carriers' }
        ]
      },
      { 
        $set: { 
          read: read !== undefined ? read : true,
          isRead: read !== undefined ? read : true,  // isRead alanını da güncelle
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bildirim bulunamadı'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Bildirim güncellendi'
    });
  } catch (error) {
    console.error('Bildirim güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Bildirim güncellenirken bir hata oluştu',
      error: error.message
    });
  }
}

// CORS middleware ile sarılmış handler fonksiyonu
export default allowCors(handler); 
 
 
 
 
 
 
 
 
 