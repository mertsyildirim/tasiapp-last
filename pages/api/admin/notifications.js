import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { setupCORS, handleOptionsRequest, sendSuccess, sendError, logRequest } from '../../../lib/api-utils';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../auth/admin/[...nextauth].js';
import { ObjectId } from 'mongodb';

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

  // İsteği logla
  logRequest(req);

  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Oturum açmanız gerekiyor' 
      });
    }

    const userId = session.user.id;

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
    
    // İstek metoduna göre işlem yap
    if (req.method === 'GET') {
      return getNotifications(req, res, db, userId);
    } else if (req.method === 'POST') {
      return createNotification(req, res, db, userId);
    } else if (req.method === 'PUT') {
      return updateNotification(req, res, db, userId);
    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Desteklenmeyen metod' 
      });
    }
  } catch (error) {
    console.error('Bildirim işlemi hatası:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
}

async function getNotifications(req, res, db, userId) {
  // Bildirimleri getir
  const notifications = await db.collection('notifications')
    .find({ 
      recipientId: userId,
      isRead: false 
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  return res.status(200).json({
    success: true,
    notifications: notifications.map(notification => ({
      id: notification._id.toString(),
      title: notification.title || '',
      message: notification.message || '',
      type: notification.type || 'info',
      createdAt: notification.createdAt || new Date(),
      isRead: notification.isRead || false
    }))
  });
}

async function createNotification(req, res, db, userId) {
  const { title, message, type = 'info', recipientId, recipientType = 'user' } = req.body;

  if (!title || !message) {
    return res.status(400).json({
      success: false,
      error: 'Başlık ve mesaj alanları zorunludur.'
    });
  }

  const notification = {
    title,
    message,
    type,
    recipientId: recipientId || userId,
    recipientType,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('notifications').insertOne(notification);

  if (result.acknowledged) {
    return res.status(201).json({
      success: true,
      message: 'Bildirim başarıyla oluşturuldu',
      notification: {
        id: result.insertedId.toString(),
        ...notification
      }
    });
  }
}

async function updateNotification(req, res, db, userId) {
  const { id } = req.query;
  const { isRead } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Bildirim ID\'si gereklidir.'
    });
  }

  const result = await db.collection('notifications').updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        isRead: isRead || true,
        updatedAt: new Date()
      } 
    }
  );

  if (result.matchedCount > 0) {
    return res.status(200).json({
      success: true,
      message: 'Bildirim durumu güncellendi'
    });
  }

  return res.status(404).json({
    success: false,
    error: 'Bildirim bulunamadı'
  });
} 