import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/admin/[...nextauth]';
import { connectToDatabase } from '../../../../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    console.log("Vehicle Brand Models API çağrıldı:", req.method, "Brand ID:", req.query.id);
    
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
      return res.status(400).json({ success: false, message: 'Geçersiz marka ID formatı' });
    }

    const brandId = new ObjectId(id);

    // GET: Markaya ait tüm modelleri getir
    if (req.method === 'GET') {
      try {
        console.log("Marka modelleri getiriliyor:", id);
        
        const brand = await db.collection('brands').findOne(
          { _id: brandId },
          { projection: { models: 1, name: 1 } }
        );
        
        if (!brand) {
          return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        }
        
        return res.status(200).json({ 
          success: true, 
          brandName: brand.name,
          models: brand.models || [] 
        });
      } catch (error) {
        console.error('Modeller getirme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Modeller getirilirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    // POST: Yeni model ekle
    if (req.method === 'POST') {
      try {
        console.log("Yeni model ekleniyor...");
        
        const { name } = req.body;
        
        if (!name || !name.trim()) {
          return res.status(400).json({ 
            success: false, 
            message: 'Model adı zorunludur' 
          });
        }

        // Markayı bul
        const brand = await db.collection('brands').findOne({ _id: brandId });
        
        if (!brand) {
          return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        }
        
        // Aynı isimde model var mı kontrol et
        const models = brand.models || [];
        if (models.some(model => model.toLowerCase() === name.trim().toLowerCase())) {
          return res.status(400).json({ 
            success: false, 
            message: 'Bu markada aynı isimde bir model zaten mevcut' 
          });
        }

        // Yeni modeli ekle
        const updateResult = await db.collection('brands').updateOne(
          { _id: brandId },
          { 
            $push: { models: name.trim() },
            $set: { updatedAt: new Date() }
          }
        );

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Marka bulunamadı' 
          });
        }

        // Güncellenmiş markayı getir
        const updatedBrand = await db.collection('brands').findOne(
          { _id: brandId },
          { projection: { models: 1, name: 1 } }
        );
        
        return res.status(201).json({ 
          success: true, 
          brandName: updatedBrand.name,
          models: updatedBrand.models || [] 
        });
      } catch (error) {
        console.error('Model ekleme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Model eklenirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Brand Models API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      details: error.message 
    });
  }
} 