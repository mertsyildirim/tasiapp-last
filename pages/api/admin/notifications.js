import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { setupCORS, handleOptionsRequest, sendSuccess, sendError, logRequest } from '../../../lib/api-utils';
import { getServerSession } from "next-auth/next";
import { authOptions } from '../auth/admin/[...nextauth].js';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';

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
  const { title, message, type = 'info', recipientId, recipientType = 'user', sendEmail } = req.body;

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

  // Eğer e-posta da gönderilecekse
  if (sendEmail) {
    try {
      // E-posta ayarlarını al
      const emailSettings = await db.collection('settings').findOne({ type: 'email' });
      if (!emailSettings) {
        throw new Error('E-posta ayarları bulunamadı.');
      }

      // Alıcı e-posta adresini bul
      let recipientEmail = null;
      if (recipientType === 'user' && recipientId) {
        const user = await db.collection('users').findOne({ _id: new ObjectId(recipientId) });
        recipientEmail = user?.email;
      }
      // Eğer kullanıcıya değilse veya e-posta yoksa, sistem yöneticisine gönder
      if (!recipientEmail) {
        const admin = await db.collection('settings').findOne({ type: 'general' });
        recipientEmail = admin?.contactEmail || emailSettings.senderEmail;
      }

      if (recipientEmail) {
        const transporter = nodemailer.createTransport({
          host: emailSettings.smtpHost,
          port: parseInt(emailSettings.smtpPort),
          secure: emailSettings.useSSL,
          auth: {
            user: emailSettings.smtpUser,
            pass: emailSettings.smtpPassword
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        const mailOptions = {
          from: `"${emailSettings.senderName}" <${emailSettings.senderEmail}>`,
          to: recipientEmail,
          subject: title,
          html: `<div><h2>${title}</h2><p>${message}</p></div>`
        };

        await transporter.sendMail(mailOptions);
      }
    } catch (err) {
      console.error('Bildirim e-posta gönderim hatası:', err);
      // E-posta gönderilemese bile bildirim kaydı başarılı sayılır
    }
  }

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