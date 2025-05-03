import { getSession } from 'next-auth/react';
import formidable from 'formidable';
import fs from 'fs';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { uploadVehicleDocument } from '../../../../lib/google-storage';
import path from 'path';

// formidable kullanıldığı için Next.js'in varsayılan body parser'ını devre dışı bırak
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Sadece POST istekleri kabul edilir' });
  }

  try {
    // Oturum kontrolü
    const session = await getSession({ req });
    if (!session || !session.user.isAdmin) {
      return res.status(401).json({ success: false, message: 'Bu işlem için yetkiniz yok' });
    }

    // Form verisini parse et
    const form = formidable({ multiples: false });
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    // Gerekli alanları kontrol et
    if (!fields.vehicleId || !fields.documentType || !files.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Eksik bilgi: Araç ID, belge türü ve dosya gereklidir' 
      });
    }

    // Belge validasyonu
    const file = files.file;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Sadece PDF, JPEG, JPG ve PNG dosyaları yüklenebilir' 
      });
    }

    // Dosya uzantısını al
    const fileExtension = path.extname(file.originalFilename).substring(1);
    
    // Dosyayı oku
    const fileBuffer = fs.readFileSync(file.filepath);
    
    // Dosyayı Google Cloud Storage'a yükle
    const fileUrl = await uploadVehicleDocument(
      fileBuffer, 
      fields.vehicleId, 
      fields.documentType,
      fileExtension
    );

    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();
    
    // Belge bilgilerini hazırla
    const documentData = {
      type: fields.documentType,
      name: getDocumentName(fields.documentType),
      validUntil: fields.validUntil || null,
      url: fileUrl,
      uploadDate: new Date(),
      approved: false,
      status: 'Aktif'
    };

    // Belgeyi araç dokümanları koleksiyonuna ekle
    const insertResult = await db.collection('vehicle_documents').insertOne({
      vehicleId: fields.vehicleId,
      ...documentData
    });

    // Belge ID'sini ekle
    documentData.id = insertResult.insertedId.toString();

    // Aracı güncelle - documents alanına yeni belgeyi ekle
    await db.collection('vehicles').updateOne(
      { _id: new ObjectId(fields.vehicleId) },
      { 
        $push: { documents: documentData },
        $set: { updatedAt: new Date() }
      }
    );

    // Başarılı cevap döndür
    return res.status(200).json({ 
      success: true, 
      message: 'Belge başarıyla yüklendi',
      document: documentData
    });

  } catch (error) {
    console.error('Belge yükleme hatası:', error);
    return res.status(500).json({ success: false, message: 'Belge yüklenirken bir hata oluştu' });
  }
}

// Belge türüne göre belge adı döndürme
function getDocumentName(documentType) {
  switch (documentType) {
    case 'registration':
      return 'Ruhsat';
    case 'inspection':
      return 'Muayene Belgesi';
    case 'insurance':
      return 'Sigorta Poliçesi';
    case 'comprehensive':
      return 'Kasko Poliçesi';
    default:
      return 'Belge';
  }
} 