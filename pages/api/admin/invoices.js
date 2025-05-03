import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import appConfig from '../../../lib/config';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';

// API_CONFIG yerine appConfig kullanacağız
const API_CONFIG = appConfig;

// CORS ve Formidable yapılandırması
export const config = {
  api: {
    externalResolver: true,
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS için header'lar
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONS isteği için erken dönüş
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
      });
    }

    // Veritabanı bağlantısı
    let db;
    try {
      const dbConnection = await connectToDatabase();
      db = dbConnection.db;
      if (!db) {
        throw new Error('Veritabanı bağlantısı kurulamadı');
      }
    } catch (dbError) {
      console.error('Veritabanı bağlantı hatası:', dbError);
      return res.status(500).json({
        success: false, 
        error: 'Veritabanı bağlantısı sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      });
    }

    // GET isteği - Faturaları listele
    if (req.method === 'GET') {
      try {
        const { limit = 10, page = 1, status, customerId, carrierId, type = 'customer' } = req.query;
        
        // Filtreleme seçenekleri
        const filter = {};
        
        // Fatura türüne göre filtreleme
        if (type) {
          filter.type = type;
        }
        
        // Durum filtresi
      if (status) {
        filter.status = status;
      }
      
        // Müşteri filtresi
      if (customerId) {
          filter.customerId = customerId;
      }
      
        // Taşıyıcı filtresi
      if (carrierId) {
          filter.carrierId = carrierId;
      }
      
        // Koleksiyonun varlığını kontrol et
        const collections = await db.listCollections({ name: 'invoices' }).toArray();
        if (collections.length === 0) {
          console.log('invoices koleksiyonu bulunamadı');
          return res.status(200).json({
            success: true,
            invoices: [],
            total: 0,
            page: parseInt(page),
            totalPages: 1,
            stats: {
              customer: {
                total: 0,
                paid: 0,
                pending: 0,
                canceled: 0,
                revenue: 0,
                pendingRevenue: 0
              },
              carrier: {
                total: 0,
                paid: 0,
                pending: 0,
                waitingDate: 0,
                canceled: 0,
                payment: 0,
                pendingPayment: 0
              }
            }
          });
      }

        // Toplam fatura sayısı
        const totalCount = await db.collection('invoices').countDocuments(filter);

      // Faturaları getir
      const invoices = await db.collection('invoices')
        .find(filter)
          .sort({ createdAt: -1 })
          .skip((parseInt(page) - 1) * parseInt(limit))
          .limit(parseInt(limit))
        .toArray();

      // İstatistikleri hesapla
      const stats = await getInvoiceStats(db, filter);

      // Frontend'in beklediği formatta yanıt oluştur
      const formattedStats = {
        customer: {
          total: stats.totalCount || 0,
          paid: stats.paidCount || 0,
          pending: stats.pendingCount || 0,
          canceled: stats.cancelledCount || 0,
          revenue: stats.paidAmount || 0,
          pendingRevenue: stats.pendingAmount || 0
        },
        carrier: {
          total: stats.totalCount || 0,
          paid: stats.paidCount || 0,
          pending: stats.pendingCount || 0,
          waitingDate: 0,
          canceled: stats.cancelledCount || 0,
          payment: stats.paidAmount || 0,
          pendingPayment: stats.pendingAmount || 0
        }
      };

      return res.status(200).json({
        success: true,
          invoices: invoices || [],
          total: totalCount || 0,
          page: parseInt(page),
          totalPages: Math.max(1, Math.ceil((totalCount || 0) / parseInt(limit))),
        stats: formattedStats
      });
      } catch (error) {
        console.error('Fatura listesi hatası:', error);
        return res.status(500).json({
          success: false,
          error: 'Fatura listesi işlemi sırasında bir hata oluştu'
        });
      }
    }

    // POST isteği - Yeni fatura oluştur
    if (req.method === 'POST') {
      const form = formidable({
        uploadDir: path.join(process.cwd(), 'public/uploads/invoices'),
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024, // 5MB
      });

      // Uploads klasörünü oluştur
      const uploadDir = path.join(process.cwd(), 'public/uploads/invoices');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      try {
        const [fields, files] = await new Promise((resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            resolve([fields, files]);
          });
        });

        // Zorunlu alanları kontrol et
        if (!fields.customerId || !fields.amount) {
          return res.status(400).json({
            success: false,
            error: 'Müşteri ve tutar alanları zorunludur'
          });
        }

        // Müşteriyi kontrol et
        const customer = await db.collection('customers').findOne({
          _id: new ObjectId(fields.customerId)
        });

        if (!customer) {
          return res.status(404).json({
            success: false,
            error: 'Müşteri bulunamadı'
          });
        }

        // Fatura numarası oluştur
        const invoiceNumber = `INV-${Date.now()}`;

        // PDF dosyası varsa işle
        let pdfPath = null;
        if (files.pdf) {
          const file = files.pdf;
          const fileName = `${invoiceNumber}-${file.originalFilename}`;
          const newPath = path.join(uploadDir, fileName);
          
          // Dosyayı taşı
          fs.renameSync(file.filepath, newPath);
          pdfPath = `/uploads/invoices/${fileName}`;
        }

        // Yeni fatura oluştur
        const newInvoice = {
          invoiceNumber,
          customerId: fields.customerId,
          orderId: fields.orderId || '',
          amount: parseFloat(fields.amount),
          description: fields.description || '',
          issueDate: new Date(),
          dueDate: fields.dueDate ? new Date(fields.dueDate) : null,
          status: 'pending',
          type: fields.type || 'customer',
          pdfPath,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Faturayı veritabanına kaydet
        const result = await db.collection('invoices').insertOne(newInvoice);

        return res.status(201).json({
          success: true,
          invoice: {
            ...newInvoice,
            _id: result.insertedId
          }
        });
      } catch (error) {
        console.error('Fatura oluşturma hatası:', error);
        return res.status(500).json({
          success: false,
          error: 'Fatura oluşturulurken bir hata oluştu'
        });
      }
    }

    // PUT isteği - Fatura güncelle
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Fatura ID gereklidir'
        });
      }

      try {
        const result = await db.collection('invoices').updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: {
              ...updateData,
              updatedAt: new Date()
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            error: 'Fatura bulunamadı'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Fatura başarıyla güncellendi'
        });
      } catch (error) {
        console.error('Fatura güncelleme hatası:', error);
        return res.status(500).json({
          success: false,
          error: 'Fatura güncellenirken bir hata oluştu'
        });
      }
    }

    // DELETE isteği - Fatura sil
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Fatura ID gereklidir'
        });
      }

      try {
        // Önce faturayı bul
        const invoice = await db.collection('invoices').findOne({ _id: new ObjectId(id) });

        if (!invoice) {
          return res.status(404).json({
            success: false,
            error: 'Fatura bulunamadı'
          });
        }

        // PDF dosyası varsa sil
        if (invoice.pdfPath) {
          const filePath = path.join(process.cwd(), 'public', invoice.pdfPath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        // Faturayı sil
        const result = await db.collection('invoices').deleteOne({ _id: new ObjectId(id) });

        return res.status(200).json({
          success: true,
          message: 'Fatura başarıyla silindi'
        });
      } catch (error) {
        console.error('Fatura silme hatası:', error);
        return res.status(500).json({
          success: false,
          error: 'Fatura silinirken bir hata oluştu'
        });
      }
    }

    // Diğer HTTP metodları için 405 hatası
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Genel hata:', error);
    return res.status(500).json({
      success: false,
      error: 'Bir hata oluştu'
    });
  }
}

