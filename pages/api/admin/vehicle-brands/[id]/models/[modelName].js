import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/admin/[...nextauth]';
import { connectToDatabase } from '../../../../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    console.log("Vehicle Brand Model API çağrıldı:", req.method, "Brand ID:", req.query.id, "Model:", req.query.modelName);
    
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

    const { id, modelName } = req.query;
    
    if (!modelName) {
      return res.status(400).json({ success: false, message: 'Model adı belirtilmedi' });
    }

    // ID kontrolü
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Geçersiz marka ID formatı' });
    }

    const brandId = new ObjectId(id);
    const decodedModelName = decodeURIComponent(modelName);
    
    // GET: Belirli bir modeli getir
    if (req.method === 'GET') {
      try {
        console.log("Model bilgisi getiriliyor:", decodedModelName);
        
        const brand = await db.collection('brands').findOne(
          { _id: brandId },
          { projection: { models: 1, name: 1 } }
        );
        
        if (!brand) {
          return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        }
        
        const models = brand.models || [];
        const model = models.find(m => m === decodedModelName);
        
        if (!model) {
          return res.status(404).json({ success: false, message: 'Model bulunamadı' });
        }
        
        return res.status(200).json({ 
          success: true, 
          brandName: brand.name,
          model
        });
      } catch (error) {
        console.error('Model getirme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Model getirilirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    // DELETE: Model sil
    if (req.method === 'DELETE') {
      try {
        console.log("Model siliniyor:", decodedModelName);
        
        // Markayı kontrol et
        const brand = await db.collection('brands').findOne({ _id: brandId });
        
        if (!brand) {
          return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        }
        
        // Modeli kontrol et
        const models = brand.models || [];
        if (!models.includes(decodedModelName)) {
          return res.status(404).json({ success: false, message: 'Model bulunamadı' });
        }
        
        // Modeli çıkar
        const updateResult = await db.collection('brands').updateOne(
          { _id: brandId },
          { 
            $pull: { models: decodedModelName },
            $set: { updatedAt: new Date() }
          }
        );
        
        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        }
        
        if (updateResult.modifiedCount === 0) {
          return res.status(400).json({ success: false, message: 'Model silinemedi' });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Model başarıyla silindi'
        });
      } catch (error) {
        console.error('Model silme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Model silinirken bir hata oluştu',
          details: error.message 
        });
      }
    }
    
    // PUT: Model güncelle
    if (req.method === 'PUT') {
      try {
        console.log("Model güncelleniyor:", decodedModelName);
        
        const { newName } = req.body;
        
        if (!newName || !newName.trim()) {
          return res.status(400).json({ 
            success: false, 
            message: 'Yeni model adı zorunludur' 
          });
        }
        
        // Markayı kontrol et
        const brand = await db.collection('brands').findOne({ _id: brandId });
        
        if (!brand) {
          return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        }
        
        // Eski modeli kontrol et
        const models = brand.models || [];
        const modelIndex = models.indexOf(decodedModelName);
        
        if (modelIndex === -1) {
          return res.status(404).json({ success: false, message: 'Model bulunamadı' });
        }
        
        // Aynı isimde başka model var mı kontrol et
        if (models.some((m, i) => i !== modelIndex && m.toLowerCase() === newName.trim().toLowerCase())) {
          return res.status(400).json({ 
            success: false, 
            message: 'Bu markada aynı isimde başka bir model zaten mevcut' 
          });
        }
        
        // Modelin adını güncelle
        models[modelIndex] = newName.trim();
        
        const updateResult = await db.collection('brands').updateOne(
          { _id: brandId },
          { 
            $set: { 
              models: models,
              updatedAt: new Date() 
            }
          }
        );
        
        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ success: false, message: 'Marka bulunamadı' });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Model başarıyla güncellendi',
          model: newName.trim()
        });
      } catch (error) {
        console.error('Model güncelleme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Model güncellenirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Brand Model API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      details: error.message 
    });
  }
} 