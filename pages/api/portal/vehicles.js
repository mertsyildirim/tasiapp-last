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
    console.log('Kullanıcı Email:', session.user.email);
    console.log('Kullanıcı Adı:', session.user.name);

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

    switch (method) {
      case 'GET': {
        try {
          const { page = 1, limit = 10, search = '', status = 'all', type = 'all' } = req.query;
          const skip = (parseInt(page) - 1) * parseInt(limit);
          
          // Sorgu filtresi başlat
          const filter = {};
          
          // Arama filtresi
          if (search) {
            filter.$or = [
              { plate: { $regex: search, $options: 'i' } },
              { brand: { $regex: search, $options: 'i' } },
              { model: { $regex: search, $options: 'i' } }
            ];
          }
          
          // Durum filtresi
          if (status !== 'all') {
            filter.status = status;
          }
          
          // Tür filtresi
          if (type !== 'all') {
            filter.type = type;
          }
          
          // Şirket ID filtresi - şirket ID var ise uygula
          if (companyId) {
            // ObjectId kontrolü yap
            if (ObjectId.isValid(companyId)) {
              // ObjectId araması
              filter.companyId = { $in: [new ObjectId(companyId), companyId] };
              console.log('Kullanılan ObjectId ve String:', new ObjectId(companyId), companyId);
            } else {
              // ID ObjectId değilse sadece string olarak ara
              filter.companyId = companyId;
              console.log('Sadece String ID kullanıldı:', companyId);
            }
          } else {
            console.log('Şirket ID bulunamadı, tüm araçlar getirilecek');
          }

          console.log('MongoDB sorgu filtresi:', JSON.stringify(filter, null, 2));

          // Araçları getir
          const [vehicles, total] = await Promise.all([
            db.collection('vehicles')
              .find(filter)
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(parseInt(limit))
              .toArray(),
            db.collection('vehicles').countDocuments(filter)
          ]);

          console.log('Şirkete ait bulunan araç sayısı:', vehicles.length);
          
          if (vehicles.length > 0) {
            console.log('İlk araç örneği:');
            console.log(JSON.stringify(vehicles[0], null, 2));
          }

          // Sürücü bilgisini ekle
          const vehiclesWithDriverInfo = await Promise.all(
            vehicles.map(async (vehicle) => {
              try {
                if (vehicle.driverId) {
                  const driverInfo = await db.collection('drivers').findOne(
                    { _id: typeof vehicle.driverId === 'object' ? vehicle.driverId : new ObjectId(vehicle.driverId) }
                  );
                  
                  if (driverInfo) {
                    vehicle.driverName = driverInfo.name || 'Bilinmeyen Sürücü';
                  }
                }
                return vehicle;
              } catch (err) {
                console.error('Sürücü bilgisi eklerken hata:', err);
                return vehicle;
              }
            })
          );

          return res.status(200).json({
            success: true,
            vehicles: vehiclesWithDriverInfo,
            pagination: {
              total,
              pages: Math.ceil(total / parseInt(limit)),
              current: parseInt(page)
            }
          });
        } catch (error) {
          console.error('Araçları getirme hatası:', error);
          return res.status(500).json({ error: 'Araçlar getirilirken bir hata oluştu' });
        }
      }

      case 'POST': {
        try {
          const { 
            plate, brand, model, year, type, capacity, status, 
            chassisNumber, driverId, notes 
          } = req.body;
          
          // Zorunlu alanları kontrol et
          if (!plate || !brand || !model) {
            return res.status(400).json({ error: 'Plaka, marka ve model alanları zorunludur' });
          }
          
          // Yeni araç oluştur
          const newVehicle = {
            plate,
            brand,
            model,
            year: year || '',
            type: type || 'truck',
            capacity: capacity || '',
            status: status || 'active',
            chassisNumber: chassisNumber || '',
            companyId: ObjectId.isValid(companyId) ? new ObjectId(companyId) : companyId,
            driverId: driverId ? (ObjectId.isValid(driverId) ? new ObjectId(driverId) : driverId) : null,
            notes: notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const result = await db.collection('vehicles').insertOne(newVehicle);
          
          if (result.acknowledged) {
            // Eklenen aracı geri döndür
            const insertedVehicle = {
              ...newVehicle,
              _id: result.insertedId
            };
            
            return res.status(201).json({
              success: true,
              data: insertedVehicle
            });
          } else {
            throw new Error('Araç eklenemedi');
          }
        } catch (error) {
          console.error('Araç ekleme hatası:', error);
          return res.status(500).json({ error: 'Araç eklenirken bir hata oluştu' });
        }
      }
      
      case 'PUT': {
        try {
          const { id } = req.query;
          const updateData = req.body;
          
          if (!id) {
            return res.status(400).json({ error: 'Araç ID gerekli' });
          }
          
          // Güncelleme için şirket kontrolü yapılır
          const vehicle = await db.collection('vehicles').findOne({ 
            _id: new ObjectId(id),
            companyId: ObjectId.isValid(companyId) ? new ObjectId(companyId) : companyId
          });
          
          if (!vehicle) {
            return res.status(404).json({ error: 'Araç bulunamadı veya bu şirkete ait değil' });
          }
          
          // Güncelleme tarihi ekle ve ID'yi çıkar
          updateData.updatedAt = new Date();
          delete updateData._id;
          
          // driverId ObjectId'ye çevir
          if (updateData.driverId && ObjectId.isValid(updateData.driverId)) {
            updateData.driverId = new ObjectId(updateData.driverId);
          }
          
          const result = await db.collection('vehicles').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
          );
          
          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Araç güncellenemedi' });
          }
          
          // Güncellenmiş aracı getir
          const updatedVehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(id) });
          
          return res.status(200).json({
            success: true,
            data: updatedVehicle
          });
        } catch (error) {
          console.error('Araç güncelleme hatası:', error);
          return res.status(500).json({ error: 'Araç güncellenirken bir hata oluştu' });
        }
      }
      
      case 'DELETE': {
        try {
          const { id } = req.query;
          
          if (!id) {
            return res.status(400).json({ error: 'Araç ID gerekli' });
          }
          
          // Silme için şirket kontrolü yapılır
          const vehicle = await db.collection('vehicles').findOne({ 
            _id: new ObjectId(id),
            companyId: ObjectId.isValid(companyId) ? new ObjectId(companyId) : companyId
          });
          
          if (!vehicle) {
            return res.status(404).json({ error: 'Araç bulunamadı veya bu şirkete ait değil' });
          }
          
          const result = await db.collection('vehicles').deleteOne({ _id: new ObjectId(id) });
          
          if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Araç silinemedi' });
          }
          
          return res.status(200).json({
            success: true,
            message: 'Araç başarıyla silindi'
          });
        } catch (error) {
          console.error('Araç silme hatası:', error);
          return res.status(500).json({ error: 'Araç silinirken bir hata oluştu' });
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