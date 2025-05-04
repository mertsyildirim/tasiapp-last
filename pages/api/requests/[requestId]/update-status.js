import { ObjectId } from 'mongodb';
import connectToDatabase from '../../../../lib/minimal-mongodb';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { requestId } = req.query;
  const { status } = req.body;

  if (!requestId || !status) {
    return res.status(400).json({ success: false, message: 'Request ID ve status zorunludur' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // ID formatını kontrol et
    const query = ObjectId.isValid(requestId) 
      ? { _id: new ObjectId(requestId) } 
      : { id: requestId };
    
    // Status'ü güncelle
    const result = await db.collection('requests').updateOne(
      query,
      { 
        $set: { 
          status: status,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
    }

    if (result.modifiedCount === 0) {
      return res.status(400).json({ success: false, message: 'Durum güncellenemedi veya zaten aynı durumda' });
    }

    // Güncellenen talebi getir
    const updatedRequest = await db.collection('requests').findOne(query);

    // Eğer talep "paid" durumuna geçtiyse, shipments koleksiyonuna kopyala
    if (status === 'paid') {
      try {
        console.log('Paid status tespit edildi, shipment oluşturuluyor...');
        
        // Talep bilgilerini al
        const shipmentData = {
          ...updatedRequest,
          requestId: updatedRequest._id.toString(),
          status: 'waiting-pickup', // Başlangıç durumu olarak "waiting-pickup" ayarla
          createdAt: new Date(),
          updatedAt: new Date(),
          
          // Talepten alınan bilgilere göre müşteri ve taşıyıcı bilgilerini düzenle
          customer: updatedRequest.customerName || updatedRequest.customer || null,
          customerName: updatedRequest.customerName || null,
          customerPhone: updatedRequest.customerPhone || null,
          
          carrier: updatedRequest.carrier || null,
          carrierId: updatedRequest.carrierId || null,
          carrierName: updatedRequest.carrierName || null,
          
          // Lokasyon bilgileri
          pickupLocation: updatedRequest.pickupLocation || null,
          deliveryLocation: updatedRequest.deliveryLocation || null,
          pickupMarker: updatedRequest.pickupMarker || null,
          deliveryMarker: updatedRequest.deliveryMarker || null,
          distance: updatedRequest.distance || null,
          
          // Durum geçmişi ve izleme bilgilerini ekle
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
          price: updatedRequest.price || 0,
          paymentDate: new Date(),
          paymentStatus: 'completed',
          
          // Sistem tarafından eklenen bilgiler
          notes: `${updatedRequest.id || updatedRequest._id} ID'li talepten oluşturuldu`,
          transportType: updatedRequest.transportType || null,
          transportTypeId: updatedRequest.transportTypeId || null,
          vehicleType: updatedRequest.vehicleType || updatedRequest.vehicle || null,
          
          // Yük bilgileri
          packageInfo: updatedRequest.packageInfo || [],
          packageCount: updatedRequest.packageCount || 1,
          packageWeight: updatedRequest.packageWeight || 0,
          packageVolume: updatedRequest.packageVolume || 0
        };

        // _id alanını kaldır (MongoDB yeni bir _id üretecek)
        delete shipmentData._id;

        // Shipments koleksiyonuna ekle
        const shipmentResult = await db.collection('shipments').insertOne(shipmentData);
        console.log('Shipment oluşturuldu:', shipmentResult.insertedId);

        // Shipment ID'sini request'e ekle
        await db.collection('requests').updateOne(
          query,
          {
            $set: {
              shipmentId: shipmentResult.insertedId,
              shipmentCreatedAt: new Date(),
              shipmentStatus: 'waiting-pickup'
            }
          }
        );

        console.log(`Talep (${requestId}) shipments koleksiyonuna eklendi. Shipment ID: ${shipmentResult.insertedId}`);
      } catch (shipmentError) {
        console.error('Talep shipments koleksiyonuna eklenirken hata:', shipmentError);
        // Ana işlemi bozmamak için hata fırlatmıyoruz, sadece logluyoruz
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Talep durumu başarıyla güncellendi',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Talep durumu güncellenirken hata:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Talep durumu güncellenirken bir hata oluştu',
      error: error.message 
    });
  }
} 