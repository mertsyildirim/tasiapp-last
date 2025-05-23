import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Sadece POST isteklerine izin ver
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Oturum kontrolü
  let session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ success: false, message: 'Oturumsuz erişim reddedildi' });
  }

  // İstek gövdesinden talep ID'sini al
  const { requestId } = req.body;
  
  if (!requestId) {
    return res.status(400).json({ success: false, message: 'Talep ID bilgisi zorunludur' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Kullanıcı bilgilerini al
    const userId = session.user.id;
    
    // Kullanıcının şirket bilgilerini al
    let company;
    try {
      company = await db.collection('companies').findOne({ 
        $or: [
          { _id: new ObjectId(userId) },
          { _id: userId },
          { email: session.user.email }
        ]
      });
    } catch (error) {
      console.error('Şirket bilgisi alınırken hata:', error);
      return res.status(500).json({ success: false, message: 'Şirket bilgisi alınamadı' });
    }

    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bilgisi bulunamadı' });
    }

    // Talebi bul
    let request;
    try {
      // Önce string ID ile dene
      request = await db.collection('requests').findOne({ id: requestId });
      
      // Bulunamazsa ObjectId ile dene
      if (!request && ObjectId.isValid(requestId)) {
        request = await db.collection('requests').findOne({ _id: new ObjectId(requestId) });
      }
    } catch (error) {
      console.error('Talep aranırken hata:', error);
      return res.status(500).json({ success: false, message: 'Talep bulunamadı' });
    }

    if (!request) {
      return res.status(404).json({ success: false, message: 'Talep bulunamadı' });
    }

    // Talebi güncelle
    try {
      const updateData = {
        status: 'accepted',
        carrierId: company._id.toString(),
        carrierName: company.companyName || company.contactPerson || company.name || '',
        carrierEmail: company.email || '',
        carrierPhone: company.phoneNumber || '',
        updatedAt: new Date()
      };
      
      const result = await db.collection('requests').updateOne(
        { _id: request._id },
        { $set: updateData }
      );
      
      if (result.modifiedCount === 1) {
        return res.status(200).json({ 
          success: true, 
          message: 'Talep başarıyla kabul edildi'
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          message: 'Talep güncellenemedi'
        });
      }
    } catch (error) {
      console.error('Talep güncellenirken hata:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Talep güncellenirken bir hata oluştu'
      });
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 