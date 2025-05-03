import bcrypt from 'bcryptjs';
import { setupCORS, handleOptionsRequest, logRequest } from '../../../lib/api-utils';
import { connectToDatabase } from '/lib/minimal-mongodb';

export default async function handler(req, res) {
  // CORS ayarları
  setupCORS(res);
  if (handleOptionsRequest(req, res)) return;
  
  // İstek logla
  logRequest(req);

  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Gelen veriyi logla
    console.log('Gelen veri:', JSON.stringify(req.body, null, 2));
    
    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();
    
    // Basit veri kontrolü
    if (!req.body.companyName || !req.body.taxNumber) {
      return res.status(400).json({ 
        error: 'Eksik veri', 
        details: 'Firma adı ve vergi numarası gereklidir' 
      });
    }

    // Şifre kontrolü - burada üst seviyede gönderdik
    if (!req.body.password) {
      return res.status(400).json({ 
        error: 'Şifre eksik', 
        details: 'Üst seviye şifre alanı gereklidir' 
      });
    }

    // Şifre hashle
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    
    // CarrierId oluştur
    const carrierId = `TF${Date.now()}`;
    
    // Firmayı oluştur
    const company = {
      // Temel bilgiler
      companyName: req.body.companyName,
      taxNumber: req.body.taxNumber,
      taxOffice: req.body.taxOffice || '',
      address: req.body.address || '',
      city: req.body.city || '',
      district: req.body.district || '',
      
      // İletişim bilgileri
      phoneNumber: req.body.phoneNumber || '',
      email: req.body.email || '',
      
      // İletişim kişisi - artık obje değil string olarak alıyoruz
      contactPerson: req.body.contactPerson || '',
      
      // Hesap bilgileri
      password: hashedPassword,
      role: 'carrier',
      carrierId: carrierId,
      status: req.body.status || 'WAITING_APPROVAL',
      isFreelance: req.body.isFreelance || false,
      
      // Diğer bilgiler
      documents: req.body.documents || {},
      
      // Zaman bilgileri
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Veritabanına kaydet
    const result = await db.collection('companies').insertOne(company);
    
    // Şifreyi çıkar ve sonucu döndür
    const { password, ...companyWithoutPassword } = company;
    
    return res.status(201).json({
      success: true,
      message: 'Taşıyıcı kaydı başarıyla oluşturuldu',
      company: companyWithoutPassword
    });
    
  } catch (error) {
    console.error('Kayıt hatası:', error);
    return res.status(500).json({ 
      error: 'Kayıt sırasında bir hata oluştu',
      details: error.message
    });
  }
}
