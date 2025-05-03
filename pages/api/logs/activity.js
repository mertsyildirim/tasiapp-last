import { connectToDatabase } from '/lib/minimal-mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/admin/[...nextauth].js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const { action, details, page } = req.body;
    
    // IP adresini al
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Kullanıcı bilgilerini al
    const userInfo = session ? {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role
    } : null;

    // Veritabanına bağlan
    const { db } = await connectToDatabase();
    
    // Log kaydını oluştur
    const logEntry = {
      timestamp: new Date(),
      action,
      details,
      page,
      ip,
      userInfo,
      userAgent: req.headers['user-agent']
    };

    // Logs koleksiyonuna kaydet
    await db.collection('activity_logs').insertOne(logEntry);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Activity log error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 