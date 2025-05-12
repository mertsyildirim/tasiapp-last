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

    // GET: Bildirim ayarlarını getir
    if (req.method === 'GET') {
      try {
        const settings = await db.collection('settings').findOne({ type: 'notifications' })
        
        if (!settings) {
          // Varsayılan ayarları döndür
          return res.status(200).json({
            success: true,
            data: {
              emailNotifications: false,
              smsNotifications: false,
              desktopNotifications: false,
              systemEvents: false,
              userEvents: false,
              paymentEvents: false,
              shippingEvents: false
            }
          })
        }

        return res.status(200).json({
          success: true,
          data: settings.settings
        })
      } catch (error) {
        console.error('Bildirim ayarları getirme hatası:', error)
        return res.status(500).json({ error: 'Bildirim ayarları getirilirken bir hata oluştu' })
      }
    }

    // POST: Bildirim ayarlarını güncelle
    if (req.method === 'POST') {
      try {
        const settings = req.body

        const result = await db.collection('settings').updateOne(
          { type: 'notifications' },
          {
            $set: {
              type: 'notifications',
              settings: settings,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        )

        return res.status(200).json({
          success: true,
          message: 'Bildirim ayarları başarıyla kaydedildi'
        })
      } catch (error) {
        console.error('Bildirim ayarları güncelleme hatası:', error)
        return res.status(500).json({ error: 'Bildirim ayarları güncellenirken bir hata oluştu' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Notification Settings API Error:', error)
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
} 