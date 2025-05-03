import { getSession } from 'next-auth/react';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { uploadCustomerInvoicePdf, uploadCarrierInvoicePdf } from '../../../../lib/google-storage';

// formidable ile dosya yükleyeceğimiz için Next.js'in varsayılan body parser'ı devre dışı bırakılmalı
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

    // Form data'yı parse et
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
    const { invoiceId, invoiceType = 'customer' } = fields;
    const pdf = files.pdf;

    // PDF dosyası ve fatura ID kontrolü
    if (!pdf || !invoiceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'PDF dosyası ve fatura ID gereklidir' 
      });
    }

    // PDF MIME tip kontrolü
    if (pdf.mimetype !== 'application/pdf') {
      return res.status(400).json({ 
        success: false, 
        message: 'Dosya PDF formatında olmalıdır' 
      });
    }

    // Dosyayı oku
    const fileBuffer = fs.readFileSync(pdf.filepath);
    
    // Google Cloud Storage'a yükle
    let publicUrl;
    if (invoiceType === 'carrier') {
      publicUrl = await uploadCarrierInvoicePdf(fileBuffer, invoiceId);
    } else {
      publicUrl = await uploadCustomerInvoicePdf(fileBuffer, invoiceId);
    }
    
    // Veritabanı bağlantısı
    const { db } = await connectToDatabase();
    
    // Faturayı güncelle
    const updateResult = await db.collection('invoices').updateOne(
      { _id: new ObjectId(invoiceId) },
      { 
        $set: { 
          pdf_url: publicUrl,
          updated_at: new Date()
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fatura bulunamadı' 
      });
    }

    // Başarı yanıtı
    return res.status(200).json({ 
      success: true, 
      message: 'Fatura PDF dosyası başarıyla yüklendi',
      pdf_url: publicUrl
    });

  } catch (error) {
    console.error('PDF yükleme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'PDF yüklenirken bir hata oluştu', 
      error: error.message 
    });
  }
} 