import { MongoClient } from 'mongodb';

// Bağlantı URL'si
const MONGODB_URI = "mongodb+srv://tasi_app:Tasiapp@cluster0.ttipxu5.mongodb.net/tasiapp?retryWrites=true&w=majority";

// Bağlantı seçenekleri
const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 60000,
};

console.log("MongoDB bağlantısı hazırlanıyor...");

let cachedDb = null;
let cachedClient = null;

export async function connectToDatabase() {
  if (cachedDb) {
    console.log("Var olan veritabanı bağlantısı kullanılıyor");
    try {
      // Bağlantının hala aktif olup olmadığını kontrol et
      await cachedClient.db().admin().ping();
      return { db: cachedDb, client: cachedClient };
    } catch (error) {
      console.log("Önbelleğe alınmış bağlantı kopmuş, yeniden bağlanılıyor...");
      cachedDb = null;
      cachedClient = null;
    }
  }

  let retries = 3;
  let lastError = null;

  while (retries > 0) {
    try {
      console.log(`MongoDB bağlantısı deneniyor... (Kalan deneme: ${retries})`);
      
      if (!MONGODB_URI) {
        throw new Error(
          "MongoDB bağlantı URL'si bulunamadı. Ortam değişkeni MONGODB_URI tanımlanmamış."
        );
      }

      // MongoDB bağlantısını oluştur
      const client = new MongoClient(MONGODB_URI, options);
      console.log("MongoDB client oluşturuldu, bağlantı başlatılıyor...");
      
      // Bağlantıyı aç
      await client.connect();
      console.log("MongoDB bağlantısı başarılı");
      
      // Bağlantıyı test et
      await client.db().admin().ping();
      console.log("MongoDB ping testi başarılı");
      
      // Veritabanı seçimi
      const db = client.db();
      console.log("Veritabanına erişim sağlandı: tasiapp");

      // Bağlantıyı önbelleğe kaydet
      cachedClient = client;
      cachedDb = db;
      
      return { db, client };
    } catch (error) {
      lastError = error;
      console.error(`MongoDB bağlantı hatası (Kalan deneme: ${retries}):`, error);
      retries--;
      
      if (retries > 0) {
        // Yeniden denemeden önce bekle (1 saniye)
        console.log("Tekrar denemeden önce 1 saniye bekleniyor...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  console.error("Tüm MongoDB bağlantı denemeleri başarısız oldu:", lastError);
  throw lastError || new Error("MongoDB'ye bağlanılamadı.");
}

// Bağlantıyı kapat
export async function closeDatabaseConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log("MongoDB bağlantısı kapatıldı");
  }
}

// Koleksiyon varlığını kontrol et ve oluştur
export async function ensureCollection(collectionName) {
  try {
    // Veritabanı bağlantısını al
    const { db } = await connectToDatabase();
    
    // Koleksiyonları listele
    const collections = await db.listCollections({ name: collectionName }).toArray();
    
    // Koleksiyon yoksa oluştur
    if (collections.length === 0) {
      console.log(`${collectionName} koleksiyonu bulunamadı, oluşturuluyor...`);
      await db.createCollection(collectionName);
      console.log(`${collectionName} koleksiyonu oluşturuldu.`);
    } else {
      console.log(`${collectionName} koleksiyonu zaten mevcut.`);
    }
    
    return true;
  } catch (error) {
    console.error(`ensureCollection(${collectionName}) hatası:`, error);
    throw new Error(`Koleksiyon oluşturma hatası: ${error.message}`);
  }
}

// Bağlantı durumunu kontrol et
export async function checkConnection() {
  try {
    const { client } = await connectToDatabase();
    const adminDb = client.db().admin();
    const result = await adminDb.ping();
    return result.ok === 1;
  } catch (error) {
    console.error("Bağlantı kontrolü hatası:", error);
    return false;
  }
}