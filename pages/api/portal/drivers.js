import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '/lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    // Session kontrolü - authOptions olmadan basit kimlik doğrulama
    const session = await getServerSession(req, res);
    console.log('Oturum bilgisi:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('Oturum bulunamadı');
      return res.status(401).json({ error: 'Oturum bulunamadı' });
    }

    // Kullanıcı bilgilerini detaylı loglama
    console.log('Kullanıcı ID:', session.user.id);
    console.log('ID Türü:', typeof session.user.id);
    console.log('ID ObjectId geçerli mi:', ObjectId.isValid(session.user.id));
    console.log('Kullanıcı Email:', session.user.email);
    console.log('Kullanıcı Adı:', session.user.name);
    console.log('Kullanıcı Tipi:', session.user.userType);
    console.log('Kullanıcı Durumu:', session.user.status);
    console.log('Tüm session.user:', JSON.stringify(session.user, null, 2));

    const { method } = req;
    let db;

    try {
      const { db: database } = await connectToDatabase();
      db = database;
      console.log('MongoDB bağlantısı başarılı');
    } catch (error) {
      console.error('Veritabanı bağlantı hatası:', error);
      return res.status(500).json({ error: 'Veritabanına bağlanılamadı' });
    }

    // Session'da şirket bilgisi yoksa e-posta adresinden kullanıcıyı bul
    let companyId = session.user.id; // Önce standart ID'yi kontrol et
    
    // Session'da ID yoksa, e-posta adresine göre şirket ara
    if (!companyId && session.user.email) {
      console.log(`E-posta adresine göre şirket aranıyor: ${session.user.email}`);
      const company = await db.collection('companies').findOne({ email: session.user.email });
      
      if (company) {
        companyId = company._id;
        console.log(`E-posta adresine göre şirket bulundu. ID: ${companyId}`);
      } else {
        console.log('E-posta adresine göre şirket bulunamadı');
      }
    }
    
    console.log('Şirket ID olarak kullanılacak:', companyId);

    // Companies koleksiyonunu kontrol et
    const companiesCount = await db.collection('companies').countDocuments({});
    console.log('Toplam şirket sayısı:', companiesCount);
    
    if (companiesCount > 0) {
      // Bir örnek şirket verisini göster
      const sampleCompany = await db.collection('companies').findOne({});
      console.log('Örnek şirket verisi:');
      console.log('_id:', sampleCompany._id);
      console.log('_id türü:', typeof sampleCompany._id);
      console.log('_id instanceof ObjectId:', sampleCompany._id instanceof ObjectId);
      console.log('_id string hali:', sampleCompany._id.toString());
    }

    // Şirketin varlığını doğrula
    let companyData = null;
    try {
      if (companyId) {
        // Önce ObjectId olarak dene
        if (ObjectId.isValid(companyId)) {
          companyData = await db.collection('companies').findOne({ _id: new ObjectId(companyId) });
          console.log('ObjectId araması sonucu:', companyData ? 'Bulundu' : 'Bulunamadı');
        }
        
        // Bulunamazsa string ID olarak dene
        if (!companyData) {
          companyData = await db.collection('companies').findOne({ _id: companyId });
          console.log('String ID araması sonucu:', companyData ? 'Bulundu' : 'Bulunamadı');
        }
      }

      console.log('Şirket verisi bulundu mu:', companyData ? 'EVET' : 'HAYIR');
      if (companyData) {
        console.log('Şirket adı:', companyData.companyName || companyData.name);
        console.log('Şirket _id:', companyData._id);
        console.log('Şirket _id türü:', typeof companyData._id);
      }
    } catch (error) {
      console.error('Şirket verisini alırken hata:', error);
    }

    // drivers koleksiyonunu kontrol et
    const driversCount = await db.collection('drivers').countDocuments({});
    console.log('Toplam sürücü sayısı:', driversCount);
    
    if (driversCount > 0) {
      // Bir örnek sürücü verisini göster
      const sampleDriver = await db.collection('drivers').findOne({});
      console.log('Örnek sürücü verisi:');
      console.log('_id:', sampleDriver._id);
      console.log('company:', sampleDriver.company);
      console.log('company türü:', typeof sampleDriver.company);
      console.log('company instanceof ObjectId:', sampleDriver.company instanceof ObjectId);
      if (sampleDriver.company) {
        console.log('company string hali:', sampleDriver.company.toString());
      }
    }

    switch (method) {
      case 'GET': {
        try {
          const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
          const skip = (parseInt(page) - 1) * parseInt(limit);
          
          // Sorgu filtresi başlat
          const filter = {};
          
          // Arama filtresi
          if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } },
              { licenseNumber: { $regex: search, $options: 'i' } },
              { vehicle: { $regex: search, $options: 'i' } }
            ];
          }
          
          // Durum filtresi
          if (status !== 'all') {
            filter.status = status;
          }
          
          // Şirket ID filtresi - şirket ID var ise uygula
          if (companyId) {
            // ObjectId kontrolü yap
            if (ObjectId.isValid(companyId)) {
              // ObjectId araması
              filter.company = { $in: [new ObjectId(companyId), companyId] };
              console.log('Kullanılan ObjectId ve String:', new ObjectId(companyId), companyId);
            } else {
              // ID ObjectId değilse sadece string olarak ara
              filter.company = companyId;
              console.log('Sadece String ID kullanıldı:', companyId);
            }
          } else {
            console.log('Şirket ID bulunamadı, tüm sürücüler getirilecek');
          }

          console.log('MongoDB sorgu filtresi:', JSON.stringify(filter, null, 2));

          // Sürücüleri getir
          const [drivers, total] = await Promise.all([
            db.collection('drivers')
              .find(filter)
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(parseInt(limit))
              .toArray(),
            db.collection('drivers').countDocuments(filter)
          ]);

          console.log('Şirkete ait bulunan sürücü sayısı:', drivers.length);

          if (drivers.length > 0) {
            console.log('İlk sürücü örneği:');
            console.log(JSON.stringify(drivers[0], null, 2));
          }

          // Şirket bilgisini ekle
          const driversWithCompanyInfo = await Promise.all(
            drivers.map(async (driver) => {
              try {
                if (driver.company) {
                  const companyInfo = await db.collection('companies').findOne(
                    { _id: typeof driver.company === 'object' ? driver.company : driver.company }
                  );
                  
                  if (companyInfo) {
                    driver.companyName = companyInfo.companyName || companyInfo.name || 'Bilinmeyen Şirket';
                  }
                }
                return driver;
              } catch (err) {
                console.error('Şirket bilgisi eklerken hata:', err);
                return driver;
              }
            })
          );

          return res.status(200).json({
            success: true,
            drivers: driversWithCompanyInfo,
            pagination: {
              total,
              pages: Math.ceil(total / parseInt(limit)),
              current: parseInt(page)
            }
          });
        } catch (error) {
          console.error('Sürücüleri getirme hatası:', error);
          return res.status(500).json({ error: 'Sürücüler getirilirken bir hata oluştu' });
        }
      }

      case 'POST': {
        try {
          const driverData = req.body;
          
          // Şirket ID'sini ekle
          driverData.company = new ObjectId(companyId);
          driverData.createdAt = new Date();
          driverData.updatedAt = new Date();
          
          const result = await db.collection('drivers').insertOne(driverData);
          
          if (result.acknowledged) {
            // Eklenen sürücüyü geri döndür
            const insertedDriver = {
              ...driverData,
              _id: result.insertedId
            };
            
            return res.status(201).json({
              success: true,
              data: insertedDriver
            });
          } else {
            throw new Error('Sürücü eklenemedi');
          }
          
        } catch (error) {
          console.error('Sürücü ekleme hatası:', error);
          return res.status(500).json({ error: 'Sürücü eklenirken bir hata oluştu' });
        }
      }
      
      case 'PUT': {
        try {
          const { id } = req.query;
          const updateData = req.body;
          
          if (!id) {
            return res.status(400).json({ error: 'Sürücü ID gerekli' });
          }
          
          // Güncelleme için şirket kontrolü yapılır
          const driver = await db.collection('drivers').findOne({ 
            _id: new ObjectId(id),
            company: new ObjectId(companyId)
          });
          
          if (!driver) {
            return res.status(404).json({ error: 'Sürücü bulunamadı veya bu şirkete ait değil' });
          }
          
          // Güncelleme tarihi ekle ve ID'yi çıkar
          updateData.updatedAt = new Date();
          delete updateData._id;
          
          const result = await db.collection('drivers').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
          );
          
          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Sürücü güncellenemedi' });
          }
          
          // Güncellenmiş sürücüyü getir
          const updatedDriver = await db.collection('drivers').findOne({ _id: new ObjectId(id) });
          
          return res.status(200).json({
            success: true,
            data: updatedDriver
          });
          
        } catch (error) {
          console.error('Sürücü güncelleme hatası:', error);
          return res.status(500).json({ error: 'Sürücü güncellenirken bir hata oluştu' });
        }
      }
      
      case 'DELETE': {
        try {
          const { id } = req.query;
          
          if (!id) {
            return res.status(400).json({ error: 'Sürücü ID gerekli' });
          }
          
          // Silme için şirket kontrolü yapılır
          const driver = await db.collection('drivers').findOne({ 
            _id: new ObjectId(id),
            company: new ObjectId(companyId)
          });
          
          if (!driver) {
            return res.status(404).json({ error: 'Sürücü bulunamadı veya bu şirkete ait değil' });
          }
          
          const result = await db.collection('drivers').deleteOne({ _id: new ObjectId(id) });
          
          if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Sürücü silinemedi' });
          }
          
          return res.status(200).json({
            success: true,
            message: 'Sürücü başarıyla silindi'
          });
          
        } catch (error) {
          console.error('Sürücü silme hatası:', error);
          return res.status(500).json({ error: 'Sürücü silinirken bir hata oluştu' });
        }
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
} 