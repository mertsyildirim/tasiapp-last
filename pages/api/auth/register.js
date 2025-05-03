import bcrypt from 'bcryptjs';
import { setupCORS, handleOptionsRequest, sendSuccess, sendError, logRequest } from '/lib/api-utils';
import { connectToDatabase } from '/lib/minimal-mongodb';
import { sign } from 'jsonwebtoken';

export default async function handler(req, res) {
  // CORS ayarlarını ekle
  setupCORS(res);
  
  // OPTIONS isteğini işle
  if (handleOptionsRequest(req, res)) {
    return;
  }
  
  // İsteği logla
  logRequest(req);

  // Sadece POST istekleri
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Veritabanı bağlantısı başlatılıyor...');
    const { db } = await connectToDatabase();
    console.log('Veritabanı bağlantısı başarılı');

    // Gelen veriyi logla
    const sanitizedBody = { ...req.body };
    delete sanitizedBody.password;
    delete sanitizedBody.confirmPassword;
    console.log('Gelen kayıt verisi:', JSON.stringify(sanitizedBody, null, 2));

    // Gerekli alanları kontrol et
    const accountType = req.body.accountType || 'individual';
    
    let requiredFields = [];
    if (accountType === 'individual') {
      requiredFields = ['firstName', 'lastName', 'email', 'phone', 'password'];
    } else {
      requiredFields = ['companyName', 'taxNumber', 'taxOffice', 'firstName', 'lastName', 'email', 'phone', 'password'];
    }

    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Eksik alanlar var',
        fields: missingFields 
      });
    }

    // Mevcut kullanıcıyı kontrol et
    console.log('Mevcut kullanıcı kontrolü yapılıyor...');
    const existingUser = await db.collection('customers').findOne({ email: req.body.email });
    if (existingUser) {
      console.log('E-posta adresi zaten kullanımda:', req.body.email);
      return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor' });
    }

    // Şifreyi hashle
    console.log('Şifre hashleniyor...');
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Kullanıcı durumunu belirle
    const status = req.body.documentLater ? 'WAITING_DOCUMENTS' : 'WAITING_APPROVAL';
    console.log('Kullanıcı durumu:', status);

    // Yeni kullanıcıyı oluştur
    const newUser = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      accountType: accountType,
      status: 'ACTIVE',
      ...(accountType === 'corporate' && {
        companyName: req.body.companyName,
        taxNumber: req.body.taxNumber,
        taxOffice: req.body.taxOffice
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    console.log('Yeni kullanıcı objesi oluşturuldu');

    // Kullanıcıyı veritabanına kaydet
    console.log('Kullanıcı veritabanına kaydediliyor...');
    const result = await db.collection('customers').insertOne(newUser);
    console.log('Kullanıcı başarıyla kaydedildi:', result.insertedId);

    // JWT token oluştur
    const token = sign(
      { 
        id: result.insertedId,
        email: newUser.email,
        accountType: newUser.accountType
      },
      process.env.NEXTAUTH_SECRET,
      { expiresIn: '7d' }
    );

    // Hassas bilgileri çıkar
    const { password, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Kayıt başarıyla tamamlandı',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Kayıt hatası detayı:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Daha açıklayıcı hata mesajı
    let errorMessage = 'Kayıt işlemi sırasında bir hata oluştu';
    if (error.code === 11000) {
      errorMessage = 'Bu e-posta adresi zaten kullanılıyor';
    } else if (error.name === 'MongoServerError') {
      errorMessage = 'Veritabanı bağlantı hatası';
    }
    
    return res.status(500).json({ 
      error: errorMessage,
      details: error.message 
    });
  }
} 