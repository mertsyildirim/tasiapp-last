import { MongoClient, ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/customer/auth-options';
import { connectToDatabase } from '../../../lib/minimal-mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log("Profile API - Auth options:", authOptions ? "Yüklendi" : "Yüklenemedi");
  console.log("Profile API - Auth provider:", authOptions?.providers?.[0]?.id || "Bulunamadı");

  try {
    // NextAuth session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    console.log("Profile API - Session data:", session);
    console.log("Profile API - Header bilgileri:", {
      cookie: req.headers.cookie?.substring(0, 50) + "...",
      authorization: req.headers.authorization ? "Var" : "Yok",
      userAgent: req.headers["user-agent"]?.substring(0, 50) + "..."
    });
    
    if (!session) {
      console.log("Profile API - Unauthorized, no session");
      return res.status(401).json({ 
        message: 'Unauthorized', 
        authAvailable: !!authOptions,
        providerAvailable: !!authOptions?.providers?.[0]
      });
    }
    
    if (!session.user || !session.user.id) {
      console.log("Profile API - Invalid session, missing user id");
      return res.status(401).json({ message: 'Invalid session' });
    }
    
    // Kullanıcı bilgilerini log'a kaydet
    console.log("Profile API - User data:", {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name
    });

    try {
      // Veritabanı bağlantısı
      const { db } = await connectToDatabase();
      console.log("Profile API - Database connection successful");
    
      if (req.method === 'GET') {
        // Kullanıcı bilgilerini getir
        let userId;
        try {
          userId = new ObjectId(session.user.id);
        } catch (err) {
          console.error("Profile API - Invalid ObjectId:", session.user.id, err);
          return res.status(400).json({ message: 'Invalid user ID format' });
        }

        console.log("Profile API - Searching for user with ID:", userId);
        
        const user = await db.collection('customers').findOne(
          { _id: userId },
          { projection: { password: 0 } } // Şifreyi hariç tut
        );

        if (!user) {
          console.log("Profile API - User not found:", session.user.id);
          return res.status(404).json({ message: 'User not found' });
        }

        console.log("Profile API - User data retrieved successfully");
        
        // Avatar URL'ini yerel bir değer ile değiştir
        if (user.avatarUrl && user.avatarUrl.includes('ui-avatars.com')) {
          // CSP hatası nedeniyle dışarıdan resim yüklenemiyor, yerel bir avatar kullanıyoruz
          user.avatarUrl = `/images/default-avatar.png`;
        }

        return res.status(200).json(user);
      }
    
      if (req.method === 'PUT') {
        const { 
          firstName, 
          lastName, 
          phone, 
          address, 
          district,
          city,
          companyName, 
          taxOffice, 
          taxNumber, 
          companyAddress,
          companyDistrict,
          companyCity,
          accountType,
          notifications,
          language
        } = req.body;
        
        console.log('Profil güncelleme isteği:', {
          userId: session.user.id,
          data: { 
            firstName, 
            lastName, 
            phone, 
            address, 
            district,
            city,
            companyName, 
            taxOffice, 
            taxNumber, 
            companyAddress,
            companyDistrict,
            companyCity,
            accountType,
            notifications,
            language
          }
        });
        
        // Kullanıcıyı güncellenmeden önce kontrol et
        const userBefore = await db.collection('customers').findOne(
          { _id: new ObjectId(session.user.id) }
        );
        
        if (!userBefore) {
          console.log("Profile API - User not found for update:", session.user.id);
          return res.status(404).json({ 
            success: false, 
            message: 'Kullanıcı bulunamadı' 
          });
        }
        
        console.log('Güncellemeden önceki kullanıcı:', userBefore);
        
        // Kullanıcı bilgilerini güncelle
        const result = await db.collection('customers').updateOne(
          { _id: new ObjectId(session.user.id) },
          { 
            $set: { 
              firstName, 
              lastName, 
              phone, 
              address, 
              district,
              city,
              companyName, 
              taxOffice, 
              taxNumber, 
              companyAddress,
              companyDistrict,
              companyCity,
              accountType,
              notifications,
              language,
              updatedAt: new Date()
            } 
          }
        );
        
        console.log('Profil güncelleme sonucu:', {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount
        });
        
        // Güncelleme sonrası kullanıcıyı kontrol et
        const userAfter = await db.collection('customers').findOne(
          { _id: new ObjectId(session.user.id) }
        );
        console.log('Güncellemeden sonraki kullanıcı:', userAfter);
        
        if (result.modifiedCount === 0 && result.matchedCount === 1) {
          // Eşleşme var ama değişiklik yok - veri zaten güncel
          return res.status(200).json({ success: true, message: 'Profil güncel, değişiklik yapılmadı' });
        } else if (result.modifiedCount === 0) {
          return res.status(400).json({ success: false, message: 'Profil güncellenemedi' });
        }
        
        return res.status(200).json({ success: true, message: 'Profil başarıyla güncellendi' });
      }
    } catch (dbError) {
      console.error('Veritabanı işlemi hatası:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı işlemi sırasında bir hata oluştu', 
        error: dbError.message 
      });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
} 