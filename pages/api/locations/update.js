import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

export default async function handler(req, res) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // Session kontrolü (isteğe bağlı, güvenlik için)
    const session = await getServerSession(req, res, authOptions);
    
    // Bu endpoint'i session olmadan da kullanabilirsiniz ama 
    // kimlik doğrulama için başka bir mekanizma eklemeniz gerekir
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

    // İstek gövdesinden konum bilgilerini al
    const { userId, latitude, longitude, timestamp, accuracy, speed, heading, userType, isActive } = req.body;

    // Gerekli alanların kontrolü
    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz istek. userId, latitude ve longitude alanları zorunludur.'
      });
    }

    // Konum verisi oluştur
    const locationData = {
      userId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      speed: speed ? parseFloat(speed) : null,
      heading: heading ? parseFloat(heading) : null,
      userType: userType || 'freelance',
      isActive: isActive === undefined ? true : isActive,
      updatedAt: new Date()
    };

    // Mevcut konumu kontrol et ve güncelle veya yeni oluştur
    try {
      const existingLocation = await db.collection('locations').findOne({ userId });

      if (existingLocation) {
        // Mevcut konumu güncelle
        const result = await db.collection('locations').updateOne(
          { userId },
          { $set: locationData }
        );

        if (result.modifiedCount === 1) {
          console.log(`Konum güncellendi: ${userId}`);
          return res.status(200).json({
            success: true,
            message: 'Konum güncellendi',
            data: locationData
          });
        } else {
          return res.status(500).json({
            success: false,
            message: 'Konum güncellenemedi'
          });
        }
      } else {
        // Yeni konum oluştur
        const result = await db.collection('locations').insertOne(locationData);

        if (result.insertedId) {
          console.log(`Yeni konum oluşturuldu: ${userId}`);
          return res.status(201).json({
            success: true,
            message: 'Yeni konum oluşturuldu',
            data: locationData
          });
        } else {
          return res.status(500).json({
            success: false,
            message: 'Konum oluşturulamadı'
          });
        }
      }
    } catch (error) {
      console.error('Konum kaydetme hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Konum kaydedilirken bir hata oluştu',
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