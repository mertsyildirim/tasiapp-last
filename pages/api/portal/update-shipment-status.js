import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Oturum kontrolü
  let session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      message: 'Bu işlemi gerçekleştirmek için giriş yapmanız gerekiyor',
      needLogin: true
    });
  }

  // İstek gövdesinden verileri al
  const { shipmentId, status } = req.body;
  
  if (!shipmentId || !status) {
    return res.status(400).json({ success: false, message: 'Taşıma ID ve durum bilgisi zorunludur' });
  }

  // Durumun geçerli olup olmadığını kontrol et
  const validStatuses = ['upcoming', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Geçersiz durum değeri' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Kullanıcı bilgilerini al
    const userId = session.user.id;
    
    // Kullanıcının şirket bilgilerini al
    let company;
    try {
      company = await db.collection('companies').findOne({ 
        $or: [
          { _id: new ObjectId(userId) },
          { _id: userId },
          { email: session.user.email }
        ]
      });
    } catch (error) {
      console.error('Şirket bilgisi alınırken hata:', error);
      return res.status(500).json({ success: false, message: 'Şirket bilgisi alınamadı' });
    }

    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bilgisi bulunamadı' });
    }

    // Taşımayı bul
    let shipment;
    try {
      // Önce string ID ile dene
      shipment = await db.collection('shipments').findOne({ id: shipmentId });
      
      // Bulunamazsa ObjectId ile dene
      if (!shipment && ObjectId.isValid(shipmentId)) {
        shipment = await db.collection('shipments').findOne({ _id: new ObjectId(shipmentId) });
      }
    } catch (error) {
      console.error('Taşıma aranırken hata:', error);
      return res.status(500).json({ success: false, message: 'Taşıma bulunamadı' });
    }

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Taşıma bulunamadı' });
    }

    // Taşımanın kullanıcıya ait olduğunu kontrol et
    const isUserShipment = 
      shipment.carrierId === userId || 
      shipment.carrierId === company._id.toString() ||
      (shipment.carrier && (
        shipment.carrier.toString() === userId || 
        shipment.carrier.toString() === company._id.toString()
      ));

    if (!isUserShipment) {
      return res.status(403).json({ success: false, message: 'Bu taşımayı güncelleme yetkiniz yok' });
    }

    // Veritabanı durumuna dönüştür (MongoDB'deki format farklı olabilir)
    let dbStatus = status;
    switch (status) {
      case 'upcoming':
        dbStatus = 'assigned';
        break;
      case 'in_progress':
        dbStatus = 'in_progress';
        break;
      case 'completed':
        dbStatus = 'completed';
        break;
      case 'cancelled':
        dbStatus = 'cancelled';
        break;
    }

    // Taşımayı güncelle
    const updateResult = await db.collection('shipments').updateOne(
      { _id: shipment._id },
      { 
        $set: { 
          status: dbStatus,
          updatedAt: new Date(),
          statusUpdatedAt: new Date(),
          lastUpdatedBy: userId
        } 
      }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Taşıma güncellenemedi' });
    }
    
    // Sonuç döndür
    return res.status(200).json({ 
      success: true, 
      message: 'Taşıma durumu başarıyla güncellendi',
      status: status
    });
    
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 