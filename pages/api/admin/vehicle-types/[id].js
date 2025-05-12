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

        // MongoDB 6+ için updateOne + findOne kullanımı
        const updateResult = await db.collection('vehicleTypes').updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              name: name.trim(),
              updatedAt: new Date()
            }
          }
        )

        if (updateResult.matchedCount === 0) {
          return res.status(404).json({ error: 'Araç tipi bulunamadı' })
        }

        // Güncellenmiş veriyi getir
        const updatedVehicleType = await db.collection('vehicleTypes').findOne({
          _id: new ObjectId(id)
        })

        return res.status(200).json(updatedVehicleType)
      } catch (error) {
        console.error('Araç tipi güncelleme hatası:', error)
        return res.status(500).json({ 
          error: 'Araç tipi güncellenirken bir hata oluştu',
          details: error.message
        })
      }
    }

    // DELETE: Araç tipini sil
    if (req.method === 'DELETE') {
      try {
        // Oturum kontrolünü tekrar yapalım (DELETE işlemi için de güvenlik)
        const session = await getServerSession(req, res, authOptions)
        if (!session) {
          return res.status(401).json({ error: 'Oturum açmanız gerekiyor' })
        }

        console.log('Silinecek araç tipi ID:', id);
        
        const result = await db.collection('vehicleTypes').deleteOne({
          _id: new ObjectId(id)
        });

        console.log('Silme sonucu:', result);

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Araç tipi bulunamadı' });
        }

        return res.status(200).json({ 
          success: true,
          message: 'Araç tipi başarıyla silindi' 
        });
      } catch (error) {
        console.error('Araç tipi silme hatası:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Araç tipi silinirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vehicle Type API Error:', error)
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
} 