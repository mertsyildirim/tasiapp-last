import { connectToDatabase } from '/lib/minimal-mongodb';
import { getSession } from 'next-auth/react';

// CORS middleware
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getSession({ req });
    
    // Oturum yoksa boş başarılı yanıt döndür
    if (!session) {
      console.log('Oturumsuz erişim - çevrimiçi durum güncellenmiyor');
      return res.status(200).json({ 
        success: true, 
        message: 'Oturum açılmadığı için işlem yapılmadı',
        isOnline: false
      });
    }

    const { isOnline } = req.body;
    
    if (isOnline === undefined) {
      return res.status(400).json({ success: false, message: 'isOnline parametresi gerekli' });
    }

    // Veritabanına bağlan
    const { db } = await connectToDatabase();
    
    // Kullanıcının çevrimiçi durumunu güncelle
    const updateResult = await db.collection('users').updateOne(
      { email: session.user.email },
      { 
        $set: { 
          isOnline: isOnline,
          lastOnlineAt: new Date(),
        },
        // Çevrimiçi durumu değiştiğinde aktivite logu oluştur
        $push: {
          activityLogs: {
            action: isOnline ? 'online' : 'offline',
            timestamp: new Date(),
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
          }
        }
      }
    );

    // Aktivite logu kaydet
    await db.collection('activity_logs').insertOne({
      userId: session.user.id,
      userInfo: {
        email: session.user.email,
        name: session.user.name
      },
      action: isOnline ? 'online' : 'offline',
      details: `Kullanıcı ${isOnline ? 'çevrimiçi' : 'çevrimdışı'} oldu`,
      timestamp: new Date(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı veya durum güncellenemedi' });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Çevrimiçi durumu başarıyla ${isOnline ? 'açık' : 'kapalı'} olarak güncellendi`,
      isOnline: isOnline
    });
  } catch (error) {
    console.error('Çevrimiçi durumu güncellenirken hata:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: error.message });
  }
}

// CORS middleware ile sarılmış handler fonksiyonu
export default allowCors(handler); 