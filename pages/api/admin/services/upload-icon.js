import { getServerSession } from 'next-auth';
import { authOptions } from '/pages/api/auth/admin/auth-options.js';
import { connectToDatabase } from '/lib/minimal-mongodb';
import { uploadServiceIcon } from '/lib/google-storage';
import formidable from 'formidable';
import fs from 'fs';
import { ObjectId } from 'mongodb';

// Formidable'ı yapılandır
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    // Sadece POST isteklerine izin ver
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }

    // Session kontrolü - e-posta API'si gibi sadece session kontrolü
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Oturum açmanız gerekiyor' });
    }

    // Formidable ile dosyayı al
    const form = formidable({ keepExtensions: true });
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Gerekli alanları kontrol et
    const serviceId = fields.serviceId?.[0];
    const iconFile = files.icon?.[0];

    if (!serviceId || !iconFile) {
      return res.status(400).json({ message: 'Hizmet ID ve ikon dosyası gereklidir' });
    }

    // Dosya uzantısını al
    const fileExtension = iconFile.originalFilename?.split('.').pop() || 'png';
    
    // Dosyayı oku
    const fileBuffer = fs.readFileSync(iconFile.filepath);
    
    // Google Cloud Storage'a yükle
    const iconUrl = await uploadServiceIcon(fileBuffer, serviceId, fileExtension);
    
    // Veritabanında hizmeti güncelle
    const { db } = await connectToDatabase();
    const result = await db.collection('services').updateOne(
      { _id: new ObjectId(serviceId) },
      { $set: { icon: iconUrl, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Hizmet bulunamadı' });
    }
    
    // Güncellenmiş hizmeti al
    const updatedService = await db.collection('services').findOne({ _id: new ObjectId(serviceId) });
    
    // Geçici dosyayı sil
    fs.unlinkSync(iconFile.filepath);
    
    return res.status(200).json({ 
      message: 'İkon başarıyla yüklendi',
      iconUrl,
      service: updatedService
    });
  } catch (error) {
    console.error('İkon yükleme API hatası:', error);
    return res.status(500).json({ message: 'İkon yüklenirken bir hata oluştu', error: error.message });
  }
} 