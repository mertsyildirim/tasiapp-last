import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/admin/[...nextauth].js'
import connectDB from '../../../lib/minimal-mongodb'
import Campaign from '../../../models/Campaign'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' })
  }

  try {
    await connectDB()

    const { code, amount } = req.body

    if (!code || !amount) {
      return res.status(400).json({ error: 'Kampanya kodu ve tutar gereklidir' })
    }

    // Kampanyayı bul
    const campaign = await Campaign.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    })

    if (!campaign) {
      return res.status(404).json({ error: 'Geçerli bir kampanya bulunamadı' })
    }

    // Minimum tutar kontrolü
    if (amount < campaign.minOrderAmount) {
      return res.status(400).json({ 
        error: `Bu kampanyayı kullanmak için minimum ${campaign.minOrderAmount} TL tutarında sipariş vermelisiniz` 
      })
    }

    // Kullanım limiti kontrolü
    if (campaign.usageLimit && campaign.usageCount >= campaign.usageLimit) {
      return res.status(400).json({ error: 'Kampanya kullanım limiti dolmuştur' })
    }

    // Kullanıcı başına limit kontrolü
    if (campaign.userUsageLimit) {
      const userCount = campaign.userUsageCount.get(session.user.id) || 0
      if (userCount >= campaign.userUsageLimit) {
        return res.status(400).json({ error: 'Bu kampanyayı daha fazla kullanamazsınız' })
      }
    }

    // Kampanya geçerli, indirim tutarını hesapla
    let discountAmount = 0
    if (campaign.discountType === 'percentage') {
      discountAmount = amount * (campaign.discountValue / 100)
    } else {
      discountAmount = campaign.discountValue
    }

    // Kampanya kullanımını artır
    campaign.usageCount += 1
    if (session.user.id) {
      const userCount = campaign.userUsageCount.get(session.user.id) || 0
      campaign.userUsageCount.set(session.user.id, userCount + 1)
    }
    await campaign.save()

    return res.status(200).json({
      campaign: {
        id: campaign._id,
        name: campaign.name,
        discountType: campaign.discountType,
        discountValue: campaign.discountType === 'percentage' ? campaign.discountValue : discountAmount,
        minOrderAmount: campaign.minOrderAmount
      },
      discountAmount
    })

  } catch (error) {
    console.error('Kampanya doğrulama hatası:', error)
    return res.status(500).json({ error: 'Kampanya doğrulanırken bir hata oluştu' })
  }
} 
 
import { authOptions } from '../auth/admin/[...nextauth].js'
import connectDB from '/lib/minimal-mongodb'
import Campaign from '../../../models/Campaign'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' })
  }

  try {
    await connectDB()

    const { code, amount } = req.body

    if (!code || !amount) {
      return res.status(400).json({ error: 'Kampanya kodu ve tutar gereklidir' })
    }

    // Kampanyayı bul
    const campaign = await Campaign.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    })

    if (!campaign) {
      return res.status(404).json({ error: 'Geçerli bir kampanya bulunamadı' })
    }

    // Minimum tutar kontrolü
    if (amount < campaign.minOrderAmount) {
      return res.status(400).json({ 
        error: `Bu kampanyayı kullanmak için minimum ${campaign.minOrderAmount} TL tutarında sipariş vermelisiniz` 
      })
    }

    // Kullanım limiti kontrolü
    if (campaign.usageLimit && campaign.usageCount >= campaign.usageLimit) {
      return res.status(400).json({ error: 'Kampanya kullanım limiti dolmuştur' })
    }

    // Kullanıcı başına limit kontrolü
    if (campaign.userUsageLimit) {
      const userCount = campaign.userUsageCount.get(session.user.id) || 0
      if (userCount >= campaign.userUsageLimit) {
        return res.status(400).json({ error: 'Bu kampanyayı daha fazla kullanamazsınız' })
      }
    }

    // Kampanya geçerli, indirim tutarını hesapla
    let discountAmount = 0
    if (campaign.discountType === 'percentage') {
      discountAmount = amount * (campaign.discountValue / 100)
    } else {
      discountAmount = campaign.discountValue
    }

    // Kampanya kullanımını artır
    campaign.usageCount += 1
    if (session.user.id) {
      const userCount = campaign.userUsageCount.get(session.user.id) || 0
      campaign.userUsageCount.set(session.user.id, userCount + 1)
    }
    await campaign.save()

    return res.status(200).json({
      campaign: {
        id: campaign._id,
        name: campaign.name,
        discountType: campaign.discountType,
        discountValue: campaign.discountType === 'percentage' ? campaign.discountValue : discountAmount,
        minOrderAmount: campaign.minOrderAmount
      },
      discountAmount
    })

  } catch (error) {
    console.error('Kampanya doğrulama hatası:', error)
    return res.status(500).json({ error: 'Kampanya doğrulanırken bir hata oluştu' })
  }
} 
 