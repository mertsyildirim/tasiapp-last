import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import axios from 'axios';
import { FaSpinner, FaTruck, FaBox, FaMoneyBillWave, FaUser, FaChartLine, FaBell, FaCog, FaSignOutAlt, FaBars, FaTimes, FaHome, FaMapMarkedAlt, FaFileInvoiceDollar, FaUsers, FaWarehouse, FaClipboardList, FaEnvelope, FaChevronDown, FaSearch, FaUserTie, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaTachometerAlt, FaUserAlt, FaCalendarAlt, FaClock, FaClipboardCheck } from 'react-icons/fa';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function PortalLayout({ children, title = 'Taşıyıcı Portalı' }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [carrierStatus, setCarrierStatus] = useState('active'); // 'active', 'document_expired', 'inactive'
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Saati güncelle
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Bildirimleri getir
  const fetchNotifications = async () => {
    try {
      if (!session) return;
      
      const response = await axios.get('/api/portal/notifications', {
        params: {
          limit: 5,
          page: 1
        }
      });
      
      if (response.data.success) {
        setNotifications(response.data.data.notifications || []);
        setUnreadNotificationsCount(response.data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Bildirim getirme hatası:', error);
    }
  };

  // Bildirimi okundu olarak işaretle
  const markNotificationAsRead = async (notificationId) => {
    try {
      if (!session) return;
      
      await axios.put(`/api/portal/notifications?id=${notificationId}`, {
        read: true
      });
      
      // Bildirimleri güncelle
      fetchNotifications();
    } catch (error) {
      console.error('Bildirim güncelleme hatası:', error);
    }
  };

  // Kullanıcı giriş durumunu kontrol et
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (status === 'loading') {
          return;
        }

        if (!session) {
          router.push('/portal/login');
          return;
        }

        // Kullanıcı bilgilerini session'dan al
        console.log("Session user:", session.user);
        
        // Company değerini al
        const companyName = session.user.company || session.user.companyName || '';
        console.log("Firma adı:", companyName);
        
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          type: session.user.userType,
          role: session.user.role,
          status: session.user.status,
          companyName: companyName // Firma adı
        });

        // Taşıyıcı durumunu kullanıcı oturum bilgisinden al
        setCarrierStatus(session.user.status === 'WAITING_DOCUMENTS' ? 'document_expired' : 
                          session.user.status === 'active' ? 'active' : 
                          session.user.status === 'ACTIVE' ? 'active' : 'inactive');
        
        // Bildirimleri getir
        fetchNotifications();
        
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/portal/login');
      } finally {
        setLoading(false);
      }
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkAuth();
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [router, session, status]);

  // Bildirimleri periyodik olarak güncelle (5 dakikada bir)
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 5 * 60 * 1000); // 5 dakika
    
    return () => clearInterval(interval);
  }, [session]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/portal/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/portal/login');
    }
  };

  // Tarih formatı
  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Saat formatı
  const formatTime = (date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = () => {
    switch (carrierStatus) {
      case 'active':
        return <FaCheckCircle className="h-5 w-5 text-green-500" />;
      case 'document_expired':
        return <FaExclamationTriangle className="h-5 w-5 text-yellow-500" />;
      case 'inactive':
        return <FaTimesCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FaCheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusText = () => {
    switch (carrierStatus) {
      case 'active':
        return 'Aktif';
      case 'document_expired':
        return 'Tarihi geçmiş evrak güncellemesi bekliyor';
      case 'inactive':
        return 'Pasif';
      default:
        return 'Aktif';
    }
  };

  const getStatusClass = () => {
    switch (carrierStatus) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'document_expired':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // Firma adının ilk harfini al
  const getCompanyInitial = () => {
    if (user?.companyName && user.companyName.trim() !== '') {
      // Firma adının ilk harfini büyük harf olarak al
      return user.companyName.charAt(0).toUpperCase();
    } else if (user?.name && user.name.trim() !== '') {
      // Kullanıcı adının ilk harfini büyük harf olarak al
      return user.name.charAt(0).toUpperCase();
    }
    return 'T'; // Default: Taşı
  };

  // Firma adının ilk kelimesini al
  const getCompanyFirstWord = () => {
    if (user?.companyName && user.companyName.trim() !== '') {
      // Firma adının ilk kelimesini al (boşluğa göre ayırarak)
      return user.companyName.split(' ')[0];
    }
    return 'Taşı';
  };

  // Kullanıcı adı ve soyadı
  const getFullName = () => {
    if (user?.name && user.name.trim() !== '') {
      // Kullanıcı adının ilk kelimesini al (boşluğa göre ayırarak)
      return user.name.split(' ')[0];
    }
    return 'Kullanıcı';
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Bildirim dropdown'ı dışında bir yere tıklandığında kapat
      // Ancak bildirim butonuna tıklanması durumunda button.dataset.type='notification-toggle' 
      // kontrolü ile dropdown'un açılıp kapanmasına izin ver
      if (showNotifications && 
          !event.target.closest('.notifications-dropdown') && 
          !(event.target.closest('button') && event.target.closest('button').dataset.type === 'notification-toggle')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Profil dropdown'ı dışında bir yere tıklandığında kapat
      // Ancak profil butonuna tıklanması durumunda button.dataset.type='profile-toggle' 
      // kontrolü ile dropdown'un açılıp kapanmasına izin ver
      if (showProfileMenu && 
          !event.target.closest('.profile-dropdown') && 
          !(event.target.closest('button') && event.target.closest('button').dataset.type === 'profile-toggle')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  // Yükleme ekranı
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Kullanıcı giriş yapmamışsa sayfa gösterilmez (yönlendirme yapılır)
  if (!user) {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', href: '/portal/dashboard', icon: FaTachometerAlt },
    { name: 'Talepler', href: '/portal/requests', icon: FaClipboardCheck },
    { name: 'Taşımalar', href: '/portal/shipments', icon: FaTruck },
    { name: 'Takip', href: '/portal/tracking', icon: FaMapMarkedAlt },
    { name: 'Ödemeler', href: '/portal/payments', icon: FaMoneyBillWave },
    { name: 'Sürücüler', href: '/portal/drivers', icon: FaUserTie },
    { name: 'Araçlar', href: '/portal/vehicles', icon: FaTruck },
    { name: 'Raporlar', href: '/portal/reports', icon: FaChartLine },
    { name: 'Faturalar', href: '/portal/invoices', icon: FaFileInvoiceDollar },
    { name: 'Görevler', href: '/portal/tasks', icon: FaClipboardList },
    { name: 'Mesajlar', href: '/portal/messages', icon: FaEnvelope },
  ];

  const isActivePath = (path) => {
    return router.pathname === path;
  };

  return (
    <>
      <Head>
        <title>{title ? `${title} | Taşı Portal` : 'Taşı Portal'}</title>
        <meta name="description" content="Taşı Portal - Taşıma İşlemlerinizi Yönetin" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Mobil Menü */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${isMenuOpen ? 'visible' : 'invisible'}`}>
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`} 
             onClick={() => setIsMenuOpen(false)}>
        </div>
        <div className={`relative flex-1 flex flex-col max-w-[260px] w-full bg-white transform transition-transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
            >
              <FaTimes className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4 mb-5">
              <Link href="/portal/dashboard" className="text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors duration-200">
                <Image
                  src="/portal_logo.png"
                  alt="Taşı Portal Logo"
                  width={120}
                  height={40}
                  className="cursor-pointer"
                  priority
                />
              </Link>
            </div>
            <nav className="mt-10 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:bg-orange-50 hover:text-orange-700'
                    }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full">
              <div className="flex items-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                  <span className="text-lg font-bold leading-none text-orange-700">
                    {getCompanyInitial()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-base font-bold text-gray-900 truncate">
                    {getFullName()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout - desktop/tablet */}
      <div className="flex min-h-screen overflow-hidden bg-gray-100">
        {/* Sidebar - desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-48 h-screen sticky top-0">
            <div className="flex flex-col h-full flex-1 border-r border-gray-200 bg-white">
                <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                    <div className="flex items-center flex-shrink-0 px-4 mb-3">
                      <Link href="/portal/dashboard" className="text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors duration-200">
                        <Image
                          src="/portal_logo.png"
                          alt="Taşı Portal Logo"
                          width={90}
                          height={30}
                          className="cursor-pointer"
                          priority
                        />
                      </Link>
                    </div>
                    
                    {/* Kullanıcı bilgileri - sidebar üst kısım */}
                    <div className="flex-shrink-0 px-4 py-3 mb-5 border-b border-gray-200">
                      <div className="flex items-center">
                        <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                          <span className="text-lg font-bold leading-none text-orange-700">
                            {getCompanyInitial()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-base font-bold text-gray-900 truncate">
                            {getFullName()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <nav className="mt-2 flex-1 px-2 space-y-1">
                      {navigation.map((item) => {
                        const isActive = router.pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                              isActive
                                ? 'bg-orange-100 text-orange-700'
                                : 'text-gray-600 hover:bg-orange-50 hover:text-orange-700'
                            }`}
                          >
                            <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                            {item.name}
                          </Link>
                        );
                      })}
                    </nav>
                </div>
            </div>
          </div>
        </div>

        {/* Main content container */}
        <div className="flex flex-col w-0 flex-1 min-h-screen overflow-hidden">
          <div className="w-full overflow-x-hidden">
            {/* Mobil Header */}
            <div className="md:hidden bg-white shadow-sm z-10">
              <div className="flex items-center justify-between px-3 py-2">
                {/* Mobil menü butonu ve sayfa başlığı */}
                <div className="flex items-center">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
                  >
                    <FaBars className="h-5 w-5" />
                  </button>
                  <div className="ml-2">
                    <h1 className="text-base font-medium text-gray-800">{title}</h1>
                  </div>
                </div>
                
                {/* Sağ taraf */}
                <div className="flex items-center space-x-3">
                  {/* Durum */}
                  <div className={`flex items-center px-2 py-1 rounded-md border ${getStatusClass()}`}>
                    {getStatusIcon()}
                    <span className="ml-1 text-xs font-medium">{carrierStatus === 'active' ? 'Aktif' : carrierStatus === 'document_expired' ? 'Evrak' : 'Pasif'}</span>
                  </div>
                  
                  {/* Bildirim butonu */}
                  <div className="relative">
                    <button 
                      className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => setShowNotifications(!showNotifications)}
                    >
                      <FaBell className="h-5 w-5" />
                      {/* Okunmamış bildirim varsa */}
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-1 ring-white"></span>
                      )}
                    </button>
                    
                    {/* Mobil bildirim dropdown - mobil görünümde göster */}
                    {showNotifications && (
                      <div className="fixed right-3 mt-2 bg-white rounded-md shadow-lg overflow-hidden z-[99999] notifications-dropdown" style={{width: "300px", maxWidth: "calc(100vw - 24px)", top: "4rem"}}>
                        <div className="py-1">
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-medium text-gray-700">Sistem Bildirimleri</h3>
                              {unreadNotificationsCount > 0 && (
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800">
                                  {unreadNotificationsCount} yeni
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {notifications && notifications.length > 0 ? (
                            <div className="max-h-72 overflow-y-auto">
                              {notifications.map((notification) => (
                                <div 
                                  key={notification.id} 
                                  className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer ${!notification.read ? 'bg-orange-50' : ''}`}
                                  onClick={() => markNotificationAsRead(notification.id)}
                                >
                                  <div className="flex items-start">
                                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                                      notification.type === 'success' ? 'bg-green-100' : 
                                      notification.type === 'warning' ? 'bg-yellow-100' : 
                                      notification.type === 'error' ? 'bg-red-100' : 
                                      'bg-blue-100'
                                    }`}>
                                      {notification.type === 'success' ? (
                                        <FaCheckCircle className="h-4 w-4 text-green-600" />
                                      ) : notification.type === 'warning' ? (
                                        <FaExclamationTriangle className="h-4 w-4 text-yellow-600" />
                                      ) : notification.type === 'error' ? (
                                        <FaTimesCircle className="h-4 w-4 text-red-600" />
                                      ) : (
                                        <FaBell className="h-4 w-4 text-blue-600" />
                                      )}
                                    </div>
                                    <div className="ml-3 flex-1">
                                      <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                        {notification.title}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                        {notification.message}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        {notification.timestamp}
                                      </p>
                                    </div>
                                    {!notification.read && (
                                      <div className="ml-2 flex-shrink-0">
                                        <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-6 text-sm text-gray-500 text-center">
                              <FaEnvelope className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                              <p>Henüz bildiriminiz bulunmuyor</p>
                            </div>
                          )}
                          <div className="border-t border-gray-200">
                            <button className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-gray-100" onClick={() => router.push('/portal/messages')}>
                              Tüm Sistem Mesajları
                            </button>
                          </div>
                        </div>
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-500" onClick={() => setShowNotifications(false)}>
                          <FaTimes className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Profil butonu */}
                  <div className="relative">
                    <button 
                      className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                    >
                      <FaUser className="h-5 w-5" />
                    </button>
                    
                    {/* Mobil profil dropdown */}
                    {showProfileMenu && (
                      <div className="fixed right-3 bg-white rounded-md shadow-lg overflow-hidden z-[99999] profile-dropdown" style={{width: "200px", maxWidth: "calc(100vw - 24px)", top: "4rem"}}>
                        <div className="py-1">
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => router.push('/portal/profile')}>
                            Profil
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => router.push('/portal/settings')}>
                            Ayarlar
                          </button>
                          <div className="border-t border-gray-200">
                            <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100" onClick={handleLogout}>
                              Çıkış Yap
                            </button>
                          </div>
                        </div>
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-500" onClick={() => setShowProfileMenu(false)}>
                          <FaTimes className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Tarih ve saat bilgisi - Tek satırda yan yana */}
              <div className="flex items-center justify-end px-3 py-1 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center">
                  <FaCalendarAlt className="h-3 w-3 mr-1 text-orange-500" />
                  <span>{currentTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="mx-2">•</span>
                  <FaClock className="h-3 w-3 mr-1 text-orange-500" />
                  <span>{currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex md:items-center p-4 border-b border-gray-200 bg-white shadow-sm w-full">
              <div className="flex-grow">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold">{title}</h1>
                  <div className="mx-4 h-6 w-px bg-gray-300"></div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    carrierStatus === 'active' ? 'bg-green-100 text-green-800' : 
                    carrierStatus === 'document_expired' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {carrierStatus === 'active' ? 'Aktif ✓' : 
                     carrierStatus === 'document_expired' ? 'Evrak Bekliyor !' : 
                     'Pasif ✕'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex items-center justify-end text-sm text-gray-600">
                    <FaCalendarAlt className="h-4 w-4 mr-1 text-orange-500" />
                    <span>{formatDate(currentTime)}</span>
                  </div>
                  <div className="flex items-center justify-end text-sm text-gray-600 mt-1">
                    <FaClock className="h-4 w-4 mr-1 text-orange-500" />
                    <span>{formatTime(currentTime)}</span>
                  </div>
                </div>
                <div className="relative z-30">
                  <button 
                    className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <FaBell className="h-6 w-6" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="fixed mt-2 bg-white rounded-md shadow-lg overflow-hidden z-50 notifications-dropdown" style={{top: "4.5rem", width: "320px", right: "3.5rem"}}>
                      <div className="py-1">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-700">Sistem Bildirimleri</h3>
                            {unreadNotificationsCount > 0 && (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800">
                                {unreadNotificationsCount} yeni
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {notifications && notifications.length > 0 ? (
                          <div className="max-h-72 overflow-y-auto">
                            {notifications.map((notification) => (
                              <div 
                                key={notification.id} 
                                className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer ${!notification.read ? 'bg-orange-50' : ''}`}
                                onClick={() => markNotificationAsRead(notification.id)}
                              >
                                <div className="flex items-start">
                                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                                    notification.type === 'success' ? 'bg-green-100' : 
                                    notification.type === 'warning' ? 'bg-yellow-100' : 
                                    notification.type === 'error' ? 'bg-red-100' : 
                                    'bg-blue-100'
                                  }`}>
                                    {notification.type === 'success' ? (
                                      <FaCheckCircle className="h-4 w-4 text-green-600" />
                                    ) : notification.type === 'warning' ? (
                                      <FaExclamationTriangle className="h-4 w-4 text-yellow-600" />
                                    ) : notification.type === 'error' ? (
                                      <FaTimesCircle className="h-4 w-4 text-red-600" />
                                    ) : (
                                      <FaBell className="h-4 w-4 text-blue-600" />
                                    )}
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                      {notification.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {notification.timestamp}
                                    </p>
                                  </div>
                                  {!notification.read && (
                                    <div className="ml-2 flex-shrink-0">
                                      <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-sm text-gray-500 text-center">
                            <FaEnvelope className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                            <p>Henüz bildiriminiz bulunmuyor</p>
                          </div>
                        )}
                        <div className="border-t border-gray-200">
                          <button className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-gray-100" onClick={() => router.push('/portal/messages')}>
                            Tüm Sistem Mesajları
                          </button>
                        </div>
                      </div>
                      <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-500" onClick={() => setShowNotifications(false)}>
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative z-30">
                  <button 
                    className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <FaUser className="h-6 w-6" />
                  </button>
                  {showProfileMenu && (
                    <div className="fixed mt-2 right-4 w-48 bg-white rounded-md shadow-lg overflow-hidden z-50 profile-dropdown" style={{top: "4.5rem"}}>
                      <div className="py-1">
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => router.push('/portal/profile')}>
                          Profil
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => router.push('/portal/settings')}>
                          Ayarlar
                        </button>
                        <div className="border-t border-gray-200">
                          <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100" onClick={handleLogout}>
                            Çıkış Yap
                          </button>
                        </div>
                      </div>
                      <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-500" onClick={() => setShowProfileMenu(false)}>
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Page content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none p-4">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}