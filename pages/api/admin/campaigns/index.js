import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/admin/[...nextauth].js'
import connectDB from '/lib/minimal-mongodb'
import Campaign from '../../../../models/Campaign'

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' })
  }

  if (session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' })
  }

  try {
    await connectDB()
    
    switch (req.method) {
      case 'GET':
        try {
          const campaigns = await Campaign.find().sort({ createdAt: -1 })
          res.status(200).json(campaigns)
        } catch (error) {
          console.error('Kampanyalar yüklenirken hata:', error)
          res.status(500).json({ error: 'Kampanyalar yüklenirken bir hata oluştu' })
        }
        break

      case 'POST':
        try {
          const campaign = new Campaign(req.body)
          await campaign.save()
          res.status(201).json(campaign)
        } catch (error) {
          console.error('Kampanya oluşturulurken hata:', error)
          res.status(500).json({ error: 'Kampanya oluşturulurken bir hata oluştu' })
        }
        break

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Veritabanı bağlantı hatası:', error)
    res.status(500).json({ error: 'Veritabanına bağlanırken bir hata oluştu' })
  }
} 