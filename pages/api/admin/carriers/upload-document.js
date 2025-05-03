import { getSession } from 'next-auth/react';
import formidable from 'formidable';
import fs from 'fs';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { uploadCarrierDocument } from '../../../../lib/google-storage';

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
      return res.status(401).json({ success: false, message: 'Yetkisiz erişim' });
    }

    // Form datasını parse et
    const form = formidable({ 
      multiples: false,
      keepExtensions: true 
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Formdan verileri al
    const { carrierId, documentType, expiryDate } = fields;
    const document = files.document;

    // Dosya ve taşıyıcı ID kontrolü
    if (!document || !carrierId || !documentType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dosya, taşıyıcı ID ve belge türü gereklidir' 
      });
    }

    // PDF MIME tip kontrolü
    if (document.mimetype !== 'application/pdf') {
      return res.status(400).json({ 
        success: false, 
        message: 'Dosya PDF formatında olmalıdır' 
      });
    }

    // Dosyayı oku
    const fileBuffer = fs.readFileSync(document.filepath);
    
    // Google Cloud Storage'a yükle
    const publicUrl = await uploadCarrierDocument(fileBuffer, carrierId, documentType);
    
    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();
    
    // Taşıyıcı belgesini güncelle
    // Önce taşıyıcı belgesinin düzenini ve veriyi kontrol et
    const carrier = await db.collection('companies').findOne({ _id: new ObjectId(carrierId) });
    
    if (!carrier) {
      return res.status(404).json({ 
        success: false, 
        message: 'Taşıyıcı bulunamadı' 
      });
    }
    
    // documents nesnesini oluştur veya güncelle
    const documents = carrier.documents || {};
    
    // Belge bilgisini güncelle
    documents[documentType] = {
      url: publicUrl,
      uploadDate: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      approved: false,
    };
    
    // Taşıyıcıyı güncelle
    const updateResult = await db.collection('companies').updateOne(
      { _id: new ObjectId(carrierId) },
      { 
        $set: { 
          documents: documents,
          updated_at: new Date()
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Taşıyıcı güncellenemedi' 
      });
    }

    // Başarı yanıtı
    return res.status(200).json({ 
      success: true, 
      message: 'Taşıyıcı belgesi başarıyla yüklendi',
      document_url: publicUrl
    });

  } catch (error) {
    console.error('Belge yükleme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Belge yüklenirken bir hata oluştu', 
      error: error.message 
    });
  }
} 