import { getServerSession } from 'next-auth'
import { authOptions } from '/pages/api/auth/admin/auth-options.js';
import { connectToDatabase } from '/lib/minimal-mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  try {
    const { id } = req.query

    const { db } = await connectToDatabase()
    const services = db.collection('services')

    switch (req.method) {
      case 'GET':
        // GET metodu için kimlik doğrulama yapmayacağız, herkes erişebilir
        const service = await services.findOne({ _id: new ObjectId(id) })
        if (!service) {
          return res.status(404).json({ message: 'Hizmet bulunamadı' })
        }
        return res.status(200).json(service)

      case 'PUT':
      case 'DELETE':
      case 'PATCH':
        // Yönetim işlemleri için kimlik doğrulama gerekli
        const session = await getServerSession(req, res, authOptions)

        // Sadece giriş kontrolü yap, rol kontrolü yapma
        if (!session) {
          return res.status(401).json({ message: 'Oturum açmanız gerekiyor' })
        }
        
        // PUT metodu için işlemler
        if (req.method === 'PUT') {
          try {
            // Güncellenecek verileri al
            const updateData = req.body;
            
            // Eğer packageTitles yoksa, eski başlıklardan oluştur
            if (!updateData.packageTitles || updateData.packageTitles.length === 0) {
              const titles = [];
              
              if (updateData.packageTitle1) {
                titles.push({
                  id: '1',
                  title: updateData.packageTitle1,
                  subtitle: [],
                  required: false,
                  type: 'input',
                  icon: ''
                });
              }
              
              if (updateData.packageTitle2) {
                titles.push({
                  id: '2',
                  title: updateData.packageTitle2,
                  subtitle: [],
                  required: false,
                  type: 'input',
                  icon: ''
                });
              }
              
              if (updateData.packageTitle3) {
                titles.push({
                  id: '3',
                  title: updateData.packageTitle3,
                  subtitle: [],
                  required: false,
                  type: 'input',
                  icon: ''
                });
              }
              
              if (updateData.packageTitle4) {
                titles.push({
                  id: '4',
                  title: updateData.packageTitle4,
                  subtitle: [],
                  required: false,
                  type: 'input',
                  icon: ''
                });
              }
              
              updateData.packageTitles = titles;
            }
            
            // Geriye dönük uyumluluk için, packageTitles'dan eski başlıkları da güncelle
            if (updateData.packageTitles && updateData.packageTitles.length > 0) {
              if (updateData.packageTitles.length > 0) updateData.packageTitle1 = updateData.packageTitles[0].title;
              if (updateData.packageTitles.length > 1) updateData.packageTitle2 = updateData.packageTitles[1].title;
              if (updateData.packageTitles.length > 2) updateData.packageTitle3 = updateData.packageTitles[2].title;
              if (updateData.packageTitles.length > 3) updateData.packageTitle4 = updateData.packageTitles[3].title;
            }

            // Mevcut servisi bul
            const existingService = await services.findOne({ _id: new ObjectId(id) });
            if (!existingService) {
              return res.status(404).json({ error: 'Hizmet bulunamadı' });
            }

            // Güncelleme tarihini ekle
            updateData.updatedAt = new Date();

            // MongoDB sürümüne bağlı olarak iki farklı parametre kullanılabilir
            // Bu yüzden her iki durumu da destekleyecek şekilde güncelleme yapıyoruz
            try {
              // Yöntem 1: findOneAndUpdate ve güncel MongoDB sürümleri için
              const updatedService = await services.findOneAndUpdate(
                { _id: new ObjectId(id) },
                { $set: updateData },
                { returnDocument: 'after' }
              );
              
              if (updatedService && updatedService.value) {
                return res.status(200).json(updatedService.value);
              }
              
              // Yöntem 2: updateOne ile güncelleme
              const updateResult = await services.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
              );
              
              if (updateResult.matchedCount > 0) {
                // Güncellenmiş servisi tekrar çek
                const updatedDoc = await services.findOne({ _id: new ObjectId(id) });
                return res.status(200).json(updatedDoc);
              }
              
              return res.status(404).json({ error: 'Güncelleme başarısız oldu' });
            } catch (updateError) {
              console.error('Veritabanı güncellemesinde hata:', updateError);
              
              // Son çare olarak eskisini tamamen değiştir
              try {
                // _id alanını güncelleme
                delete updateData._id;
                
                await services.replaceOne(
                  { _id: new ObjectId(id) },
                  { ...existingService, ...updateData }
                );
                
                const finalDoc = await services.findOne({ _id: new ObjectId(id) });
                return res.status(200).json(finalDoc);
              } catch (replaceError) {
                throw replaceError;
              }
            }
          } catch (error) {
            console.error('Hizmet güncellenirken hata:', error);
            return res.status(500).json({ error: 'Hizmet güncellenirken bir hata oluştu', details: error.message });
          }
        }
        
        // DELETE metodu için işlemler
        if (req.method === 'DELETE') {
          const deleteResult = await services.deleteOne({ _id: new ObjectId(id) })
          
          if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ message: 'Hizmet bulunamadı' })
          }
          
          return res.status(200).json({ message: 'Hizmet başarıyla silindi' })
        }
        
        // PATCH metodu için işlemler
        if (req.method === 'PATCH') {
          const { isActive } = req.body
          const result = await services.updateOne(
            { _id: new ObjectId(id) },
            { $set: { isActive } }
          )
          
          if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Hizmet bulunamadı' })
          }
          
          return res.status(200).json({ message: 'Hizmet durumu başarıyla güncellendi' })
        }
        
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH'])
        return res.status(405).json({ message: `Method ${req.method} not allowed` })
    }
  } catch (error) {
    console.error('Service API Error:', error)
    return res.status(500).json({ message: 'Bir hata oluştu' })
  }
} 