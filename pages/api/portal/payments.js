import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/portal/[...nextauth].js';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

// CORS middleware
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
      });
    }

    // MongoDB bağlantısı
    try {
      const connection = await connectToDatabase();
      const db = connection.db;
      
      if (!db) {
        throw new Error('Veritabanı bağlantısı başarısız: DB nesnesi alınamadı');
      }
      
      // HTTP metodu kontrolü
      switch(req.method) {
        case 'GET':
          return await getPayments(req, res, db, session);
        default:
          return res.status(405).json({ success: false, message: 'Metod izni yok' });
      }
    } catch (dbError) {
      console.error('Veritabanı bağlantı hatası:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı bağlantı hatası', 
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Payments API sunucu hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası', 
      error: error.message
    });
  }
}

// Kullanıcıya ait ödemeleri getir
async function getPayments(req, res, db, session) {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Kullanıcı ID'sini al
    const userId = session.user.id;
    
    // Filtre oluştur
    const filter = {};
    
    // Kullanıcının tipine göre filtre ekle
    if (session.user.userType === 'customer') {
      filter.customer_id = userId;
      filter.payment_type = 'customer';
    } else if (session.user.userType === 'company') {
      filter.carrier_id = userId;
      filter.payment_type = 'carrier';
    }
    
    // Durum filtresi
    if (status && status !== 'all') {
      // Status mapping
      const statusMapping = {
        'completed': 'ödendi',
        'pending': 'beklemede',
        'processing': 'işleniyor',
        'waitingDate': 'tarih_bekliyor',
        'rejected': 'iptal'
      };
      
      filter.status = statusMapping[status] || status;
    }
    
    // Arama filtresi
    if (search) {
      filter.$or = [
        { payment_id: { $regex: search, $options: 'i' } },
        { request_id: { $regex: search, $options: 'i' } },
        { shipment_details: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Toplam sayıyı hesapla
    const totalCount = await db.collection('payments').countDocuments(filter);
    
    // Ödemeleri getir
    const payments = await db.collection('payments')
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNumber)
      .toArray();
    
    // Format payments for frontend
    const formattedPayments = payments.map(payment => {
      // Status mapping for UI
      const statusMapping = {
        'ödendi': 'completed',
        'beklemede': 'pending',
        'işleniyor': 'processing',
        'tarih_bekliyor': 'processing',
        'iptal': 'rejected'
      };
      
      return {
        id: payment.payment_id,
        amount: payment.amount,
        currency: 'TRY',
        status: statusMapping[payment.status] || 'pending',
        paymentDate: payment.date,
        dueDate: payment.due_date,
        shipmentId: payment.request_id,
        shipmentDetails: payment.shipment_details || `${payment.from_city} - ${payment.to_city} Taşıma`,
        method: payment.payment_method === 'havale' ? 'Banka Transferi' : payment.payment_method,
        bankDetails: payment.bank_details || 'İş Bankası TR12 0000 0000 0000 0000 0000 00',
        createdAt: payment.created_at,
        notes: payment.notes
      };
    });
    
    return res.status(200).json({
      success: true,
      data: {
        payments: formattedPayments,
        pagination: {
          total: totalCount,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(totalCount / limitNumber)
        }
      }
    });
  } catch (error) {
    console.error('Ödeme getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Ödemeler getirilirken bir hata oluştu',
      error: error.message
    });
  }
}

// CORS middleware ile sarılmış handler fonksiyonu
export default allowCors(handler); 