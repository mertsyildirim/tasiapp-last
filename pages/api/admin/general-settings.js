import { getServerSession } from 'next-auth';
import { authOptions } from '/pages/api/auth/admin/auth-options.js';
import { connectToDatabase } from '/lib/minimal-mongodb';

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const settings = db.collection('settings');

    // Sadece admin yetkisi kontrolü
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Yetkisiz erişim' });
    }

    switch (req.method) {
      case 'GET':
        // Genel ayarları getir
        const generalSettings = await settings.findOne({ type: 'general' });
        
        // Ayarlar yoksa varsayılan ayarları döndür
        if (!generalSettings) {
          return res.status(200).json({
            success: true,
            data: {
              siteName: 'Taşı App',
              contactEmail: 'iletisim@tasiapp.com',
              phone: '+90 212 123 4567',
              address: 'Ataşehir, İstanbul, Türkiye',
              workingHours: {
                start: '09:00',
                end: '18:00'
              }
            }
          });
        }
        
        return res.status(200).json({ success: true, data: generalSettings });

      case 'POST':
        // Gelen verileri al
        const data = req.body;
        
        // Genel ayarlar var mı kontrol et
        const existingSettings = await settings.findOne({ type: 'general' });
        
        if (existingSettings) {
          // Ayarları güncelle
          const result = await settings.updateOne(
            { type: 'general' },
            { $set: { 
                siteName: data.siteName,
                contactEmail: data.contactEmail,
                phone: data.phone,
                address: data.address,
                workingHours: data.workingHours,
                updatedAt: new Date()
              }
            }
          );
          
          if (result.modifiedCount === 0) {
            return res.status(500).json({ success: false, message: 'Ayarlar güncellenemedi' });
          }
          
          return res.status(200).json({ success: true, message: 'Ayarlar başarıyla güncellendi' });
        } else {
          // Yeni ayarları ekle
          const newSettings = {
            type: 'general',
            siteName: data.siteName,
            contactEmail: data.contactEmail,
            phone: data.phone,
            address: data.address,
            workingHours: data.workingHours,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const result = await settings.insertOne(newSettings);
          
          if (!result.insertedId) {
            return res.status(500).json({ success: false, message: 'Ayarlar eklenemedi' });
          }
          
          return res.status(201).json({ success: true, message: 'Ayarlar başarıyla eklendi' });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('General Settings API Error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: error.message });
  }
} 
 
 
 
 
 
 
 
 
 