import { connectToDatabase } from '../../..///lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

// Statü güncelleme fonksiyonu
async function updateRequestStatus(db, requestId, status, additionalData = {}) {
  try {
    const updateData = {
      status,
      updatedAt: new Date(),
      ...additionalData
    };

    const result = await db.collection('requests').updateOne(
      { id: requestId },
      { $set: updateData }
    );

    return result.modifiedCount === 1;
  } catch (error) {
    console.error('Statü güncellenirken hata:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
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
    
    // GET metodu - Talepleri getir
    if (req.method === 'GET') {
      const { status, search, page = 1, limit = 10 } = req.query;
      
      // Filtreleme koşulları
      let query = {};
      
      if (status) {
        if (status === 'new') {
          query.status = 'Yeni';
        } else if (status === 'searching') {
          query.status = 'Taşıyıcı Aranıyor';
        } else if (status === 'awaiting') {
          query.status = 'Taşıyıcı Onayı Bekleniyor';
        } else if (status === 'rejected') {
          query.status = 'Taşıyıcı Onay Olmadı';
        } else if (status === 'canceled') {
          query.status = 'İptal Edildi';
        } else if (status === 'payment') {
          query.status = 'Ödeme Bekleniyor';
        } else if (status === 'sms') {
          query.status = 'İndirim SMS Gönderildi';
        }
      }
      
      if (search) {
        query.$or = [
          { customerName: { $regex: search, $options: 'i' } },
          { id: { $regex: search, $options: 'i' } },
          { pickupLocation: { $regex: search, $options: 'i' } },
          { deliveryLocation: { $regex: search, $options: 'i' } }
        ];
      }
      
      try {
        // Sayfalama için hesaplamalar
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        
        // Toplam talep sayısını getir
        const totalRequests = await db.collection('requests').countDocuments(query);
        
        // Talepleri getir
        const requests = await db.collection('requests')
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .toArray();
        
        // Talepler için ek veri işlemleri
        const enrichedRequests = await Promise.all(requests.map(async request => {
          let carrier = null;
          
          if (request.carrierId) {
            try {
              carrier = await db.collection('carriers').findOne({
                _id: new ObjectId(request.carrierId)
              });
            } catch (err) {
              console.error(`Taşıyıcı bilgileri alınırken hata: ${err.message}`);
            }
          }
          
          return {
            id: request.id || request._id.toString(),
            customerName: request.customerName || '',
            customerPhone: request.customerPhone || '',
            pickupLocation: request.pickupLocation || '',
            deliveryLocation: request.deliveryLocation || '',
            distance: request.distance || '',
            vehicle: request.vehicle || '',
            status: request.status || 'Yeni',
            date: request.date || (request.createdAt ? new Date(request.createdAt).toLocaleDateString('tr-TR') : ''),
            time: request.time || (request.createdAt ? new Date(request.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''),
            price: request.price || '',
            description: request.description || '',
            carrierId: request.carrierId || null,
            carrier: carrier ? carrier.name : (request.carrier || null),
            payment: request.payment || null
          };
        }));
        
        return res.status(200).json({
          success: true,
          requests: enrichedRequests,
          pagination: {
            total: totalRequests,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalRequests / limitNum)
          }
        });
      } catch (err) {
        console.error('Talep verileri alınırken hata:', err);
        return res.status(500).json({
          success: false,
          message: 'Talep verileri alınırken bir hata oluştu',
          error: err.message
        });
      }
    }
    
    // PATCH metodu - Talep güncelleme
    if (req.method === 'PATCH') {
      const { requestId, modalType, price, updateData = {} } = req.body;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          message: 'Talep ID zorunludur.'
        });
      }

      try {
        let status = '';
        let additionalData = { ...updateData };

        // Modal tipine göre güncelleme
        if (modalType) {
          switch (modalType) {
            case 'payment':
              status = 'Randevu Oluşturuldu';
              additionalData.paymentStatus = 'completed';
              break;

            case 'paymentSuccess':
              status = 'Randevu Oluşturuldu';
              additionalData.paymentStatus = 'completed';
              additionalData.paymentDate = new Date();
              break;

            case 'waitingApproval':
              status = 'Taşıyıcı Onayı Bekleniyor';
              break;

            case 'carrierDetails':
              status = 'Ödeme Bekleniyor';
              break;

            case 'transportSummary':
              if (price) {
                status = 'Fiyat Belirlendi';
                additionalData.price = price;
              }
              break;
          }

          if (status) {
            additionalData.status = status;
          }
        }

        // Güncelleme tarihini ekle
        additionalData.updatedAt = new Date();

        console.log('Güncellenecek talep ID:', requestId);
        console.log('Güncellenecek veriler:', additionalData);

        const result = await db.collection('requests').updateOne(
          { id: requestId },
          { $set: additionalData }
        );

        console.log('Güncelleme sonucu:', result);

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            message: 'Talep bulunamadı'
          });
        }

        if (result.modifiedCount === 0) {
          return res.status(400).json({
            success: false,
            message: 'Güncelleme yapılmadı'
          });
        }

        // Güncellenmiş talebi getir
        const updatedRequest = await db.collection('requests').findOne({ id: requestId });

        return res.status(200).json({
          success: true,
          message: 'Talep başarıyla güncellendi',
          request: updatedRequest
        });

      } catch (error) {
        console.error('Talep güncellenirken hata:', error);
        return res.status(500).json({
          success: false,
          message: 'Talep güncellenirken bir hata oluştu',
          error: error.message
        });
      }
    }
    
    // POST metodu - Yeni talep ekle
    if (req.method === 'POST') {
      const requestData = req.body;
      
      console.log('Gelen request data:', requestData);
      
      // Zorunlu alanlar kontrolü
      if (!requestData.customerPhone || !requestData.pickupLocation || !requestData.deliveryLocation) {
        return res.status(400).json({
          success: false,
          message: 'Telefon, alım ve teslimat lokasyonları zorunludur.'
        });
      }
      
      try {
        console.log('Veritabanı bağlantısı kontrol ediliyor...');
        console.log('Kullanılan veritabanı:', db.databaseName);
        
        // Müşteri bilgilerini al
        console.log('Müşteri aranıyor:', requestData.customerPhone);
        const customer = await db.collection('customers').findOne({
          phone: requestData.customerPhone
        });
        console.log('Bulunan müşteri:', customer);

        if (!customer) {
          return res.status(404).json({
            success: false,
            message: 'Müşteri bulunamadı.'
          });
        }

        // Müşteri adını oluştur
        const customerFullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();

        // Talep ID oluştur
        console.log('Son talep ID\'si aranıyor...');
        const lastRequest = await db.collection('requests')
          .find()
          .sort({ _id: -1 })
          .limit(1)
          .toArray();
        console.log('Son talep:', lastRequest);
        
        let requestNumber = 1000;
        if (lastRequest.length > 0 && lastRequest[0].id) {
          const lastIdNumber = parseInt(lastRequest[0].id.split('-')[1]);
          if (!isNaN(lastIdNumber)) {
            requestNumber = lastIdNumber + 1;
          }
        }
        
        const requestId = `TL-${requestNumber}`;
        console.log('Yeni talep ID:', requestId);
        
        // Yeni talep oluştur
        const newRequest = {
          // Temel Bilgiler
          id: requestId,
          status: requestData.status || 'new',
          createdAt: new Date(),
          updatedAt: new Date(),

          // Müşteri Bilgileri
          customerId: customer._id,
          customerName: customerFullName,
          customerPhone: customer.phone,

          // Lokasyon Bilgileri
          pickupLocation: requestData.pickupLocation,
          deliveryLocation: requestData.deliveryLocation,
          pickupMarker: requestData.pickupMarker || null,
          deliveryMarker: requestData.deliveryMarker || null,
          distance: requestData.distance || 0,

          // Taşıma Tipi Bilgileri - Portal tarafında aranması için
          transportType: requestData.transportType || '',
          transportTypeId: requestData.transportTypeId || '',
          transportTypes: requestData.transportTypes || [],
          vehicle: requestData.vehicle || '',

          // Taşıma Detayları - Eski format için uyumluluk 
          selectedService: {
            id: requestData.transportTypeId || '',
            name: requestData.transportType || '',
            vehicleType: requestData.vehicle || '',
          },
          loadingDateTime: `${requestData.selectedDate || ''}T${requestData.selectedTime || ''}:00`,
          selectedDate: requestData.selectedDate || '',
          selectedTime: requestData.selectedTime || '',

          // Paket/İçerik Bilgileri
          packageInfo: requestData.packageInfo || [],
          packageImages: requestData.packageImages || [],
          packageCount: requestData.packageCount || 1,
          packageWeight: requestData.packageWeight || 0,
          packageVolume: requestData.packageVolume || 0,
          
          // İçerik Detayları
          contentDetails: {
            weight: requestData.contentDetails?.weight || 0,
            volume: requestData.contentDetails?.volume || 0,
            pieces: requestData.contentDetails?.pieces || 0,
            description: requestData.contentDetails?.description || '',
            specialNotes: requestData.contentDetails?.specialNotes || ''
          },

          // Taşıyıcı Bilgileri
          carrier: requestData.carrier || null,
          carrierId: requestData.carrierId || null,

          // Ödeme Bilgileri
          paymentStatus: 'pending',
          price: 0, // Başlangıçta 0, transportSummary modalında güncellenecek
          paymentDate: null,

          // Durum Bilgileri
          currentStep: 1,
          isApproved: false,
          isCompleted: false,

          // Sistem Bilgileri
          lastUpdatedBy: requestData.lastUpdatedBy || null,
          notes: requestData.notes || '',
          tags: requestData.tags || []
        };
        
        console.log('Kaydedilecek talep:', newRequest);
        console.log('Kullanılan koleksiyon:', 'requests');
        
        const result = await db.collection('requests').insertOne(newRequest);
        console.log('Kayıt sonucu:', result);
        
        if (result.acknowledged) {
          console.log('Talep başarıyla kaydedildi. ID:', result.insertedId);
          return res.status(201).json({
            success: true,
            message: 'Talep başarıyla oluşturuldu',
            request: {
              ...newRequest,
              _id: result.insertedId
            }
          });
        } else {
          console.error('Talep kaydedilemedi:', result);
          return res.status(500).json({
            success: false,
            message: 'Talep eklenirken bir hata oluştu'
          });
        }
      } catch (err) {
        console.error('Talep oluşturulurken hata:', err);
        return res.status(500).json({
          success: false,
          message: 'Talep oluşturulurken bir hata oluştu',
          error: err.message
        });
      }
    }
    
    // Desteklenmeyen HTTP metodu
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });
    
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 