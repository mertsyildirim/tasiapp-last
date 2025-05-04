import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { connectToDatabase } from '../../../lib/minimal-mongodb';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ success: false, error: 'Oturum bulunamadı' });
  }

  // Users koleksiyonunda olup olmadığını kontrol et
  try {
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: session.user.email });

    if (!user) {
      return res.status(403).json({ success: false, error: 'Kullanıcı veritabanında bulunamadı' });
  }

    // Başarılı doğrulama
  return res.status(200).json({
    success: true,
    user: {
        id: user._id.toString(),
      email: user.email,
        name: user.name || '',
        role: 'admin', // Erişim iznini admin olarak ayarla
        roles: ['admin'] // Admin rolünü dizisine ekle
    }
  });
  } catch (error) {
    console.error('Auth check hatası:', error);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
}
