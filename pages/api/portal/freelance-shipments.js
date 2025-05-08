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
      tasks: {
        upcoming: [],
        in_progress: [],
        completed: [],
        cancelled: []
      },
      all: []
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

    // Filtre parametrelerini al
    const status = req.query.status || 'all';
    
    // Filtre oluştur - carrierId veya carrier alanı kullanıcının ID'sine eşit olmalı
    let filter = {
      $or: [
        { carrierId: userId },
        { carrierId: company._id.toString() },
        { carrier: userId },
        { carrier: company._id.toString() }
      ]
    };

    // ObjectId kontrolü
    if (ObjectId.isValid(userId)) {
      filter.$or.push({ carrier: new ObjectId(userId) });
    }
    
    if (ObjectId.isValid(company._id)) {
      filter.$or.push({ carrier: company._id });
    }

    // Durum filtresini uygula
    if (status !== 'all') {
      filter.status = status;
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
    
    // Taşımaları işle ve kategorize et
    const formattedShipments = shipments.map(shipment => {
      // Temel alanları düzenle
      return {
        id: shipment.id || shipment._id.toString(),
        title: shipment.title || (shipment.description ? shipment.description.substring(0, 50) + '...' : 'Taşıma'),
        customer: shipment.customerName || shipment.customer?.name || 'İsimsiz Müşteri',
        customerContact: shipment.customerPhone || shipment.customer?.phone || '',
        from: shipment.pickupLocation || shipment.origin || '',
        fromAddress: shipment.pickupAddress || shipment.originAddress || '',
        to: shipment.deliveryLocation || shipment.destination || '',
        toAddress: shipment.deliveryAddress || shipment.destinationAddress || '',
        date: shipment.pickupDate || shipment.date || new Date().toISOString().split('T')[0],
        time: shipment.pickupTime || shipment.time || '',
        description: shipment.description || '',
        status: mapShipmentStatus(shipment.status),
        distance: shipment.distance || '',
        payment: {
          amount: shipment.price || shipment.payment?.amount || 0,
          method: shipment.paymentMethod || shipment.payment?.method || 'Belirtilmemiş',
          status: shipment.paymentStatus || shipment.payment?.status || 'Belirtilmemiş'
        },
        items: shipment.items || shipment.cargo || [],
        notes: shipment.notes || shipment.specialInstructions || '',
        createdAt: shipment.createdAt || new Date().toISOString()
      };
    });
    
    // Durumlara göre kategorize et
    const processedTasks = {
      upcoming: formattedShipments.filter(task => task.status === 'upcoming'),
      in_progress: formattedShipments.filter(task => task.status === 'in_progress'),
      completed: formattedShipments.filter(task => task.status === 'completed'),
      cancelled: formattedShipments.filter(task => task.status === 'cancelled')
    };
    
    // Sonuç döndür
    return res.status(200).json({ 
      success: true, 
      tasks: processedTasks,
      all: formattedShipments
    });
    
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
}

// Shipment durumunu uyumlu status değerine dönüştür
function mapShipmentStatus(status) {
  if (!status) return 'upcoming';
  
  status = status.toLowerCase();
  
  if (status.includes('waiting') || status.includes('ready') || status.includes('assigned') || 
      status.includes('scheduled') || status.includes('pending')) {
    return 'upcoming';
  }
  
  if (status.includes('in_progress') || status.includes('in progress') || status.includes('started') || 
      status.includes('pickup') || status.includes('picked') || status.includes('transit') || 
      status.includes('loaded') || status.includes('loading')) {
    return 'in_progress';  
  }
  
  if (status.includes('completed') || status.includes('delivered') || status.includes('done') || 
      status.includes('finished') || status.includes('success')) {
    return 'completed';
  }
  
  if (status.includes('cancel') || status.includes('reject') || status.includes('failed') || 
      status.includes('terminated')) {
    return 'cancelled';
  }
  
  return 'upcoming'; // Varsayılan durum
} 