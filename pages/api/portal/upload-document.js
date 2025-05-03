import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { IncomingForm } from 'formidable';
import { uploadCarrierDocument, uploadFile } from '../../../lib/google-storage';
import fs from 'fs';
import path from 'path';

// formData işleme için config
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Sadece POST metodu kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metod desteklenmiyor' });
  }

  // Session kontrolü
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ success: false, message: 'Bu işlem için yetkilendirilmemiş' });
  }

  try {
    // Form verisini ayrıştır
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10 MB limit
    });

    // Form verisini işle
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    // Dosya ve belge kimliği kontrolü
    const file = files.file;
    const documentId = fields.documentId[0];

    if (!file || !documentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dosya veya belge kimliği eksik' 
      });
    }

    // Dosya bilgilerini al
    const filePath = file[0].filepath;
    const fileName = file[0].originalFilename;
    const fileSize = file[0].size;
    const fileType = file[0].mimetype;
    
    // Dosya uzantısı kontrolü
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Geçersiz dosya formatı. Sadece PDF, JPEG, JPG ve PNG dosyaları kabul edilir'
      });
    }

    // Dosya içeriğini oku
    const fileBuffer = fs.readFileSync(filePath);

    // Database bağlantısı
    const { db } = await connectToDatabase();
    
    // Kullanıcı bilgisini al
    const userId = session.user.id;

    // Şirket bilgilerini al
    const company = await db.collection('companies').findOne({ _id: new ObjectId(userId) });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
    }

    // Belge türünü belirle
    let documentType;
    if (documentId === "1") documentType = "vergi";
    else if (documentId === "2") documentType = "sicil";
    else if (documentId === "3") documentType = "imza";
    else if (documentId === "4") documentType = "k1";
    else if (documentId === "5") documentType = "k2";
    else if (documentId === "6") documentType = "k3";
    else documentType = "diger";

    // Dosya uzantısını belirle
    let fileExtension;
    if (fileType === 'application/pdf') {
      fileExtension = 'pdf';
    } else if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
      fileExtension = 'jpg';
    } else if (fileType === 'image/png') {
      fileExtension = 'png';
    }

    // Dosyayı GCS'ye yükle
    let uploadResult;
    try {
      // Görüntü dosyaları için genel bir yükleme yöntemi kullanalım
      if (fileType.startsWith('image/')) {
        const timestamp = new Date().getTime();
        const fileName = `tasiyici-firma-belge/${documentType}/${documentType}_${userId}_${timestamp}.${fileExtension}`;
        uploadResult = await uploadFile(fileBuffer, fileName, fileType);
      } else {
        // PDF dosyaları için mevcut uploadCarrierDocument fonksiyonunu kullanalım
        uploadResult = await uploadCarrierDocument(fileBuffer, userId, documentType);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Dosya yükleme hatası',
        error: error.message
      });
    }

    // Belge dizisini güncelle
    const documents = company.documents || [];
    
    // Mevcut belgeyi bul
    const docIndex = documents.findIndex(doc => doc.id === documentId);
    
    const updatedDocument = {
      id: documentId,
      status: 'pending', // Admin onayı bekliyor
      approved: false,  // Admin paneli ile uyumlu
      uploadDate: new Date(),
      fileUrl: uploadResult,
      fileName: fileName,
      fileSize: fileSize,
      fileType: fileType
    };

    // Belge dizisini güncelle
    if (docIndex !== -1) {
      documents[docIndex] = { ...documents[docIndex], ...updatedDocument };
    } else {
      documents.push(updatedDocument);
    }

    // Veritabanında güncelle
    const updateResult = await db.collection('companies').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          documents: documents,
          updatedAt: new Date()
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Şirket güncellenemedi' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Belge başarıyla yüklendi',
      document: updatedDocument
    });

  } catch (error) {
    console.error('Belge yükleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: error.message
    });
  }
} 