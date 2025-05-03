import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  // Sadece GET isteklerini kabul et
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Sadece GET istekleri kabul edilir' });
  }

  try {
    // Oturum kontrolü
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ success: false, message: 'Yetkisiz erişim' });
    }

    // Veritabanına bağlan
    const { db } = await connectToDatabase();

    // Sayfalama parametreleri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtreleme parametreleri
    const status = req.query.status;
    
    // Sorgu oluştur
    const query = { userId: session.user.id };
    
    // Durum filtresi ekle (isteğe bağlı)
    if (status) {
      query.status = status;
    }

    // Toplam fatura sayısını bul
    const total = await db.collection('invoices').countDocuments(query);
    
    // Faturaları getir
    const invoices = await db
      .collection('invoices')
      .find(query)
      .sort({ createdAt: -1 }) // En yeni faturalar önce
      .skip(skip)
      .limit(limit)
      .toArray();

    // Toplam sayfa sayısı
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error('Fatura listesi alınırken hata:', error);
    return res.status(500).json({
      success: false,
      message: 'Faturalar alınırken bir hata oluştu',
      error: error.message
    });
  }
} 