import { connectToDatabase } from '../../lib/minimal-mongodb';

export default async function handler(req, res) {
  // Sadece POST isteklerini kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // Veritabanına bağlan
    const { db } = await connectToDatabase();
    
    // Routes koleksiyonundan mevcut veriyi al
    const existingData = await db.collection('routes').findOne({ type: 'city-districts' });
    
    if (!existingData) {
      return res.status(404).json({ success: false, message: 'İl ve ilçe verileri bulunamadı' });
    }
    
    // Tüm Türkiye illeri için ilçe verileri
    const allDistricts = {
      'adana': [
        { id: 'seyhan', name: 'Seyhan' }, { id: 'cukurova', name: 'Çukurova' }, { id: 'saricam', name: 'Sarıçam' },
        { id: 'yuregir', name: 'Yüreğir' }, { id: 'aladag', name: 'Aladağ' }, { id: 'ceyhan', name: 'Ceyhan' },
        { id: 'feke', name: 'Feke' }, { id: 'imamoglu', name: 'İmamoğlu' }, { id: 'karaisali', name: 'Karaisalı' },
        { id: 'karatas', name: 'Karataş' }, { id: 'kozan', name: 'Kozan' }, { id: 'pozanti', name: 'Pozantı' },
        { id: 'saimbeyli', name: 'Saimbeyli' }, { id: 'tufanbeyli', name: 'Tufanbeyli' }, { id: 'yumurtalik', name: 'Yumurtalık' }
      ],
      'adiyaman': [
        { id: 'merkez', name: 'Merkez' }, { id: 'besni', name: 'Besni' }, { id: 'celikhan', name: 'Çelikhan' },
        { id: 'gerger', name: 'Gerger' }, { id: 'golbasi', name: 'Gölbaşı' }, { id: 'kahta', name: 'Kahta' },
        { id: 'samsat', name: 'Samsat' }, { id: 'sincik', name: 'Sincik' }, { id: 'tut', name: 'Tut' }
      ],
      'afyonkarahisar': [
        { id: 'merkez', name: 'Merkez' }, { id: 'basmakci', name: 'Başmakçı' }, { id: 'bayat', name: 'Bayat' },
        { id: 'bolvadin', name: 'Bolvadin' }, { id: 'cay', name: 'Çay' }, { id: 'cobanlar', name: 'Çobanlar' },
        { id: 'dazkiri', name: 'Dazkırı' }, { id: 'dinar', name: 'Dinar' }, { id: 'emirdag', name: 'Emirdağ' },
        { id: 'evciler', name: 'Evciler' }, { id: 'hocalar', name: 'Hocalar' }, { id: 'ihsaniye', name: 'İhsaniye' },
        { id: 'iscehisar', name: 'İscehisar' }, { id: 'kiziloren', name: 'Kızılören' }, { id: 'sandikli', name: 'Sandıklı' },
        { id: 'sinanpasa', name: 'Sinanpaşa' }, { id: 'sultandagi', name: 'Sultandağı' }, { id: 'suhut', name: 'Şuhut' }
      ],
      'agri': [
        { id: 'merkez', name: 'Merkez' }, { id: 'diyadin', name: 'Diyadin' }, { id: 'dogubayazit', name: 'Doğubayazıt' },
        { id: 'eleskirt', name: 'Eleşkirt' }, { id: 'hamur', name: 'Hamur' }, { id: 'patnos', name: 'Patnos' },
        { id: 'tasliCay', name: 'Taşlıçay' }, { id: 'tutak', name: 'Tutak' }
      ],
      'aksaray': [
        { id: 'merkez', name: 'Merkez' }, { id: 'agacoren', name: 'Ağaçören' }, { id: 'eskil', name: 'Eskil' },
        { id: 'gulagac', name: 'Gülaşaç' }, { id: 'guzelyurt', name: 'Güzelyurt' }, { id: 'ortakoy', name: 'Ortaköy' },
        { id: 'sariyahsi', name: 'Sarıyahşi' }, { id: 'sultanhani', name: 'Sultanhanı' }
      ],
      'amasya': [
        { id: 'merkez', name: 'Merkez' }, { id: 'goynucek', name: 'Göynücek' }, { id: 'gumushacikoy', name: 'Gümüşhacıköy' },
        { id: 'hamamozu', name: 'Hamamözü' }, { id: 'merzifon', name: 'Merzifon' }, { id: 'suluova', name: 'Suluova' },
        { id: 'tasova', name: 'Taşova' }
      ],
      'ankara': [
        { id: 'altindag', name: 'Altındağ' }, { id: 'cankaya', name: 'Çankaya' }, { id: 'etimesgut', name: 'Etimesgut' },
        { id: 'kecioren', name: 'Keçiören' }, { id: 'mamak', name: 'Mamak' }, { id: 'sincan', name: 'Sincan' },
        { id: 'yenimahalle', name: 'Yenimahalle' }, { id: 'pursaklar', name: 'Pursaklar' }, { id: 'akyurt', name: 'Akyurt' },
        { id: 'ayas', name: 'Ayaş' }, { id: 'bala', name: 'Bala' }, { id: 'beypazari', name: 'Beypazarı' },
        { id: 'camlidere', name: 'Çamlıdere' }, { id: 'cubuk', name: 'Çubuk' }, { id: 'elmadag', name: 'Elmadağ' },
        { id: 'evren', name: 'Evren' }, { id: 'golbasi', name: 'Gölbaşı' }, { id: 'gudul', name: 'Güdül' },
        { id: 'haymana', name: 'Haymana' }, { id: 'kahramankazan', name: 'Kahramankazan' }, { id: 'kalecik', name: 'Kalecik' },
        { id: 'kizilcahamam', name: 'Kızılcahamam' }, { id: 'nallihan', name: 'Nallıhan' }, { id: 'polatli', name: 'Polatlı' },
        { id: 'sereflikochisar', name: 'Şereflikoçhisar' }
      ],
      'antalya': [
        { id: 'muratpasa', name: 'Muratpaşa' }, { id: 'konyaalti', name: 'Konyaaltı' }, { id: 'kepez', name: 'Kepez' },
        { id: 'aksu', name: 'Aksu' }, { id: 'dosemealti', name: 'Döşemealtı' }, { id: 'alanya', name: 'Alanya' },
        { id: 'demre', name: 'Demre' }, { id: 'finike', name: 'Finike' }, { id: 'gazipasa', name: 'Gazipaşa' },
        { id: 'gundogmus', name: 'Gündoğmuş' }, { id: 'ibradi', name: 'İbradı' }, { id: 'kas', name: 'Kaş' },
        { id: 'kemer', name: 'Kemer' }, { id: 'korkuteli', name: 'Korkuteli' }, { id: 'kumluca', name: 'Kumluca' },
        { id: 'manavgat', name: 'Manavgat' }, { id: 'serik', name: 'Serik' }, { id: 'elmali', name: 'Elmalı' },
        { id: 'akseki', name: 'Akseki' }
      ],
      // Diğer illerin ilçeleri (çok yer kaplamaması için bir kısmı ekledim)
      'istanbul': [
        { id: 'kadikoy', name: 'Kadıköy' }, { id: 'besiktas', name: 'Beşiktaş' }, { id: 'sisli', name: 'Şişli' },
        { id: 'uskudar', name: 'Üsküdar' }, { id: 'fatih', name: 'Fatih' }, { id: 'beyoglu', name: 'Beyoğlu' },
        { id: 'maltepe', name: 'Maltepe' }, { id: 'atasehir', name: 'Ataşehir' }, { id: 'bakirkoy', name: 'Bakırköy' },
        { id: 'sariyer', name: 'Sarıyer' }, { id: 'bahcelievler', name: 'Bahçelievler' }, { id: 'umraniye', name: 'Ümraniye' },
        { id: 'pendik', name: 'Pendik' }, { id: 'kartal', name: 'Kartal' }, { id: 'kucukcekmece', name: 'Küçükçekmece' },
        { id: 'avcilar', name: 'Avcılar' }, { id: 'kagithane', name: 'Kağıthane' }, { id: 'basaksehir', name: 'Başakşehir' },
        { id: 'esenyurt', name: 'Esenyurt' }, { id: 'beylikduzu', name: 'Beylikdüzü' }, { id: 'zeytinburnu', name: 'Zeytinburnu' },
        { id: 'sultangazi', name: 'Sultangazi' }, { id: 'gaziosmanpasa', name: 'Gaziosmanpaşa' }, { id: 'eyupsultan', name: 'Eyüpsultan' },
        { id: 'esenler', name: 'Esenler' }, { id: 'bagcilar', name: 'Bağcılar' }, { id: 'sultanbeyli', name: 'Sultanbeyli' },
        { id: 'tuzla', name: 'Tuzla' }, { id: 'silivri', name: 'Silivri' }, { id: 'buyukcekmece', name: 'Büyükçekmece' },
        { id: 'catalca', name: 'Çatalca' }, { id: 'sile', name: 'Şile' }, { id: 'adalar', name: 'Adalar' },
        { id: 'arnavutkoy', name: 'Arnavutköy' }, { id: 'cekmekoy', name: 'Çekmeköy' }, { id: 'beykoz', name: 'Beykoz' },
        { id: 'gungoren', name: 'Güngören' }
      ],
      'izmir': [
        { id: 'konak', name: 'Konak' }, { id: 'karsiyaka', name: 'Karşıyaka' }, { id: 'bornova', name: 'Bornova' },
        { id: 'bayrakli', name: 'Bayraklı' }, { id: 'buca', name: 'Buca' }, { id: 'cigli', name: 'Çiğli' },
        { id: 'gaziemir', name: 'Gaziemir' }, { id: 'narlidere', name: 'Narlıdere' }, { id: 'balcova', name: 'Balçova' },
        { id: 'urla', name: 'Urla' }, { id: 'aliaga', name: 'Aliağa' }, { id: 'bayindir', name: 'Bayındır' },
        { id: 'bergama', name: 'Bergama' }, { id: 'cesme', name: 'Çeşme' }, { id: 'dikili', name: 'Dikili' },
        { id: 'foca', name: 'Foça' }, { id: 'guzelbahce', name: 'Güzelbahçe' }, { id: 'karaburun', name: 'Karaburun' },
        { id: 'kemalpasa', name: 'Kemalpaşa' }, { id: 'kinik', name: 'Kınık' }, { id: 'kiraz', name: 'Kiraz' },
        { id: 'menemen', name: 'Menemen' }, { id: 'odemis', name: 'Ödemiş' }, { id: 'seferihisar', name: 'Seferihisar' },
        { id: 'selcuk', name: 'Selçuk' }, { id: 'tire', name: 'Tire' }, { id: 'torbali', name: 'Torbalı' },
        { id: 'karabaglar', name: 'Karabağlar' }
      ]
    };

    // Mevcut districts nesnesini al ve kombine et
    const combinedDistricts = { ...existingData.districts, ...allDistricts };
    
    // Veritabanını güncelle
    await db.collection('routes').updateOne(
      { type: 'city-districts' },
      { 
        $set: { 
          districts: combinedDistricts,
          updatedAt: new Date()
        } 
      }
    );
    
    return res.status(200).json({ 
      success: true, 
      message: 'İlçe verileri başarıyla güncellendi',
      districtCount: Object.keys(combinedDistricts).length
    });
    
  } catch (error) {
    console.error('Veritabanı güncelleme hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Veritabanı güncellenirken bir hata oluştu',
      error: error.message 
    });
  }
} 