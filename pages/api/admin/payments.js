import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { connectToDatabase, ensureCollection } from '../../..///lib/minimal-mongodb';
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

    // NOT: Rol kontrolü kaldırıldı - sadece session kontrolü yapıyoruz

    console.log('Payments API isteği alındı');
    
    // MongoDB bağlantısı
    console.log('Veritabanı bağlantısı kuruluyor...');
    
    try {
      // Veritabanı bağlantısı kur
      console.log('connectToDatabase() fonksiyonu çağrılıyor...');
      const connection = await connectToDatabase();
      console.log('connectToDatabase() tamamlandı, dönüş değerleri:', {
        hasConnection: !!connection,
        hasConn: !!connection?.conn,
        hasDb: !!connection?.db,
        keys: Object.keys(connection || {})
      });
      
      // db nesnesini elde etmeye çalış
      const db = connection.db || (connection.conn && connection.conn.db) || 
               (connection.connection && connection.connection.db);
      
      if (!db) {
        console.error('DB nesnesi alınamadı, connection objesi:', JSON.stringify(connection));
        throw new Error('Veritabanı bağlantısı başarısız: DB nesnesi alınamadı');
      }
      
      console.log('DB nesnesi başarıyla alındı');
      
      // Payments koleksiyonunun varlığını kontrol et
      console.log('ensureCollection() fonksiyonu çağrılıyor...');
      try {
        await ensureCollection('payments');
        console.log('ensureCollection() tamamlandı');
      } catch (collectionError) {
        console.error('ensureCollection hatası:', collectionError);
        // ensureCollection hata verirse de devam et
      }
      
      console.log('Veritabanı bağlantısı kuruldu, metod:', req.method);
      
      // HTTP metodu kontrolü
      switch(req.method) {
        case 'GET':
          return await getPayments(req, res, db);
        
        case 'POST':
          return await createPayment(req, res, db);
        
        case 'PUT':
          return await updatePayment(req, res, db);
        
        case 'DELETE':
          return await deletePayment(req, res, db);
        
        default:
          console.log('Desteklenmeyen HTTP metodu:', req.method);
          return res.status(405).json({ success: false, message: 'Metod izni yok' });
      }
    } catch (dbError) {
      console.error('Veritabanı bağlantı hatası:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı bağlantı hatası', 
        error: dbError.message, 
        stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined 
      });
    }
  } catch (error) {
    console.error('Payments API sunucu hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Tüm ödemeleri getir
async function getPayments(req, res, db) {
  try {
    const { 
      type = 'all',
      status,
      search, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    const filter = {};
    
    if (type && type !== 'all') {
      filter.payment_type = type;
    }
    
    if (status) {
      const statusList = Array.isArray(status) ? status : [status];
      if (statusList.length > 0 && statusList[0] !== 'all') {
        const statusMapping = {
          'pending': 'beklemede',
          'completed': 'ödendi'
        };
        
        filter.status = { 
          $in: statusList.map(s => statusMapping[s] || s)
        };
      }
    }
    
    if (search) {
      filter.$or = [
        { payment_id: { $regex: search, $options: 'i' } },
        { request_id: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    const totalCount = await db.collection('payments').countDocuments(filter);
    const payments = await db.collection('payments')
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNumber)
      .toArray();
    
    // İstatistikleri hesapla
    const stats = {
      customer: {
        total: await db.collection('payments').countDocuments({ payment_type: 'customer' }),
        paid: await db.collection('payments').countDocuments({ payment_type: 'customer', status: 'ödendi' }),
        pending: await db.collection('payments').countDocuments({ payment_type: 'customer', status: 'beklemede' }),
        canceled: await db.collection('payments').countDocuments({ payment_type: 'customer', status: 'iptal' })
      },
      carrier: {
        total: await db.collection('payments').countDocuments({ payment_type: 'carrier' }),
        paid: await db.collection('payments').countDocuments({ payment_type: 'carrier', status: 'ödendi' }),
        pending: await db.collection('payments').countDocuments({ payment_type: 'carrier', status: 'beklemede' }),
        waitingDate: await db.collection('payments').countDocuments({ payment_type: 'carrier', status: 'tarih_bekliyor' }),
        canceled: await db.collection('payments').countDocuments({ payment_type: 'carrier', status: 'iptal' })
      }
    };

    return res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          total: totalCount,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(totalCount / limitNumber)
        },
        stats
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

// Ödeme oluştur
async function createPayment(req, res, db) {
  try {
    const { 
      payment_type,
      customer,
      carrier,
      amount,
      status,
      date,
      payment_method,
      request_id
    } = req.body;
    
    // Son ödeme ID'sini al ve yeni ID oluştur
    const lastPayment = await db.collection('payments')
      .findOne({}, { sort: { payment_id: -1 } });
    
    let paymentId;
    if (lastPayment && lastPayment.payment_id) {
      const lastNumber = parseInt(lastPayment.payment_id.split('-')[1]);
      paymentId = `MO-${lastNumber + 1}`;
    } else {
      paymentId = 'MO-1000';
    }

    // Requests koleksiyonundan ilgili talebi al
    let requestData = null;
    if (request_id) {
      requestData = await db.collection('requests').findOne({ _id: new ObjectId(request_id) });
    }
    
    // Yeni ödeme nesnesi oluştur
    const newPayment = {
      payment_id: paymentId,
      payment_type,
      request_id: request_id,
      amount: requestData ? requestData.price : parseFloat(amount),
      status: status === 'pending' ? 'beklemede' : status === 'completed' ? 'ödendi' : status || 'beklemede',
      date: date ? new Date(date) : new Date(),
      payment_method: payment_method || 'havale',
      customerName: requestData ? requestData.customerName : customer?.name,
      company: requestData ? requestData.company : customer?.company,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Ödemeyi veritabanına ekle
    const result = await db.collection('payments').insertOne(newPayment);
    
    if (!result.acknowledged) {
      throw new Error('Ödeme eklenirken bir hata oluştu');
    }
    
    return res.status(201).json({
      success: true,
      message: 'Ödeme başarıyla oluşturuldu',
      data: {
        payment_id: paymentId
      }
    });
  } catch (error) {
    console.error('Ödeme oluşturma hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Ödeme oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
}

// Ödeme güncelle
async function updatePayment(req, res, db) {
  console.log('updatePayment fonksiyonu çağrıldı');
  
  try {
    const { payment_id } = req.query;
    
    if (!payment_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ödeme ID gerekli'
      });
    }
    
    // Güncellenecek özellikler
    const updateFields = {};
    
    // Güncellenebilecek alanlar
    const { status, date, payment_method, amount } = req.body;
    
    if (status) {
      // Requests koleksiyonundaki paymentStatus değerlerini payments koleksiyonundaki status değerlerine dönüştür
      updateFields.status = status === 'pending' ? 'beklemede' : status === 'completed' ? 'ödendi' : status;
    }
    if (date) updateFields.date = new Date(date);
    if (payment_method) updateFields.payment_method = payment_method;
    if (amount) updateFields.amount = parseFloat(amount);
    
    // Güncelleme zamanı
    updateFields.updated_at = new Date();
    
    // Ödemeyi güncelle
    const result = await db.collection('payments').updateOne(
      { payment_id },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Ödeme başarıyla güncellendi',
      data: {
        payment_id,
        updated: result.modifiedCount > 0
      }
    });
  } catch (error) {
    console.error('Ödeme güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Ödeme güncellenirken bir hata oluştu',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Ödeme sil
async function deletePayment(req, res, db) {
  console.log('deletePayment fonksiyonu çağrıldı');
  
  try {
    const { payment_id } = req.query;
    
    if (!payment_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ödeme ID gerekli'
      });
    }
    
    // Ödemeyi sil
    const result = await db.collection('payments').deleteOne({ payment_id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Ödeme başarıyla silindi'
    });
  } catch (error) {
    console.error('Ödeme silme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Ödeme silinirken bir hata oluştu',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// CORS middleware ile sarılmış handler fonksiyonu
export default allowCors(handler); 