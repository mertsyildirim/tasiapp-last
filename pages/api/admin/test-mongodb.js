import { connectToDatabase, checkConnection } from '/lib/minimal-mongodb';

/**
 * MongoDB bağlantı durumunu test etmek için API endpoint
 * NOT: Bu endpoint yetkilendirme gerektirmez - sadece test amaçlıdır
 */
export default async function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  // OPTIONS isteğini işle
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Sadece GET isteklerine izin ver
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    console.log('MongoDB test başlatılıyor...');
    
    // MongoDB bağlantı durumunu kontrol et
    console.log('Bağlantı kontrolü yapılıyor...');
    const connectionStatus = await checkConnection();
    console.log('Bağlantı kontrol sonucu:', connectionStatus);
    
    if (!connectionStatus.success) {
      console.error('MongoDB bağlantı hatası:', connectionStatus);
      return res.status(500).json({
        success: false,
        error: 'MongoDB bağlantı hatası',
        details: connectionStatus
      });
    }
    
    try {
      // Veritabanına tam bağlantı yap
      console.log('Veritabanına bağlanılıyor...');
      const { db } = await connectToDatabase();
      console.log('Veritabanına bağlanıldı');
      
      // Basit bir test yap
      const testData = {
        message: 'MongoDB bağlantısı başarılı',
        databaseName: db.databaseName,
        timestamp: new Date().toISOString()
      };
      
      // Başarılı yanıt döndür
      return res.status(200).json({
        success: true,
        connectionStatus,
        testData
      });
      
    } catch (dbError) {
      console.error('Veritabanı işlemi hatası:', dbError);
      return res.status(500).json({
        success: false, 
        error: 'Veritabanı işlemi sırasında hata oluştu',
        message: dbError.message
      });
    }
    
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası',
      message: error.message
    });
  }
} 