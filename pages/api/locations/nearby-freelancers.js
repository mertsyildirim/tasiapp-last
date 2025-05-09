import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

// İki nokta arasındaki mesafeyi hesaplamak için Haversine formülü
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Dünya yarıçapı (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Kilometre cinsinden mesafe
  return distance;
}

export default async function handler(req, res) {
  // Sadece GET isteklerine izin ver
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: 'Oturum bulunamadı. Erişim reddedildi.' 
      });
    }
    
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
        message: 'Veritabanı bağlantısı sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      });
    }

    // Query parametrelerini al
    const { latitude, longitude, distance = 10, minutes = 15 } = req.query;

    // Parametrelerin kontrolü
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz istek. latitude ve longitude parametreleri zorunludur.'
      });
    }

    // Parse parametreleri
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const maxDistance = parseFloat(distance); // km cinsinden
    
    // Son X dakika içinde güncellenen konumları getir
    const minutesAgo = new Date();
    minutesAgo.setMinutes(minutesAgo.getMinutes() - parseInt(minutes));

    try {
      // MongoDB'nin 2dsphere index'i yoksa, direkt mesafe hesaplaması yapacağız
      // Yakın gelecekte $geoNear operatörü ile daha verimli hale getirebilirsiniz
      
      // Tüm aktif ve son X dakika içinde güncellenen freelancer konumlarını getir
      const locations = await db.collection('locations')
        .find({
          userType: 'freelance',
          isActive: true,
          updatedAt: { $gte: minutesAgo }
        })
        .toArray();
      
      // Mesafeye göre filtreleme ve mesafe hesaplama
      const nearbyLocations = locations
        .map(location => {
          const dist = calculateDistance(lat, lon, location.latitude, location.longitude);
          return { ...location, distance: parseFloat(dist.toFixed(2)) };
        })
        .filter(location => location.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance);
      
      // Freelancer bilgilerini ekle
      const enrichedLocations = await Promise.all(nearbyLocations.map(async (location) => {
        let user = null;
        try {
          // Kullanıcı bilgilerini getir (companies koleksiyonundan)
          user = await db.collection('companies').findOne({ _id: location.userId });
        } catch (err) {
          console.error(`Kullanıcı bilgisi alınırken hata: ${err.message}`);
        }

        return {
          ...location,
          userName: user ? user.companyName : null,
          contactPerson: user ? user.contactPerson : null,
          phone: user ? user.phoneNumber : null,
          email: user ? user.email : null
        };
      }));

      // Cevap döndür
      return res.status(200).json({
        success: true,
        count: enrichedLocations.length,
        sourceLocation: { latitude: lat, longitude: lon },
        maxDistance: maxDistance,
        locations: enrichedLocations
      });
    } catch (error) {
      console.error('Konum verileri alınamadı:', error);
      return res.status(500).json({
        success: false,
        message: 'Konum verileri alınırken bir hata oluştu',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Genel hata:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: error.message
    });
  }
} 