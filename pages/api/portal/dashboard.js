import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/portal/[...nextauth].js';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

// CORS middleware
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  return await fn(req, res);
};

// Ana işleyici fonksiyonu
async function handler(req, res) {
  try {
    console.log("Dashboard API isteği alındı");
    
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    console.log("Session:", session ? "Mevcut" : "Bulunamadı", session);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
      });
    }

    // Sadece GET isteklerini kabul et
    if (req.method !== 'GET') {
      return res.status(405).json({ 
        success: false, 
        error: 'Method Not Allowed' 
      });
    }

    // MongoDB bağlantısı
    try {
      console.log("MongoDB bağlantısı kuruluyor...");
      const connection = await connectToDatabase();
      const db = connection.db;
      
      if (!db) {
        throw new Error('Veritabanı bağlantısı başarısız: DB nesnesi alınamadı');
      }
      
      // Kullanıcı bilgilerini al
      const userId = session.user.id;
      const userRole = session.user.userType;
      
      console.log("Kullanıcı bilgileri:", { userId, userRole });
      
      // Dashboard istatistiklerini topla
      console.log("Dashboard verileri toplanıyor...");
      const dashboardData = await getDashboardData(db, userId, userRole);
      
      console.log("Dashboard verileri toplandı ve gönderiliyor");
      return res.status(200).json({
        success: true,
        ...dashboardData
      });
      
    } catch (dbError) {
      console.error('Veritabanı bağlantı hatası:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı bağlantı hatası', 
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Dashboard API sunucu hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası', 
      error: error.message
    });
  }
}

