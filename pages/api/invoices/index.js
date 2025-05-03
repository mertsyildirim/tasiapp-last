import { connectToDatabase } from '/lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
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
    const { db } = await connectToDatabase();
    
    // GET isteği - Faturaları listele
    if (req.method === 'GET') {
      // Query parametreleri
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const skip = (page - 1) * limit;
      const status = req.query.status || null;
      
      // Filtreleme seçenekleri oluştur
      let filter = {};
      
      // Role göre filtreleme
      if (session.user.role === 'admin') {
        // Admin tüm faturaları görebilir
      } else if (session.user.role === 'carrier') {
        filter.carrier = session.user.id;
      } else {
        filter.customer = session.user.id;
      }
      
      if (status) {
        filter.status = status;
      }
      
      // Faturaları getir
      const invoices = await db.collection('invoices')
        .find(filter)
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      // Toplam fatura sayısını getir
      const total = await db.collection('invoices').countDocuments(filter);
      
      // Sonuç döndür
      return res.status(200).json({
        success: true,
        count: invoices.length,
        invoices: invoices.length > 0 ? invoices : []
      });
    }
    
    // POST isteği - Yeni fatura oluştur
    if (req.method === 'POST') {
      // Sadece admin ve carrier rolleri fatura oluşturabilir
      if (session.user.role !== 'admin' && session.user.role !== 'carrier') {
        return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
      }
      
      const { 
        customer, carrier, type, amount, tax, totalAmount, currency,
        items, status, issueDate, dueDate, period, shipments, billingAddress, notes 
      } = req.body;
      
      // Zorunlu alanları kontrol et
      if (!customer || !amount || !totalAmount || !items || !issueDate || !dueDate) {
        return res.status(400).json({ message: 'Zorunlu alanlar eksik' });
      }
      
      // Yeni fatura oluştur
      const today = new Date();
      const year = today.getFullYear().toString().substr(-2);
      
      // Son ID'yi al
      const lastInvoice = await db.collection('invoices')
        .find({ id: new RegExp(`^INV${year}`) })
        .sort({ id: -1 })
        .limit(1)
        .toArray();
      
      let counter = 0;
      if (lastInvoice.length > 0) {
        const lastId = lastInvoice[0].id;
        counter = parseInt(lastId.substring(5), 10);
      }
      
      counter++;
      const id = `INV${year}${counter.toString().padStart(4, '0')}`;
      const invoiceNo = `F-${today.getFullYear()}-${counter.toString().padStart(4, '0')}`;
      
      const newInvoice = {
        id,
        invoiceNo,
        type: type || 'service',
        amount,
        tax: tax || 0,
        totalAmount,
        currency: currency || 'TRY',
        status: status || 'draft',
        customer,
        carrier: carrier || session.user.id,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        period: period || '',
        shipments: shipments || [],
        totalShipments: shipments ? shipments.length : 0,
        items,
        billingAddress,
        notes,
        createdAt: today,
        updatedAt: today
      };
      
      const result = await db.collection('invoices').insertOne(newInvoice);
      
      // Taşıma kayıtlarını güncelle
      if (shipments && shipments.length > 0) {
        await Promise.all(shipments.map(shipmentId => 
          db.collection('shipments').updateOne(
            { _id: shipmentId },
            { $set: { invoice: id } }
          )
        ));
      }
      
      return res.status(201).json({
        success: true,
        invoice: { ...newInvoice, _id: result.insertedId }
      });
    }
    
  } catch (error) {
    console.error('Faturalar API hatası:', error);
    return res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
} 