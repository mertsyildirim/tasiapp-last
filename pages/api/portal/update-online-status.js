import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/portal/[...nextauth]'
import dbConnect from '../../../lib/dbConnect'
import User from '../../../models/User'

// CORS middleware
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  return await fn(req, res);
};

// Ana işleyici fonksiyonu
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session) {
      return res.status(401).json({ success: false, message: 'Oturum açılmadığı için durum güncellenemedi' })
    }

    await dbConnect()

    const { isOnline } = req.body

    // Kullanıcıyı güncelle
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { 
        isOnline,
        lastSeen: new Date()
      },
      { new: true }
    )

    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' })
    }

    // Socket.IO sunucusuna bildirim gönder
    if (req.socket.server.io) {
      req.socket.server.io.emit('userStatusChange', {
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      })
    }

    return res.status(200).json({ 
      success: true, 
      message: `Kullanıcı durumu ${isOnline ? 'çevrimiçi' : 'çevrimdışı'} olarak güncellendi`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    })
  } catch (error) {
    console.error('Durum güncelleme hatası:', error)
    return res.status(500).json({ success: false, message: 'Sunucu hatası' })
  }
}

// CORS middleware ile sarılmış handler fonksiyonu
export default allowCors(handler); 