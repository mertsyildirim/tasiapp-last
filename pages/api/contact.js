import { connectToDatabase } from '../../lib/minimal-mongodb';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { name, email, phone, subject, message } = req.body;

    // Form doğrulama
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lütfen gerekli tüm alanları doldurun.' 
      });
    }

    // MongoDB'ye bağlan
    const { db } = await connectToDatabase();
    const contactMessages = db.collection('contact_messages');

    // Mesajı veritabanına kaydet
    const result = await contactMessages.insertOne({
      name,
      email,
      phone: phone || '',
      subject,
      message,
      createdAt: new Date(),
      read: false
    });

    // E-posta göndermeyi dene (hata olsa bile devam et)
    try {
      // Yönetici e-posta bilgilerini getir
      const settings = await db.collection('settings').findOne({ type: 'general' });
      const adminEmail = settings?.contactEmail || 'iletisim@tasiapp.com';

      // E-posta gönderimi için transporter oluştur
      const transporter = nodemailer.createTransport({
        // E-posta ayarlarınıza göre düzenleyin
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || '',
        },
      });

      // Yöneticiye bildirim e-postası gönder
      await transporter.sendMail({
        from: `"Taşı App İletişim" <${process.env.SMTP_USER || 'iletisim@tasiapp.com'}>`,
        to: adminEmail,
        subject: `Yeni İletişim Mesajı: ${subject}`,
        html: `
          <h1>Yeni İletişim Formu Mesajı</h1>
          <p><strong>Gönderen:</strong> ${name}</p>
          <p><strong>E-posta:</strong> ${email}</p>
          <p><strong>Telefon:</strong> ${phone || 'Belirtilmemiş'}</p>
          <p><strong>Konu:</strong> ${subject}</p>
          <p><strong>Mesaj:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      });

      // Kullanıcıya otomatik yanıt gönder
      await transporter.sendMail({
        from: `"Taşı App" <${process.env.SMTP_USER || 'iletisim@tasiapp.com'}>`,
        to: email,
        subject: 'Mesajınız Alındı - Taşı App',
        html: `
          <h1>Teşekkürler ${name}!</h1>
          <p>Mesajınız başarıyla alındı. En kısa sürede size dönüş yapacağız.</p>
          <p>İletişim mesajınızın detayları:</p>
          <p><strong>Konu:</strong> ${subject}</p>
          <p><strong>Mesaj:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p>Taşı App Ekibi</p>
        `,
      });
    } catch (emailError) {
      console.error('E-posta gönderimi sırasında hata:', emailError);
      // E-posta gönderilemese bile işleme devam et
    }

    // Başarılı yanıtı döndür
    return res.status(201).json({ 
      success: true, 
      message: 'Mesajınız başarıyla gönderildi.',
      data: { id: result.insertedId }
    });
    
  } catch (error) {
    console.error('İletişim formu işleme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Mesajınız gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.' 
    });
  }
} 
 
 
 
 
 
 
 
 