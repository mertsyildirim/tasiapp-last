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
    
    // Aktif taşımaları getir
    const shipments = await db.collection('shipments')
      .find({ status: 'active' })
      .sort({ createdAt: -1 })
      .toArray();
    
    return res.status(200).json({
      success: true,
      shipments
    });
  } catch (error) {
    console.error('Aktif taşımalar getirme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
} 