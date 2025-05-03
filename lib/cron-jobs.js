// Bu modül sadece sunucu tarafında çalışacak
// İstemci tarafında hata oluşmasını önlemek için kontrol ekliyoruz
const isServer = typeof window === 'undefined';

// İstemci tarafında import yapmayacak, sadece boş fonksiyonlar döndürecek
if (!isServer) {
  module.exports = {
    copyPaidRequestsToShipments: async () => ({}),
    startCronJobs: () => {},
    stopCronJobs: () => {}
  };
} else {
  // Sunucu tarafında çalışacak kodlar
  const { MongoClient, ObjectId } = require('mongodb');

  // MongoDB bağlantı bilgileri
  const MONGODB_URI = "mongodb+srv://tasi_app:Tasiapp@cluster0.ttipxu5.mongodb.net/tasiapp?retryWrites=true&w=majority";
  const DB_NAME = "tasiapp";

  // Bağlantı seçenekleri
  const options = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
  };

  /**
   * Paid statüsündeki talepleri shipments koleksiyonuna kopyalar
   */
  async function copyPaidRequestsToShipments() {
    console.log('[CRON] Paid statüsündeki talepler kontrol ediliyor...');
    
    const client = new MongoClient(MONGODB_URI, options);
    
    try {
      // MongoDB'ye bağlan
      await client.connect();
      
      const db = client.db(DB_NAME);
      
      // Paid statüsündeki ve shipmentId olmayan talepleri bul
      const paidRequests = await db.collection('requests').find({
        status: 'paid',
        shipmentId: { $exists: false }
      }).toArray();
      
      if (paidRequests.length === 0) {
        console.log('[CRON] Kopyalanacak yeni talep bulunamadı');
        return { success: true, processed: 0 };
      }
      
      console.log(`[CRON] ${paidRequests.length} adet kopyalanacak paid statüslü talep bulundu`);
      
      // Her bir talebi işle
      for (const request of paidRequests) {
        try {
          console.log(`[CRON] ${request._id} ID'li talep işleniyor...`);
          
          // Shipment verisini oluştur
          const shipmentData = {
            requestId: request._id.toString(),
            status: 'waiting-pickup',
            createdAt: new Date(),
            updatedAt: new Date(),
            
            // Müşteri ve taşıyıcı bilgileri
            customer: request.customerName || request.customer || null,
            customerName: request.customerName || null,
            customerPhone: request.customerPhone || null,
            
            carrier: request.carrier || null,
            carrierId: request.carrierId || null,
            carrierName: request.carrierName || null,
            
            // Lokasyon bilgileri
            pickupLocation: request.pickupLocation || null,
            deliveryLocation: request.deliveryLocation || null,
            pickupMarker: request.pickupMarker || null,
            deliveryMarker: request.deliveryMarker || null,
            distance: request.distance || null,
            
            // Durum geçmişi ve izleme bilgileri
            statusHistory: [
              {
                status: 'waiting-pickup',
                timestamp: new Date(),
                description: 'Ödeme tamamlandı, alım için bekleniyor',
                updatedBy: 'system'
              }
            ],
            
            trackingEvents: [
              {
                status: 'created',
                timestamp: new Date(),
                description: 'Taşıma kaydı oluşturuldu',
                location: 'System'
              }
            ],
            
            // Ödeme bilgileri
            price: request.price || 0,
            paymentDate: new Date(),
            paymentStatus: 'completed',
            
            // Sistem bilgileri
            notes: `${request._id} ID'li talepten otomatik olarak oluşturuldu`,
            transportType: request.transportType || null,
            transportTypeId: request.transportTypeId || null,
            vehicleType: request.vehicleType || request.vehicle || null,
            
            // Yük bilgileri
            packageInfo: request.packageInfo || [],
            packageCount: request.packageCount || 1,
            packageWeight: request.packageWeight || 0,
            packageVolume: request.packageVolume || 0
          };
          
          // Request'in diğer tüm alanlarını kopyala
          for (const [key, value] of Object.entries(request)) {
            // Özel olarak ayarladığımız alanları veya _id'yi atla
            if (!['_id', 'status', 'createdAt', 'updatedAt'].includes(key) && shipmentData[key] === undefined) {
              shipmentData[key] = value;
            }
          }
          
          // Shipments koleksiyonuna ekle
          const result = await db.collection('shipments').insertOne(shipmentData);
          
          // Request'e shipmentId ekle
          await db.collection('requests').updateOne(
            { _id: request._id },
            {
              $set: {
                shipmentId: result.insertedId,
                shipmentCreatedAt: new Date(),
                shipmentStatus: 'waiting-pickup'
              }
            }
          );
          
          console.log(`[CRON] ${request._id} ID'li talep başarıyla işlendi`);
        } catch (error) {
          console.error(`[CRON] ${request._id} ID'li talep işlenirken hata:`, error);
        }
      }
      
      console.log('[CRON] İşlem tamamlandı!');
      return { success: true, processed: paidRequests.length };
    } catch (error) {
      console.error('[CRON] Script çalışırken hata:', error);
      return { success: false, error: error.message };
    } finally {
      await client.close();
    }
  }

  /**
   * Düzenli aralıklarla çalışacak cron jobları başlatır
   */
  let cronJobs = {
    copyPaidRequests: null
  };

  function startCronJobs() {
    // Daha önce başlatılmış işi durdur
    stopCronJobs();
    
    console.log('Otomatik görevler başlatılıyor...');
    
    // Her 5 dakikada bir paid status kontrolü yap
    cronJobs.copyPaidRequests = setInterval(async () => {
      try {
        const result = await copyPaidRequestsToShipments();
        if (result.processed > 0) {
          console.log(`[CRON] ${result.processed} adet talep shipments koleksiyonuna kopyalandı`);
        }
      } catch (error) {
        console.error('[CRON] Hata:', error);
      }
    }, 5 * 60 * 1000); // 5 dakika
    
    console.log('Otomatik görevler başlatıldı! Her 5 dakikada bir çalışacak.');
  }

  function stopCronJobs() {
    if (cronJobs.copyPaidRequests) {
      clearInterval(cronJobs.copyPaidRequests);
      cronJobs.copyPaidRequests = null;
      console.log('Otomatik görevler durduruldu.');
    }
  }

  // Fonksiyonları dışa aktar
  module.exports = {
    copyPaidRequestsToShipments,
    startCronJobs,
    stopCronJobs
  };
} 