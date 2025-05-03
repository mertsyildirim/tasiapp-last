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

// Global client değişkeni
let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // Development modunda global değişkeni yeniden kullan
  if (!global._mongoClientPromise) {
    console.log("Yeni MongoDB bağlantısı oluşturuluyor...");
    client = new MongoClient(MONGODB_URI, options);
    global._mongoClientPromise = client.connect();
  } else {
    console.log("Mevcut MongoDB bağlantısı kullanılıyor...");
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production modunda yeni bağlantı oluştur
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect();
}

// Veritabanına bağlan
export async function connectToDatabase() {
  try {
    // Client bağlantısını al
    const client = await clientPromise;
    // Veritabanı adı
    const db = client.db("tasiapp");
    
    console.log("MongoDB bağlantısı başarılı");
    return { db };
  } catch (error) {
    console.error("MongoDB bağlantı hatası:", error);
    throw new Error(`MongoDB bağlantı hatası: ${error.message}`);
  }
}

// Bağlantı kontrolü
export async function checkConnection() {
  try {
    const client = await clientPromise;
    await client.db("admin").command({ ping: 1 });
    const db = client.db('tasiapp');
    return { success: true, message: "Bağlantı başarılı" };
  } catch (error) {
    console.error("Bağlantı kontrolü hatası:", error);
    return { success: false, message: error.message, name: error.name };
  }
}

export default clientPromise; 