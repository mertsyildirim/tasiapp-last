import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Sadece GET isteklerine izin ver
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Oturum kontrolü
  let session = await getSession({ req });
  if (!session) {
    console.log('Oturumsuz erişim - boş veri dönülüyor');
    return res.status(200).json({ 
      success: true, 
      routes: []
    });
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
    }

    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bilgisi bulunamadı' });
    }

    // Temel filtre oluştur - carrierId veya carrier alanı kullanıcının ID'sine eşit olmalı
    let filter = {
      $or: [
        { carrierId: userId },
        { carrierId: company._id.toString() },
        { carrier: userId },
        { carrier: company._id.toString() }
      ],
      // Tamamlanmış (completed, delivered, vs.) olmayanları getir
      $nor: [
        { status: 'completed' },
        { status: 'COMPLETED' },
        { status: 'delivered' },
        { status: 'DELIVERED' },
        { status: 'done' },
        { status: 'finished' }
      ]
    };

    // ObjectId kontrolü
    if (ObjectId.isValid(userId)) {
      filter.$or.push({ carrier: new ObjectId(userId) });
    }
    
    if (ObjectId.isValid(company._id)) {
      filter.$or.push({ carrier: company._id });
    }

    console.log('Uygulanan filtre:', JSON.stringify(filter, null, 2));
    
    // Shipments verilerini getir
    let shipments = [];
    try {
      shipments = await db.collection('shipments')
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();
      
      console.log(`${shipments.length} taşıma bulundu.`);
    } catch (error) {
      console.error('Taşımalar alınırken hata:', error);
      return res.status(500).json({ success: false, message: 'Taşımalar alınırken bir hata oluştu' });
    }
    
    // Taşımaları rota formatına dönüştür
    const routes = shipments.map(shipment => {
      // Başlangıç ve bitiş konumlarını belirle
      const startLocation = shipment.pickupLocation || shipment.origin || shipment.startLocation || '';
      const endLocation = shipment.deliveryLocation || shipment.destination || shipment.endLocation || '';
      
      // Durum değerini belirle
      let status = 'inactive';
      if (shipment.status === 'in_progress' || shipment.status === 'in-transit' || shipment.status === 'started' || shipment.status === 'picking') {
        status = 'active';
      } else if (shipment.status === 'assigned' || shipment.status === 'scheduled' || shipment.status === 'waiting-pickup') {
        status = 'planned';
      }
      
      // Varsayılan koordinatlar (gerçek koordinatlar yoksa)
      const defaultStartCoords = { lat: 41.0082, lng: 28.9784 }; // İstanbul
      const defaultEndCoords = { lat: 39.9334, lng: 32.8597 };   // Ankara
      
      // Rota nesnesi oluştur
      return {
        id: shipment.id || shipment._id.toString(),
        title: `${startLocation} - ${endLocation}`,
        description: shipment.description || `${startLocation}'dan ${endLocation}'a taşıma hizmeti`,
        startLocation: startLocation,
        startCoordinates: shipment.pickupCoordinates || shipment.originCoordinates || defaultStartCoords,
        endLocation: endLocation,
        endCoordinates: shipment.deliveryCoordinates || shipment.destinationCoordinates || defaultEndCoords,
        distance: shipment.distance || `${Math.floor(Math.random() * 500) + 50} km`, // Varsayılan mesafe
        duration: shipment.duration || `${Math.floor(Math.random() * 10) + 1} saat`, // Varsayılan süre
        frequency: shipment.frequency || 'Tek Seferlik',
        days: shipment.days || ['Pazartesi', 'Perşembe'],
        nextDate: shipment.pickupDate || shipment.date || new Date().toISOString().split('T')[0],
        vehicleType: shipment.vehicleType || shipment.vehicle?.type || 'Kamyon',
        capacity: shipment.capacity || shipment.vehicle?.capacity || '10 ton',
        status: status,
        price: shipment.price ? `${shipment.price} ₺` : 'Belirtilmemiş',
        stops: shipment.stops || [],
        notes: shipment.notes || shipment.specialInstructions || '',
        createdAt: shipment.createdAt || new Date().toISOString()
      };
    });
    
    // Sonuç döndür
    return res.status(200).json({ 
      success: true, 
      routes: routes
    });
    
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 