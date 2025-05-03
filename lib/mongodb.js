import { MongoClient } from 'mongodb';

// URI kontrolü
const MONGODB_URI = process.env.MONGODB_URI;
console.log('MongoDB URI mevcut mu:', !!MONGODB_URI);

if (!MONGODB_URI) {
  throw new Error('MongoDB bağlantı URL\'si tanımlanmamış');
}

// Bağlantı seçenekleri
const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
};

// Global değişkenler
let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  console.log('Development modunda MongoDB bağlantısı oluşturuluyor...');
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    console.log('MongoDB client oluşturuldu, bağlantı başlatılıyor...');
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  console.log('Production modunda MongoDB bağlantısı oluşturuluyor...');
  client = new MongoClient(MONGODB_URI, options);
  console.log('MongoDB client oluşturuldu, bağlantı başlatılıyor...');
  clientPromise = client.connect();
}

// Veritabanına bağlan ve db nesnesini döndür
export async function connectToDatabase() {
  try {
    console.log('MongoDB bağlantısı isteniyor...');
    const client = await clientPromise;
    console.log('Client nesnesine erişim sağlandı');
    
    // Veritabanı seçimi
    const db = client.db('tasiapp');
    console.log('Veritabanına erişim sağlandı: tasiapp');
    
    return { client, db };
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
    throw new Error(`Veritabanına bağlanılamadı: ${error.message}`);
  }
}

// Bağlantıyı test et
export async function checkConnection() {
  try {
    console.log('MongoDB bağlantı durumu kontrol ediliyor...');
    const client = await clientPromise;
    console.log('Client nesnesine erişildi');
    
    await client.db("admin").command({ ping: 1 });
    console.log('MongoDB ping başarılı');
    const db = client.db('tasiapp');

    return { 
      success: true, 
      message: 'Bağlantı başarılı',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('MongoDB bağlantı kontrolü hatası:', error);
    return { 
      success: false, 
      message: 'Bağlantı başarısız', 
      error: error.message,
      name: error.name,
      timestamp: new Date().toISOString()
    };
  }
}

// Client promise'i dışa aktar
export default clientPromise; 