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
    const { id } = req.query

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Geçersiz ID' })
    }

    // PUT: Araç tipini güncelle
    if (req.method === 'PUT') {
      try {
        const { name } = req.body

        if (!name || !name.trim()) {
          return res.status(400).json({ error: 'Araç tipi adı gereklidir' })
        }

        const result = await db.collection('vehicleTypes').findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            $set: {
              name: name.trim(),
              updatedAt: new Date()
            }
          },
          { returnDocument: 'after' }
        )

        if (!result.value) {
          return res.status(404).json({ error: 'Araç tipi bulunamadı' })
        }

        return res.status(200).json(result.value)
      } catch (error) {
        console.error('Araç tipi güncelleme hatası:', error)
        return res.status(500).json({ error: 'Araç tipi güncellenirken bir hata oluştu' })
      }
    }

    // DELETE: Araç tipini sil
    if (req.method === 'DELETE') {
      try {
        const result = await db.collection('vehicleTypes').findOneAndDelete({
          _id: new ObjectId(id)
        })

        if (!result.value) {
          return res.status(404).json({ error: 'Araç tipi bulunamadı' })
        }

        return res.status(200).json({ message: 'Araç tipi başarıyla silindi' })
      } catch (error) {
        console.error('Araç tipi silme hatası:', error)
        return res.status(500).json({ error: 'Araç tipi silinirken bir hata oluştu' })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vehicle Type API Error:', error)
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
} 