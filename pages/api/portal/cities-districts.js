import { getServerSession } from 'next-auth/next';
import { connectToDatabase } from '../../../lib/minimal-mongodb';

export default async function handler(req, res) {
  try {
    // Session kontrolü - basit kimlik doğrulama
    const session = await getServerSession(req, res);
    console.log('Oturum bilgisi:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('Oturum bulunamadı');
      return res.status(401).json({ success: false, message: 'Bu işlem için giriş yapmalısınız' });
    }

    // Sadece GET metodunu kabul et
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, message: 'Metod desteklenmiyor' });
    }

    try {
      // Database bağlantısı yap
      const { db } = await connectToDatabase();
      console.log('MongoDB bağlantısı başarılı');
      
      // Routes koleksiyonundan şehir ve ilçe verilerini sorgula
      const routesData = await db.collection('routes').findOne({ type: 'city-districts' });

      // Eğer veri bulunduysa döndür
      if (routesData && routesData.cities && routesData.districts) {
        console.log('Mevcut routes verileri bulundu');
        return res.status(200).json({
          success: true,
          cities: routesData.cities,
          districts: routesData.districts
        });
      }
      
      console.log('Routes verileri bulunamadı, yeni veri oluşturuluyor');
      // Veritabanında veri yoksa, Türkiye'deki illerin statik listesi
      const cities = [
        { id: 'adana', name: 'Adana' },
        { id: 'adiyaman', name: 'Adıyaman' },
        { id: 'afyonkarahisar', name: 'Afyonkarahisar' },
        { id: 'agri', name: 'Ağrı' },
        { id: 'aksaray', name: 'Aksaray' },
        { id: 'amasya', name: 'Amasya' },
        { id: 'ankara', name: 'Ankara' },
        { id: 'antalya', name: 'Antalya' },
        { id: 'ardahan', name: 'Ardahan' },
        { id: 'artvin', name: 'Artvin' },
        { id: 'aydin', name: 'Aydın' },
        { id: 'balikesir', name: 'Balıkesir' },
        { id: 'bartin', name: 'Bartın' },
        { id: 'batman', name: 'Batman' },
        { id: 'bayburt', name: 'Bayburt' },
        { id: 'bilecik', name: 'Bilecik' },
        { id: 'bingol', name: 'Bingöl' },
        { id: 'bitlis', name: 'Bitlis' },
        { id: 'bolu', name: 'Bolu' },
        { id: 'burdur', name: 'Burdur' },
        { id: 'bursa', name: 'Bursa' },
        { id: 'canakkale', name: 'Çanakkale' },
        { id: 'cankiri', name: 'Çankırı' },
        { id: 'corum', name: 'Çorum' },
        { id: 'denizli', name: 'Denizli' },
        { id: 'diyarbakir', name: 'Diyarbakır' },
        { id: 'duzce', name: 'Düzce' },
        { id: 'edirne', name: 'Edirne' },
        { id: 'elazig', name: 'Elazığ' },
        { id: 'erzincan', name: 'Erzincan' },
        { id: 'erzurum', name: 'Erzurum' },
        { id: 'eskisehir', name: 'Eskişehir' },
        { id: 'gaziantep', name: 'Gaziantep' },
        { id: 'giresun', name: 'Giresun' },
        { id: 'gumushane', name: 'Gümüşhane' },
        { id: 'hakkari', name: 'Hakkari' },
        { id: 'hatay', name: 'Hatay' },
        { id: 'igdir', name: 'Iğdır' },
        { id: 'isparta', name: 'Isparta' },
        { id: 'istanbul', name: 'İstanbul' },
        { id: 'izmir', name: 'İzmir' },
        { id: 'kahramanmaras', name: 'Kahramanmaraş' },
        { id: 'karabuk', name: 'Karabük' },
        { id: 'karaman', name: 'Karaman' },
        { id: 'kars', name: 'Kars' },
        { id: 'kastamonu', name: 'Kastamonu' },
        { id: 'kayseri', name: 'Kayseri' },
        { id: 'kilis', name: 'Kilis' },
        { id: 'kirikkale', name: 'Kırıkkale' },
        { id: 'kirklareli', name: 'Kırklareli' },
        { id: 'kirsehir', name: 'Kırşehir' },
        { id: 'kocaeli', name: 'Kocaeli' },
        { id: 'konya', name: 'Konya' },
        { id: 'kutahya', name: 'Kütahya' },
        { id: 'malatya', name: 'Malatya' },
        { id: 'manisa', name: 'Manisa' },
        { id: 'mardin', name: 'Mardin' },
        { id: 'mersin', name: 'Mersin' },
        { id: 'mugla', name: 'Muğla' },
        { id: 'mus', name: 'Muş' },
        { id: 'nevsehir', name: 'Nevşehir' },
        { id: 'nigde', name: 'Niğde' },
        { id: 'ordu', name: 'Ordu' },
        { id: 'osmaniye', name: 'Osmaniye' },
        { id: 'rize', name: 'Rize' },
        { id: 'sakarya', name: 'Sakarya' },
        { id: 'samsun', name: 'Samsun' },
        { id: 'sanliurfa', name: 'Şanlıurfa' },
        { id: 'siirt', name: 'Siirt' },
        { id: 'sinop', name: 'Sinop' },
        { id: 'sivas', name: 'Sivas' },
        { id: 'sirnak', name: 'Şırnak' },
        { id: 'tekirdag', name: 'Tekirdağ' },
        { id: 'tokat', name: 'Tokat' },
        { id: 'trabzon', name: 'Trabzon' },
        { id: 'tunceli', name: 'Tunceli' },
        { id: 'usak', name: 'Uşak' },
        { id: 'van', name: 'Van' },
        { id: 'yalova', name: 'Yalova' },
        { id: 'yozgat', name: 'Yozgat' },
        { id: 'zonguldak', name: 'Zonguldak' }
      ];
      
      // Her ile ait ilçelerin listesi (örnek olarak popüler illerin ilçeleri)
      const districts = {
        'istanbul': [
          { id: 'kadikoy', name: 'Kadıköy' },
          { id: 'besiktas', name: 'Beşiktaş' },
          { id: 'sisli', name: 'Şişli' },
          { id: 'uskudar', name: 'Üsküdar' },
          { id: 'fatih', name: 'Fatih' },
          { id: 'beyoglu', name: 'Beyoğlu' },
          { id: 'maltepe', name: 'Maltepe' },
          { id: 'atasehir', name: 'Ataşehir' },
          { id: 'bakirkoy', name: 'Bakırköy' },
          { id: 'sariyer', name: 'Sarıyer' },
          { id: 'bahcelievler', name: 'Bahçelievler' },
          { id: 'umraniye', name: 'Ümraniye' },
          { id: 'pendik', name: 'Pendik' },
          { id: 'kartal', name: 'Kartal' },
          { id: 'kucukcekmece', name: 'Küçükçekmece' },
          { id: 'avcilar', name: 'Avcılar' },
          { id: 'kagithane', name: 'Kağıthane' },
          { id: 'basaksehir', name: 'Başakşehir' },
          { id: 'esenyurt', name: 'Esenyurt' },
          { id: 'beylikduzu', name: 'Beylikdüzü' },
          { id: 'zeytinburnu', name: 'Zeytinburnu' },
          { id: 'sultangazi', name: 'Sultangazi' },
          { id: 'gaziosmanpasa', name: 'Gaziosmanpaşa' },
          { id: 'eyupsultan', name: 'Eyüpsultan' },
          { id: 'esenler', name: 'Esenler' },
          { id: 'bagcilar', name: 'Bağcılar' },
          { id: 'sultanbeyli', name: 'Sultanbeyli' },
          { id: 'tuzla', name: 'Tuzla' },
          { id: 'silivri', name: 'Silivri' },
          { id: 'buyukcekmece', name: 'Büyükçekmece' },
          { id: 'catalca', name: 'Çatalca' },
          { id: 'sile', name: 'Şile' },
          { id: 'adalar', name: 'Adalar' },
          { id: 'arnavutkoy', name: 'Arnavutköy' },
          { id: 'cekmekoy', name: 'Çekmeköy' },
          { id: 'beykoz', name: 'Beykoz' },
          { id: 'gungoren', name: 'Güngören' }
        ],
        'ankara': [
          { id: 'cankaya', name: 'Çankaya' },
          { id: 'kecioren', name: 'Keçiören' },
          { id: 'mamak', name: 'Mamak' },
          { id: 'yenimahalle', name: 'Yenimahalle' },
          { id: 'etimesgut', name: 'Etimesgut' },
          { id: 'sincan', name: 'Sincan' },
          { id: 'altindag', name: 'Altındağ' },
          { id: 'golbasi', name: 'Gölbaşı' },
          { id: 'polatli', name: 'Polatlı' },
          { id: 'kahramankazan', name: 'Kahramankazan' },
          { id: 'pursaklar', name: 'Pursaklar' },
          { id: 'cebeci', name: 'Cebeci' },
          { id: 'akyurt', name: 'Akyurt' },
          { id: 'ayas', name: 'Ayaş' },
          { id: 'bala', name: 'Bala' },
          { id: 'beypazari', name: 'Beypazarı' },
          { id: 'camlidere', name: 'Çamlıdere' },
          { id: 'cubuk', name: 'Çubuk' },
          { id: 'elmadag', name: 'Elmadağ' },
          { id: 'evren', name: 'Evren' },
          { id: 'gudul', name: 'Güdül' },
          { id: 'haymana', name: 'Haymana' },
          { id: 'kalecik', name: 'Kalecik' },
          { id: 'kizilcahamam', name: 'Kızılcahamam' },
          { id: 'nallihan', name: 'Nallıhan' },
          { id: 'sereflikochisar', name: 'Şereflikoçhisar' }
        ],
        'izmir': [
          { id: 'konak', name: 'Konak' },
          { id: 'karsiyaka', name: 'Karşıyaka' },
          { id: 'bornova', name: 'Bornova' },
          { id: 'bayrakli', name: 'Bayraklı' },
          { id: 'buca', name: 'Buca' },
          { id: 'cigli', name: 'Çiğli' },
          { id: 'gaziemir', name: 'Gaziemir' },
          { id: 'narlidere', name: 'Narlıdere' },
          { id: 'balcova', name: 'Balçova' },
          { id: 'urla', name: 'Urla' },
          { id: 'aliaga', name: 'Aliağa' },
          { id: 'bayindir', name: 'Bayındır' },
          { id: 'bergama', name: 'Bergama' },
          { id: 'cesme', name: 'Çeşme' },
          { id: 'dikili', name: 'Dikili' },
          { id: 'foca', name: 'Foça' },
          { id: 'guzelbahce', name: 'Güzelbahçe' },
          { id: 'karaburun', name: 'Karaburun' },
          { id: 'kemalpasa', name: 'Kemalpaşa' },
          { id: 'kinik', name: 'Kınık' },
          { id: 'kiraz', name: 'Kiraz' },
          { id: 'menemen', name: 'Menemen' },
          { id: 'odemis', name: 'Ödemiş' },
          { id: 'seferihisar', name: 'Seferihisar' },
          { id: 'selcuk', name: 'Selçuk' },
          { id: 'tire', name: 'Tire' },
          { id: 'torbali', name: 'Torbalı' },
          { id: 'karabaglar', name: 'Karabağlar' }
        ],
        'bursa': [
          { id: 'osmangazi', name: 'Osmangazi' },
          { id: 'nilufer', name: 'Nilüfer' },
          { id: 'yildirim', name: 'Yıldırım' },
          { id: 'gemlik', name: 'Gemlik' },
          { id: 'mudanya', name: 'Mudanya' },
          { id: 'inegol', name: 'İnegöl' },
          { id: 'orhangazi', name: 'Orhangazi' },
          { id: 'kestel', name: 'Kestel' },
          { id: 'mustafakemalpasa', name: 'Mustafakemalpaşa' },
          { id: 'orhaneli', name: 'Orhaneli' },
          { id: 'keles', name: 'Keles' },
          { id: 'buyukorhan', name: 'Büyükorhan' },
          { id: 'harmancik', name: 'Harmancık' },
          { id: 'gursukancaabat', name: 'Gürsu' },
          { id: 'iznik', name: 'İznik' },
          { id: 'karacabey', name: 'Karacabey' },
          { id: 'yenisehir', name: 'Yenişehir' }
        ],
        'adana': [
          { id: 'seyhan', name: 'Seyhan' },
          { id: 'cukurova', name: 'Çukurova' },
          { id: 'saricam', name: 'Sarıçam' },
          { id: 'yuregir', name: 'Yüreğir' },
          { id: 'aladag', name: 'Aladağ' },
          { id: 'ceyhan', name: 'Ceyhan' },
          { id: 'feke', name: 'Feke' },
          { id: 'imamoglu', name: 'İmamoğlu' },
          { id: 'karaisali', name: 'Karaisalı' },
          { id: 'karatas', name: 'Karataş' },
          { id: 'kozan', name: 'Kozan' },
          { id: 'pozanti', name: 'Pozantı' },
          { id: 'saimbeyli', name: 'Saimbeyli' },
          { id: 'tufanbeyli', name: 'Tufanbeyli' },
          { id: 'yumurtalik', name: 'Yumurtalık' }
        ],
        'antalya': [
          { id: 'muratpasa', name: 'Muratpaşa' },
          { id: 'konyaalti', name: 'Konyaaltı' },
          { id: 'kepez', name: 'Kepez' },
          { id: 'alanya', name: 'Alanya' },
          { id: 'manavgat', name: 'Manavgat' },
          { id: 'serik', name: 'Serik' },
          { id: 'kemer', name: 'Kemer' },
          { id: 'kumluca', name: 'Kumluca' },
          { id: 'kas', name: 'Kaş' },
          { id: 'finike', name: 'Finike' },
          { id: 'demre', name: 'Demre' },
          { id: 'aksu', name: 'Aksu' },
          { id: 'dosemealti', name: 'Döşemealtı' },
          { id: 'gazipasa', name: 'Gazipaşa' },
          { id: 'korkuteli', name: 'Korkuteli' },
          { id: 'elmali', name: 'Elmalı' },
          { id: 'akseki', name: 'Akseki' },
          { id: 'gundogmus', name: 'Gündoğmuş' },
          { id: 'ibradi', name: 'İbradı' }
        ],
        'konya': [
          { id: 'selcuklu', name: 'Selçuklu' },
          { id: 'meram', name: 'Meram' },
          { id: 'karatay', name: 'Karatay' },
          { id: 'aksehir', name: 'Akşehir' },
          { id: 'beysehir', name: 'Beyşehir' },
          { id: 'bozkir', name: 'Bozkır' },
          { id: 'cihanbeyli', name: 'Cihanbeyli' },
          { id: 'cumra', name: 'Çumra' },
          { id: 'doganhisar', name: 'Doğanhisar' },
          { id: 'eregli', name: 'Ereğli' },
          { id: 'hadim', name: 'Hadim' },
          { id: 'ilgin', name: 'Ilgın' },
          { id: 'kadinhani', name: 'Kadınhanı' },
          { id: 'karapinar', name: 'Karapınar' },
          { id: 'kulu', name: 'Kulu' }
        ],
        'gaziantep': [
          { id: 'sehitkamil', name: 'Şehitkamil' },
          { id: 'sahinbey', name: 'Şahinbey' },
          { id: 'nizip', name: 'Nizip' },
          { id: 'islahiye', name: 'İslahiye' },
          { id: 'nurdagi', name: 'Nurdağı' },
          { id: 'araban', name: 'Araban' },
          { id: 'oguzeli', name: 'Oğuzeli' },
          { id: 'yavuzeli', name: 'Yavuzeli' },
          { id: 'karkamis', name: 'Karkamış' }
        ],
        'samsun': [
          { id: 'atakum', name: 'Atakum' },
          { id: 'ilkadim', name: 'İlkadım' },
          { id: 'canik', name: 'Canik' },
          { id: 'bafra', name: 'Bafra' },
          { id: 'carsamba', name: 'Çarşamba' },
          { id: 'terme', name: 'Terme' },
          { id: 'vezirkopru', name: 'Vezirköprü' },
          { id: 'havza', name: 'Havza' },
          { id: 'kavak', name: 'Kavak' },
          { id: 'alacam', name: 'Alaçam' },
          { id: 'tekkekoy', name: 'Tekkeköy' },
          { id: 'asarcik', name: 'Asarcık' },
          { id: 'ladik', name: 'Ladik' },
          { id: 'salipazari', name: 'Salıpazarı' },
          { id: 'ondokuzmayis', name: 'Ondokuzmayıs' },
          { id: 'ayvacik', name: 'Ayvacık' },
          { id: 'yakakent', name: 'Yakakent' }
        ],
        'kayseri': [
          { id: 'melikgazi', name: 'Melikgazi' },
          { id: 'kocasinan', name: 'Kocasinan' },
          { id: 'talas', name: 'Talas' },
          { id: 'develi', name: 'Develi' },
          { id: 'yahyali', name: 'Yahyalı' },
          { id: 'bunyan', name: 'Bünyan' },
          { id: 'yesilhisar', name: 'Yeşilhisar' },
          { id: 'tomarza', name: 'Tomarza' },
          { id: 'felahiye', name: 'Felahiye' },
          { id: 'hacilar', name: 'Hacılar' },
          { id: 'incesu', name: 'İncesu' },
          { id: 'ozvatan', name: 'Özvatan' },
          { id: 'pinarbasi', name: 'Pınarbaşı' },
          { id: 'sarioglan', name: 'Sarıoğlan' },
          { id: 'sariz', name: 'Sarız' },
          { id: 'akkisla', name: 'Akkışla' }
        ]
      };
      
      console.log('Yeni routes verisi oluşturuluyor');
      // Statik veriyi koleksiyona ekle
      const insertResult = await db.collection('routes').insertOne({
        type: 'city-districts',
        cities: cities,
        districts: districts,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('Routes verisi eklendi, ID:', insertResult.insertedId);
      // Eklenen veriyi döndür
      return res.status(200).json({
        success: true,
        cities: cities,
        districts: districts
      });
    } catch (dbError) {
      console.error('Veritabanı işlemleri sırasında hata:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Veritabanı işlemi sırasında hata oluştu', 
        error: dbError.message 
      });
    }
  } catch (error) {
    console.error('Genel API Hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası', 
      error: error.message 
    });
  }
} 