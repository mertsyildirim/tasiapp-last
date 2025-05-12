import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/auth-options';

export default async function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // OPTIONS isteği kontrolü
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Sadece GET isteklerini kabul et
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
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
        error: 'Veritabanı bağlantısı sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      });
    }

    // Dashboard için istatistik verilerini getir
    try {
      // İstatistik verileri
      const totalUsers = await db.collection('users').countDocuments();
      const customersCount = await db.collection('customers').countDocuments();
      const companiesCount = await db.collection('companies').countDocuments();
      const totalShipments = await db.collection('shipments').countDocuments();
      const pendingShipments = await db.collection('shipments').countDocuments({ status: { $in: ['Yeni', 'Beklemede', 'Pending'] } });
      const completedShipments = await db.collection('shipments').countDocuments({ status: { $in: ['Tamamlandı', 'Completed'] } });
      
      // Son 5 müşteriyi getir
      const recentCustomers = await db.collection('customers')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      // Son 5 taşımayı getir
      const recentShipments = await db.collection('shipments')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      // Son 5 firmayı getir
      const recentCompanies = await db.collection('companies')
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      // Yanıtı formatla
  const dashboardData = {
    stats: {
          users: totalUsers,
          customers: customersCount,
          companies: companiesCount,
          orders: totalShipments,
          pendingOrders: pendingShipments,
          completedOrders: completedShipments
        },
        recentCustomers: recentCustomers.map(customer => ({
          id: customer._id.toString(),
          name: customer.name || customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'İsimsiz Müşteri',
          email: customer.email || '',
          phone: customer.phone || '',
          status: customer.status || 'active',
          createdAt: customer.createdAt || new Date()
        })),
        recentShipments: recentShipments.map(shipment => ({
          id: shipment._id.toString(),
          customerName: shipment.customerName || 'İsimsiz Müşteri',
          pickupLocation: shipment.pickupLocation || shipment.from || 'Belirtilmemiş',
          deliveryLocation: shipment.deliveryLocation || shipment.to || 'Belirtilmemiş',
          status: shipment.status || 'Beklemede',
          price: shipment.price || '0',
          transportType: shipment.transportType || 'Belirtilmemiş',
          createdAt: shipment.createdAt || new Date()
        })),
        recentCompanies: recentCompanies.map(company => ({
          id: company._id.toString(),
          name: company.name || company.companyName || 'İsimsiz Firma',
          email: company.email || '',
          phone: company.phone || '',
          status: company.status || 'active',
          createdAt: company.createdAt || new Date()
        }))
      };
      
      return res.status(200).json({
    success: true,
    data: dashboardData
  });
    } catch (error) {
      console.error('Dashboard veri hatası:', error);
      return res.status(500).json({
        success: false,
        error: 'Dashboard verileri alınırken bir hata oluştu'
      });
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 