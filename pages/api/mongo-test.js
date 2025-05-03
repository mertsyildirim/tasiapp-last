import { MongoClient } from 'mongodb';

// Basit MongoDB bağlantı testi
export default async function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Doğrudan sabit URL ile test
    const uri = "mongodb+srv://tasi_app:Tasiapp@cluster0.ttipxu5.mongodb.net/tasiapp?retryWrites=true&w=majority";
    console.log('MongoDB bağlantısı deneniyor...');
    
    // Bağlantı seçenekleri
    const options = {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      serverSelectionTimeoutMS: 5000
    };
    
    const client = new MongoClient(uri, options);
    await client.connect();
    
    // Ping testi
    await client.db("admin").command({ ping: 1 });
    
    // Veritabanını doğrula
    const db = client.db("tasiapp");
    const collections = await db.listCollections().toArray();
    
    // Bağlantıyı kapat
    await client.close();
    
    // Başarılı yanıt
    return res.status(200).json({
      success: true,
      message: 'MongoDB bağlantı testi başarılı',
      databaseName: db.databaseName,
      collectionsCount: collections.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('MongoDB Bağlantı Hatası:', error);
    
    return res.status(500).json({
      success: false,
      error: 'MongoDB bağlantı hatası',
      message: error.message,
      name: error.name,
      timestamp: new Date().toISOString()
    });
  }
} 