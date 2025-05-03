import { MongoClient, ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/admin/[...nextauth].js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'tasiapp';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
      });
    }

    // Admin rolü kontrolü
    const userRoles = session.user.roles || [];
    const userRole = session.user.role;
    
    if (!userRoles.includes('admin') && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu işlem için yetkiniz yok' 
      });
    }

    const { id } = req.query;
    const { isActive } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Kullanıcı ID gerekli' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, error: 'isActive boolean olmalı' });
    }

    await client.connect();
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');

    // Kullanıcı durumunu güncelle
    const updateResult = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: isActive, updatedAt: new Date() } }
    );
    
    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    return res.status(200).json({
      success: true,
      message: `Kullanıcı durumu "${isActive ? 'active' : 'inactive'}" olarak güncellendi`
    });
    
  } catch (error) {
    console.error('Kullanıcı durumu güncelleme hatası:', error);
    return res.status(500).json({ error: 'Sunucu hatası', details: error.message });
  }
} 