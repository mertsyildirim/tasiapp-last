import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/admin/[...nextauth]';
import { connectToDatabase } from '../../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    console.log("Vehicle Brands [id] API çağrıldı:", req.method, "ID:", req.query.id);
    
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

    const { id } = req.query;

    // ID kontrolü
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Geçersiz ID formatı' });
    }

    const objectId = new ObjectId(id);

    // GET: Belirli bir markayı getir
    if (req.method === 'GET') {
      try {
        console.log("Marka detayı getiriliyor:", id);
        
        const brand = await db.collection('brands')
          .aggregate([
            { $match: { _id: objectId } },
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
        
        if (!brand || brand.length === 0) {
          return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        }
        
        return res.status(200).json({ success: true, brand: brand[0] });
      } catch (error) {
        console.error('Marka getirme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Marka getirilirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    // PUT: Belirli bir markayı güncelle
    if (req.method === 'PUT') {
      try {
        console.log("Marka güncelleniyor:", id);
        
        const { name, vehicleType, models } = req.body;
        
        if (!name || !vehicleType) {
          return res.status(400).json({ 
            success: false, 
            message: 'Marka adı ve araç tipi zorunludur' 
          });
        }

        // vehicleType'ı ObjectId formatına çevirmeye çalış
        let vehicleTypeId;
        try {
          vehicleTypeId = typeof vehicleType === 'string' ? new ObjectId(vehicleType) : vehicleType;
        } catch (error) {
          return res.status(400).json({ 
            success: false, 
            message: 'Geçersiz araç tipi ID formatı' 
          });
        }

        // Aynı isimde başka marka var mı kontrol et (kendisi hariç)
        const existingBrand = await db.collection('brands').findOne({ 
          _id: { $ne: objectId },
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          vehicleType: vehicleTypeId
        });

        if (existingBrand) {
          return res.status(400).json({ 
            success: false, 
            message: 'Bu araç tipinde aynı isimde başka bir marka zaten mevcut' 
          });
        }

        // MongoDB 6+ için updateOne kullanımı
        const updateResult = await db.collection('brands').updateOne(
          { _id: objectId },
          {
            $set: {
              name: name.trim(),
              vehicleType: vehicleTypeId,
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
            { $match: { _id: objectId } },
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

    // DELETE: Belirli bir markayı sil
    if (req.method === 'DELETE') {
      try {
        console.log("Marka siliniyor:", id);
        
        const deleteResult = await db.collection('brands').deleteOne({ _id: objectId });

        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Marka başarıyla silindi' 
        });
      } catch (error) {
        console.error('Marka silme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Marka silinirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Brand API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      details: error.message 
    });
  }
} 