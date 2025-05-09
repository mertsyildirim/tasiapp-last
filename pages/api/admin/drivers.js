import { connectToDatabase } from '/lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { setupCORS, handleOptionsRequest, sendSuccess, sendError, logRequest } from '../../../lib/api-utils';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

export default async function handler(req, res) {
  // CORS ayarlarını ekle
  setupCORS(res);
  
  // OPTIONS isteğini işle
  if (handleOptionsRequest(req, res)) {
    return;
  }
  
  // İsteği logla
  logRequest(req);

  try {
    // Basit oturum kontrolü
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
      return res.status(401).json({ 
        success: false,
        message: 'Oturum bulunamadı. Lütfen giriş yapın.' 
      });
  }

    const { method } = req;
    const { db } = await connectToDatabase();

    // İstek metoduna göre işlem yap
    switch (method) {
      case 'GET':
        try {
          const { status, search, page = 1, limit = 10 } = req.query;
          const skip = (parseInt(page) - 1) * parseInt(limit);

          let filter = {};
          if (status && status !== 'all') {
            filter.status = status;
          }
          if (search) {
            filter.$or = [
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } },
              { company: { $regex: search, $options: 'i' } }
            ];
          }

          console.log('MongoDB Query Filter:', filter);
          
          // Koleksiyon kontrolü
          const collections = await db.listCollections().toArray();
          const hasDriversCollection = collections.some(col => col.name === 'drivers');
          
          if (!hasDriversCollection) {
            console.log('drivers koleksiyonu oluşturuluyor...');
            await db.createCollection('drivers');
            return res.status(200).json({
              success: true,
              drivers: [],
              total: 0,
              currentPage: parseInt(page),
              totalPages: 0
            });
          }

          // Önce normal sürücüleri al
          const total = await db.collection('drivers').countDocuments(filter);
          console.log('Total drivers found:', total);

          const drivers = await db.collection('drivers')
            .find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 })
            .toArray();

          // Sürücü verilerini formatla
          const formattedDrivers = drivers.map(driver => ({
            _id: driver._id.toString(),
            name: driver.name || '',
            email: driver.email || '',
            phone: driver.phone || '',
            company: driver.company || '',
            status: driver.status || 'active',
            licenseType: driver.licenseType || '',
            licenseExpiry: driver.licenseExpiry || '',
            experience: driver.experience || '',
            notes: driver.notes || '',
            documents: driver.documents || [],
            activeShipments: driver.activeShipments || 0,
            completedShipments: driver.completedShipments || 0,
            createdAt: driver.createdAt,
            updatedAt: driver.updatedAt,
            isFreelance: false
          }));
          
          // Freelance kullanıcıları da getir (companies koleksiyonundan isFreelance=true olanlar)
          const freelanceFilter = { isFreelance: true };
          if (search) {
            freelanceFilter.$or = [
              { companyName: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } },
              { phoneNumber: { $regex: search, $options: 'i' } },
              { contactPerson: { $regex: search, $options: 'i' } }
            ];
          }
          
          const freelancers = await db.collection('companies')
            .find(freelanceFilter)
            .toArray();
            
          console.log('Total freelancers found:', freelancers.length);
          
          // Freelance kullanıcıları sürücü formatına dönüştür
          const formattedFreelancers = freelancers.map(freelancer => ({
            _id: `f_${freelancer._id.toString()}`,  // ID çakışmasını önlemek için f_ prefixi ekle
            name: freelancer.contactPerson || '',
            email: freelancer.email || '',
            phone: freelancer.phoneNumber || '',
            company: freelancer.companyName || '',
            status: 'active',
            licenseType: 'Freelance',
            licenseExpiry: '',
            experience: '',
            notes: 'Freelance çalışan',
            documents: [],
            activeShipments: 0,
            completedShipments: 0,
            createdAt: freelancer.createdAt,
            updatedAt: freelancer.updatedAt,
            isFreelance: true,
            originalId: freelancer._id.toString()
          }));
          
          // İki listeyi birleştir
          const allDrivers = [...formattedDrivers, ...formattedFreelancers];
          const totalCombined = total + freelancers.length;

          return res.status(200).json({
            success: true,
            drivers: allDrivers,
            total: totalCombined,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCombined / parseInt(limit))
          });
        } catch (error) {
          console.error('Sürücüleri getirme hatası:', error);
          return res.status(500).json({ 
            success: false,
            message: 'Sürücüler getirilirken bir hata oluştu',
            error: error.message 
          });
        }
      case 'POST':
        return await createDriver(req, res, db);
      case 'PUT':
        return await updateDriver(req, res, db);
      case 'DELETE':
        return await deleteDriver(req, res, db);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return sendError(res, `Method ${method} not allowed`, 405);
    }
  } catch (error) {
    console.error('Sürücüler API hatası:', error);
    return sendError(res, 'Sunucu hatası', 500, error);
  }
}

