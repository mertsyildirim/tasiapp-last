import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/admin/[...nextauth].js'
import { connectToDatabase } from '/lib/minimal-mongodb'

export default async function handler(req, res) {
  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions)

    if (!session) {
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor' })
    }

    const { db } = await connectToDatabase()

    // GET: Kampanya ayarlarını getir
    if (req.method === 'GET') {
      try {
        const settings = await db.collection('settings').findOne({ type: 'campaign' })
        
        if (!settings) {
          // Varsayılan ayarları döndür
          return res.status(200).json({
            success: true,
            data: {
              enableCampaigns: false,
              allowMultipleCampaigns: false,
              defaultDiscount: 0
            }
          })
        }

        return res.status(200).json({
          success: true,
          data: settings.settings
        })
      } catch (error) {
        console.error('Kampanya ayarları getirme hatası:', error)
        return res.status(500).json({ error: 'Kampanya ayarları getirilirken bir hata oluştu' })
      }
    }

    // POST: Kampanya ayarlarını güncelle
    if (req.method === 'POST') {
      try {
        const settings = req.body

        const result = await db.collection('settings').updateOne(
          { type: 'campaign' },
          {
            $set: {
              type: 'campaign',
              settings: settings,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        )

        return res.status(200).json({
          success: true,
          message: 'Kampanya ayarları başarıyla kaydedildi'
        })
      } catch (error) {
        console.error('Kampanya ayarları güncelleme hatası:', error)
        return res.status(500).json({ error: 'Kampanya ayarları güncellenirken bir hata oluştu' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Campaign Settings API Error:', error)
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
} 