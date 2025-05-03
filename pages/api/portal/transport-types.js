import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

// getServerSession ve authOptions import'u ekleyelim
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/portal/[...nextauth]';

export default async function handler(req, res) {
  try {
    // Session kontrolü - authOptions ile birlikte çağıralım
    const session = await getServerSession(req, res, authOptions);
    console.log('Oturum bilgisi:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('Oturum bulunamadı');
      return res.status(401).json({ success: false, message: 'Bu işlem için giriş yapmalısınız' });
    }

    // Sadece PUT metodunu kabul et
    if (req.method !== 'PUT') {
      return res.status(405).json({ success: false, message: 'Metod desteklenmiyor' });
    }

    try {
      // Database bağlantısı yap
      const { db } = await connectToDatabase();
      console.log('MongoDB bağlantısı başarılı');
      
      // Kullanıcı ID'sini session'dan al
      let userId = session.user?.id;
      
      // Headers veya query'den de alabiliriz (yedek yöntem)
      if (!userId) {
        userId = req.headers['x-user-id'] || req.query.userId;
        console.log('Session dışından alınan userId:', userId);
      }
      
      if (!userId) {
        console.log('Session bilgisinde kullanıcı ID bulunamadı');
        return res.status(400).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
      }
      
      console.log('Kullanıcı ID:', userId);

      // İstek gövdesinden taşıma tiplerini al
      const { transportTypes } = req.body;
      console.log('Gelen taşıma tipleri:', transportTypes);
      
      // Veri kontrolü
      if (!transportTypes || !Array.isArray(transportTypes)) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli taşıma tipleri listesi sağlanmadı'
        });
      }
      
      // Veritabanında güncelle - ObjectId dönüşüm hatası riski için try-catch ekleyelim
      let result;
      try {
        // Önce ObjectId ile deneyelim
        if (ObjectId.isValid(userId)) {
          result = await db.collection('companies').updateOne(
            { _id: new ObjectId(userId) },
            { 
              $set: {
                transportTypes: transportTypes,
                updatedAt: new Date()
              } 
            }
          );
          console.log('ObjectId ile güncelleme sonucu:', result);
        }
      } catch (idError) {
        console.error('ObjectId dönüşüm hatası:', idError);
      }
      
      // Eğer sonuç yoksa veya hiç eşleşme yoksa, string ID ile deneyelim
      if (!result || result.matchedCount === 0) {
        console.log('String ID ile deneniyor');
        result = await db.collection('companies').updateOne(
          { _id: userId },
          { 
            $set: {
              transportTypes: transportTypes,
              updatedAt: new Date()
            } 
          }
        );
        console.log('String ID ile güncelleme sonucu:', result);
      }
      
      console.log('Güncelleme sonucu:', result);
      
      if (result.matchedCount === 0) {
        console.log('Şirket bulunamadı, id:', userId);
        return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Taşıma tipleri güncellendi'
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