/**
 * Yeni bir sürücü oluştur
 */
async function createDriver(req, res, db) {
  try {
    const { name, email, phone, company, status = 'active', licenseType, licenseExpiry, experience, notes } = req.body;

    if (!name || !email || !phone || !company) {
      throw new Error('Gerekli alanlar eksik');
    }

    const newDriver = {
      name,
      email,
      phone,
      company,
      status: status || 'active',
      licenseType: licenseType || '',
      licenseExpiry: licenseExpiry || '',
      experience: experience || '',
      notes: notes || '',
      documents: [],
      activeShipments: 0,
      completedShipments: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('drivers').insertOne(newDriver);
    newDriver._id = result.insertedId;

    return res.status(201).json({
      success: true,
      driver: newDriver
    });
  } catch (error) {
    console.error('Sürücü oluşturma hatası:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Sürücü oluşturulurken bir hata oluştu',
      error: error.message 
    });
  }
}

/**
 * Sürücü güncelle
 */
async function updateDriver(req, res, db) {
  try {
    const { id } = req.query;
    const { name, email, phone, company, status, licenseType, licenseExpiry, experience, notes } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Sürücü ID\'si gerekli' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (company) updateData.company = company;
    if (status) updateData.status = status;
    if (licenseType) updateData.licenseType = licenseType;
    if (licenseExpiry) updateData.licenseExpiry = licenseExpiry;
    if (experience) updateData.experience = experience;
    if (notes) updateData.notes = notes;
    updateData.updatedAt = new Date();

    const result = await db.collection('drivers').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error('Sürücü bulunamadı');
    }

    const updatedDriver = await db.collection('drivers').findOne({ _id: new ObjectId(id) });
    return res.status(200).json({
      success: true,
      driver: updatedDriver
    });
  } catch (error) {
    console.error('Sürücü güncelleme hatası:', error);
    return res.status(500).json({ message: 'Sürücü güncellenirken bir hata oluştu' });
  }
}

/**
 * Sürücü sil
 */
async function deleteDriver(req, res, db) {
  try {
    // ID kontrolü
    const { id } = req.query;
    if (!id) {
      return sendError(res, 'Sürücü ID\'si gerekli', 400);
    }
    
    // ObjectId'ye çevir
    const driverId = new ObjectId(id);
    
    // Sürücünün varlığını kontrol et
    const existingDriver = await db.collection('drivers').findOne({ _id: driverId });
    if (!existingDriver) {
      return sendError(res, 'Sürücü bulunamadı', 404);
    }
    
    // Sürücüyü sil
    const result = await db.collection('drivers').deleteOne({ _id: driverId });
    
    if (result.deletedCount === 0) {
      throw new Error('Sürücü bulunamadı');
    }

    return sendSuccess(res, null, 200, 'Sürücü başarıyla silindi');
  } catch (error) {
    console.error('Sürücü silme hatası:', error);
    return sendError(res, 'Sürücü silinirken bir hata oluştu', 500, error);
  }
} 