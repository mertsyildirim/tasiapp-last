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
        const vehicleTypes = await db.collection('vehicleTypes')
          .find({})
          .sort({ name: 1 }) // İsme göre sırala
          .toArray();

        // İsteğe bağlı filtreleme
        if (req.query.search) {
          const searchTerm = req.query.search.toLowerCase();
          return res.status(200).json(
            vehicleTypes.filter(type => 
              type.name.toLowerCase().includes(searchTerm)
            )
          );
        }

        return res.status(200).json(vehicleTypes);
      } catch (error) {
        console.error('Araç tipleri getirme hatası:', error);
        return res.status(500).json({ 
          error: 'Araç tipleri getirilirken bir hata oluştu',
          details: error.message 
        });
      }
    }

    // POST: Yeni araç tipi ekle
    if (req.method === 'POST') {
      try {
        // Oturum kontrolünü tekrar yapalım (POST işlemi için de güvenlik)
        const session = await getServerSession(req, res, authOptions)
        if (!session) {
          return res.status(401).json({ error: 'Oturum açmanız gerekiyor' })
        }

        const { name } = req.body

        if (!name || !name.trim()) {
          return res.status(400).json({ error: 'Araç tipi adı gereklidir' })
        }

        // Aynı isimde araç tipi var mı kontrol et
        const existingType = await db.collection('vehicleTypes').findOne({
          name: name.trim()
        });

        if (existingType) {
          return res.status(400).json({ error: 'Bu isimde bir araç tipi zaten mevcut' });
        }

        const vehicleTypeDoc = {
          name: name.trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection('vehicleTypes').insertOne(vehicleTypeDoc);

        return res.status(201).json({
          _id: result.insertedId,
          ...vehicleTypeDoc
        });
      } catch (error) {
        console.error('Araç tipi ekleme hatası:', error)
        return res.status(500).json({ 
          error: 'Araç tipi eklenirken bir hata oluştu',
          details: error.message
        })
      }
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Vehicle Types API Error:', error)
    return res.status(500).json({ error: 'Server error', details: error.message })
  }
} 