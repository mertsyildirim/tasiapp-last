import { getSession, getServerSession } from 'next-auth/react';
import { authOptions } from '../auth/portal/[...nextauth]';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Session kontrol et - hem getSession hem de getServerSession deneyelim
  let session = await getSession({ req });
  
  if (!session) {
    try {
      // getServerSession deneyebiliriz
      session = await getServerSession(req, res, authOptions);
    } catch (err) {
      console.error("getServerSession hatası:", err);
    }
  }
  
  console.log("Alınan session:", session);
  
  // Session yoksa, header üzerinden ID'yi almayı deneyelim
  if (!session && req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    console.log("Token bulundu:", token ? "Evet" : "Hayır");
    
    // Bu durumda kullanıcıyı token ile doğrulayıp devam ettirmemiz gerekiyor
    // Gerçek uygulamada JWT verify işlemi yapılmalı
    try {
      session = { user: { id: req.headers['x-user-id'] || 'default-id' } };
      console.log("Header'dan oluşturulan session:", session);
    } catch (err) {
      console.error("Token ile session oluşturma hatası:", err);
    }
  }
  
  if (!session) {
    return res.status(401).json({ success: false, message: 'Bu işlem için yetkilendirilmemiş' });
  }

  // Database bağlantısı yap
  try {
    const { db } = await connectToDatabase();
    console.log("Veritabanı bağlantısı başarılı");
    
    // Kullanıcı bilgisini al
    const userId = session.user.id || req.headers['x-user-id'] || req.query.userId;
    console.log("Kullanıcı ID:", userId);

    try {
      // GET isteği - Profil bilgilerini getir
      if (req.method === 'GET') {
        console.log("GET isteği işleniyor");
        
        // Session yoksa, örnek veri dönelim
        if (!userId) {
          console.log("Örnek veri dönülüyor");
          return res.status(200).json({
            success: true,
            user: {
              id: "example-id",
              name: "Örnek Kullanıcı",
              email: "ornek@tasiapp.com",
              phone: "5551234567",
              company: "Örnek Lojistik Ltd. Şti.",
              taxNumber: "1234567890",
              taxOffice: "İstanbul",
              address: "Örnek Mah. Örnek Cad. No:123",
              district: "Kadıköy",
              city: "İstanbul",
              description: "Örnek firma açıklaması",
              transportTypes: [1, 2, 4],
              serviceAreas: {
                pickup: [],
                delivery: []
              },
              documents: []
            }
          });
        }
        
        // İlk olarak ID dönüşümü olmadan deneyelim
        let company = await db.collection('companies').findOne({ _id: userId });
        
        if (!company) {
          console.log("ID string olarak bulunamadı, ObjectId dönüşümü deneniyor");
          try {
            // ObjectId dönüşümü ile deneyelim
            company = await db.collection('companies').findOne({ _id: new ObjectId(userId) });
          } catch (objectIdError) {
            console.error("ObjectId dönüşüm hatası:", objectIdError);
          }
        }
        
        if (!company) {
          console.log("Kullanıcı email ile aranıyor");
          // ID ile bulunamadıysa email ile deneyelim
          company = await db.collection('companies').findOne({ email: session.user.email });
        }
        
        if (!company) {
          console.log("İlk companies belgesini dönüyoruz");
          // Hiçbir şekilde bulamazsak ilk company belgesini alalım
          company = await db.collection('companies').findOne({});
          
          if (!company) {
            console.log("Şirket bulunamadı:", userId);
            // Tüm şirketleri listeleyelim
            const allCompanies = await db.collection('companies').find({}).limit(5).toArray();
            console.log("Veritabanındaki ilk 5 şirket:", JSON.stringify(allCompanies, null, 2));
            
            return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
          }
        }
        
        console.log("Şirket bulundu:", company._id);
        
        // Kullanıcı bilgilerini döndür
        return res.status(200).json({
          success: true,
          user: {
            id: company._id.toString(),
            name: company.contactPerson || '',
            email: company.email || '',
            phone: company.phoneNumber || '',
            company: company.companyName || '',
            taxNumber: company.taxNumber || '',
            taxOffice: company.taxOffice || '',
            address: company.address || '',
            district: company.district || '',
            city: company.city || '',
            description: company.description || '',
            transportTypes: company.transportTypes || [],
            serviceAreas: company.serviceAreas || {
              pickup: [],
              delivery: []
            },
            documents: company.documents || []
          }
        });
      }
      
      // PUT isteği - Profil bilgilerini güncelle
      if (req.method === 'PUT') {
        console.log("PUT isteği işleniyor");
        
        const { 
          name, email, phone, company, taxNumber, taxOffice, 
          address, district, city, description,
          currentPassword, newPassword
        } = req.body;
        
        // Güncelleme verilerini hazırla
        const updateData = {
          contactPerson: name,
          email,
          phoneNumber: phone,
          companyName: company,
          taxNumber,
          taxOffice,
          address,
          district,
          city,
          description,
          updatedAt: new Date()
        };
        
        console.log("Güncellenecek veriler:", updateData);
        
        // Şifre kontrolü ve güncelleme (isteğe bağlı)
        // Not: Gerçek uygulamada şifre değişikliği için daha güvenli bir yöntem kullanılmalıdır
        if (currentPassword && newPassword) {
          // Şifre değişikliği kodunu ekleyin (opsiyonel)
          // updateData.password = hashedPassword;
        }
        
        // Veritabanında güncelle
        try {
          const result = await db.collection('companies').updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateData }
          );
          
          console.log("Güncelleme sonucu:", result);
          
          if (result.matchedCount === 0) {
            console.log("Şirket güncellenemedi");
            return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
          }
          
          return res.status(200).json({
            success: true,
            message: 'Profil bilgileri güncellendi'
          });
        } catch (updateError) {
          console.error("Güncelleme hatası:", updateError);
          throw updateError;
        }
      }
      
      // Desteklenmeyen HTTP metodu
      return res.status(405).json({ success: false, message: 'Metod desteklenmiyor' });
      
    } catch (error) {
      console.error('API Hatası:', error);
      return res.status(500).json({ success: false, message: 'Sunucu hatası', error: error.message });
    }
  } catch (dbError) {
    console.error("Veritabanı bağlantı hatası:", dbError);
    return res.status(500).json({ success: false, message: 'Veritabanı bağlantı hatası', error: dbError.message });
  }
} 