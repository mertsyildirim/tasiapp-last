import { connectToDatabase } from '/lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    // Oturum kontrolü
    const session = await getServerSession(req, res, authOptions);
    console.log('Session:', session);

    if (!session) {
      return res.status(401).json({ error: 'Oturum bulunamadı' });
    }

    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();

    // HTTP metoduna göre işlem yap
    switch (req.method) {
      case 'GET':
        return await getVehicles(req, res, db);
      case 'POST':
        return await createVehicle(req, res, db);
      case 'PUT':
        return await updateVehicle(req, res, db);
      case 'DELETE':
        return await deleteVehicle(req, res, db);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Vehicles API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Araçları listele
async function getVehicles(req, res, db) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Arama filtresi oluştur
    let filter = {};
    
    // Metin araması
    if (req.query.search) {
      filter = {
        $or: [
          { plateNumber: { $regex: req.query.search, $options: 'i' } },
          { brand: { $regex: req.query.search, $options: 'i' } },
          { model: { $regex: req.query.search, $options: 'i' } }
        ]
      };
    }
    
    // Durum filtreleme
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Süresi dolmuş belge kontrolü
    if (req.query.hasExpiredDocuments === 'true') {
      const today = new Date();
      filter.$or = [
        ...(filter.$or || []),
        { 'documents.validUntil': { $lt: today } }
      ];
    }
    
    console.log('Filter:', filter);

    // Toplam araç sayısını al
    const total = await db.collection('vehicles').countDocuments(filter);
    
    // Araçları getir
    const vehicles = await db.collection('vehicles')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Her aracın belge durumunu kontrol et
    const vehiclesWithDocumentStatus = vehicles.map(vehicle => {
      const hasExpiredDocuments = vehicle.documents?.some(doc => {
        const validUntil = new Date(doc.validUntil);
        return validUntil < new Date();
      });
      return { ...vehicle, hasExpiredDocuments };
    });

    return res.status(200).json({
      vehicles: vehiclesWithDocumentStatus,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get Vehicles Error:', error);
    return res.status(500).json({ error: 'Araçlar listelenirken bir hata oluştu' });
  }
}

// Yeni araç oluştur
async function createVehicle(req, res, db) {
  try {
    const { plateNumber, brand, model, year, capacity, status, fuelType } = req.body;

    // Zorunlu alanları kontrol et
    if (!plateNumber || !brand || !model) {
      return res.status(400).json({ error: 'Plaka, marka ve model alanları zorunludur' });
    }

    // Plaka numarasının benzersiz olduğunu kontrol et
    const existingVehicle = await db.collection('vehicles').findOne({ plateNumber });
    if (existingVehicle) {
      return res.status(400).json({ error: 'Bu plaka numarası zaten kayıtlı' });
    }

    // Yeni araç oluştur
    const newVehicle = {
      plateNumber,
      brand,
      model,
      year,
      capacity,
      fuelType: fuelType || 'Bilinmiyor',
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('vehicles').insertOne(newVehicle);
    return res.status(201).json({ vehicle: { ...newVehicle, _id: result.insertedId } });
  } catch (error) {
    console.error('Create Vehicle Error:', error);
    return res.status(500).json({ error: 'Araç oluşturulurken bir hata oluştu' });
  }
}

// Araç güncelle
async function updateVehicle(req, res, db) {
  try {
    const { id } = req.query;
    const { plateNumber, brand, model, year, capacity, status, fuelType } = req.body;

    // Araç ID'sini kontrol et
    if (!id) {
      return res.status(400).json({ error: 'Araç ID\'si gerekli' });
    }

    // Araç var mı kontrol et
    const vehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(id) });
    if (!vehicle) {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }

    // Güncelleme verilerini hazırla
    const updateData = {
      updatedAt: new Date()
    };

    if (plateNumber) updateData.plateNumber = plateNumber;
    if (brand) updateData.brand = brand;
    if (model) updateData.model = model;
    if (year) updateData.year = year;
    if (capacity) updateData.capacity = capacity;
    if (status) updateData.status = status;
    if (fuelType) updateData.fuelType = fuelType;

    // Aracı güncelle
    await db.collection('vehicles').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // Güncellenmiş aracı getir
    const updatedVehicle = await db.collection('vehicles').findOne({ _id: new ObjectId(id) });
    return res.status(200).json({ vehicle: updatedVehicle });
  } catch (error) {
    console.error('Update Vehicle Error:', error);
    return res.status(500).json({ error: 'Araç güncellenirken bir hata oluştu' });
  }
}

// Araç sil
async function deleteVehicle(req, res, db) {
  try {
    const { id } = req.query;
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Geçersiz araç ID' });
    }

    const result = await db.collection('vehicles').findOneAndDelete({
      _id: new ObjectId(id)
    });

    if (!result.value) {
      return res.status(404).json({ error: 'Araç bulunamadı' });
    }

    return res.status(200).json({ message: 'Araç başarıyla silindi' });
  } catch (error) {
    console.error('Delete Vehicle Error:', error);
    return res.status(500).json({ error: 'Araç silinirken bir hata oluştu' });
  }
}