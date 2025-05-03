import { getServerSession } from 'next-auth';
import { authOptions } from '/pages/api/auth/admin/auth-options.js';
import { connectToDatabase } from '/lib/minimal-mongodb';

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const services = db.collection('services');

    switch (req.method) {
      case 'GET':
        // GET metodu için oturum kontrolü yapmıyoruz, herkes erişebilir
        const allServices = await services.find({}).sort({ createdAt: -1 }).toArray();
        return res.status(200).json(allServices);

      case 'POST':
        // Admin oturumunu kontrol et (basePath: "/api/auth/admin" ile uyumlu olacak)
        const session = await getServerSession(req, res, authOptions);
        
        // POST için sadece giriş kontrolü yap, rol kontrolü yapma
        if (!session) {
          return res.status(401).json({ message: 'Oturum açmanız gerekiyor' });
        }

        // Yeni hizmet verisini al
        const serviceData = req.body;
        
        // Eğer packageTitles yoksa, eski başlıklardan oluştur
        if (!serviceData.packageTitles || serviceData.packageTitles.length === 0) {
          const titles = [];
          
          if (serviceData.packageTitle1) {
            titles.push({
              id: '1',
              title: serviceData.packageTitle1,
              subtitle: [],
              required: false,
              type: 'input',
              icon: ''
            });
          }
          
          if (serviceData.packageTitle2) {
            titles.push({
              id: '2',
              title: serviceData.packageTitle2,
              subtitle: [],
              required: false,
              type: 'input',
              icon: ''
            });
          }
          
          if (serviceData.packageTitle3) {
            titles.push({
              id: '3',
              title: serviceData.packageTitle3,
              subtitle: [],
              required: false,
              type: 'input',
              icon: ''
            });
          }
          
          if (serviceData.packageTitle4) {
            titles.push({
              id: '4',
              title: serviceData.packageTitle4,
              subtitle: [],
              required: false,
              type: 'input',
              icon: ''
            });
          }
          
          serviceData.packageTitles = titles;
        }
        
        // Geriye dönük uyumluluk için, packageTitles'dan eski başlıkları da güncelle
        if (serviceData.packageTitles && serviceData.packageTitles.length > 0) {
          if (serviceData.packageTitles.length > 0) serviceData.packageTitle1 = serviceData.packageTitles[0].title;
          if (serviceData.packageTitles.length > 1) serviceData.packageTitle2 = serviceData.packageTitles[1].title;
          if (serviceData.packageTitles.length > 2) serviceData.packageTitle3 = serviceData.packageTitles[2].title;
          if (serviceData.packageTitles.length > 3) serviceData.packageTitle4 = serviceData.packageTitles[3].title;
        }

        const newService = {
          ...serviceData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const result = await services.insertOne(newService);
        return res.status(201).json({ ...newService, _id: result.insertedId });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Service API Error:', error);
    return res.status(500).json({ message: 'Bir hata oluştu' });
  }
} 