import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { connectToDatabase } from '../../../lib/minimal-mongodb';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
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
    
    // NOT: Rol kontrolü kaldırıldı - sadece session kontrolü yapıyoruz

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

    // Güncellenecek alanları kontrol et
    const { name, email, phone, company } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Ad ve e-posta alanları zorunludur' });
    }

    // E-posta benzersizliğini kontrol et
    if (email !== session.user.email) {
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor' });
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
          company: company || null,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    // Güncellenmiş kullanıcı bilgilerini getir
    const updatedUser = await usersCollection.findOne({ _id: new ObjectId(session.user.id) });
    
    // Hassas bilgileri temizle
    const sanitizedUser = {
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      company: updatedUser.company,
      roles: updatedUser.roles,
      role: updatedUser.role
    };

    return res.status(200).json({
      success: true,
      user: sanitizedUser
    });

  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası oluştu'
    });
  }
} 