import { connectToDatabase } from '/lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { setupCORS, logRequest } from '../../../lib/api-utils';

export default async function handler(req, res) {
  // CORS ayarlarını yapılandır
  setupCORS(res);
  
  // İsteği logla
  logRequest(req);

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Oturum kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
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

    const collection = db.collection('drivers');

    // Sayfalama ve arama parametreleri
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const searchTerm = req.query.search || '';

    // Aktif sürücü filtresi
    const filter = {
      $or: [
        { status: { $in: ['active', 'online', 'Aktif'] } },
        { status: 'on_delivery' }
      ]
    };

    if (searchTerm) {
      filter.$or.push(
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } },
        { licensePlate: { $regex: searchTerm, $options: 'i' } }
      );
    }

    // Sürücüleri getir
    const drivers = await collection
      .find(filter)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Toplam sayıları hesapla
    const total = await collection.countDocuments(filter);
    const active = await collection.countDocuments({
      status: { $in: ['active', 'online', 'Aktif'] }
    });
    const onDelivery = await collection.countDocuments({
      status: 'on_delivery'
    });

    // Hassas bilgileri temizle
    const sanitizedDrivers = drivers.map(driver => ({
      id: driver._id.toString(),
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      company: driver.company,
      vehicleType: driver.vehicleType,
      licensePlate: driver.licensePlate,
      location: driver.location,
      status: driver.status
    }));

    return res.status(200).json({
      success: true,
      drivers: sanitizedDrivers,
      total,
      active,
      onDelivery,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Aktif sürücüler getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 