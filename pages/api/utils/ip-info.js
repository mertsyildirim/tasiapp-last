import { getSession } from 'next-auth/react';

/**
 * IP adresi bilgisinden konum bilgilerini getiren API endpoint
 * 
 * Bu API, verilen IP adresini kullanarak şehir, ilçe, ülke gibi konum bilgilerini döndürür.
 */
export default async function handler(req, res) {
  try {
    console.log('IP-Info API çağrıldı', req.query);
    
    // Geliştirme aşamasında güvenlik kontrolünü geçici olarak kaldırıyoruz
    // Gerçek uygulamada bu kısmı aktif etmek gerekir
    /*
    const session = await getSession({ req });
    if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
      return res.status(403).json({ success: false, message: 'Bu API endpoint\'ine erişim izniniz yok.' });
    }
    */

    const { ip } = req.query;
    
    if (!ip) {
      console.log('IP bilgisi eksik');
      return res.status(400).json({ success: false, message: 'IP adresi belirtilmemiş.' });
    }

    // Bu örnek için yerel bir mock servis kullanıyoruz
    const locationInfo = await getMockLocationFromIp(ip);
    console.log('IP için bulunan konum:', locationInfo);
    
    // Başarılı yanıt döndür
    return res.status(200).json({
      success: true,
      ...locationInfo
    });
  } catch (error) {
    console.error('IP bilgisi alınırken hata:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Konum bilgisi alınamadı.', 
      error: error.message 
    });
  }
}

/**
 * IP adresine göre mock konum bilgisi döndürür.
 */
async function getMockLocationFromIp(ip) {
  // IP'nin son octet'ine göre rastgele ama tutarlı lokasyon ataması yapalım
  let lastOctet = 0;
  
  try {
    // IP adresinin geçerli olup olmadığını kontrol et
    if (ip && ip.includes('.')) {
      lastOctet = parseInt(ip.split('.').pop() || '0');
    } else {
      // IP adresi yoksa veya yanlış formattaysa rastgele bir değer kullan
      lastOctet = Math.floor(Math.random() * 10);
    }
  } catch (e) {
    console.error('IP adresi ayrıştırılırken hata:', e);
    lastOctet = Math.floor(Math.random() * 10);
  }
  
  // Türkiye'deki iller ve ilçeler
  const locations = [
    { city: 'İstanbul', district: 'Kadıköy', country: 'Türkiye' },
    { city: 'İstanbul', district: 'Beşiktaş', country: 'Türkiye' },
    { city: 'İstanbul', district: 'Üsküdar', country: 'Türkiye' },
    { city: 'Ankara', district: 'Çankaya', country: 'Türkiye' },
    { city: 'Ankara', district: 'Keçiören', country: 'Türkiye' },
    { city: 'İzmir', district: 'Konak', country: 'Türkiye' },
    { city: 'İzmir', district: 'Karşıyaka', country: 'Türkiye' },
    { city: 'Bursa', district: 'Nilüfer', country: 'Türkiye' },
    { city: 'Antalya', district: 'Muratpaşa', country: 'Türkiye' },
    { city: 'Adana', district: 'Seyhan', country: 'Türkiye' },
  ];
  
  const index = lastOctet % locations.length;
  return locations[index];
} 