import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Yalnızca GET, PUT ve DELETE isteklerine izin ver
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
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
    
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Fatura ID gerekli' 
      });
    }
    
    // Faturayı getir
    const invoice = await db.collection('invoices')
      .findOne({ _id: new ObjectId(id) });
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        error: 'Fatura bulunamadı' 
      });
    }
    
    // Rol bazlı erişim kontrolü
    if (session.user.role !== 'admin' && 
        invoice.customer.toString() !== session.user.id && 
        invoice.carrier.toString() !== session.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'Bu faturaya erişim yetkiniz yok' 
      });
    }
    
    // GET isteği - Faturayı getir
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        invoice
      });
    }
    
    // PUT isteği - Faturayı güncelle
    if (req.method === 'PUT') {
      // Yalnızca admin ve carrier rolleri fatura güncelleyebilir
      if (session.user.role !== 'admin' && session.user.role !== 'carrier') {
        return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
      }
      
      const { status, dueDate, billingAddress, notes } = req.body;
      
      // Güncelleme nesnesi oluştur
      const updateObj = { updatedAt: new Date() };
      
      if (status) updateObj.status = status;
      if (dueDate) updateObj.dueDate = new Date(dueDate);
      if (billingAddress) updateObj.billingAddress = billingAddress;
      if (notes) updateObj.notes = notes;
      
      // Eğer status paid olarak güncelleniyorsa, paidDate ekle
      if (status === 'paid' && invoice.status !== 'paid') {
        updateObj.paidDate = new Date();
      }
      
      // Faturayı güncelle
      await db.collection('invoices').updateOne(
        { _id: new ObjectId(id) },
        { $set: updateObj }
      );
      
      // Güncellenmiş faturayı getir
      const updatedInvoice = await db.collection('invoices').findOne({ _id: new ObjectId(id) });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Fatura başarıyla güncellendi',
        invoice: updatedInvoice
      });
    }
    
    // DELETE isteği - Faturayı sil
    if (req.method === 'DELETE') {
      // Yalnızca admin ve carrier rolleri fatura silebilir
      if (session.user.role !== 'admin' && session.user.role !== 'carrier') {
        return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
      }
      
      // Fatura silinmeden önce taşıma kayıtlarından referansı kaldır
      if (invoice.shipments && invoice.shipments.length > 0) {
        await db.collection('shipments').updateMany(
          { _id: { $in: invoice.shipments } },
          { $unset: { invoice: "" } }
        );
      }
      
      // Faturayı sil
      await db.collection('invoices').deleteOne({ _id: new ObjectId(id) });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Fatura başarıyla silindi'
      });
    }
    
  } catch (error) {
    console.error('Fatura işlemi hatası:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Sunucu hatası' 
    });
  }
} 