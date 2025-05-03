require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MONGODB_URI ortam değişkeni tanımlanmamış');
    process.exit(1);
  }

  console.log('MongoDB URI:', uri);
  
  try {
    console.log('MongoDB bağlantısı kuruluyor...');
    const client = new MongoClient(uri);
    await client.connect();
    
    console.log('Bağlantı başarılı!');
    const db = client.db('tasiapp');
    
    const collections = await db.listCollections().toArray();
    console.log('\nMevcut koleksiyonlar:');
    collections.forEach(coll => console.log(`- ${coll.name}`));
    
    await client.close();
    console.log('\nBağlantı kapatıldı');
  } catch (error) {
    console.error('Bağlantı hatası:', error);
    process.exit(1);
  }
}

testConnection(); 