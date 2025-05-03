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

async function copyPaidRequestsToShipments() {
  console.log('Paid statüsündeki talepleri shipments koleksiyonuna kopyalama scripti başlatılıyor...');
  
  const client = new MongoClient(MONGODB_URI, options);
  
  try {
    // MongoDB'ye bağlan
    await client.connect();
    console.log('MongoDB\'ye bağlantı başarılı');
    
    const db = client.db(DB_NAME);
    
    // Paid statüsündeki ve shipmentId olmayan talepleri bul
    const paidRequests = await db.collection('requests').find({
      status: 'paid',
      shipmentId: { $exists: false }
    }).toArray();
    
    console.log(`${paidRequests.length} adet kopyalanacak paid statüslü talep bulundu`);
    
    // Her bir talebi işle
    for (const request of paidRequests) {
      try {
        console.log(`${request._id} ID'li talep işleniyor...`);
        
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
          notes: `${request._id} ID'li talepten manuel script ile oluşturuldu`,
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
        console.log(`Shipment oluşturuldu: ${result.insertedId}`);
        
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
        
        console.log(`${request._id} ID'li talep başarıyla işlendi`);
      } catch (error) {
        console.error(`${request._id} ID'li talep işlenirken hata:`, error);
      }
    }
    
    console.log('İşlem tamamlandı!');
  } catch (error) {
    console.error('Script çalışırken hata:', error);
  } finally {
    await client.close();
    console.log('MongoDB bağlantısı kapatıldı');
  }
}

// Scripti çalıştır
copyPaidRequestsToShipments(); 