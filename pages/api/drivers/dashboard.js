import { getServerSession } from "next-auth/next";
import { authOptions } from '../auth/portal/[...nextauth]';

export default async function handler(req, res) {
  // Yalnızca GET isteklerine izin ver
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Oturum kontrolü - sadece session doğrulaması yeterli
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Oturum bulunamadı', redirectTo: '/portal/login' });
    }
    
    // Kullanıcı türü kontrolü
    if (session.user.userType !== 'driver') {
      // Normal kullanıcı erişim izni olmadığı bilgisiyle birlikte 403 hatası 
      return res.status(403).json({ 
        message: 'Bu kaynağa erişim yetkiniz yok. Sadece sürücüler erişebilir.', 
        userType: session.user.userType,
        redirectTo: '/portal/dashboard'  // sürücü olmayanlar için doğru yönlendirme
      });
    }
    
    console.log("Sürücü dashboard API isteği başarılı:", session.user.id);
    
    // Oturum geçerliyse ve kullanıcı türü doğruysa mock veri döndür
    return res.status(200).json({
      success: true,
      driverStatus: 'active',
      currentRoute: {
        id: "R12345",
        origin: "İstanbul",
        destination: "Ankara",
        distance: "450 km",
        estimatedTime: "5 saat",
        status: "devam ediyor"
      },
      stats: {
        totalTrips: 45,
        totalDistance: "12,500 km",
        averageRating: 4.8,
        fuelConsumption: "8.5 L/100km"
      },
      recentTrips: [
        {
          id: "T789012",
          date: "15 Mayıs 2024",
          route: "İstanbul - İzmir",
          status: "tamamlandı",
          distance: "480 km"
        },
        {
          id: "T789011",
          date: "10 Mayıs 2024",
          route: "Ankara - İstanbul",
          status: "tamamlandı",
          distance: "450 km"
        },
        {
          id: "T789010",
          date: "5 Mayıs 2024",
          route: "İzmir - Antalya",
          status: "tamamlandı",
          distance: "350 km"
        }
      ],
      upcomingMaintenance: {
        date: "20 Haziran 2024",
        type: "Periyodik Bakım",
        vehicle: "Ford Kamyon"
      },
      monthlyPerformance: {
        labels: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran"],
        datasets: [
          {
            label: "Mesafe (km)",
            data: [1200, 1900, 1700, 2100, 2400, 2000],
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)"
          },
          {
            label: "Yakıt Tüketimi (L)",
            data: [320, 390, 350, 400, 450, 380],
            borderColor: "rgba(255, 99, 132, 1)",
            backgroundColor: "rgba(255, 99, 132, 0.2)"
          }
        ]
      }
    });
    
  } catch (error) {
    console.error('Driver API error:', error);
    
    // Hata durumunda 500 hatası dön
    return res.status(500).json({ 
      success: false,
      message: 'Dashboard verisi yüklenirken bir hata oluştu', 
      error: error.message 
    });
  }
} 