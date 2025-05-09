import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

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

    // Son X dakika içinde güncellenen aktif konumları getir
    const { minutes = 15 } = req.query;
    const minutesAgo = new Date();
    minutesAgo.setMinutes(minutesAgo.getMinutes() - parseInt(minutes));

    try {
      // Aktif ve son X dakika içinde güncellenen freelancer konumlarını getir
      const locations = await db.collection('locations')
        .find({
          userType: 'freelance',
          isActive: true,
          updatedAt: { $gte: minutesAgo }
        })
        .toArray();

      // Freelancer kullanıcı bilgilerini ekle
      const enrichedLocations = await Promise.all(locations.map(async (location) => {
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