// Dashboard verilerini topla
async function getDashboardData(db, userId, userRole) {
  try {
    console.log("getDashboardData fonksiyonu başlatıldı:", { userId, userRole });
    
    // userId string ise ObjectId'ye dönüştür
    let userObjectId;
    try {
      userObjectId = userId ? new ObjectId(userId) : null;
      console.log("User ObjectId oluşturuldu:", userObjectId);
    } catch (error) {
      console.error("ObjectId dönüştürme hatası:", error);
      userObjectId = userId;
    }
    
    // Taşıyıcı şirket ID'si ile ilgili sorgu filtreleri
    // portal/shipments API ile aynı sorgu mantığını kullan
    let shipmentQuery = {
      $or: [
        { carrierId: userId },
        { 'carrier': userId }
      ]
    };

    if (ObjectId.isValid(userId)) {
      shipmentQuery.$or.push({ 'carrier': new ObjectId(userId) });
    }
    
    console.log("Taşıma sorgusu:", JSON.stringify(shipmentQuery));
    
    // Veritabanı sorgularını güvenli şekilde yapan yardımcı fonksiyon
    const safeDbOperation = async (operation, defaultValue) => {
      try {
        return await operation();
      } catch (error) {
        console.error("DB operasyon hatası:", error);
        return defaultValue;
      }
    };
    
    console.log("Ana sorguları yapıyorum...");
    
    // Tüm taşımaları getir
    const allShipments = await safeDbOperation(
      () => db.collection('shipments')
        .find(shipmentQuery)
        .sort({ createdAt: -1 })
        .toArray(),
      []
    );
    
    console.log(`Toplam ${allShipments.length} taşıma bulundu`);
    
    // Debug: Taşıma statülerini kontrol et
    const statusSummary = {};
    allShipments.forEach(shipment => {
      const status = shipment.status || 'undefined';
      statusSummary[status] = (statusSummary[status] || 0) + 1;
    });
    console.log("Taşıma statülerine göre dağılım:", statusSummary);
    
    // 1. İstatistikler için verileri hazırlama
    
    // Tamamlanmış statüler
    const completedStatuses = ['completed', 'delivered'];
    
    // Aktif taşımalar (tamamlananlar hariç)
    const activeShipments = allShipments.filter(
      s => !completedStatuses.includes(s.status)
    );
    
    // Tamamlanan taşımalar
    const completedShipments = allShipments.filter(
      s => completedStatuses.includes(s.status)
    );
    
    console.log(`Aktif taşıma sayısı: ${activeShipments.length}, Tamamlanan taşıma sayısı: ${completedShipments.length}`);
    
    // Benzersiz müşteri sayısı (customerID'lere göre)
    const uniqueCustomers = new Set();
    allShipments.forEach(shipment => {
      if (shipment.customerId) {
        uniqueCustomers.add(shipment.customerId);
      } else if (shipment.customerName) {
        uniqueCustomers.add(shipment.customerName);
      }
    });
    
    // Performans hesabı (tamamlanan / toplam)
    const totalShipments = activeShipments.length + completedShipments.length;
    const performanceRate = totalShipments > 0
      ? (completedShipments.length / totalShipments * 100).toFixed(2)
      : 0;
    
    // Toplam kazanç (tamamlanan taşımalardan)
    const totalRevenue = completedShipments.reduce(
      (sum, shipment) => sum + (shipment.amount || 0), 
      0
    );
    
    // 2. İstatistik sonrası listeleme verilerini hazırla
    
    // Ödemeleri getir
    let payments = await safeDbOperation(
      () => db.collection('payments')
        .find({ carrierId: userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray(),
      []
    );
    
    // Faturaları getir
    let invoices = await safeDbOperation(
      () => db.collection('invoices')
        .find({ carrierId: userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray(),
      []
    );
    
    // Aktif taşımaları hazırla (son 3)
    // createdAt'e göre sırala, en yenileri göster
    const activeShipmentsData = [...activeShipments]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // En yeni en üstte
      })
      .slice(0, 3);
    
    console.log(`Gösterilecek aktif taşıma sayısı: ${activeShipmentsData.length}`);
    if (activeShipmentsData.length > 0) {
      console.log("İlk aktif taşıma örneği:", {
        id: activeShipmentsData[0]._id,
        status: activeShipmentsData[0].status,
        createdAt: activeShipmentsData[0].createdAt
      });
    }
    
    // Son tamamlanan taşımaları hazırla (son 3)
    // completedAt veya updatedAt'e göre sırala, en yenileri göster
    const recentShipmentsData = [...completedShipments]
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt) : (a.updatedAt ? new Date(a.updatedAt) : new Date(0));
        const dateB = b.completedAt ? new Date(b.completedAt) : (b.updatedAt ? new Date(b.updatedAt) : new Date(0));
        return dateB - dateA; // En yeni en üstte
      })
      .slice(0, 3);
    
    console.log(`Gösterilecek tamamlanan taşıma sayısı: ${recentShipmentsData.length}`);
    
    // Bekleyen ödeme verilerini getir
    const pendingPaymentsData = await safeDbOperation(
      () => db.collection('payments')
        .find({ carrierId: userId, status: 'pending' })
        .toArray(),
      []
    );
    
    // Okunmamış bildirimleri getir
    const unreadNotifications = await safeDbOperation(
      () => db.collection('notifications').find({
        $or: [
          { recipientId: userId, read: false },
          { recipientId: userId, isRead: false },
          { recipientType: 'all_carriers', read: false },
          { recipientType: 'all_carriers', isRead: false },
          { recipientType: 'carriers', read: false },
          { recipientType: 'carriers', isRead: false }
        ]
      }).toArray(),
      []
    );
    
    // Bekleyen ödeme tutarını hesapla
    const pendingPaymentsAmount = pendingPaymentsData.reduce(
      (total, payment) => total + (payment.amount || 0), 
      0
    );
    
    console.log("Tüm veriler başarıyla toplandı");
    
    // Sonuç
    return {
      // İstatistikler
      totalShipments: totalShipments,
      activeShipments: activeShipments.length,
      completedShipments: completedShipments.length,
      pendingPayments: pendingPaymentsData.length,
      totalRevenue: totalRevenue,
      formatTotalRevenue: `₺${totalRevenue.toLocaleString('tr-TR')}`,
      uniqueCustomers: uniqueCustomers.size,
      performanceRate: performanceRate,
      
      // Listeler
      activeShipmentsData: activeShipmentsData.map(formatShipment),
      recentShipmentsData: recentShipmentsData.map(formatShipment),
      paymentsData: payments.map(formatPayment),
      invoicesData: invoices.map(formatInvoice),
      
      // Diğer veriler
      notifications: unreadNotifications
    };
    
  } catch (error) {
    console.error('Dashboard verileri toplanırken hata:', error);
    throw new Error('Dashboard verileri toplanırken bir hata oluştu: ' + error.message);
  }
}

