import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/portal/[...nextauth]';

export default async function handler(req, res) {
  try {
    // Sadece POST metodunu kabul et
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Metod desteklenmiyor' });
    }

    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    console.log('Oturum bilgisi:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('Oturum bulunamadı');
      return res.status(401).json({ success: false, message: 'Bu işlem için giriş yapmalısınız' });
    }

    // Kullanıcı ID'sini session'dan al
    let userId = session.user?.id;
    
    if (!userId) {
      console.log('Session bilgisinde kullanıcı ID bulunamadı');
      return res.status(400).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
    }

    try {
      // Database bağlantısı yap
      const { db } = await connectToDatabase();
      console.log('MongoDB bağlantısı başarılı');
      
      // İstek gövdesinden talep ID'sini al
      const { requestId } = req.body;
      
      if (!requestId) {
        return res.status(400).json({ success: false, message: "Geçerli bir talep ID'si sağlanmadı" });
      }
      
      console.log('Talep ID:', requestId);
      
      // Firma bilgilerini getir
      let company;
      try {
        // ObjectId kontrolü yaparak firma bilgilerini al
        if (ObjectId.isValid(userId)) {
          company = await db.collection('companies').findOne({ _id: new ObjectId(userId) });
        }
        
        // Bulunamadıysa string ID ile tekrar dene
        if (!company) {
          company = await db.collection('companies').findOne({ _id: userId });
        }
        
        // Hala bulunamadıysa email ile dene
        if (!company && session.user?.email) {
          company = await db.collection('companies').findOne({ email: session.user.email });
        }
      } catch (companyError) {
        console.error('Firma bilgileri alınamadı:', companyError);
      }
      
      if (!company) {
        console.log('Firma bulunamadı, userId:', userId);
        return res.status(404).json({ success: false, message: 'Taşıyıcı firma bulunamadı' });
      }
      
      console.log('Firma bulundu:', company.companyName || company.name, 'ID:', company._id);
      
      // Talebi durumunu güncelle
      let result;
      try {
        const companyId = company._id;
        const carrierId = companyId.toString(); // String olarak ID
        
        // Güncelleme verisi
        const updateData = {
          status: 'approved',
          carrier: companyId, // ObjectId olarak kaydet
          carrierId: carrierId, // String olarak ID'yi de kaydet (uyumluluk için)
          carrierName: company.companyName || company.name || '', // Firma adını da kaydet
          acceptedAt: new Date(),
          updatedAt: new Date()
        };
        
        console.log('Güncelleme verisi:', updateData);
        
        // ID formatına göre sorgu oluştur
        if (ObjectId.isValid(requestId)) {
          console.log('ObjectId formatında talep ID kullanılıyor');
          result = await db.collection('requests').updateOne(
            { _id: new ObjectId(requestId), status: 'waiting-approve' },
            { $set: updateData }
          );
        } else {
          console.log('String formatında talep ID kullanılıyor');
          result = await db.collection('requests').updateOne(
            { id: requestId, status: 'waiting-approve' },
            { $set: updateData }
          );
        }
      } catch (idError) {
        console.error('ID işleme hatası:', idError);
        return res.status(500).json({ success: false, message: 'ID işleme hatası', error: idError.message });
      }
      
      console.log('Güncelleme sonucu:', result);
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Talep bulunamadı veya zaten kabul edilmiş' });
      }
      
      if (result.modifiedCount === 0) {
        return res.status(400).json({ success: false, message: 'Talep güncellenemedi' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Talep başarıyla kabul edildi'
      });
      
    } catch (dbError) {
      console.error('Veritabanı işlemleri sırasında hata:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı işlemi sırasında hata oluştu', 
        error: dbError.message 
      });
    }
  } catch (error) {
    console.error('Genel API Hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası', 
      error: error.message 
    });
  }
} 