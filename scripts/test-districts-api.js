const { connectToDatabase } = require('../lib/minimal-mongodb');

async function main() {
  try {
    console.log('Veritabanına bağlanılıyor...');
    const { db } = await connectToDatabase();
    console.log('Veritabanına bağlantı başarılı.');
    
    // Routes koleksiyonundan city-districts verisini sorgula
    const routesData = await db.collection('routes').findOne({ type: 'city-districts' });
    
    if (!routesData) {
      console.error('İl ve ilçe verileri bulunamadı!');
      process.exit(1);
    }
    
    console.log('İl ve ilçe verileri başarıyla alındı:');
    console.log('Toplam il sayısı:', routesData.cities.length);
    console.log('İlçe verisi olan il sayısı:', Object.keys(routesData.districts).length);
    
    // İlk 3 il ve ilçelerini örnek olarak göster
    console.log('\nÖrnek il ve ilçe verileri:');
    const sampleCities = Object.keys(routesData.districts).slice(0, 3);
    
    for (const cityId of sampleCities) {
      const cityName = routesData.cities.find(city => city.id === cityId)?.name || cityId;
      const districts = routesData.districts[cityId];
      
      console.log(`\n${cityName} ili ilçeleri (${districts.length} adet):`);
      districts.forEach(district => {
        console.log(`- ${district.name} (${district.id})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

// Scripti çalıştır
main(); 