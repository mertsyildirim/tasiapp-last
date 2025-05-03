import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Veritabanına bağlan
    const { db } = await connectToDatabase();
    
    // HTTP metoda göre işlem yap
    switch (req.method) {
      case 'GET':
        return await getDrivers(req, res, db);
      case 'POST':
        return await addDriver(req, res, db);
      case 'PUT':
        return await updateDriver(req, res, db);
      case 'DELETE':
        return await deleteDriver(req, res, db);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Veritabanı işlemi hatası:', error);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
}

// Sürücüleri getir
async function getDrivers(req, res, db) {
  try {
    // Şirket ID'sini query'den al
    const { companyId } = req.query;
    
    // Sorgu kriterlerini oluştur
    let query = {};
    
    // Eğer şirket ID'si verilmişse, sorguya ekle
    if (companyId) {
      // companyId string'ini ObjectId'ye dönüştür
      query.company = new ObjectId(companyId);
    }
    
    // Pipeline oluştur
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'companies',
          localField: 'company',
          foreignField: '_id',
          as: 'companyInfo'
        }
      },
      {
        $addFields: {
          companyName: { $arrayElemAt: ['$companyInfo.companyName', 0] },
          companyId: { $toString: '$company' }
        }
      },
      {
        $project: {
          companyInfo: 0 // Artık ihtiyacımız olmayan companyInfo alanını çıkar
        }
      },
      { $sort: { createdAt: -1 } }
    ];
    
    // Aggregation kullanarak sürücüleri getir
    const drivers = await db
      .collection('drivers')
      .aggregate(pipeline)
      .toArray();
    
    // Yanıt gönder
    return res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    console.error('Sürücü verileri getirme hatası:', error);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
}

// Yeni sürücü ekle
async function addDriver(req, res, db) {
  try {
    const driverData = req.body;
    
    // Gerekli alanlar kontrolü
    if (!driverData.name || !driverData.company) {
      return res.status(400).json({ success: false, error: 'Gerekli alanlar eksik' });
    }
    
    // Şirket ID'sini ObjectId'ye dönüştür
    driverData.company = new ObjectId(driverData.company);
    
    // Oluşturulma tarihi ekle
    driverData.createdAt = new Date();
    driverData.updatedAt = new Date();
    
    // Veritabanına ekle
    const result = await db.collection('drivers').insertOne(driverData);
    
    if (result.acknowledged) {
      // Şirket bilgilerini al
      const company = await db.collection('companies').findOne(
        { _id: driverData.company },
        { projection: { companyName: 1 } }
      );
      
      // Döndürülecek veriyi hazırla
      const insertedDriver = {
        ...driverData,
        _id: result.insertedId,
        companyName: company ? company.companyName : '',
        companyId: driverData.company.toString()
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
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
}

// Sürücü güncelle
async function updateDriver(req, res, db) {
  try {
    const { id } = req.query;
    const updateData = req.body;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Sürücü ID gerekli' });
    }
    
    // Güncelleme tarihi ekle
    updateData.updatedAt = new Date();
    
    // _id alanını kaldır (varsa)
    delete updateData._id;
    
    // Eğer company alanı varsa, ObjectId'ye dönüştür
    if (updateData.company && typeof updateData.company === 'string') {
      updateData.company = new ObjectId(updateData.company);
    }
    
    // Veritabanında güncelle
    const result = await db.collection('drivers').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'Sürücü bulunamadı' });
    }
    
    // Güncellenmiş sürücüyü aggregation ile getir
    const updatedDriver = await db.collection('drivers')
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        {
          $lookup: {
            from: 'companies',
            localField: 'company',
            foreignField: '_id',
            as: 'companyInfo'
          }
        },
        {
          $addFields: {
            companyName: { $arrayElemAt: ['$companyInfo.companyName', 0] },
            companyId: { $toString: '$company' }
          }
        },
        {
          $project: {
            companyInfo: 0
          }
        }
      ])
      .next();
    
    return res.status(200).json({ success: true, data: updatedDriver });
  } catch (error) {
    console.error('Sürücü güncelleme hatası:', error);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
}

// Sürücü sil
async function deleteDriver(req, res, db) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Sürücü ID gerekli' });
    }
    
    // Veritabanından sil
    const result = await db.collection('drivers').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Sürücü bulunamadı' });
    }
    
    return res.status(200).json({ success: true, message: 'Sürücü başarıyla silindi' });
  } catch (error) {
    console.error('Sürücü silme hatası:', error);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
} 