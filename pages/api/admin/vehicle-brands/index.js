import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/admin/[...nextauth]';
import { connectToDatabase } from '../../../../lib/minimal-mongodb';
import Brand from '../../../../models/Brand';

export default async function handler(req, res) {
  try {
    console.log("Vehicle Brands API çağrıldı:", req.method);
    
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      console.log("Oturum doğrulama başarısız");
      return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
    }
    
    console.log("Oturum doğrulama başarılı:", session.user?.email);

    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();
    console.log("Veritabanı bağlantısı başarılı");

    // GET: Tüm markaları getir
    if (req.method === 'GET') {
      try {
        console.log("Markalar getiriliyor...");
        
        // MongoDB native driver kullanarak brands koleksiyonuna eriş
        const brands = await db.collection('brands')
          .aggregate([
            {
              $lookup: {
                from: 'vehicletypes',
                localField: 'vehicleType',
                foreignField: '_id',
                as: 'vehicleTypeInfo'
              }
            },
            {
              $addFields: {
                vehicleType: { $arrayElemAt: ['$vehicleTypeInfo', 0] }
              }
            },
            {
              $project: {
                vehicleTypeInfo: 0
              }
            },
            {
              $sort: { name: 1 }
            }
          ]).toArray();

        console.log(`${brands.length} marka bulundu`);

        // İsteğe bağlı filtreleme
        if (req.query.vehicleType) {
          console.log(`Filtreleme yapılıyor: vehicleType=${req.query.vehicleType}`);
          const filtered = brands.filter(brand => 
            brand.vehicleType?._id.toString() === req.query.vehicleType
          );
          return res.status(200).json({ success: true, brands: filtered });
        }

        return res.status(200).json({ success: true, brands });
      } catch (error) {
        console.error('Markalar getirme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Markalar getirilirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    // POST: Yeni marka ekle
    if (req.method === 'POST') {
      try {
        console.log("Yeni marka ekleniyor...");
        
        const { name, vehicleType, models } = req.body;
        
        if (!name || !vehicleType) {
          return res.status(400).json({ 
            success: false, 
            message: 'Marka adı ve araç tipi zorunludur' 
          });
        }

        // Aynı isimde marka var mı kontrol et
        const existingBrand = await db.collection('brands').findOne({ 
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          vehicleType
        });

        if (existingBrand) {
          return res.status(400).json({ 
            success: false, 
            message: 'Bu araç tipinde aynı isimde bir marka zaten mevcut' 
          });
        }

        const brandData = {
          name: name.trim(),
          vehicleType,
          models: models || [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection('brands').insertOne(brandData);
        
        const newBrand = await db.collection('brands')
          .aggregate([
            { $match: { _id: result.insertedId } },
            {
              $lookup: {
                from: 'vehicletypes',
                localField: 'vehicleType',
                foreignField: '_id',
                as: 'vehicleTypeInfo'
              }
            },
            {
              $addFields: {
                vehicleType: { $arrayElemAt: ['$vehicleTypeInfo', 0] }
              }
            },
            {
              $project: {
                vehicleTypeInfo: 0
              }
            }
          ]).toArray();
        
        return res.status(201).json({ 
          success: true, 
          brand: newBrand[0] 
        });
      } catch (error) {
        console.error('Marka ekleme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Marka eklenirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    // PUT: Marka güncelle
    if (req.method === 'PUT') {
      try {
        console.log("Marka güncelleniyor...");
        
        const { _id, name, vehicleType, models } = req.body;
        
        if (!_id) {
          return res.status(400).json({ 
            success: false, 
            message: 'Marka ID zorunludur' 
          });
        }

        if (!name || !vehicleType) {
          return res.status(400).json({ 
            success: false, 
            message: 'Marka adı ve araç tipi zorunludur' 
          });
        }

        // Aynı isimde başka marka var mı kontrol et (kendisi hariç)
        const existingBrand = await db.collection('brands').findOne({ 
          _id: { $ne: _id },
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          vehicleType
        });

        if (existingBrand) {
          return res.status(400).json({ 
            success: false, 
            message: 'Bu araç tipinde aynı isimde başka bir marka zaten mevcut' 
          });
        }

        // MongoDB 6+ için updateOne kullanımı
        const updateResult = await db.collection('brands').updateOne(
          { _id },
          {
            $set: {
              name: name.trim(),
              vehicleType,
              models: models || [],
              updatedAt: new Date()
            }
          }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Marka bulunamadı' 
          });
        }

        // Güncellenmiş veriyi getir
        const updatedBrand = await db.collection('brands')
          .aggregate([
            { $match: { _id } },
            {
              $lookup: {
                from: 'vehicletypes',
                localField: 'vehicleType',
                foreignField: '_id',
                as: 'vehicleTypeInfo'
              }
            },
            {
              $addFields: {
                vehicleType: { $arrayElemAt: ['$vehicleTypeInfo', 0] }
              }
            },
            {
              $project: {
                vehicleTypeInfo: 0
              }
            }
          ]).toArray();

        return res.status(200).json({ 
          success: true, 
          brand: updatedBrand[0] 
        });
      } catch (error) {
        console.error('Marka güncelleme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Marka güncellenirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Vehicle Brands API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      details: error.message 
    });
  }
} 