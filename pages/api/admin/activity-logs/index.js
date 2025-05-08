import { connectToDatabase } from '/lib/minimal-mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/admin/[...nextauth].js';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Oturum açmanız gerekiyor' });
  }

  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      
      // Filtreleme parametreleri
      const { 
        startDate, 
        endDate, 
        action, 
        userEmail, 
        ip,
        city,
        district,
        page = 1,
        limit = 20
      } = req.query;

      // Filtre oluşturma
      const filter = {};
      
      if (startDate && endDate) {
        filter.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      if (action) {
        filter.action = action;
      }
      
      if (userEmail) {
        filter['userInfo.email'] = { $regex: userEmail, $options: 'i' };
      }
      
      if (ip) {
        filter.ip = ip;
      }
      
      // Konum filtreleri
      if (city) {
        filter['location.city'] = { $regex: city, $options: 'i' };
      }
      
      if (district) {
        filter['location.district'] = { $regex: district, $options: 'i' };
      }

      console.log('Aktivite log filtreleri:', filter);

      // Toplam kayıt sayısı
      const total = await db.collection('activity_logs').countDocuments(filter);
      
      // Sayfalama
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);

      // Logları getir
      const logs = await db.collection('activity_logs')
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .toArray();
        
      // Log objelerini zenginleştir
      const enhancedLogs = logs.map(log => {
        // Sayfa URL'ini farklı alanlardan elde et
        const pageUrl = 
          log.url || 
          log.route || 
          log.path || 
          (log.details && typeof log.details === 'object' ? log.details.url || log.details.route || log.details.path : '') ||
          (typeof log.details === 'string' && log.details.includes('/') ? log.details : '');
          
        // Sayfayı belirgin şekilde ekleyelim
        let enhancedLog = {
          ...log,
          pageUrl: pageUrl || null
        };
        
        // Konum bilgisi yok ve IP adresi varsa, konum için boş bir nesne oluştur
        // Frontend'de IP'den konum bilgisi alınacak
        if (!log.location && log.ip) {
          enhancedLog.location = {
            city: null,
            district: null,
            country: null
          };
        }
        
        return enhancedLog;
      });

      console.log(`Toplam ${enhancedLogs.length} log kaydı döndürülüyor`);

      return res.status(200).json({
        logs: enhancedLogs,
        total,
        totalPages,
        currentPage: Number(page)
      });
    } catch (error) {
      console.error('Aktivite logları getirilirken hata:', error);
      return res.status(500).json({ message: 'Sunucu hatası', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
} 