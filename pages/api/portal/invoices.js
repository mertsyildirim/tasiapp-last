import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '/lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    // Session kontrolü - authOptions olmadan basit kimlik doğrulama
    const session = await getServerSession(req, res);
    console.log('Oturum bilgisi:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('Oturum bulunamadı');
      return res.status(401).json({ error: 'Oturum bulunamadı' });
    }

    // Kullanıcı bilgilerini detaylı loglama
    console.log('Kullanıcı ID:', session.user.id);
    console.log('Kullanıcı Email:', session.user.email);
    console.log('Kullanıcı Adı:', session.user.name);

    const { method } = req;
    let db;

    try {
      const { db: database } = await connectToDatabase();
      db = database;
      console.log('MongoDB bağlantısı başarılı');
    } catch (error) {
      console.error('Veritabanı bağlantı hatası:', error);
      return res.status(500).json({ error: 'Veritabanına bağlanılamadı' });
    }

    // Session'da şirket bilgisi yoksa e-posta adresinden kullanıcıyı bul
    let companyId = session.user.id; // Önce standart ID'yi kontrol et
    
    // Session'da ID yoksa, e-posta adresine göre şirket ara
    if (!companyId && session.user.email) {
      console.log(`E-posta adresine göre şirket aranıyor: ${session.user.email}`);
      const company = await db.collection('companies').findOne({ email: session.user.email });
      
      if (company) {
        companyId = company._id;
        console.log(`E-posta adresine göre şirket bulundu. ID: ${companyId}`);
      } else {
        console.log('E-posta adresine göre şirket bulunamadı');
      }
    }
    
    console.log('Şirket ID olarak kullanılacak:', companyId);

    switch (method) {
      case 'GET': {
        try {
          const { page = 1, limit = 10, search = '', status = 'all', type = 'customer' } = req.query;
          const skip = (parseInt(page) - 1) * parseInt(limit);
          
          // Sorgu filtresi başlat
          const filter = {};
          
          // Fatura tipi filtresi (customer veya carrier)
          filter.type = type;
          console.log('Fatura tipi filtresi:', type);
          
          // Arama filtresi
          if (search) {
            filter.$or = [
              { number: { $regex: search, $options: 'i' } },
              { 'shipment.id': { $regex: search, $options: 'i' } },
              { 'shipment.details': { $regex: search, $options: 'i' } }
            ];
          }
          
          // Durum filtresi
          if (status !== 'all') {
            filter.status = status;
          }
          
          // Şirket ID filtresi - şirket ID var ise uygula
          if (companyId) {
            // ObjectId kontrolü yap
            if (ObjectId.isValid(companyId)) {
              // ObjectId araması
              filter.companyId = { $in: [new ObjectId(companyId), companyId] };
              console.log('Kullanılan ObjectId ve String:', new ObjectId(companyId), companyId);
            } else {
              // ID ObjectId değilse sadece string olarak ara
              filter.companyId = companyId;
              console.log('Sadece String ID kullanıldı:', companyId);
            }
          } else {
            console.log('Şirket ID bulunamadı, tüm faturalar getirilecek');
          }

          console.log('MongoDB sorgu filtresi:', JSON.stringify(filter, null, 2));

          // Faturaları getir
          const [invoices, total] = await Promise.all([
            db.collection('invoices')
              .find(filter)
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(parseInt(limit))
              .toArray(),
            db.collection('invoices').countDocuments(filter)
          ]);

          console.log('Şirkete ait bulunan fatura sayısı:', invoices.length);
          
          if (invoices.length > 0) {
            console.log('İlk fatura örneği:');
            console.log(JSON.stringify(invoices[0], null, 2));
          }

          // Veri tabanında henüz fatura yoksa, boş dizi döndür
          if (invoices.length === 0) {
            return res.status(200).json({
              success: true,
              invoices: [],
              pagination: {
                total: 0,
                pages: 0,
                current: parseInt(page)
              }
            });
          }

          return res.status(200).json({
            success: true,
            invoices: invoices,
            pagination: {
              total,
              pages: Math.ceil(total / parseInt(limit)),
              current: parseInt(page)
            }
          });
        } catch (error) {
          console.error('Faturaları getirme hatası:', error);
          return res.status(500).json({ error: 'Faturalar getirilirken bir hata oluştu' });
        }
      }

      case 'POST': {
        try {
          const { 
            number, amount, currency, status, issueDate, dueDate,
            paymentDate, shipmentId, shipmentDetails, paymentMethod, notes
          } = req.body;
          
          // Zorunlu alanları kontrol et
          if (!number || !amount || !currency || !issueDate) {
            return res.status(400).json({ error: 'Fatura numarası, tutar, para birimi ve fatura tarihi alanları zorunludur' });
          }
          
          // Yeni fatura oluştur
          const newInvoice = {
            number,
            amount,
            currency,
            status: status || 'pending',
            issueDate: new Date(issueDate),
            dueDate: dueDate ? new Date(dueDate) : null,
            paymentDate: paymentDate ? new Date(paymentDate) : null,
            shipmentId: shipmentId || null,
            shipmentDetails: shipmentDetails || '',
            paymentMethod: paymentMethod || null,
            companyId: ObjectId.isValid(companyId) ? new ObjectId(companyId) : companyId,
            notes: notes || '',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const result = await db.collection('invoices').insertOne(newInvoice);
          
          if (result.acknowledged) {
            // Eklenen faturayı geri döndür
            const insertedInvoice = {
              ...newInvoice,
              _id: result.insertedId
            };
            
            return res.status(201).json({
              success: true,
              data: insertedInvoice
            });
          } else {
            throw new Error('Fatura eklenemedi');
          }
        } catch (error) {
          console.error('Fatura ekleme hatası:', error);
          return res.status(500).json({ error: 'Fatura eklenirken bir hata oluştu' });
        }
      }
      
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
} 