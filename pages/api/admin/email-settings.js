import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { setupCORS, handleOptionsRequest, sendSuccess, sendError, logRequest } from '../../..//lib/api-utils';
import jwt from 'jsonwebtoken';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import nodemailer from 'nodemailer';

/**
 * E-posta ayarlarını doğrulama
 */
function validateEmailSettings(settings) {
  const { smtpHost, smtpPort, smtpUser, smtpPassword, senderName, senderEmail, useSSL } = settings;
  
  // Zorunlu alanların varlığını ve boş olup olmadığını kontrol et
  if (!smtpHost || smtpHost.trim() === '') {
    return { isValid: false, message: 'SMTP sunucu alanı boş olamaz' };
  }
  
  if (!smtpPort || smtpPort.toString().trim() === '') {
    return { isValid: false, message: 'SMTP port alanı boş olamaz' };
  }
  
  if (!smtpUser || smtpUser.trim() === '') {
    return { isValid: false, message: 'SMTP kullanıcı adı boş olamaz' };
  }
  
  if (!senderName || senderName.trim() === '') {
    return { isValid: false, message: 'Gönderen adı boş olamaz' };
  }
  
  if (!senderEmail || senderEmail.trim() === '') {
    return { isValid: false, message: 'Gönderen e-posta adresi boş olamaz' };
  }
  
  // Port numarası kontrolü
  if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    return { isValid: false, message: 'Geçersiz port numarası' };
  }
  
  // E-posta formatı kontrolü
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(senderEmail.trim())) {
    return { isValid: false, message: 'Geçersiz gönderen e-posta formatı' };
  }
  
  if (!emailRegex.test(smtpUser.trim())) {
    return { isValid: false, message: 'Geçersiz SMTP kullanıcı e-posta formatı' };
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
        data: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUser: 'bildirim@tasiapp.com',
          smtpPassword: '', // Güvenlik nedeniyle şifre gönderilmez
          senderName: 'Taşı App',
          senderEmail: 'bildirim@tasiapp.com',
          useSSL: true,
          lastUpdated: new Date()
        },
        message: 'Henüz ayarlanmış e-posta ayarları bulunamadı, varsayılan değerler gösteriliyor'
      });
    }
    
    // Şifre gizleme
    const result = {
      ...settings,
      smtpPassword: settings.smtpPassword ? '********' : ''
    };
    
    // Gereksiz _id ve type gibi alanları çıkar
    delete result._id;
    delete result.type;
    
    // Başarılı yanıt döndür
    return sendSuccess(res, {
      data: result,
      message: 'E-posta ayarları başarıyla getirildi',
      lastUpdated: settings.lastUpdated
    });
  } catch (error) {
    console.error('E-posta ayarları getirilirken hata:', error);
    return sendError(res, 'E-posta ayarları getirilirken bir hata oluştu: ' + error.message, 500);
  }
}

/**
 * E-posta ayarlarını güncelle
 */
async function updateEmailSettings(req, res) {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, senderName, senderEmail, useSSL } = req.body;
    
    console.log('Gelen ayarlar:', { smtpHost, smtpPort, smtpUser, senderName, senderEmail, useSSL });
    
    // Gelen veriler uygun veri tipinde olmalı
    const cleanSettings = {
      smtpHost: typeof smtpHost === 'string' ? smtpHost.trim() : '',
      smtpPort: parseInt(smtpPort || '587', 10),
      smtpUser: typeof smtpUser === 'string' ? smtpUser.trim() : '',
      smtpPassword,
      senderName: typeof senderName === 'string' ? senderName.trim() : '',
      senderEmail: typeof senderEmail === 'string' ? senderEmail.trim() : '',
      useSSL: Boolean(useSSL)
    };
    
    console.log('Temizlenmiş ayarlar:', cleanSettings);
    
    // Ayarları doğrula
    const validation = validateEmailSettings(cleanSettings);
    
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
    } else if (smtpPassword && smtpPassword !== '********') {
      // Şifre değiştiyse, yeni şifreyi test et
      try {
        // Nodemailer transporter oluştur
        const testTransporter = nodemailer.createTransport({
          host: cleanSettings.smtpHost,
          port: cleanSettings.smtpPort,
          secure: cleanSettings.useSSL,
          auth: {
            user: cleanSettings.smtpUser,
            pass: smtpPassword
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        
        // Bağlantıyı test et (e-posta göndermeden)
        await testTransporter.verify();
        
        // Şifre doğrulandı, kullanılabilir
        console.log('SMTP şifre doğrulandı');
      } catch (verifyError) {
        console.error('SMTP bağlantı doğrulama hatası:', verifyError);
        return sendError(res, `SMTP bağlantısı doğrulanamadı: ${verifyError.message}`, 400);
      }
    }
    
    // Ayarları kaydet veya güncelle
    const result = await db.collection('settings').updateOne(
      { type: 'email' },
      { 
        $set: {
          smtpHost: cleanSettings.smtpHost,
          smtpPort: cleanSettings.smtpPort,
          smtpUser: cleanSettings.smtpUser,
          smtpPassword: updatedPassword,
          senderName: cleanSettings.senderName,
          senderEmail: cleanSettings.senderEmail,
          useSSL: cleanSettings.useSSL,
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
    return sendError(res, 'E-posta ayarları güncellenirken bir hata oluştu: ' + error.message, 500);
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
    
    // Veritabanından e-posta ayarlarını al
    const { db } = await connectToDatabase();
    const settings = await db.collection('settings').findOne({ type: 'email' });
    
    if (!settings) {
      return sendError(res, 'E-posta ayarları bulunamadı, lütfen önce ayarları kaydedin', 400);
    }
    
    // Nodemailer'ı yapılandır
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort),
      secure: settings.useSSL,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword
      },
      tls: {
        // Otomatik onaylı sertifikalar için güvenlik kontrolünü devre dışı bırakabilirsiniz
        rejectUnauthorized: false
      }
    });
    
    // E-posta içeriğini oluştur
    const mailOptions = {
      from: `"${settings.senderName}" <${settings.senderEmail}>`,
      to: testEmail,
      subject: 'Taşı.app - Test E-postası',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h1 style="color: #FF6B00; text-align: center;">Taşı.app Test E-postası</h1>
          <p>Merhaba,</p>
          <p>Bu bir test e-postasıdır. E-posta ayarlarınız doğru bir şekilde yapılandırılmış ve çalışıyor.</p>
          <p>Bu e-posta, <strong>${settings.smtpHost}</strong> üzerinden <strong>${settings.smtpUser}</strong> hesabı kullanılarak gönderilmiştir.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Taşı.app. Tüm hakları saklıdır.</p>
        </div>
      `
    };
    
    // E-postayı gönder
    await transporter.sendMail(mailOptions);
    
    // İşlem başarılı olduysa
    return sendSuccess(res, { 
      success: true, 
      message: `Test e-postası ${testEmail} adresine başarıyla gönderildi` 
    });
  } catch (error) {
    console.error('Test e-postası gönderilirken hata:', error);
    return sendError(res, 'Test e-postası gönderilirken bir hata oluştu: ' + error.message, 500);
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