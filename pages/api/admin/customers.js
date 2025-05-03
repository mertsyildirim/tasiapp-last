import { connectToDatabase } from '../../..///lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

export default async function handler(req, res) {
  let conn = null;
  
  try {
    // API isteği bilgilerini kaydet
    console.log('---------------------------------------------');
    console.log(`API isteği alındı: ${req.method} ${req.url}`);
    console.log('Query parametreleri:', req.query);
    
    // Oturum kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      console.log('Oturum bulunamadı');
      return res.status(401).json({ 
        success: false, 
        message: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
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
        message: 'Veritabanı bağlantısı sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      });
    }
    
    // GET metodu - Müşterileri getir
    if (req.method === 'GET') {
      console.log('GET isteği işleniyor, query:', req.query);
      const { status, search } = req.query;
      
      // Filtreleme koşulları
      let query = {};
      
      if (status) {
        if (status === 'active') {
          query.status = 'Aktif';
        } else if (status === 'passive') {
          query.status = 'Pasif';
        }
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Müşterileri getir
      try {
        const customers = await db.collection('customers').find(query).toArray();
        console.log(`${customers.length} müşteri bulundu`);
      
        // Her müşteri için sipariş sayısını hesapla
        console.log('Müşteri sipariş bilgileri hesaplanıyor...');
        const customersWithOrders = await Promise.all(customers.map(async customer => {
          try {
            // Müşterinin siparişlerini say
            const orderCount = await db.collection('orders').countDocuments({ 
              customerId: customer._id.toString() 
            });
            
            // Son siparişi bul
            const lastOrder = await db.collection('orders')
              .find({ customerId: customer._id.toString() })
              .sort({ createdAt: -1 })
              .limit(1)
              .toArray();
            
            return {
              id: customer._id.toString(),
              firstName: customer.firstName || '',
              lastName: customer.lastName || '',
              name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name || '',
              company: customer.company || '',
              phone: customer.phone || '',
              email: customer.email || '',
              address: customer.address || '',
              taxNumber: customer.taxNumber || '',
              status: customer.status || 'Aktif',
              joinDate: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('tr-TR') : '',
              notes: customer.notes || '',
              orders: orderCount,
              lastOrder: lastOrder.length > 0 ? new Date(lastOrder[0].createdAt).toLocaleDateString('tr-TR') : '-',
              accountType: customer.accountType || 'individual',
              companyName: customer.companyName || '',
              taxOffice: customer.taxOffice || '',
              companyAddress: customer.companyAddress || '',
              companyDistrict: customer.companyDistrict || '',
              companyCity: customer.companyCity || ''
            };
          } catch (err) {
            console.error(`Müşteri ID ${customer._id} için sipariş bilgisi alınırken hata:`, err);
            // Hata durumunda varsayılan değerlerle devam et
            return {
              id: customer._id.toString(),
              firstName: customer.firstName || '',
              lastName: customer.lastName || '',
              name: customer.name || '',
              company: customer.company || '',
              phone: customer.phone || '',
              email: customer.email || '',
              address: customer.address || '',
              taxNumber: customer.taxNumber || '',
              status: customer.status || 'Aktif',
              joinDate: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('tr-TR') : '',
              notes: customer.notes || '',
              orders: 0,
              lastOrder: '-',
              accountType: 'individual',
              companyName: '',
              taxOffice: '',
              companyAddress: '',
              companyDistrict: '',
              companyCity: ''
            };
          }
        }));
        
        console.log('Müşteri verileri başarıyla hazırlandı, yanıt gönderiliyor');
        return res.status(200).json({
          success: true,
          customers: customersWithOrders
        });
      } catch (err) {
        console.error('Müşteri verileri alınırken hata:', err);
        return res.status(500).json({
          success: false,
          message: 'Müşteri verileri alınırken bir hata oluştu',
          error: err.message
        });
      }
    }
    
    // POST metodu - Yeni müşteri ekle
    if (req.method === 'POST') {
      const customerData = req.body;
      
      // Zorunlu alanlar kontrolü
      if (!customerData.name || !customerData.phone || !customerData.email) {
        return res.status(400).json({
          success: false,
          message: 'Ad, telefon ve e-posta alanları zorunludur.'
        });
      }
      
      // Yeni müşteri oluştur
      const newCustomer = {
        name: customerData.name,
        company: customerData.company || '',
        phone: customerData.phone,
        email: customerData.email,
        address: customerData.address || '',
        taxNumber: customerData.taxNumber || '',
        status: customerData.status || 'Aktif',
        notes: customerData.notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Veritabanına ekle
      const result = await db.collection('customers').insertOne(newCustomer);
      
      if (result.acknowledged) {
        return res.status(201).json({
          success: true,
          message: 'Müşteri başarıyla eklendi.',
          customer: {
            _id: result.insertedId,
            ...newCustomer
          }
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Müşteri eklenirken bir hata oluştu.'
        });
      }
    }
    
    // PUT metodu - Müşteri güncelle
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Müşteri ID\'si gereklidir.'
        });
      }
      
      // Güncelleme verilerini hazırla
      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };
      
      const result = await db.collection('customers').updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      
      if (result.matchedCount > 0) {
        return res.status(200).json({
          success: true,
          message: 'Müşteri başarıyla güncellendi.'
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Müşteri bulunamadı.'
        });
      }
    }
    
    // DELETE metodu - Müşteri sil
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Müşteri ID\'si gereklidir.'
        });
      }
      
      const result = await db.collection('customers').deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount > 0) {
        return res.status(200).json({
          success: true,
          message: 'Müşteri başarıyla silindi.'
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Müşteri bulunamadı.'
        });
      }
    }
    
    // Desteklenmeyen metot
    return res.status(405).json({
      success: false,
      message: 'Metot izin verilmiyor'
    });
  } catch (error) {
    console.error('API Hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 