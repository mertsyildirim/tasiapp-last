import { getSession } from 'next-auth/react';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../../../lib/minimal-mongodb';

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
  // Sadece GET isteklerine izin ver
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Oturum kontrolü
  let session = await getSession({ req });
  
  if (!session) {
    console.log('Oturumsuz erişim - boş dashboard verileri dönülüyor');
    // 401 yerine boş veri dön
    return res.status(200).json({ 
      success: true, 
      name: 'Ziyaretçi',
      todayEarnings: 0,
      weekEarnings: 0,
      monthEarnings: 0,
      totalEarnings: 0,
      monthlyEarnings: [],
      activeTasksCount: 0,
      completedTasksCount: 0,
      upcomingTasksCount: 0,
      totalTasksCount: 0,
      completionRate: 0,
      rating: 0,
      customerSatisfaction: 0,
      responseTime: 0,
      recentTasks: [],
      pendingPayments: [],
      documentsToRenew: [],
      newRequests: [],
      newRequestsCount: 0
    });
  }

  try {
    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();
    
    // Kullanıcı bilgilerini al
    const userId = session.user.id;
    
    // Burada veri çekme işlemleri...
    
  } catch (error) {
    console.error('Dashboard verisi alınırken hata:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
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