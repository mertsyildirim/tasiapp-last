import { clientPromise } from './connection';
import { INDEXES } from './collections';

// İndeksleri oluştur
export async function createIndexes() {
  try {
    const client = await clientPromise;
    const db = client.db('tasiapp');
    
    // Her koleksiyon için indeksleri oluştur
    for (const [collectionName, collectionIndexes] of Object.entries(INDEXES)) {
      const collection = db.collection(collectionName);
      
      for (const index of collectionIndexes) {
        await collection.createIndex(index.key, {
          unique: index.unique || false,
          sparse: index.sparse || false,
          background: true
        });
      }
    }
    
    console.log('Tüm indeksler başarıyla oluşturuldu');
  } catch (error) {
    console.error('İndeks oluşturma hatası:', error);
    throw error;
  }
}

// İndeksleri kontrol et
export async function checkIndexes() {
  try {
    const client = await clientPromise;
    const db = client.db('tasiapp');
    
    const results = {};
    
    for (const [collectionName, collectionIndexes] of Object.entries(INDEXES)) {
      const collection = db.collection(collectionName);
      const existingIndexes = await collection.indexes();
      
      results[collectionName] = {
        expected: collectionIndexes.length,
        actual: existingIndexes.length,
        indexes: existingIndexes
      };
    }
    
    return results;
  } catch (error) {
    console.error('İndeks kontrol hatası:', error);
    throw error;
  }
} 