// Fatura istatistiklerini hesapla
async function getInvoiceStats(db, baseFilter = {}) {
  try {
    // Toplam fatura sayısı
    const totalCount = await db.collection('invoices').countDocuments(baseFilter);
    
    // Ödenmiş faturalar
    const paidFilter = { ...baseFilter, status: 'paid' };
    const paidCount = await db.collection('invoices').countDocuments(paidFilter);
    const paidAmount = await db.collection('invoices')
      .aggregate([
        { $match: paidFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
      .toArray()
      .then(result => result[0]?.total || 0);

    // Bekleyen faturalar
    const pendingFilter = { ...baseFilter, status: 'pending' };
    const pendingCount = await db.collection('invoices').countDocuments(pendingFilter);
    const pendingAmount = await db.collection('invoices')
      .aggregate([
        { $match: pendingFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
      .toArray()
      .then(result => result[0]?.total || 0);

    // İptal edilen faturalar
    const cancelledFilter = { ...baseFilter, status: 'cancelled' };
    const cancelledCount = await db.collection('invoices').countDocuments(cancelledFilter);

    return {
      totalCount,
      paidCount,
      paidAmount,
      pendingCount,
      pendingAmount,
      cancelledCount
    };
  } catch (error) {
    console.error('İstatistik hesaplama hatası:', error);
    return {
      totalCount: 0,
      paidCount: 0,
      paidAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      cancelledCount: 0
    };
  }
} 