// Taşıma verilerini formatla
function formatShipment(shipment) {
  return {
    id: shipment._id?.toString() || shipment.id || '',
    shipmentId: shipment.shipmentId || shipment._id?.toString() || '',
    type: shipment.shipmentType || shipment.type || 'standard',
    pickupAddress: shipment.pickupAddress || 'Belirtilmedi',
    deliveryAddress: shipment.deliveryAddress || 'Belirtilmedi',
    status: shipment.status || 'active',
    createdAt: shipment.createdAt || new Date(),
    completedAt: shipment.completedAt || null,
    driver: shipment.driverName || shipment.driver || 'Atanmadı',
    vehicle: shipment.vehiclePlate || shipment.vehicle || 'Atanmadı',
    amount: shipment.amount || 0,
    customer: {
      name: shipment.customerName || (shipment.customer?.name) || 'Müşteri',
      company: shipment.customerCompany || (shipment.customer?.company) || '',
      phone: shipment.customerPhone || (shipment.customer?.phone) || ''
    },
    originCoords: shipment.originCoords || { lat: 41.0082, lng: 28.9784 }, // Default: Istanbul
    destinationCoords: shipment.destinationCoords || { lat: 39.9334, lng: 32.8597 }, // Default: Ankara
    pickupDate: shipment.pickupDate || shipment.createdAt,
    deliveryDate: shipment.deliveryDate || shipment.completedAt,
    currentLocation: shipment.currentLocation || shipment.originCoords || { lat: 41.0082, lng: 28.9784 },
    paymentStatus: shipment.paymentStatus || 'pending'
  };
}

// Ödeme verilerini formatla
function formatPayment(payment) {
  return {
    id: payment._id?.toString() || payment.id || '',
    amount: payment.amount || 0,
    formattedAmount: `₺${(payment.amount || 0).toLocaleString('tr-TR')}`,
    status: payment.status || 'pending',
    paymentDate: payment.paymentDate || payment.createdAt || new Date(),
    description: payment.description || `Ödeme #${payment._id?.toString() || payment.id || ''}`,
    period: payment.period || formatDatePeriod(payment.createdAt),
    shipmentId: payment.shipmentId || '',
    invoiceId: payment.invoiceId || '',
    totalDeliveries: payment.totalDeliveries || 1
  };
}

// Fatura verilerini formatla
function formatInvoice(invoice) {
  return {
    id: invoice._id?.toString() || invoice.id || '',
    invoiceNo: invoice.invoiceNo || invoice.invoiceNumber || `INV-${invoice._id?.toString()?.substring(0, 8) || ''}`,
    amount: invoice.amount || 0,
    formattedAmount: `₺${(invoice.amount || 0).toLocaleString('tr-TR')}`,
    status: invoice.status || 'pending',
    createdAt: invoice.createdAt || new Date(),
    dueDate: invoice.dueDate || null,
    type: invoice.type || 'standard',
    period: invoice.period || formatDatePeriod(invoice.createdAt),
    totalDeliveries: invoice.totalDeliveries || 1
  };
}

// Dönem formatla (Ocak 2023 gibi)
function formatDatePeriod(date) {
  if (!date) return 'Belirsiz';
  
  const dt = new Date(date);
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  
  return `${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

// CORS middleware ile sarılmış handler fonksiyonu
export default allowCors(handler); 