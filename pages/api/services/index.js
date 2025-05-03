import { connectToDatabase } from '/lib/minimal-mongodb'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: `Method ${req.method} not allowed` })
  }

  try {
    const { db } = await connectToDatabase()
    const services = db.collection('services')
    
    // Aktif hizmetleri al
    const allServices = await services
      .find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .toArray()
    
    // Döndürülen hizmetlerde eksik alanları kontrol et
    const processedServices = allServices.map(service => {
      const processedService = { ...service };
      
      // packageTitles alanı yoksa, eski başlıklardan oluştur
      if (!processedService.packageTitles || processedService.packageTitles.length === 0) {
        const titles = [];
        
        if (processedService.packageTitle1) {
          titles.push({
            id: '1',
            title: processedService.packageTitle1,
            subtitle: [],
            required: false,
            type: 'input',
            icon: ''
          });
        }
        
        if (processedService.packageTitle2) {
          titles.push({
            id: '2',
            title: processedService.packageTitle2,
            subtitle: [],
            required: false,
            type: 'input',
            icon: ''
          });
        }
        
        if (processedService.packageTitle3) {
          titles.push({
            id: '3',
            title: processedService.packageTitle3,
            subtitle: [],
            required: false,
            type: 'input',
            icon: ''
          });
        }
        
        if (processedService.packageTitle4) {
          titles.push({
            id: '4',
            title: processedService.packageTitle4,
            subtitle: [],
            required: false,
            type: 'input',
            icon: ''
          });
        }
        
        processedService.packageTitles = titles;
      }
      
      return processedService;
    });
    
    return res.status(200).json(processedServices)
  } catch (error) {
    console.error('Service API Error:', error)
    return res.status(500).json({ message: 'Bir hata oluştu' })
  }
} 