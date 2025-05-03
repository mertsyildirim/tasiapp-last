import { connectToDatabase } from '/lib/minimal-mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Telefon numarası gerekli' });
    }

    const { db } = await connectToDatabase();
    
    // Telefon numarasına göre kullanıcıyı bul
    const user = await db.collection('customers').findOne({ phone });

    if (!user) {
      return res.status(404).json({ error: 'Bu telefon numarası ile kayıtlı kullanıcı bulunamadı' });
    }

    // OTP oluştur ve kaydet
    const otp = Math.floor(100000 + Math.random() * 900000); // 6 haneli OTP
    const otpExpiry = new Date(Date.now() + 10 * 60000); // 10 dakika geçerli

    await db.collection('otps').insertOne({
      userId: user._id,
      phone,
      otp,
      otpExpiry,
      createdAt: new Date()
    });

    // TODO: SMS gönderme işlemi burada yapılacak
    console.log(`OTP for ${phone}: ${otp}`);

    res.status(200).json({ message: 'OTP gönderildi' });
  } catch (error) {
    console.error('OTP gönderme hatası:', error);
    res.status(500).json({ error: 'OTP gönderilirken bir hata oluştu' });
  }
} 