import { getSession } from 'next-auth/react';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { Storage } from '@google-cloud/storage';
import axios from 'axios';

// Google Cloud Storage istemcisini oluştur
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

// Bucket adı
const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'tasiapp-storage';

export default async function handler(req, res) {
  // Sadece GET isteklerini kabul et
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Sadece GET istekleri kabul edilir' });
  }

  try {
    // Oturum kontrolü
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ success: false, message: 'Yetkisiz erişim' });
    }

    // Fatura ID'sini al
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Fatura ID gereklidir' });
    }

    // Veritabanına bağlan
    const { db } = await connectToDatabase();

    // Faturayı bul
    const invoice = await db.collection('invoices').findOne({ 
      _id: new ObjectId(id),
      userId: session.user.id // Sadece kullanıcının kendi faturalarına erişmesini sağla
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Fatura bulunamadı veya bu faturaya erişim yetkiniz yok' });
    }

    // PDF URL kontrolü
    if (!invoice.pdf_url) {
      return res.status(404).json({ success: false, message: 'Bu faturaya ait PDF dosyası bulunamadı' });
    }
    
    // Google Cloud Storage URL'inden dosya mı yoksa yerel dosya mı olduğunu kontrol et
    if (invoice.pdf_url.startsWith('https://storage.googleapis.com/')) {
      // Google Cloud Storage URL'i
      try {
        // Google Cloud Storage URL'inden dosyayı çek
        const storageUrl = invoice.pdf_url;
        
        // URL'den bucket ve nesne adını ayır
        // https://storage.googleapis.com/bucket-name/path/to/file.pdf
        const urlParts = storageUrl.replace('https://storage.googleapis.com/', '').split('/');
        const bucketName = urlParts[0];
        const objectName = urlParts.slice(1).join('/');
        
        // Dosya adını oluştur
        const invoiceNumber = invoice.invoice_number || 'fatura';
        const fileName = `${invoiceNumber}.pdf`;
        
        // Google Storage'dan dosyayı al
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(objectName);
        
        // Dosya var mı kontrol et
        const [exists] = await file.exists();
        if (!exists) {
          return res.status(404).json({ success: false, message: 'PDF dosyası Cloud Storage\'da bulunamadı' });
        }
        
        // Dosya metadata al
        const [metadata] = await file.getMetadata();
        
        // Header'ları ayarla
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', metadata.size);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        // Dosyayı stream et
        const readStream = file.createReadStream();
        readStream.pipe(res);
        
      } catch (error) {
        console.error('Cloud Storage dosya indirme hatası:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'PDF dosyası yüklenirken bir hata oluştu', 
          error: error.message 
        });
      }
    } else {
      // Yerel dosya
      // PDF dosya yolunu oluştur
      const pdfRelativePath = invoice.pdf_url.replace(/^\/uploads\//, '');
      const pdfFilePath = path.join(process.cwd(), 'public', 'uploads', pdfRelativePath);

      // Dosya varlığını kontrol et
      if (!fs.existsSync(pdfFilePath)) {
        return res.status(404).json({ success: false, message: 'PDF dosyası sunucuda bulunamadı' });
      }

      // Dosya okunabilirliğini kontrol et
      try {
        fs.accessSync(pdfFilePath, fs.constants.R_OK);
      } catch (error) {
        return res.status(500).json({ 
          success: false, 
          message: 'PDF dosyasına erişilemedi', 
          error: error.message 
        });
      }

      // Dosya stats al (boyut vs.)
      const stat = fs.statSync(pdfFilePath);

      // Dosya adını oluştur
      const invoiceNumber = invoice.invoice_number || 'fatura';
      const fileName = `${invoiceNumber}.pdf`;

      // Header'ları ayarla
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Dosyayı stream et
      const fileStream = fs.createReadStream(pdfFilePath);
      fileStream.pipe(res);
    }

  } catch (error) {
    console.error('Fatura indirme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Fatura indirilirken bir hata oluştu', 
      error: error.message 
    });
  }
} 