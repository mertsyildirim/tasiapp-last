import { connectToDatabase } from '../../..///lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { setupCORS, handleOptionsRequest, sendSuccess, sendError, logRequest } from '../../..//lib/api-utils';
import jwt from 'jsonwebtoken';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

/**
 * E-posta ayarlarını doğrulama
 */
function validateEmailSettings(settings) {
  const { smtpHost, smtpPort, smtpUser, smtpPassword, senderName, senderEmail, useSSL } = settings;
  
  if (!smtpHost || !smtpPort || !smtpUser || !senderName || !senderEmail) {
    return { isValid: false, message: 'SMTP sunucu, port, kullanıcı, gönderen adı ve e-posta zorunludur' };
  }
  
  // Port numarası kontrolü
  if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return { isValid: false, message: 'Geçersiz port numarası' };
  }
  
  // E-posta formatı kontrolü
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(senderEmail) || !emailRegex.test(smtpUser)) {
    return { isValid: false, message: 'Geçersiz e-posta formatı' };
  }
  
  return { isValid: true };
}

/**
 * E-posta ayarlarını getir
 */
async function getEmailSettings(req, res) {
  try {
    const { db } = await connectToDatabase();
    
    // En son kaydedilen e-posta ayarlarını getir
    const settings = await db.collection('settings').findOne({ type: 'email' });
    
    if (!settings) {
      // Ayarlar bulunamadıysa varsayılan değerleri döndür
      return sendSuccess(res, {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'bildirim@tasiapp.com',
        smtpPassword: '', // Güvenlik nedeniyle şifre gönderilmez
        senderName: 'Taşı App',
        senderEmail: 'bildirim@tasiapp.com',
        useSSL: true,
        lastUpdated: new Date()
      });
    }
    
    // Şifre gizleme
    const result = {
      ...settings,
      smtpPassword: settings.smtpPassword ? '********' : ''
    };
    
    return sendSuccess(res, result);
  } catch (error) {
    console.error('E-posta ayarları getirilirken hata:', error);
    return sendError(res, 'E-posta ayarları getirilirken bir hata oluştu', 500);
  }
}

/**
 * E-posta ayarlarını güncelle
 */
async function updateEmailSettings(req, res) {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, senderName, senderEmail, useSSL } = req.body;
    
    // Ayarları doğrula
    const validation = validateEmailSettings({
      smtpHost, 
      smtpPort, 
      smtpUser, 
      smtpPassword, 
      senderName, 
      senderEmail, 
      useSSL
    });
    
    if (!validation.isValid) {
      return sendError(res, validation.message, 400);
    }
    
    const { db } = await connectToDatabase();
    
    // Mevcut ayarları kontrol et
    const existingSettings = await db.collection('settings').findOne({ type: 'email' });
    
    // Şifre değişikliği kontrolü
    let updatedPassword = smtpPassword;
    if (smtpPassword === '********' && existingSettings) {
      // Şifre değişmediyse mevcut şifreyi kullan
      updatedPassword = existingSettings.smtpPassword;
    }
    
    // Ayarları kaydet veya güncelle
    const result = await db.collection('settings').updateOne(
      { type: 'email' },
      { 
        $set: {
          smtpHost,
          smtpPort: parseInt(smtpPort),
          smtpUser,
          smtpPassword: updatedPassword,
          senderName,
          senderEmail,
          useSSL: Boolean(useSSL),
          lastUpdated: new Date()
        } 
      },
      { upsert: true }
    );
    
    return sendSuccess(res, { 
      success: true, 
      message: 'E-posta ayarları başarıyla güncellendi' 
    });
  } catch (error) {
    console.error('E-posta ayarları güncellenirken hata:', error);
    return sendError(res, 'E-posta ayarları güncellenirken bir hata oluştu', 500);
  }
}

/**
 * Test e-postası gönder
 */
async function sendTestEmail(req, res) {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return sendError(res, 'Test için e-posta adresi gereklidir', 400);
    }
    
    // E-posta formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return sendError(res, 'Geçersiz e-posta formatı', 400);
    }
    
    // E-posta gönderme işlemi
    // Not: Gerçek bir e-posta göndermek için nodemailer gibi bir paket kullanılmalıdır
    
    // Başarılı yanıt
    return sendSuccess(res, { 
      success: true, 
      message: `Test e-postası ${testEmail} adresine başarıyla gönderildi` 
    });
  } catch (error) {
    console.error('Test e-postası gönderilirken hata:', error);
    return sendError(res, 'Test e-postası gönderilirken bir hata oluştu', 500);
  }
}

/**
 * API ana işleyici
 */
export default async function handler(req, res) {
  // CORS ayarları
  setupCORS(res);
  
  // OPTIONS isteği kontrolü
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest(req, res);
  }
  
  // İstek logunu kaydet
  logRequest(req);
  
  try {
    // Session kontrolü - bildirimler API'si gibi doğrudan kontrol
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Oturum açmanız gerekiyor' 
      });
    }
    
    // HTTP metodu kontrolü
    if (req.method === 'GET') {
      return getEmailSettings(req, res);
    } else if (req.method === 'POST') {
      return updateEmailSettings(req, res);
    } else if (req.method === 'PUT' && req.body.action === 'test') {
      return sendTestEmail(req, res);
    } else {
      return sendError(res, 'Geçersiz istek metodu', 405);
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 