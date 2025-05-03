import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/portal/[...nextauth]';

export default async function handler(req, res) {
  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    console.log('Oturum bilgisi:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('Oturum bulunamadı');
      return res.status(401).json({ success: false, message: 'Bu işlem için giriş yapmalısınız' });
    }

    // HTTP metod kontrolü
    if (req.method === 'GET') {
      return await getShipments(req, res, session);
    } else if (req.method === 'PUT') {
      return await updateShipment(req, res, session);
    } else {
      return res.status(405).json({ success: false, message: 'Metod desteklenmiyor' });
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

// GET: Taşımaları getir
async function getShipments(req, res, session) {
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

    // Şirket bilgilerini getir
    let company;
    try {
      if (ObjectId.isValid(userId)) {
        company = await db.collection('companies').findOne({ _id: new ObjectId(userId) });
      }
      if (!company) {
        company = await db.collection('companies').findOne({ _id: userId });
      }
    } catch (err) {
      console.error('Şirket bilgileri alınamadı:', err);
    }

    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
    }

    console.log('Şirket bilgileri bulundu:', company.companyName || company.name);

    // Sayfalandırma için parametreleri al
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Statü filtresi için parametreyi al
    let status = req.query.status || 'all';
    
    console.log('İstenen status filtresi:', status);

    // Shipments koleksiyonundan taşıyıcıya ait verileri getir
    // carrierId veya carrier alanında taşıyıcı ID'si olmalı
    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }
    
    // Taşıyıcının shipments verilerini bul (carrier.toString() veya carrierId şirket ID'sine eşit olmalı)
    query.$or = [
      { carrierId: userId },
      { 'carrier': userId }
    ];

    if (ObjectId.isValid(userId)) {
      query.$or.push({ 'carrier': new ObjectId(userId) });
    }

    console.log('Shipments koleksiyonu sorgusu:', JSON.stringify(query));

    // Toplam kayıt sayısını al
    const totalCount = await db.collection('shipments').countDocuments(query);
    console.log('Toplam shipment sayısı:', totalCount);
    
    // Shipments verilerini getir
    const shipments = await db.collection('shipments')
      .find(query)
      .sort({ createdAt: -1 }) // En yeniden eskiye sırala
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`${shipments.length} adet shipment bulundu`);

    // Yanıt döndür
    return res.status(200).json({
      success: true,
      shipments: shipments,
      pagination: {
        total: totalCount,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (dbError) {
    console.error('Veritabanı işlemleri sırasında hata:', dbError);
    return res.status(500).json({ 
      success: false, 
      message: 'Veritabanı işlemi sırasında hata oluştu', 
      error: dbError.message 
    });
  }
}

// PUT: Taşıma bilgilerini güncelle
async function updateShipment(req, res, session) {
  try {
    // Database bağlantısı yap
    const { db } = await connectToDatabase();
    console.log('MongoDB bağlantısı başarılı (PUT)');
    
    // İstek gövdesinden güncelleme verilerini al
    const { driverId, vehicleId, driverName, vehicleInfo } = req.body;
    
    // URL path'inden shipment ID'sini al
    const shipmentId = req.query.id;
    
    if (!shipmentId) {
      return res.status(400).json({ success: false, message: 'Taşıma ID gereklidir' });
    }
    
    console.log(`Güncelleme yapılacak taşıma ID: ${shipmentId}`);
    console.log('Güncelleme verileri:', { driverId, vehicleId, driverName, vehicleInfo });
    
    // ObjectId kontrolü ve dönüşümü
    let objectIdShipmentId;
    try {
      objectIdShipmentId = new ObjectId(shipmentId);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Geçersiz taşıma ID formatı' });
    }
    
    // Shipment'ı bul ve güncelle
    const updateResult = await db.collection('shipments').updateOne(
      { _id: objectIdShipmentId },
      { 
        $set: { 
          driverId,
          vehicleId, 
          driverName,
          vehicleInfo,
          updatedAt: new Date() 
        } 
      }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Taşıma bulunamadı' });
    }
    
    if (updateResult.modifiedCount === 0) {
      return res.status(200).json({ success: true, message: 'Hiçbir değişiklik yapılmadı' });
    }
    
    // Güncellenmiş taşımayı getir
    const updatedShipment = await db.collection('shipments').findOne({ _id: objectIdShipmentId });
    
    return res.status(200).json({
      success: true,
      message: 'Taşıma başarıyla güncellendi',
      shipment: updatedShipment
    });
  } catch (error) {
    console.error('Taşıma güncelleme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Taşıma güncellenirken bir hata oluştu', 
      error: error.message 
    });
  }
} 