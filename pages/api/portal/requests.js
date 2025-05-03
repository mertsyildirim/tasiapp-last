import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/portal/[...nextauth]';

export default async function handler(req, res) {
  try {
    // Session kontrolü - authOptions ile birlikte çağıralım
    const session = await getServerSession(req, res, authOptions);
    console.log('Oturum bilgisi:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('Oturum bulunamadı');
      return res.status(401).json({ success: false, message: 'Bu işlem için giriş yapmalısınız' });
    }

    // Sadece GET metodunu kabul et
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Metod desteklenmiyor' });
    }

    try {
      // Database bağlantısı yap
      const { db } = await connectToDatabase();
      console.log('MongoDB bağlantısı başarılı');
      
      // Kullanıcı ID'sini session'dan al
      let userId = session.user?.id;
      
      // Headers veya query'den de alabiliriz (yedek yöntem)
      if (!userId) {
        userId = req.headers['x-user-id'] || req.query.userId;
        console.log('Session dışından alınan userId:', userId);
      }
      
      if (!userId) {
        console.log('Session bilgisinde kullanıcı ID bulunamadı');
        return res.status(400).json({ success: false, message: 'Kullanıcı ID bulunamadı' });
      }
      
      console.log('Kullanıcı ID:', userId);

      // Şirket bilgilerini getir
      let company;
      try {
        if (ObjectId.isValid(userId)) {
          company = await db.collection('companies').findOne({ _id: new ObjectId(userId) });
        }
        if (!company) {
          company = await db.collection('companies').findOne({ _id: userId });
        }
      } catch (err) {
        console.error('Şirket bilgileri alınamadı:', err);
      }

      if (!company) {
        return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
      }

      console.log('Şirket bilgileri bulundu:', company.companyName || company.name);

      // Şirketin desteklediği taşıma tipleri
      const supportedTransportTypes = Array.isArray(company.transportTypes) ? company.transportTypes : [];
      // İlk transport tipi (varsa) alınır
      const primaryTransportType = supportedTransportTypes.length > 0 ? supportedTransportTypes[0] : null;
      
      // Şirketin hizmet bölgeleri
      const serviceAreas = company.serviceAreas || { pickup: [], delivery: [] };
      const pickupAreas = serviceAreas.pickup || [];
      const deliveryAreas = serviceAreas.delivery || [];
      
      // Sadece ilk alış ve teslimat bölgesini al (varsa)
      const primaryPickupArea = pickupAreas.length > 0 ? pickupAreas[0] : null;
      const primaryDeliveryArea = deliveryAreas.length > 0 ? deliveryAreas[0] : null;

      console.log('Desteklenen taşıma tipleri:', supportedTransportTypes);
      console.log('Birincil taşıma tipi:', primaryTransportType);
      console.log('Birincil alış bölgesi:', primaryPickupArea ? JSON.stringify(primaryPickupArea) : 'Yok');
      console.log('Birincil teslimat bölgesi:', primaryDeliveryArea ? JSON.stringify(primaryDeliveryArea) : 'Yok');

      // Verilerin doğru şekilde gelip gelmediğini kontrol için komple debug logu
      console.log('DEBUG - Tam şirket bilgisi:', JSON.stringify({
        id: company._id,
        name: company.companyName || company.name,
        transportTypes: supportedTransportTypes,
        primaryTransportType: primaryTransportType,
        pickupAreas: pickupAreas,
        primaryPickupArea: primaryPickupArea,
        deliveryAreas: deliveryAreas,
        primaryDeliveryArea: primaryDeliveryArea
      }, null, 2));

      // Sayfalandırma için parametreleri al
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      // Statü filtresi için parametreyi al
      const status = req.query.status || 'all';
      console.log('İstenen status filtresi:', status);

      // Tüm istekleri getir ve filtrelemeyi uygula
      let requestsCollection = await db.collection('requests').find({}).toArray();
      console.log('Toplam istek sayısı:', requestsCollection.length);

      // Örnek talep verisini inceleyelim
      const sampleRequest = requestsCollection.length > 0 ? requestsCollection[0] : null;
      if (sampleRequest) {
        console.log('ÖRNEK TALEP BİLGİSİ:', JSON.stringify({
          id: sampleRequest._id || sampleRequest.id,
          transportTypeId: sampleRequest.transportTypeId,
          pickupLocation: sampleRequest.pickupLocation,
          deliveryLocation: sampleRequest.deliveryLocation,
          status: sampleRequest.status
        }, null, 2));
      }

      // Hiç veri yoksa hata döndürmek yerine boş dizi dönelim
      if (requestsCollection.length === 0) {
        console.log('Hiç talep bulunamadı');
        return res.status(200).json({
          success: true,
          requests: [],
          pagination: {
            total: 0,
            page: 1,
            limit: limit,
            totalPages: 0
          }
        });
      }

      // Request verilerinin bir örneğini görelim
      console.log('İlk talep örneği:', JSON.stringify(requestsCollection[0], null, 2));
      
      // Debug: Tüm requests kayıtlarının status değerlerini kontrol et
      const statusValues = [...new Set(requestsCollection.map(req => req.status))];
      console.log('Mevcut status değerleri:', statusValues);

      // İlk olarak, temel zorunlu alanları olan kayıtları filtreleyelim
      const validRequests = requestsCollection.filter(request => {
        // Temel kimlik kontrolü - id veya _id alanı olmalı
        const hasValidId = request.id || request._id;
        
        // Taşıma tipi - transportType veya transportTypeId olmalı
        const hasTransportType = request.transportType || request.transportTypeId;
        
        // Konum bilgileri - alış ve teslimat yerleri olmalı
        const hasLocations = request.pickupLocation && request.deliveryLocation;
        
        return hasValidId && hasTransportType && hasLocations;
      });
      
      console.log('Geçerli talep sayısı:', validRequests.length);

      // Filtre 1: Taşıma tipine göre filtrele
      let filteredRequests = validRequests.filter(request => {
        // Taşıma tipi kontrolü - çok basit bir şekilde karşılaştırma yapalım
        const requestTransportTypeId = request.transportTypeId || '';
        
        // Eğer primaryTransportType null ise filtreleme yapma
        if (primaryTransportType === null) {
          console.log(`primaryTransportType null olduğu için talep (${request._id || request.id}) kabul edildi`);
          return true;
        }
        
        // TransportTypeId eşleşmesine bak
        const isMatch = requestTransportTypeId === primaryTransportType;
        
        if (!isMatch) {
          console.log(`TransportTypeId eşleşmedi: Talep (${request._id || request.id}) - ${requestTransportTypeId} vs ${primaryTransportType}`);
        } else {
          console.log(`TransportTypeId eşleşti: Talep (${request._id || request.id}) - ${requestTransportTypeId}`);
        }
        
        return isMatch;
      });

      console.log('Filtreleme yapılmadan talep sayısı:', filteredRequests.length);

      // Durum filtrelemesi
      if (status !== 'all') {
        console.log(`Status filtresi '${status}' ile filtreleme yapılacak`);
        // Request objelerindeki status alanını güvenli bir şekilde kontrol edelim
        filteredRequests = filteredRequests.filter(request => {
          // Request objesinin kendisi ve status alanı tanımlı mı kontrol et
          if (!request || request.status === undefined || request.status === null) {
            return false;
          }
          
          // status değerini string'e dönüştür ve küçük harfle karşılaştır
          const requestStatus = String(request.status).toLowerCase();
          const filterStatus = status.toLowerCase();
          
          // Özel durum: waiting-approve ve taşıyıcının onayladığı approved talepleri göster
          if (filterStatus === 'waiting-approve') {
            // Eğer status waiting-approve ise doğrudan göster
            if (requestStatus === 'waiting-approve') {
              return true;
            }
            
            // Eğer status approved ve ben taşıyıcıysam göster
            if (requestStatus === 'approved') {
              console.log('Approved talep kontrolü, ID:', request._id || request.id);
              console.log('Carrier:', request.carrier, 'CarrierId:', request.carrierId);
              console.log('UserId:', userId);
              
              // Carrier ObjectId veya string olabilir, her iki durumu da kontrol et
              const carrier = request.carrier;
              const carrierId = request.carrierId;
              
              // Carrier alanı ObjectId olabilir, string karşılaştırması için toString() kullan
              const carrierMatch = carrier && (
                (typeof carrier === 'object' && carrier.toString() === userId) ||
                (typeof carrier === 'string' && carrier === userId)
              );
              
              // CarrierId string olmalı
              const carrierIdMatch = carrierId && carrierId === userId;
              
              console.log('Eşleşme sonucu:', carrierMatch || carrierIdMatch);
              
              return carrierMatch || carrierIdMatch;
            }
            
            return false;
          }
          
          // Türkçe-İngilizce karşılaştırması için ek kontrol
          if (filterStatus === 'new') {
            return requestStatus === 'new' || requestStatus === 'yeni';
          } else if (filterStatus === 'accepted') {
            return requestStatus === 'accepted' || requestStatus === 'kabul edildi';
          } else if (filterStatus === 'completed') {
            return requestStatus === 'completed' || requestStatus === 'tamamlandı' || requestStatus === 'tamamlandi';
          } else if (filterStatus === 'expired') {
            return requestStatus === 'expired' || requestStatus === 'süresi geçti' || requestStatus === 'suresi gecti';
          } else if (filterStatus === 'waiting') {
            return requestStatus === 'waiting' || requestStatus === 'beklemede';
          }
          
          // Diğer durumlar için basit karşılaştırma
          return requestStatus === filterStatus;
        });
        console.log('Durum filtresi sonrası istek sayısı:', filteredRequests.length);
      }

      // Sonuçları tarihe göre sırala (en yeni en üstte)
      filteredRequests.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA;
      });

      // Toplam sayfa sayısını hesapla
      const total = filteredRequests.length;
      const totalPages = Math.ceil(total / limit);

      // Sayfalandırma uygula
      const paginatedRequests = filteredRequests.slice(skip, skip + limit);

      // Sonuçları döndür
      return res.status(200).json({
        success: true,
        requests: paginatedRequests,
        pagination: {
          total,
          page,
          limit,
          totalPages
        },
        debug: {
          totalRequestsInDB: requestsCollection.length,
          validRequestsCount: validRequests.length,
          filteredRequestsCount: filteredRequests.length,
          statusValues: statusValues
        }
      });

    } catch (dbError) {
      console.error('Veritabanı işlemleri sırasında hata:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı işlemi sırasında hata oluştu', 
        error: dbError.message 
      });
    }
  } catch (error) {
    console.error('Genel API Hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası', 
      error: error.message 
    });
  }
} 