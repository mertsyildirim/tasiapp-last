import { connectToDatabase } from '/lib/minimal-mongodb';
import { getSession } from 'next-auth/react';

// CORS middleware
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
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
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Kullanıcı oturumunu kontrol et
    const session = await getSession({ req });
    
    // Oturum yoksa boş başarılı yanıt döndür
    if (!session) {
      console.log('Oturumsuz erişim - varsayılan durum bilgisi döndürülüyor');
      return res.status(200).json({ 
        success: true, 
        message: 'Oturum açılmadığı için varsayılan durum döndürüldü',
        isOnline: false,
        lastOnlineAt: null
      });
    }

    // Veritabanına bağlan
    const { db } = await connectToDatabase();
    
    // Kullanıcının çevrimiçi durumunu al
    const user = await db.collection('users').findOne(
      { email: session.user.email },
      { projection: { isOnline: 1, lastOnlineAt: 1 } }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    // Kullanıcı son 15 dakika içinde çevrimiçi olmuşsa ve isOnline true ise çevrimiçi kabul et
    // Bu, tarayıcının kapanması gibi durumlarda manuel çıkış yapılmadığında yardımcı olur
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const isActiveNow = user.isOnline && user.lastOnlineAt && new Date(user.lastOnlineAt) > fifteenMinutesAgo;

    return res.status(200).json({ 
      success: true, 
      isOnline: isActiveNow || false,
      lastOnlineAt: user.lastOnlineAt || null
    });
  } catch (error) {
    console.error('Kullanıcı durumu alınırken hata:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: error.message });
  }
}

// CORS middleware ile sarılmış handler fonksiyonu
export default allowCors(handler); 