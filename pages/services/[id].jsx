import React from 'react'
import { useRouter } from 'next/router'
import { connectToDatabase } from '../../lib/minimal-mongodb'
import ServiceTemplatePage from './template'
import { ObjectId } from 'mongodb'

export default function DynamicServicePage({ service }) {
  const router = useRouter()
  
  // Service bilgisi yoksa sayfa hala yükleniyor demektir
  if (router.isFallback || !service) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
    </div>
  }
  
  // Template sayfasını döndür ve service objesini prop olarak geçir
  return <ServiceTemplatePage service={service} serviceId={router.query.id} />
}

// Sunucu tarafında veri çekme
export async function getServerSideProps(context) {
  const { id } = context.params
  
  try {
    const { db } = await connectToDatabase()
    const services = db.collection('services')
    
    // ID'ye göre hizmeti bul
    let service
    
    // MongoDB ObjectId kontrolü
    if (ObjectId.isValid(id)) {
      service = await services.findOne({ _id: new ObjectId(id) })
    }
    
    // ObjectId değilse (string ise), URL yoluyla arama yap
    if (!service) {
      // redirectUrl'e göre hizmeti bul
      service = await services.findOne({ redirectUrl: `/services/${id}` })
      
      // Eğer böyle bir hizmet yoksa, slug ile dene
      if (!service) {
        service = await services.findOne({ slug: id })
      }
    }
    
    if (!service) {
      console.log('Hizmet bulunamadı. Aranan ID:', id)
      return {
        notFound: true // 404 sayfasına yönlendir
      }
    }
    
    // BSON formatından JSON formatına dönüştür
    service = JSON.parse(JSON.stringify(service))
    console.log('Hizmet bulundu:', service.name)
    
    return {
      props: {
        service
      }
    }
  } catch (error) {
    console.error('Hizmet bilgisi çekilirken hata:', error)
    return {
      notFound: true
    }
  }
}