import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import DriverLayout from '../../../components/portal/DriverLayout';
import { FaTruck, FaRoute, FaClock, FaGasPump, FaCalendarAlt, FaBox, FaMoneyBillWave, FaUsers, FaChartLine, FaRegClock, FaRegCalendarAlt, FaMapMarkerAlt, FaTimes, FaWeight, FaPhone, FaUser, FaBuilding, FaFileAlt, FaMoneyBill, FaBell, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaMapMarkedAlt, FaArrowRight, FaEye } from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import axios from 'axios';

// Chart.js kayıt
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend
);

export default function DriverDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Session yoksa login sayfasına yönlendir
      router.replace('/portal/login');
    },
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [driverStatusValue, setDriverStatusValue] = useState('active');

  // Oturum kontrolü - doğrulama için yeterli
  useEffect(() => {
    // Henüz session yüklenmemişse işlem yapma
    if (status === 'loading') return;
    
    console.log("Sürücü Dashboard - Session durumu:", status, "Session:", session);
    
    // Oturum yoksa (zaten onUnauthenticated ile handle ediliyor)
    if (!session) return;

    // Kullanıcı türü kontrolü
    if (session.user && session.user.userType !== 'driver') {
      console.error("Kullanıcı türü sürücü değil, normal dashboard'a yönlendiriliyor");
      router.replace('/portal/dashboard');
    }
  }, [status, router, session]);

  // API'den veri çekme - oturum kontrolü sonrası
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Session yüklenmemişse veya kullanıcı türü driver değilse veri çekme
      if (status === 'loading' || !session || (session.user?.userType !== 'driver')) {
        return;
      }
      
      try {
        setLoading(true);
        
        // API'den veri çekme
        const response = await axios.get('/api/drivers/dashboard');
        
        if (response.data) {
          setDashboardData(response.data);
          if (response.data.driverStatus) {
            setDriverStatusValue(response.data.driverStatus);
          }
        }
      } catch (error) {
        console.error('Dashboard veri hatası:', error);
        setError('Veriler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session, status]);

  // Formatlanmış mesafe (xx,xx km formatında)
  const formatDistance = (distance) => {
    if (!distance) return 'Hesaplanıyor...';
    
    // String ise sayıya çevir
    const distanceNum = typeof distance === 'string' ? parseFloat(distance) : distance;
    
    // Geçerli bir sayı değilse
    if (isNaN(distanceNum)) return 'Hesaplanıyor...';
    
    // xx,xx formatında yuvarla (Türkçe formatı: virgül)
    return distanceNum.toFixed(2).replace('.', ',') + ' km';
  };

  // Yükleme durumu - session yükleniyorsa veya veri yükleniyorsa
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // Oturumu olmayan kullanıcıları buradan geçirme, useSession'ın onUnauthenticated fonksiyonu bunu zaten hallediyor
  if (!session) {
    return null;
  }

  // Kullanıcı türü sürücü değilse
  if (session.user?.userType !== 'driver') {
    return (
      <DriverLayout>
        <div className="text-center p-6">
          <p className="text-red-500">Bu sayfaya erişim yetkiniz bulunmamaktadır. Sürücü girişi yapmanız gerekmektedir.</p>
        </div>
      </DriverLayout>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <DriverLayout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-6 mx-4" role="alert">
          <strong className="font-bold">Hata!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </DriverLayout>
    );
  }

  // Veri yoksa
  if (!dashboardData) {
    return (
      <DriverLayout>
        <div className="text-center p-6">
          <p>Veri bulunamadı</p>
        </div>
      </DriverLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Sürücü Paneli - TaşıApp</title>
        <meta name="description" content="TaşıApp Sürücü Portalı Panel" />
      </Head>
      <DriverLayout title="Sürücü Paneli" driverStatus={driverStatusValue}>
        <div className="flex flex-col h-full">
          <div className="flex-grow py-4 px-4">
            {/* Dashboard içeriği */}
            <div className="grid grid-cols-1 gap-6 pb-6">
              
              {/* 1. İstatistik Kutucukları */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <FaTruck className="h-5 w-5 text-orange-500" />
                    </div>
                    <span className="text-xs text-orange-700 font-semibold bg-orange-50 px-2 py-1 rounded-full">
                      Toplam
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Toplam Sefer</h3>
                  <p className="text-2xl font-bold text-gray-800">{dashboardData.stats.totalTrips}</p>
                  <p className="mt-2 text-xs text-green-600">
                    <FaChartLine className="inline mr-1" />
                    <span>Son 30 günde 8 sefer</span>
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <FaRoute className="h-5 w-5 text-orange-500" />
                    </div>
                    <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                      Toplam
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Toplam Mesafe</h3>
                  <p className="text-2xl font-bold text-gray-800">{dashboardData.stats.totalDistance}</p>
                  <p className="mt-2 text-xs text-green-600">
                    <FaChartLine className="inline mr-1" />
                    <span>Son 30 günde 2.500 km</span>
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <FaMoneyBillWave className="h-5 w-5 text-orange-500" />
                    </div>
                    <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2 py-1 rounded-full">
                      Kazanç
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Kazançlar</h3>
                  <p className="text-2xl font-bold text-gray-800">₺{(dashboardData.stats.totalTrips * 250).toLocaleString('tr-TR')}</p>
                  <p className="mt-2 text-xs text-green-600">
                    <FaChartLine className="inline mr-1" />
                    <span>Son 30 günde ₺2,000</span>
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <div className="text-xl text-orange-500">★</div>
                    </div>
                    <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                      Puan
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Puanım</h3>
                  <p className="text-2xl font-bold text-gray-800">{dashboardData.stats.averageRating}</p>
                  <p className="mt-2 text-xs text-green-600">
                    <FaChartLine className="inline mr-1" />
                    <span>Son 30 günde +0.2</span>
                  </p>
                </div>
              </div>

              {/* 2. Aktif Rota ve Performans Grafiği */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Aktif Rota */}
                <div className="md:col-span-1">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Aktif Rota</h2>
                  </div>
                  {dashboardData.currentRoute && dashboardData.currentRoute.status === "devam ediyor" ? (
                    <div className="bg-white shadow-md rounded-lg p-4 border-l-4 border-orange-500 hover:shadow-lg transition-all duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <span className="p-2 rounded-full bg-orange-100 mr-3">
                            <FaTruck className="text-orange-500" />
                          </span>
                          <div>
                            <p className="font-bold text-gray-800">Aktif Teslimat</p>
                            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('tr-TR')}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800 flex items-center">
                          <FaTruck className="mr-1 h-3 w-3" />
                          Yolda
                        </span>
                      </div>

                      <div className="flex items-start text-sm mb-3">
                        <div className="flex flex-col w-full">
                          <div className="flex items-start mb-1">
                            <FaMapMarkerAlt className="text-red-500 mt-1 mr-2 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{dashboardData.currentRoute.origin}</span>
                          </div>
                          
                          <div className="flex items-center justify-center my-1 text-xs text-gray-500">
                            <div className="border-l-2 border-gray-300 h-4 mx-2"></div>
                            <FaArrowRight className="text-gray-400 mx-1" />
                            <span>{dashboardData.currentRoute.distance}</span>
                            <div className="border-l-2 border-gray-300 h-4 mx-2"></div>
                          </div>
                          
                          <div className="flex items-start">
                            <FaMapMarkerAlt className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{dashboardData.currentRoute.destination}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-600">
                          <FaClock className="inline mr-1" /> Tahmini Süre: {dashboardData.currentRoute.estimatedTime}
                        </div>
                        <button className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center">
                          <FaMapMarkedAlt className="mr-1" />
                          Rotayı Gör
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-gray-300">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="p-3 bg-gray-100 rounded-full mb-3">
                          <FaRoute className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="font-medium text-gray-700 mb-1">Aktif Rotanız Bulunmuyor</h3>
                        <p className="text-sm text-gray-500 mb-4">Şu anda devam eden bir teslimat görevi yok.</p>
                        <button className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors">
                          Görevleri Kontrol Et
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Performans Grafiği */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Aylık Performans</h2>
                  </div>
                  <div className="bg-white shadow-md rounded-lg p-4">
                    <div className="h-64">
                      <Line
                        data={{
                          labels: dashboardData.monthlyPerformance.labels,
                          datasets: dashboardData.monthlyPerformance.datasets.map(dataset => ({
                            ...dataset,
                            borderColor: dataset.label.includes("Mesafe") ? "rgba(249, 115, 22, 1)" : "rgba(59, 130, 246, 1)", // Birincil veri turuncu, ikincil veri mavi
                            backgroundColor: dataset.label.includes("Mesafe") ? "rgba(249, 115, 22, 0.1)" : "rgba(59, 130, 246, 0.1)"
                          }))
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Son Seferler ve Bakım Bilgisi */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Son Seferler */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Son Seferler</h2>
                    <button 
                      onClick={() => router.push('/portal/driver/trips')}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Tümünü Gör
                    </button>
                  </div>
                  <div className="space-y-4">
                    {dashboardData.recentTrips.map((trip) => (
                      <div key={trip.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500 hover:shadow-lg transition-all duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <span className="p-2 rounded-full bg-orange-100 mr-3">
                              <FaTruck className="text-orange-500" />
                            </span>
                            <div>
                              <p className="font-bold text-gray-800">#{trip.id.substring(0, 6)}</p>
                              <p className="text-sm text-gray-500">{trip.date}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            trip.status === 'tamamlandı' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {trip.status === 'tamamlandı' ? 'Tamamlandı' : 'Devam Ediyor'}
                          </span>
                        </div>

                        <div className="flex items-start text-sm mb-2">
                          <div className="flex flex-col w-full">
                            <div className="flex items-start mb-1">
                              <FaMapMarkerAlt className="text-red-500 mt-1 mr-2 flex-shrink-0" />
                              <span className="text-gray-700 truncate">{trip.route.split(' - ')[0]}</span>
                            </div>
                            
                            <div className="flex items-center justify-center my-1 text-xs text-gray-500">
                              <div className="border-l-2 border-gray-300 h-4 mx-2"></div>
                              <FaArrowRight className="text-gray-400 mx-1" />
                              <span>{trip.distance}</span>
                              <div className="border-l-2 border-gray-300 h-4 mx-2"></div>
                            </div>
                            
                            <div className="flex items-start">
                              <FaMapMarkerAlt className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                              <span className="text-gray-700 truncate">{trip.route.split(' - ')[1]}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end mt-2">
                          <button className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center">
                            <FaEye className="mr-1" />
                            Detayları Gör
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Yaklaşan Bakım */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Yaklaşan Bakım</h2>
                  </div>
                  {dashboardData.upcomingMaintenance ? (
                    <div className="bg-white shadow-md rounded-lg p-4 border-l-4 border-yellow-500">
                      <div className="flex items-start mb-3">
                        <div className="p-2 rounded-full bg-yellow-100 mr-3 mt-1">
                          <FaCalendarAlt className="text-yellow-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 mb-1">{dashboardData.upcomingMaintenance.type}</h3>
                          <p className="text-sm text-gray-600">{dashboardData.upcomingMaintenance.date}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                        <p className="text-sm text-gray-600 mb-1">Araç:</p>
                        <p className="font-medium text-gray-800 mb-3">{dashboardData.upcomingMaintenance.vehicle}</p>
                        
                        <p className="text-xs text-gray-500 mb-3">
                          Düzenli bakımlarınızı yaptırmak, hem aracınızın ömrünü uzatır hem de yolda kalma riskini azaltır.
                        </p>
                        
                        <button className="w-full py-2 px-4 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors">
                          Detayları Gör
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white shadow-md rounded-lg p-6 text-center">
                      <div className="p-3 bg-gray-100 rounded-full mx-auto mb-3 w-14 h-14 flex items-center justify-center">
                        <FaCalendarAlt className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-medium text-gray-700 mb-1">Yaklaşan Bakım Yok</h3>
                      <p className="text-sm text-gray-500 mb-4">Şu anda planlanmış bir bakım bulunmuyor.</p>
                    </div>
                  )}
                  
                  <div className="mt-4 bg-white shadow-md rounded-lg p-4 border-l-4 border-orange-500">
                    <div className="flex items-center">
                      <div className="p-2 rounded-full bg-orange-100 mr-3">
                        <FaGasPump className="text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 mb-1">Yakıt Tüketimi</h3>
                        <p className="text-sm text-gray-600">{dashboardData.stats.fuelConsumption}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Alt çizgi - ekranın altına sabitlenmiş */}
          <div className="w-full border-t border-gray-200 mt-auto"></div>
        </div>
      </DriverLayout>
    </>
  );
} 