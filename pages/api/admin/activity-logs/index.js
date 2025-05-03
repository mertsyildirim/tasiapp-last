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
        filter['userInfo.email'] = userEmail;
      }
      
      if (ip) {
        filter.ip = ip;
      }

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

      return res.status(200).json({
        logs,
        total,
        totalPages,
        currentPage: Number(page)
      });
    } catch (error) {
      console.error('Aktivite logları getirilirken hata:', error);
      return res.status(500).json({ message: 'Sunucu hatası' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
} 