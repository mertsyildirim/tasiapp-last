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
      earnings: [],
      summary: {
        totalEarnings: 0,
        pendingEarnings: 0,
        completedEarnings: 0
      }
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
    const period = req.query.period || 'all';
    
    // Temel filtre oluştur - carrierId veya carrier alanı kullanıcının ID'sine eşit olmalı
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

    // Zaman filtresini ekle
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch(period) {
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          filter.createdAt = { $gte: startDate };
          break;
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          filter.createdAt = { $gte: startDate, $lte: endDate };
          break;
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1);
          filter.createdAt = { $gte: startDate };
          break;
      }
    }
    
    console.log('Uygulanan filtre:', JSON.stringify(filter, null, 2));
    
    // Kazanç verilerini getir
    // Önce shipments koleksiyonundan teslim edilmiş taşımaları al
    let shipments = [];
    try {
      // Sadece teslim edilmiş ve ödeme bilgisi olan taşımaları getir
      shipments = await db.collection('shipments')
        .find({
          ...filter,
          $or: [
            { status: 'delivered' },                  // Standart teslim edildi durumu
            { status: 'delivered_status' },           // Alternatif format
            { status: 'DELIVERED' },                  // Büyük harfli versiyon
            { deliveryStatus: 'delivered' },          // Alternatif alan adı
            { delivery_status: 'completed' },         // Alternatif alan ve durum
            { status: 'completed', isDelivered: true} // Tamamlanmış ve teslim edilmiş
          ],
          price: { $exists: true, $ne: null, $gt: 0 }
        })
        .sort({ createdAt: -1 })
        .toArray();
      
      console.log(`${shipments.length} teslim edilmiş taşıma bulundu.`);
    } catch (error) {
      console.error('Taşımalar alınırken hata:', error);
      return res.status(500).json({ success: false, message: 'Taşımalar alınırken bir hata oluştu' });
    }
    
    // Ödemeleri işle
    const formattedEarnings = shipments.map((shipment, index) => {
      // Temel ödeme bilgilerini oluştur
      return {
        id: `TRN${new Date().getFullYear()}${(index + 1).toString().padStart(3, '0')}`,
        title: shipment.title || (shipment.description ? shipment.description.substring(0, 50) + '...' : 'Taşıma'),
        taskId: shipment.id || shipment._id.toString(),
        amount: shipment.price || 0,
        currency: '₺',
        status: shipment.paymentStatus || 'pending',
        paymentMethod: shipment.paymentMethod || 'Banka Transferi',
        paymentDate: shipment.paymentDate || null,
        invoiceNumber: `FTR${new Date().getFullYear()}${(index + 1).toString().padStart(3, '0')}`,
        notes: shipment.paymentNotes || '',
        createdAt: shipment.createdAt || new Date().toISOString()
      };
    });
    
    // Toplam kazançları hesapla
    const totalEarnings = formattedEarnings.reduce((sum, item) => sum + item.amount, 0);
    
    // Bekleyen ödemeleri hesapla
    const pendingEarnings = formattedEarnings
      .filter(item => item.status === 'pending')
      .reduce((sum, item) => sum + item.amount, 0);
    
    // Tamamlanan ödemeleri hesapla
    const completedEarnings = formattedEarnings
      .filter(item => item.status === 'completed')
      .reduce((sum, item) => sum + item.amount, 0);
    
    // Sonuç döndür
    return res.status(200).json({ 
      success: true, 
      earnings: formattedEarnings,
      summary: {
        totalEarnings,
        pendingEarnings,
        completedEarnings
      }
    });
    
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 