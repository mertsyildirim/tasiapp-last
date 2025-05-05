import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
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
    let db;
    try {
      const dbConnection = await connectToDatabase();
      db = dbConnection.db;
      if (!db) {
        throw new Error('Veritabanı bağlantısı kurulamadı');
      }
    } catch (dbError) {
      console.error('Veritabanı bağlantı hatası:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Veritabanı bağlantısı sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      });
    }

    const usersCollection = db.collection('users');

    if (req.method === 'GET') {
      // Kullanıcıyı bul
      const user = await usersCollection.findOne(
        { email: session.user.email },
        { projection: { name: 1, phone: 1, email: 1 } }
      );

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      });
    }

    if (req.method === 'PUT') {
      const { name, email, phone } = req.body;

      if (!name || !email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ad ve e-posta alanları zorunludur' 
        });
      }

      // E-posta benzersizliğini kontrol et
      if (email !== session.user.email) {
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            message: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor' 
          });
        }
      }

      // Kullanıcıyı güncelle
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(session.user.id) },
        {
          $set: {
            name,
            email,
            phone: phone || null,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Kullanıcı bulunamadı' 
        });
      }

      // Güncellenmiş kullanıcı bilgilerini getir
      const updatedUser = await usersCollection.findOne(
        { _id: new ObjectId(session.user.id) },
        { projection: { name: 1, phone: 1, email: 1 } }
      );

      return res.status(200).json({
        success: true,
        user: {
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone
        }
      });
    }

  } catch (error) {
    console.error('Profil işlemi sırasında hata:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası oluştu'
    });
  }
} 