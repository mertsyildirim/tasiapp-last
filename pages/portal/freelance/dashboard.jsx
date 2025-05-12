import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaTruck, FaRoute, FaCalendarAlt, FaMoneyBillWave, FaUser, FaMapMarkedAlt, FaChartLine, FaFileAlt, FaExclamationTriangle, FaBell, FaCheck, FaInbox, FaTools, FaClock, FaExclamationCircle, FaThumbsUp, FaThumbsDown, FaLocationArrow, FaInfoCircle } from 'react-icons/fa';
import Link from 'next/link';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';
import axios from 'axios';

export default function FreelanceDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [freelanceData, setFreelanceData] = useState({
    name: '',
    earnings: {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      monthly: []
    },
    tasks: {
      active: 0,
      completed: 0,
      upcoming: 0,
      total: 0
    },
    stats: {
      completionRate: 0,
      rating: 0,
      customerSatisfaction: 0,
      responseTime: 0
    },
    recentTasks: [],
    quickActions: [],
    pendingPayments: [],
    documentsToRenew: [],
    transportRequests: []
  });

  // Oturum kontrolü
  useEffect(() => {
    if (status === 'loading') return;
    
    console.log("Freelance Dashboard - Session durumu:", status, "Session:", session);
    
    // Oturum yoksa login sayfasına yönlendir
    if (status !== 'authenticated') {
      console.log("Oturum doğrulanamadı, login sayfasına yönlendiriliyor");
      router.push('/portal/login');
      return;
    }

    // Dashboard verilerini API'den al
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log("API isteği gönderiliyor...");
        
        const response = await axios.get('/api/portal/dashboard', {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'x-user-id': session?.user?.id
          },
          params: {
            userId: session?.user?.id
          }
        });
        
        console.log('API yanıtı:', response.data);
        
        if (response.data.success) {
          console.log('Dashboard verileri başarıyla alındı:', response.data);
          
          // API'den gelen verileri uygun formatta düzenle
          setFreelanceData({
            name: session.user?.name || response.data.name || 'Freelance Kullanıcı',
            earnings: {
              today: response.data.todayEarnings || 0,
              week: response.data.weekEarnings || 0,
              month: response.data.monthEarnings || 0,
              total: response.data.totalEarnings || 0,
              monthly: response.data.monthlyEarnings || []
            },
            tasks: {
              active: response.data.activeTasksCount || 0,
              completed: response.data.completedTasksCount || 0,
              upcoming: response.data.upcomingTasksCount || 0,
              total: response.data.totalTasksCount || 0
            },
            stats: {
              completionRate: response.data.completionRate || 0,
              rating: response.data.rating || 0,
              customerSatisfaction: response.data.customerSatisfaction || 0,
              responseTime: response.data.responseTime || 0
            },
            recentTasks: response.data.recentTasks || [],
            quickActions: [
              { id: 1, title: 'Yeni Taşıma Talebi Gör', icon: FaInbox, link: '/portal/freelance/requests', color: 'bg-blue-500', count: response.data.newRequestsCount || 0 },
              { id: 2, title: 'Taşımalarımı Yönet', icon: FaTruck, link: '/portal/freelance/tasks', color: 'bg-green-500' },
              { id: 3, title: 'Rota Planla', icon: FaRoute, link: '/portal/freelance/routes', color: 'bg-indigo-500' },
              { id: 4, title: 'Faturalarımı Gör', icon: FaMoneyBillWave, link: '/portal/freelance/earnings', color: 'bg-yellow-500' }
            ],
            pendingPayments: response.data.pendingPayments || [],
            documentsToRenew: response.data.documentsToRenew || [],
            transportRequests: response.data.newRequests || []
          });
        } else {
          console.error('Dashboard verileri alınamadı:', response.data.message);
          // Hata durumunda boş veri göster
          initializeEmptyData();
        }
      } catch (error) {
        console.error('Dashboard verileri alınırken hata:', error);
        console.error('Hata detayları:', error.response?.data);
        
        // Hata durumunda boş veri göster
        initializeEmptyData();
      } finally {
        setLoading(false);
      }
    };
    
    // Boş dashboard verisi oluşturma fonksiyonu
    const initializeEmptyData = () => {
      setFreelanceData({
        name: session.user?.name || 'Freelance Kullanıcı',
        earnings: {
          today: 0,
          week: 0,
          month: 0,
          total: 0,
          monthly: []
        },
        tasks: {
          active: 0,
          completed: 0,
          upcoming: 0,
          total: 0
        },
        stats: {
          completionRate: 0,
          rating: 0,
          customerSatisfaction: 0,
          responseTime: 0
        },
        recentTasks: [],
        quickActions: [
          { id: 1, title: 'Yeni Taşıma Talebi Gör', icon: FaInbox, link: '/portal/freelance/requests', color: 'bg-blue-500', count: 0 },
          { id: 2, title: 'Taşımalarımı Yönet', icon: FaTruck, link: '/portal/freelance/tasks', color: 'bg-green-500' },
          { id: 3, title: 'Rota Planla', icon: FaRoute, link: '/portal/freelance/routes', color: 'bg-indigo-500' },
          { id: 4, title: 'Faturalarımı Gör', icon: FaMoneyBillWave, link: '/portal/freelance/earnings', color: 'bg-yellow-500' }
        ],
        pendingPayments: [],
        documentsToRenew: [],
        transportRequests: []
      });
    };
    
    fetchDashboardData();
    
    // Saat güncellemesi
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, [status, router, session]);

  // Yükleme durumu
  if (status === 'loading' || loading) {
    return (
      <FreelanceLayout title="Dashboard">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </FreelanceLayout>
    );
  }

  // Oturum açılmamış
  if (status === 'unauthenticated') {
    return (
      <FreelanceLayout title="Dashboard">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="bg-white shadow-md rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <FaUser className="mx-auto h-12 w-12 text-orange-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Oturum Açmanız Gerekiyor</h3>
              <p className="mt-1 text-sm text-gray-500">
                Dashboard verilerinizi görüntülemek için lütfen giriş yapın.
              </p>
            </div>
            <div className="mt-5">
              <button
                onClick={() => router.push('/portal/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      </FreelanceLayout>
    );
  }

  const formatDate = (date) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('tr-TR', options);
  };

  const formatSimpleDate = (date) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    return new Date(date).toLocaleDateString('tr-TR', options);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800';
      case 'warning':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed':
        return 'Tamamlandı';
      case 'active':
        return 'Aktif';
      case 'upcoming':
        return 'Yaklaşan';
      case 'warning':
        return 'Yakında Sona Erecek';
      case 'info':
        return 'Bilgi';
      case 'pending':
        return 'Bekliyor';
      default:
        return 'Bilinmiyor';
    }
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    const targetDate = new Date(dateStr);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // En yüksek aylık kazancı bul (grafik için)
  const maxMonthlyEarning = Math.max(...freelanceData.earnings.monthly.map(item => item.amount));

  // Talep onaylama fonksiyonu
  const handleAcceptRequest = (requestId) => {
    // API çağrısı yapılacak - şimdilik sadece örnek
    setFreelanceData(prevData => ({
      ...prevData,
      transportRequests: prevData.transportRequests.map(req => 
        req.id === requestId ? { ...req, status: 'accepted' } : req
      )
    }));
    setShowRequestModal(false);
  };

  // Talep reddetme fonksiyonu
  const handleRejectRequest = (requestId) => {
    // API çağrısı yapılacak - şimdilik sadece örnek
    setFreelanceData(prevData => ({
      ...prevData,
      transportRequests: prevData.transportRequests.map(req => 
        req.id === requestId ? { ...req, status: 'rejected' } : req
      )
    }));
    setShowRequestModal(false);
  };

  // Talep detaylarını görüntüleme fonksiyonu
  const handleViewRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  return (
    <FreelanceLayout title="Dashboard">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        {/* Taşıma Talepleri Bölümü */}
        <div className="mb-6">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Taşıma Talepleri</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Onayınızı bekleyen taşıma talepleri
                </p>
              </div>
              <Link href="/portal/freelance/requests">
                <span className="inline-flex items-center px-4 py-2 border border-orange-500 rounded-md shadow-sm text-sm font-medium text-orange-600 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                  Tüm Talepleri Görüntüle
                </span>
              </Link>
            </div>
            <div className="border-t border-gray-200">
              {freelanceData.transportRequests && freelanceData.transportRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  {/* Masaüstü tablo görünümü */}
                  <table className="hidden md:table min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Talep Bilgisi
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rota
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tarih
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ücret
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlem
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {freelanceData.transportRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-orange-100 rounded-full text-orange-600">
                                <FaTruck className="h-5 w-5" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{request.title}</div>
                                <div className="text-sm text-gray-500">{request.customer}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 mb-1">{request.from}</div>
                            <div className="text-sm text-gray-500">{request.to}</div>
                            <div className="text-xs text-gray-400 mt-1">{request.distance}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatSimpleDate(request.date)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{request.estimatedPrice} ₺</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              request.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {request.status === 'pending' ? 'Bekliyor' : 
                               request.status === 'accepted' ? 'Onaylandı' : 'Reddedildi'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {request.status === 'pending' && (
                              <div className="flex space-x-2 justify-end">
                                <button
                                  onClick={() => handleViewRequestDetails(request)}
                                  className="text-orange-600 hover:text-orange-800"
                                >
                                  Detaylar
                                </button>
                              </div>
                            )}
                            {request.status !== 'pending' && (
                              <span className="text-gray-500">
                                {request.status === 'accepted' ? 'Onaylandı' : 'Reddedildi'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Mobil kart görünümü */}
                  <div className="md:hidden">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {freelanceData.transportRequests.map((request) => (
                        <div key={request.id} className="bg-white overflow-hidden border border-gray-200 rounded-lg">
                          <div className="px-4 py-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-orange-100 rounded-full text-orange-600">
                                  <FaTruck className="h-4 w-4" />
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{request.title}</div>
                                  <div className="text-xs text-gray-500">{request.customer}</div>
                                </div>
                              </div>
                              <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                request.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                                'bg-red-100 text-red-800'
                              }`}>
                                {request.status === 'pending' ? 'Bekliyor' : 
                                 request.status === 'accepted' ? 'Onaylandı' : 'Reddedildi'}
                              </span>
                            </div>
                            
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Nereden:</span>
                                <p className="text-gray-900 mt-1">{request.from}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Nereye:</span>
                                <p className="text-gray-900 mt-1">{request.to}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Tarih:</span>
                                <p className="text-gray-900 mt-1">{formatSimpleDate(request.date)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Ücret:</span>
                                <p className="text-gray-900 font-medium mt-1">{request.estimatedPrice} ₺</p>
                              </div>
                            </div>
                            
                            {request.status === 'pending' && (
                              <button
                                onClick={() => handleViewRequestDetails(request)}
                                className="mt-3 w-full inline-flex justify-center items-center px-3 py-1.5 border border-orange-300 shadow-sm text-sm leading-4 font-medium rounded-md text-orange-600 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                              >
                                Detayları Görüntüle
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-12 text-center text-sm text-gray-500">
                  Bekleyen taşıma talebi bulunmamaktadır.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {/* Kazanç İstatistikleri */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaMoneyBillWave className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Bu Ay Kazanç
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {freelanceData.earnings.month} ₺
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link href="/portal/freelance/earnings">
                  <span className="font-medium text-orange-600 hover:text-orange-500">
                    Tüm kazançları görüntüle
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Aktif Taşımalar */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaTruck className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Aktif Taşımalar
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {freelanceData.tasks.active}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link href="/portal/freelance/tasks">
                  <span className="font-medium text-orange-600 hover:text-orange-500">
                    Tüm taşımaları görüntüle
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Müşteri Memnuniyeti */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaUser className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Müşteri Memnuniyeti
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        %{freelanceData.stats.customerSatisfaction}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link href="/portal/freelance/profile">
                  <span className="font-medium text-orange-600 hover:text-orange-500">
                    Tüm istatistikleri görüntüle
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Değerlendirme */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaChartLine className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Ortalama Puanım
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {freelanceData.stats.rating} / 5
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link href="/portal/freelance/profile">
                  <span className="font-medium text-orange-600 hover:text-orange-500">
                    Değerlendirmeleri görüntüle
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Hızlı Erişim Menüsü */}
        <div className="mt-6">
          <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 mb-3">Hızlı Erişim</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {freelanceData.quickActions.map((action) => (
              <Link key={action.id} href={action.link}>
                <div className="bg-white overflow-hidden shadow rounded-lg transition transform hover:scale-105 cursor-pointer hover:shadow-lg">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 rounded-md p-2 ${action.color}`}>
                        <action.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{action.title}</p>
                        {action.count && (
                          <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {action.count} yeni
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* İki Sütunlu Yerleşim: Kazanç Grafiği ve Yakın Tarihli Belgeler */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Son 6 Ay Kazanç Grafiği */}
          <div className="lg:col-span-2 bg-white shadow sm:rounded-lg">
            <div className="px-4 py-4 sm:py-5 flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">Aylık Kazanç Grafiği</h3>
                <p className="mt-1 max-w-2xl text-xs sm:text-sm text-gray-500">
                  Son 6 aydaki kazanç dağılımınız
                </p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="h-48 sm:h-64 flex items-end">
                {freelanceData.earnings.monthly.map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div 
                      className="w-full mx-1 bg-orange-500 rounded-t"
                      style={{ 
                        height: `${item.amount > 0 ? (item.amount / maxMonthlyEarning) * 100 : 0}%`, 
                        minHeight: item.amount > 0 ? '20px' : '0'
                      }}
                    ></div>
                    <p className="mt-1 text-xs font-medium text-gray-500">{item.month}</p>
                    <p className="text-xs font-bold text-gray-700">{item.amount} ₺</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Belgeler ve Yenileme Gereken Öğeler */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-4 sm:py-5">
              <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">Yaklaşan Yenilemeler</h3>
              <p className="mt-1 max-w-2xl text-xs sm:text-sm text-gray-500">
                Yakında süresi dolacak belgeler
              </p>
            </div>
            <div>
              <ul className="divide-y divide-gray-200">
                {freelanceData.documentsToRenew.length > 0 ? (
                  freelanceData.documentsToRenew.map((doc) => (
                    <li key={doc.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <FaFileAlt className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm font-medium text-gray-900">{doc.title}</p>
                            <p className="text-xs text-gray-500">Son geçerlilik: {formatSimpleDate(doc.expiryDate)}</p>
                          </div>
                        </div>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(doc.status)}`}>
                          {getDaysUntil(doc.expiryDate)} gün
                        </span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-4 text-center text-xs sm:text-sm text-gray-500">
                    Yakında süresi dolacak belge bulunmamaktadır.
                  </li>
                )}
              </ul>
              <div className="px-4 py-3 bg-gray-50">
                <div className="text-xs sm:text-sm">
                  <Link href="/portal/freelance/documents">
                    <span className="font-medium text-orange-600 hover:text-orange-500">
                      Tüm belgeleri görüntüle
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* İki Sütunlu Yerleşim: Son Taşımalar ve Bekleyen Ödemeler */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Son Taşımalar */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">Son Taşımalarım</h3>
                <p className="mt-1 max-w-2xl text-xs sm:text-sm text-gray-500">
                  Tamamlanan, aktif ve yaklaşan taşımalarınız
                </p>
              </div>
              <Link href="/portal/freelance/tasks">
                <span className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                  Tümünü Görüntüle
                </span>
              </Link>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {freelanceData.recentTasks.length > 0 ? (
                  freelanceData.recentTasks.map((task) => (
                    <li key={task.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <FaTruck className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm font-medium text-gray-900">{task.title}</p>
                            <p className="text-xs text-gray-500">{task.customer}</p>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${getStatusColor(task.status)}`}>
                            {getStatusText(task.status)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <FaCalendarAlt className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                          {formatDate(task.date)}
                        </div>
                        <div className="flex items-center justify-end text-xs text-gray-500">
                          <FaMoneyBillWave className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                          {task.amount} ₺
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-8 text-center text-xs sm:text-sm text-gray-500">
                    Henüz taşıma kaydınız bulunmamaktadır.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Bekleyen Ödemeler */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">Bekleyen Ödemeler</h3>
                <p className="mt-1 max-w-2xl text-xs sm:text-sm text-gray-500">
                  Yakında alacağınız ödemeler
                </p>
              </div>
              <Link href="/portal/freelance/earnings">
                <span className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                  Tüm Ödemeleri Görüntüle
                </span>
              </Link>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {freelanceData.pendingPayments.length > 0 ? (
                  freelanceData.pendingPayments.map((payment) => (
                    <li key={payment.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <FaMoneyBillWave className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm font-medium text-gray-900">{payment.title}</p>
                            <p className="text-xs text-gray-500">{payment.id}</p>
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex items-center">
                          <p className="text-xs font-medium text-green-600">{payment.amount} ₺</p>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <FaCalendarAlt className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                          Tarih: {formatSimpleDate(payment.dueDate)}
                        </div>
                        <div className="flex items-center justify-end text-xs text-gray-500">
                          <FaClock className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                          {getDaysUntil(payment.dueDate)} gün kaldı
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-8 text-center text-xs sm:text-sm text-gray-500">
                    Bekleyen ödemeniz bulunmamaktadır.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Talep Detay Modalı */}
      {showRequestModal && selectedRequest && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowRequestModal(false)}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                  <FaTruck className="h-6 w-6 text-orange-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {selectedRequest.title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {selectedRequest.id} - {selectedRequest.customer}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 border-t border-gray-200 pt-4">
                <dl>
                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-2">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <FaLocationArrow className="mr-1 h-4 w-4 text-orange-500" />
                      Kalkış
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {selectedRequest.from}
                    </dd>
                  </div>
                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-2">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <FaLocationArrow className="mr-1 h-4 w-4 text-orange-500" />
                      Varış
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {selectedRequest.to}
                    </dd>
                  </div>
                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-2">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <FaCalendarAlt className="mr-1 h-4 w-4 text-orange-500" />
                      Tarih
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {formatSimpleDate(selectedRequest.date)}
                    </dd>
                  </div>
                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-2">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <FaMoneyBillWave className="mr-1 h-4 w-4 text-orange-500" />
                      Tahmini Ücret
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {selectedRequest.estimatedPrice} ₺
                    </dd>
                  </div>
                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-2">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <FaInfoCircle className="mr-1 h-4 w-4 text-orange-500" />
                      Eşya Detayı
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {selectedRequest.cargoDetails}
                    </dd>
                  </div>
                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-2">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <FaUser className="mr-1 h-4 w-4 text-orange-500" />
                      Müşteri Puanı
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                      {selectedRequest.customerRating} / 5.0
                      <div className="ml-2 flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <span key={i}>
                            {i < Math.floor(selectedRequest.customerRating) ? 
                              <span>★</span> : 
                              i < selectedRequest.customerRating ? 
                                <span>⯪</span> : 
                                <span className="text-gray-300">★</span>}
                          </span>
                        ))}
                      </div>
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:col-start-2 sm:text-sm"
                  onClick={() => handleAcceptRequest(selectedRequest.id)}
                >
                  <FaThumbsUp className="mr-2 h-5 w-5" />
                  Talebi Onayla
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={() => handleRejectRequest(selectedRequest.id)}
                >
                  <FaThumbsDown className="mr-2 h-5 w-5" />
                  Reddet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FreelanceLayout>
  );
}