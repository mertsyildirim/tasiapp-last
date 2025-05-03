import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { connectToDatabase } from '/lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { setupCORS, handleOptionsRequest, sendSuccess, sendError, logRequest } from '../../../lib/api-utils';

export default async function handler(req, res) {
  // CORS ve loglama ekle
  setupCORS(res);
  
  // OPTIONS isteğini işle
  if (handleOptionsRequest(req, res)) {
    return;
  }
  
  // İsteği logla
  logRequest(req);
  
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return sendError(res, `Method ${req.method} not allowed`, 405);
  }

  try {
    // Basit oturum kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: 'Oturum bulunamadı. Lütfen giriş yapın.' 
      });
    }

    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();

    const { method } = req;

    switch (method) {
      case 'GET': {
        try {
          const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
          const skip = (parseInt(page) - 1) * parseInt(limit);
          
          const filter = {
            ...(search && {
              $or: [
                { name: { $regex: search, $options: 'i' } },
                { contactPerson: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { companyName: { $regex: search, $options: 'i' } }
              ]
            }),
            ...(status !== 'all' && { status })
          };

          // Doğrudan companies koleksiyonundan veri çek
          const [carriers, total] = await Promise.all([
            db.collection('companies')
              .find(filter)
              .skip(skip)
              .limit(parseInt(limit))
              .toArray(),
            db.collection('companies').countDocuments(filter)
          ]);

          // ObjectId'leri string'e çevir ve alan adlarını düzenle
          const formattedCarriers = carriers.map(carrier => ({
            ...carrier,
            _id: carrier._id.toString(),
            // Alan adlarını frontend ile uyumlu hale getir
            contactPerson: carrier.contactPerson || carrier.name || '',
            name: carrier.name || '',
            email: carrier.email || '',
            phone: carrier.phone || '',
            companyName: carrier.companyName || '',
            address: carrier.address || '',
            taxOffice: carrier.taxOffice || '',
            taxNumber: carrier.taxNumber || '',
            companyType: carrier.companyType || '',
            registrationNumber: carrier.registrationNumber || '',
            status: carrier.status || 'active',
            createdAt: carrier.createdAt || new Date(),
            updatedAt: carrier.updatedAt || new Date()
          }));

          return res.status(200).json({
            success: true,
            carriers: formattedCarriers,
            pagination: {
              total,
              pages: Math.ceil(total / parseInt(limit)),
              current: parseInt(page)
            }
          });
        } catch (error) {
          console.error('Taşıyıcıları getirme hatası:', error);
          return res.status(500).json({ error: 'Taşıyıcılar getirilirken bir hata oluştu' });
        }
      }

      case 'POST': {
        try {
          const { 
            name, 
            contactPerson, 
            email, 
            phone, 
            company, 
            address, 
            taxOffice, 
            taxNumber, 
            companyType, 
            registrationNumber, 
            status = 'active' 
          } = req.body;

          if (!name || !email || !phone || !company) {
            return res.status(400).json({ error: 'Gerekli alanlar eksik' });
          }

          const newCarrier = {
            name: name || contactPerson, // İki alanı da destekle
            contactPerson: contactPerson || name, // İki alanı da destekle
            email,
            phone,
            company,
            address: address || '',
            taxOffice: taxOffice || '',
            taxNumber: taxNumber || '',
            companyType: companyType || '',
            registrationNumber: registrationNumber || '',
            status,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = await db.collection('companies').insertOne(newCarrier);

          return res.status(201).json({
            success: true,
            carrier: { 
              ...newCarrier, 
              _id: result.insertedId.toString() 
            }
          });
        } catch (error) {
          console.error('Taşıyıcı oluşturma hatası:', error);
          return res.status(500).json({ error: 'Taşıyıcı oluşturulurken bir hata oluştu' });
        }
      }

      case 'PUT': {
        try {
          const { 
            id, 
            name, 
            contactPerson, 
            email, 
            phone, 
            company, 
            address, 
            taxOffice, 
            taxNumber, 
            companyType, 
            registrationNumber, 
            status,
            ...otherFields 
          } = req.body;

          if (!id) {
            return res.status(400).json({ error: 'Taşıyıcı ID gerekli' });
          }

          const updateData = {
            ...(name && { name }),
            ...(contactPerson && { contactPerson }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(company && { company }),
            ...(address && { address }),
            ...(taxOffice && { taxOffice }),
            ...(taxNumber && { taxNumber }),
            ...(companyType && { companyType }),
            ...(registrationNumber && { registrationNumber }),
            ...(status && { status }),
            ...otherFields,
            updatedAt: new Date()
          };

          const result = await db.collection('companies').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Taşıyıcı bulunamadı' });
          }

          return res.status(200).json({
            success: true,
            message: 'Taşıyıcı güncellendi'
          });
        } catch (error) {
          console.error('Taşıyıcı güncelleme hatası:', error);
          return res.status(500).json({ error: 'Taşıyıcı güncellenirken bir hata oluştu' });
        }
      }

      case 'DELETE': {
        try {
          const { id } = req.query;

          if (!id) {
            return res.status(400).json({ error: 'Taşıyıcı ID gerekli' });
          }

          const result = await db.collection('companies').deleteOne({ _id: new ObjectId(id) });

          if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Taşıyıcı bulunamadı' });
          }

          return res.status(200).json({
            success: true,
            message: 'Taşıyıcı silindi'
          });
        } catch (error) {
          console.error('Taşıyıcı silme hatası:', error);
          return res.status(500).json({ error: 'Taşıyıcı silinirken bir hata oluştu' });
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