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

    // Freelance kullanıcı reddettiğinde, talebin "rejected_by" listesine kullanıcının ID'sini ekle
    // Bu şekilde kullanıcıya bir daha gösterilmez
    try {
      const userId = session.user.id;
      
      const updateData = {
        updatedAt: new Date()
      };
      
      // rejected_by alanı yoksa oluştur
      const updateOperation = request.rejected_by 
        ? { 
            $addToSet: { rejected_by: userId },
            $set: updateData
          }
        : { 
            $set: { 
              ...updateData,
              rejected_by: [userId] 
            } 
          };
      
      const result = await db.collection('requests').updateOne(
        { _id: request._id },
        updateOperation
      );
      
      if (result.modifiedCount === 1) {
        return res.status(200).json({ 
          success: true, 
          message: 'Talep başarıyla reddedildi'
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