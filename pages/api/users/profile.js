import { MongoClient, ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/customer/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // NextAuth session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // MongoDB bağlantı dizesi
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      return res.status(500).json({ error: 'MONGODB_URI tanımlı değil' });
    }
    
    // Bağlantı oluştur
    const client = new MongoClient(uri);
    
    // Bağlan
    await client.connect();
    
    // Veritabanını seç
    const db = client.db('tasiapp');
    
    if (req.method === 'GET') {
      // Kullanıcı bilgilerini getir
      const user = await db.collection('customers').findOne(
        { _id: new ObjectId(session.user.id) },
        { projection: { password: 0 } } // Şifreyi hariç tut
      );

      // Bağlantıyı kapat
      await client.close();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

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
      
      try {
        // Kullanıcıyı güncellenmeden önce kontrol et
        const userBefore = await db.collection('customers').findOne(
          { _id: new ObjectId(session.user.id) }
        );
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
        
        // Bağlantıyı kapat
        await client.close();
        
        if (result.modifiedCount === 0 && result.matchedCount === 1) {
          // Eşleşme var ama değişiklik yok - veri zaten güncel
          return res.status(200).json({ success: true, message: 'Profil güncel, değişiklik yapılmadı' });
        } else if (result.modifiedCount === 0) {
          return res.status(400).json({ success: false, message: 'Profil güncellenemedi' });
        }
        
        return res.status(200).json({ success: true, message: 'Profil başarıyla güncellendi' });
      } catch (error) {
        console.error('Profil güncelleme hatası:', error);
        await client.close();
        return res.status(500).json({ success: false, message: 'Profil güncellenirken bir hata oluştu' });
      }
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 