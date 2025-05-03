import { connectToDatabase } from '/lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

export default async function handler(req, res) {
  // Yalnızca GET isteklerine izin ver
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
      });
    }

    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();
    
    // Son ödemeleri getir
    const payments = await db.collection('payments')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    return res.status(200).json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Son ödemeler getirme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
} 