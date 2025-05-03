import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/admin/[...nextauth].js'
import { connectToDatabase } from '/lib/minimal-mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions)

    if (!session) {
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor' })
    }

    const { db } = await connectToDatabase()

    // GET: Tüm araç tiplerini getir
    if (req.method === 'GET') {
      try {
        const vehicleTypes = await db.collection('vehicleTypes').find({}).toArray()
        return res.status(200).json(vehicleTypes)
      } catch (error) {
        console.error('Araç tipleri getirme hatası:', error)
        return res.status(500).json({ error: 'Araç tipleri getirilirken bir hata oluştu' })
      }
    }

    // POST: Yeni araç tipi ekle
    if (req.method === 'POST') {
      try {
        const { name } = req.body

        if (!name || !name.trim()) {
          return res.status(400).json({ error: 'Araç tipi adı gereklidir' })
        }

        const result = await db.collection('vehicleTypes').insertOne({
          name: name.trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        })

        return res.status(201).json({
          _id: result.insertedId,
          name: name.trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      } catch (error) {
        console.error('Araç tipi ekleme hatası:', error)
        return res.status(500).json({ error: 'Araç tipi eklenirken bir hata oluştu' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vehicle Types API Error:', error)
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
} 