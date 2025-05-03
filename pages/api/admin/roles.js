import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: 'Oturum açmanız gerekiyor' 
      });
    }
    
    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();
    
    // HTTP metodu kontrolü
    switch (req.method) {
      case 'GET':
        const roles = await db.collection('roles').find({}).toArray();
        return res.status(200).json({ success: true, roles });
        
      default:
        return res.status(405).json({ success: false, message: 'Metod izni yok' });
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
} 