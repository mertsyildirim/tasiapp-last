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
      requests: {
        new: [],
        pending: [],
        accepted: [],
        missed: []
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

    // Şirketin taşıma tiplerini ve hizmet bölgelerini al
    const transportTypes = company.transportTypes || [];
    const serviceAreas = company.serviceAreas || {};
    const preferredRoutes = serviceAreas.preferredRoutes || [];
    
    console.log('Şirket bilgileri:', {
      id: company._id,
      email: company.email,
      transportTypes,
      preferredRoutes
    });
    
    // Filtre parametrelerini al
    const status = req.query.status || 'all';
    
    // Filtre oluştur
    let filter = {
      // Kullanıcının daha önce reddettiği talepleri dışla
      $or: [
        { rejected_by: { $exists: false } },
        { rejected_by: { $nin: [userId, company._id.toString()] } }
      ]
    };

    // Durum filtresini uygula
    if (status !== 'all') {
      filter.status = status;
    }
    
    // Şirketin desteklediği taşıma tiplerine göre talepleri filtrele
    const transportTypeFilter = [];
    if (transportTypes.length > 0) {
      transportTypeFilter.push(
        { transportType: { $in: transportTypes } },
        { transportTypeId: { $in: transportTypes.map(type => type.toString()) } },
        { 'vehicle.type': { $in: transportTypes } }
      );
    }
    
    // Şirketin hizmet verdiği güzergahlara göre talepleri filtrele
    const routeFilter = [];
    if (preferredRoutes.length > 0) {
      const routeParts = preferredRoutes.map(route => {
        const [from, to] = route.split('-');
        return { from, to };
      });
      
      routeParts.forEach(({ from, to }) => {
        routeFilter.push({
          $and: [
            { $or: [
              { pickupLocation: { $regex: from, $options: 'i' } },
              { 'pickupAddress.city': { $regex: from, $options: 'i' } }
            ]},
            { $or: [
              { deliveryLocation: { $regex: to, $options: 'i' } },
              { 'deliveryAddress.city': { $regex: to, $options: 'i' } }
            ]}
          ]
        });
      });
    }
    
    // Tüm filtreleri bir araya getir
    if (transportTypeFilter.length > 0 || routeFilter.length > 0) {
      const combinedFilters = [...transportTypeFilter, ...routeFilter];
      if (combinedFilters.length > 0) {
        filter.$and = [
          { $or: combinedFilters }
        ];
      }
    }
    
    console.log('Uygulanan filtre:', JSON.stringify(filter, null, 2));
    
    // Talepleri getir
    let requests = [];
    try {
      requests = await db.collection('requests')
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();
      
      console.log(`${requests.length} talep bulundu.`);
    } catch (error) {
      console.error('Talepler alınırken hata:', error);
      return res.status(500).json({ success: false, message: 'Talepler alınırken bir hata oluştu' });
    }
    
    // Talepleri işle ve kategorize et
    const processedRequests = {
      new: [],
      pending: [],
      accepted: [],
      missed: []
    };
    
    const currentDate = new Date();
    
    requests.forEach(request => {
      // Temel alanları düzenle
      const processedRequest = {
        id: request.id || request._id.toString(),
        title: request.title || 'Taşıma Talebi',
        customer: request.customerName || 'İsimsiz Müşteri',
        from: request.pickupLocation || '',
        to: request.deliveryLocation || '',
        date: request.date || (request.pickupDate ? new Date(request.pickupDate).toISOString().split('T')[0] : ''),
        time: request.time || request.pickupTime || '',
        distance: request.distance || '',
        price: request.price ? `${request.price} ₺` : 'Belirtilmemiş',
        status: request.status || 'new',
        createdAt: request.createdAt || new Date().toISOString()
      };
      
      // Durumuna göre kategorize et
      if (request.carrierId === userId || request.carrierId === company._id.toString()) {
        // Taşıyıcı olarak ben seçilmişsem "accepted" kategorisinde olmalı
        processedRequests.accepted.push(processedRequest);
      } else if (request.status === 'pending' || request.status === 'offer_made') {
        // Teklif bekleyen veya teklif yapılmış talepler
        processedRequests.pending.push(processedRequest);
      } else if (request.status === 'expired' || 
                (request.expiryDate && new Date(request.expiryDate) < currentDate)) {
        // Süresi dolmuş talepler
        processedRequests.missed.push(processedRequest);
      } else {
        // Varsayılan olarak yeni talepler
        processedRequests.new.push(processedRequest);
      }
    });
    
    // Sonuç döndür
    return res.status(200).json({ 
      success: true, 
      requests: processedRequests
    });
    
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 