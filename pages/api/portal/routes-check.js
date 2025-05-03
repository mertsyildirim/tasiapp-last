import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '../../../lib/minimal-mongodb';

export default async function handler(req, res) {
  try {
    // Session kontrolü - basit kimlik doğrulama
    const session = await getServerSession(req, res);
    console.log('Oturum bilgisi:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('Oturum bulunamadı');
      return res.status(401).json({ success: false, message: 'Bu işlem için giriş yapmalısınız' });
    }

    // Sadece GET metodunu kabul et
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Metod desteklenmiyor' });
    }

    try {
      // Database bağlantısı yap
      const { db } = await connectToDatabase();
      console.log('MongoDB bağlantısı başarılı');
      
      // Routes koleksiyonundaki şehir-ilçe verilerini kontrol et
      const routesData = await db.collection('routes').findOne({ type: 'city-districts' });
      
      if (routesData) {
        console.log('Routes koleksiyonunda veri bulundu');
        return res.status(200).json({
          success: true,
          message: 'Routes koleksiyonunda şehir-ilçe verileri mevcut',
          dataExists: true,
          createdAt: routesData.createdAt,
          updatedAt: routesData.updatedAt,
          cityCount: routesData.cities ? routesData.cities.length : 0,
          districtCount: routesData.districts ? Object.keys(routesData.districts).length : 0
        });
      } else {
        console.log('Routes koleksiyonunda veri bulunamadı');
        return res.status(200).json({
          success: true,
          message: 'Routes koleksiyonunda şehir-ilçe verileri bulunamadı',
          dataExists: false
        });
      }
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