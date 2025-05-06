import { connectToDatabase } from '../../../lib/minimal-mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: `Method ${req.method} not allowed` })
  }

  const { id } = req.query

  try {
    const { db } = await connectToDatabase()
    const services = db.collection('services')
    
    console.log('Aranan ID:', id)
    
    // ID'ye göre hizmeti bul
    let service
    
    // MongoDB ObjectId kontrolü
    if (ObjectId.isValid(id)) {
      console.log('ObjectId olarak geçerli, ObjectId ile aranıyor')
      service = await services.findOne({ _id: new ObjectId(id) })
      console.log('ObjectId ile arama sonucu:', service ? 'Bulundu' : 'Bulunamadı')
    }
    
    // ObjectId değilse (string ise), URL yoluyla arama yap
    if (!service) {
      // redirectUrl'e göre hizmeti bul
      console.log('redirectUrl ile aranıyor: /services/' + id)
      service = await services.findOne({ redirectUrl: `/services/${id}` })
      console.log('redirectUrl ile arama sonucu:', service ? 'Bulundu' : 'Bulunamadı')
      
      // Eğer böyle bir hizmet yoksa, slug ile dene
      if (!service) {
        console.log('slug ile aranıyor:', id)
        service = await services.findOne({ slug: id })
        console.log('slug ile arama sonucu:', service ? 'Bulundu' : 'Bulunamadı')
      }
    }
    
    if (!service) {
      console.log('Hizmet bulunamadı. Koleksiyon kontrolü yapılacak.')
      
      // Teşhis için koleksiyonda kaç hizmet olduğuna bakalım
      const count = await services.countDocuments({})
      console.log('Toplam hizmet sayısı:', count)
      
      // Örnek bir hizmet görelim
      if (count > 0) {
        const sampleService = await services.findOne({})
        console.log('Örnek hizmet:', {
          _id: sampleService._id,
          name: sampleService.name,
          redirectUrl: sampleService.redirectUrl,
          slug: sampleService.slug
        })
      }
      
      return res.status(404).json({ message: 'Hizmet bulunamadı' })
    }
    
    return res.status(200).json(service)
  } catch (error) {
    console.error('Hizmet bilgisi çekilirken hata:', error)
    return res.status(500).json({ message: 'Sunucu hatası', error: error.message })
  }
} 