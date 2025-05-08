import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FaTachometerAlt, FaTruck, FaRoute, FaMoneyBillWave, 
  FaFileAlt, FaUser, FaTools, FaBars, FaTimes, 
  FaSignOutAlt, FaBell, FaChartLine, FaCalendarAlt, FaClock,
  FaInbox, FaMapMarkerAlt, FaCheckCircle, FaExclamationCircle,
  FaMapMarked, FaLock, FaLockOpen, FaToggleOn, FaToggleOff
} from 'react-icons/fa';

export default function FreelanceLayout({ children, title = 'Freelance Portal' }) {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace('/portal/login');
    },
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [locationShared, setLocationShared] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [driverStatus, setDriverStatus] = useState('çevrimdışı');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showingModal, setShowingModal] = useState(false);
  const [modalAnimating, setModalAnimating] = useState(false);
  
  // Oturum kontrolü
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) return;
    
    // Kullanıcı türü ve freelance kontrolü
    if (!session.user.isFreelance || session.user.userType !== 'company') {
      console.error("Bu sayfa sadece freelance kullanıcıları içindir");
      
      if (session.user.userType === 'driver') {
        router.replace('/portal/driver/dashboard');
      } else {
        router.replace('/portal/dashboard');
      }
    }
  }, [status, session, router]);

  // Saati güncelle
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Ekran boyutu kontrolü
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Örnek bildirimler
  useEffect(() => {
    // Session yüklenmiyorsa işlem yapma
    if (status === 'loading') return;
    
    // Session yoksa işlem yapma (onUnauthenticated ile zaten yönlendiriliyor)
    if (!session) return;
    
    // Mock bildirimler ekle (normalde API'den çekilecek)
    setNotifications([
      { id: 1, message: "Yeni bir taşıma talebi alındı: #FRL2024123", time: "Bugün, 14:30" },
      { id: 2, message: "Yeni fiyat teklifi talebi var", time: "Dün, 10:15" },
      { id: 3, message: "Taşıyıcı belgeniz için yenileme zamanı yaklaşıyor", time: "2 gün önce" }
    ]);
  }, [session, status]);

  // Mevcut durum bilgisini alma ve güncelleme
  useEffect(() => {
    if (status === 'loading') return;
    
    // Oturum yoksa çevrimiçi durumunu güncellemiyoruz
    if (!session) {
      setIsOnline(false);
      setDriverStatus('çevrimdışı');
      return;
    }
    
    // Çevrimiçi durum değişikliğini takip et
    if (isOnline) {
      setDriverStatus('çevrimiçi');
    } else {
      setDriverStatus('çevrimdışı');
    }
    
    // Çevrimiçi durumu localStorage'a kaydet (sayfalar arası geçişlerde korunsun)
    localStorage.setItem('freelanceIsOnline', isOnline.toString());
    
    // API'ye çevrimiçi durumunu bildir
    const updateOnlineStatus = async () => {
      try {
        console.log(`Çevrimiçi durum değişti: ${isOnline ? 'çevrimiçi' : 'çevrimdışı'}`);
        
        // API çağrısı yaparak durum değişikliğini veritabanına kaydet
        const response = await fetch('/api/portal/update-online-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOnline })
        });
        
        const data = await response.json();
        
        // Yanıtı kontrol et
        if (!response.ok) {
          if (response.status === 401) {
            console.warn('Durum güncellemesi için oturum gerekiyor.');
            return;
          }
          
          throw new Error(data.message || 'Durum güncellenirken bir hata oluştu');
        }
        
        // Başarılı cevap ama oturum yok mesajı
        if (data.message && data.message.includes('Oturum açılmadığı için')) {
          console.log('Bilgi:', data.message);
          return; // İşlem yapılmadı, devam et
        }
        
        console.log('Durum başarıyla güncellendi:', data.message);
      } catch (error) {
        console.error('Durum güncellenirken hata:', error);
        // Hata durumunda LocalStorage'daki durumu koruyalım
      }
    };
    
    // Çevrimiçi durum değiştiğinde API'yi çağır
    updateOnlineStatus();
  }, [isOnline, session, status]);

  // İlk yüklendiğinde localStorage'dan çevrimiçi durumunu al
  // ve kullanıcının mevcut durumunu API'den kontrol et
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Önce localStorage'dan durumu al (sayfa yenileme için)
    const savedOnlineStatus = localStorage.getItem('freelanceIsOnline');
    
    // Oturum yoksa çevrimiçi durumunu değiştirmiyoruz
    if (status === 'loading') return;
    
    if (!session) {
      setIsOnline(false);
      return;
    }
    
    const fetchUserOnlineStatus = async () => {
      try {
        // Kullanıcının mevcut çevrimiçi durumunu API'den kontrol et
        const response = await fetch('/api/portal/user-status');
        
        const data = await response.json();
        
        // Yanıtı kontrol et
        if (!response.ok) {
          if (response.status === 401) {
            console.warn('Durum bilgisi alımı için oturum gerekiyor.');
            setIsOnline(false);
            return;
          }
          
          // API hatası durumunda localStorage değerini kullan
          setIsOnline(savedOnlineStatus === 'true');
          return;
        }
        
        // Oturumsuz kullanım için API düzgün yanıt verdi mi?
        if (data.message && data.message.includes('Oturum açılmadığı için')) {
          console.log('Bilgi:', data.message);
          setIsOnline(data.isOnline); // API'nin döndürdüğü durumu kullan (muhtemelen false)
          return;
        }
        
        if (data.success) {
          // API'den gelen durumu state'e ayarla
          setIsOnline(data.isOnline);
          console.log('Kullanıcı durumu API\'den alındı:', data.isOnline ? 'çevrimiçi' : 'çevrimdışı');
        } else {
          // API başarısız olursa localStorage değerini kullan
          setIsOnline(savedOnlineStatus === 'true');
        }
      } catch (error) {
        console.error('Kullanıcı durumu alınırken hata:', error);
        // Hata durumunda localStorage değerini kullan
        setIsOnline(savedOnlineStatus === 'true');
      }
    };
    
    fetchUserOnlineStatus();
  }, [session, status]);

  // Bildirim dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isNotificationsOpen && !event.target.closest('.notifications-dropdown')) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  // Profil dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest('.profile-dropdown')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const handleSignOut = async () => {
    try {
      console.log('Çıkış yapılıyor...');
      await signOut({ 
        redirect: false,
        callbackUrl: '/portal/login'
      });
      console.log('Çıkış başarılı, yönlendiriliyor...');
      
      // Oturum verilerini temizle
      localStorage.removeItem('freelanceIsOnline');
      
      // Kısa bir gecikme ekleyerek yönlendirme işlemine izin ver
      setTimeout(() => {
        window.location.href = '/portal/login';
      }, 100);
    } catch (error) {
      console.error('Çıkış yaparken hata:', error);
      // Hata durumunda yine de yönlendir
      window.location.href = '/portal/login';
    }
  };

  // Çevrimiçi durumunu değiştir
  const toggleOnlineStatus = () => {
    // Oturum yoksa çevrimiçi durumunu değiştirmiyoruz
    if (!session) {
      // Oturum açmadan durum değiştirilemez
      router.push('/portal/login');
      return;
    }
    
    setIsOnline(prevStatus => !prevStatus);
  };

  // Tarih formatı
  const formatDate = (date) => {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Saat formatı
  const formatTime = (date) => {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Aktif menü öğesini belirle
  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  // Freelance menü öğeleri
  const navigation = [
    { name: 'Dashboard', href: '/portal/freelance/dashboard', icon: FaChartLine },
    { name: 'Talepler', href: '/portal/freelance/requests', icon: FaInbox },
    { name: 'Taşımalarım', href: '/portal/freelance/tasks', icon: FaTruck },
    { name: 'Rotalarım', href: '/portal/freelance/routes', icon: FaRoute },
    { name: 'Kazançlarım', href: '/portal/freelance/earnings', icon: FaMoneyBillWave },
    { name: 'Belgelerim', href: '/portal/freelance/documents', icon: FaFileAlt },
    { name: 'Profilim', href: '/portal/freelance/profile', icon: FaUser },
    { name: 'Ayarlar', href: '/portal/freelance/settings', icon: FaTools },
  ];

  // Konum paylaşımını aç/kapat
  const toggleLocationSharing = () => {
    if (!locationShared) {
      // Konum izni iste
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Başarılı olursa konum paylaşımını etkinleştir
            setLocationShared(true);
            // Başarı modalını göster
            setShowingModal(true);
            showLocationSuccessModal();
          },
          (error) => {
            // Hata durumunda izin modalını göster
            setShowLocationModal(true);
          }
        );
      } else {
        // Tarayıcı desteklemiyorsa izin modalını göster
        setShowLocationModal(true);
      }
    } else {
      // Konum paylaşımını kapatmak istediğinde onay modalı göster
      setShowingModal(true);
      showLocationSuccessModal();
    }
  };

  // Konum izni modalını kapat
  const closeLocationModal = () => {
    setModalAnimating(true);
    setTimeout(() => {
      setShowLocationModal(false);
      setModalAnimating(false);
    }, 300);
  };

  // Konum paylaşımı başarılı modalı göster/kapat
  const showLocationSuccessModal = () => {
    setModalAnimating(true);
    setTimeout(() => {
      setModalAnimating(false);
    }, 300);
    
    // Modal otomatik kapanma zamanlayıcısı
    setTimeout(() => {
      setModalAnimating(true);
      setTimeout(() => {
        setShowingModal(false);
        setModalAnimating(false);
      }, 300);
    }, 3000);
  };

  // Konum paylaşımı aç/kapat
  const handleLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationShared(true);
          closeLocationModal();
          // Başarı modalını göster
          setShowingModal(true);
          showLocationSuccessModal();
        },
        (error) => {
          // Konum izni reddedildiğinde
          setLocationShared(false);
          closeLocationModal();
        }
      );
    }
  };

  // Oturum yoksa veya yükleniyor durumunda boş içerik göster
  if (status === 'loading' || !session) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
    </div>;
  }

  return (
    <>
      <Head>
        <title>{title ? `${title} | Taşı Portal` : 'Taşı Portal'}</title>
        <meta name="description" content="Taşı Portal - Freelance Taşıyıcı Paneli" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex h-screen bg-gray-50">
        {/* Sidebar - Masaüstü */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-gray-200 bg-white h-full">
            <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 mb-5">
                <Link href="/portal/freelance/dashboard">
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
              
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const isCurrentActive = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                        isCurrentActive
                          ? 'bg-orange-100 text-orange-700'
                          : 'text-gray-600 hover:bg-orange-50 hover:text-orange-700'
                      }`}
                    >
                      <item.icon className={`mr-3 h-5 w-5 ${isCurrentActive ? 'text-orange-500' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 w-full">
                <div className="flex items-center">
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-orange-100">
                    <span className="text-sm font-medium leading-none text-orange-700">
                      {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'F'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-bold text-gray-900">{session.user?.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobil Menü */}
        <div className={`fixed inset-0 flex z-40 md:hidden transition-all transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
              >
                <FaTimes className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4 mb-5">
                <Link href="/portal/freelance/dashboard">
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
              
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const isCurrentActive = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
                        isCurrentActive
                          ? 'bg-orange-100 text-orange-700'
                          : 'text-gray-600 hover:bg-orange-50 hover:text-orange-700'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className={`mr-3 h-5 w-5 ${isCurrentActive ? 'text-orange-500' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 w-full">
                <div className="flex items-center">
                  <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-orange-100">
                    <span className="text-sm font-medium leading-none text-orange-700">
                      {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'F'}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-bold text-gray-900">{session.user?.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ana İçerik */}
        <div className="flex flex-col w-full flex-1 overflow-hidden">
          {/* Mobil Header */}
          <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 flex items-center justify-between shadow-sm z-10 bg-white">
            <div className="flex items-center space-x-2">
              <button
                className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <FaBars className="h-6 w-6" />
              </button>
              <div className="flex items-center">
                <span className={`inline-flex items-center ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {driverStatus}
                </span>
                <button 
                  onClick={toggleOnlineStatus}
                  className={`ml-2 p-1 rounded-full transition-colors duration-200 focus:outline-none ${
                    isOnline ? 'text-green-500 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {isOnline ? <FaToggleOn className="h-5 w-5" /> : <FaToggleOff className="h-5 w-5" />}
                </button>
                {locationShared ? (
                  <button 
                    onClick={toggleLocationSharing}
                    className="ml-2 p-1 rounded-full hover:bg-green-100 transition-colors duration-200 focus:outline-none"
                  >
                    <FaMapMarkerAlt className="h-4 w-4 text-green-500" />
                  </button>
                ) : (
                  <button 
                    onClick={toggleLocationSharing}
                    className="ml-2 p-1 rounded-full hover:bg-red-100 transition-colors duration-200 focus:outline-none"
                  >
                    <FaMapMarkerAlt className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end pr-4">
              <div className="text-xs font-medium text-gray-500 flex items-center">
                <FaCalendarAlt className="h-3 w-3 mr-1 text-orange-500" />
                <span>{formatDate(currentTime)}</span>
              </div>
              <div className="text-xs font-medium text-gray-500 flex items-center mt-1">
                <FaClock className="h-3 w-3 mr-1 text-orange-500" />
                <span>{formatTime(currentTime)}</span>
              </div>
            </div>
          </div>
          
          {/* Desktop Header */}
          <div className="hidden md:flex md:items-center md:justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
            <div>
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {driverStatus}
                  </span>
                  <button 
                    onClick={toggleOnlineStatus}
                    className={`p-1 rounded-full transition-colors duration-200 focus:outline-none ${
                      isOnline ? 'text-green-500 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={isOnline ? 'Çevrimdışı ol' : 'Çevrimiçi ol'}
                  >
                    {isOnline ? <FaToggleOn className="h-6 w-6" /> : <FaToggleOff className="h-6 w-6" />}
                  </button>
                </div>
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
              
              <div className="relative">
                <button 
                  className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                >
                  <FaBell className="h-6 w-6" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                  )}
                </button>
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50 notifications-dropdown">
                    <div className="py-1">
                      {notifications.length > 0 ? (
                        notifications.map((notification, index) => (
                          <div key={index} className="px-4 py-2 hover:bg-gray-100">
                            <p className="text-sm text-gray-800">{notification.message}</p>
                            <p className="text-xs text-gray-500">{notification.time}</p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">
                          Bildiriminiz bulunmuyor
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <button 
                  className="relative p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <FaUser className="h-6 w-6" />
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-50 profile-dropdown">
                    <div className="py-1">
                      <Link
                        href="/portal/freelance/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Profilim
                      </Link>
                      <div className="border-t border-gray-200">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 focus:outline-none focus:ring-0"
                        >
                          <span className="flex items-center">
                            <FaSignOutAlt className="mr-2 h-4 w-4" />
                            Çıkış Yap
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Konum İzni Modal */}
      {showLocationModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className={`absolute inset-0 bg-gray-500 ${modalAnimating ? 'opacity-0' : 'opacity-75'} transition-opacity duration-300`}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 ${modalAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} transition-all duration-300`}>
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                  <FaMapMarked className="h-6 w-6 text-orange-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Konum İzni Gerekiyor
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      TaşıApp&apos;in konumunuzu kullanmasına izin vererek müşterilerin sizi daha kolay bulmasını sağlayabilirsiniz. 
                      Ayrıca konum paylaşımı, taşıma taleplerini daha doğru bir şekilde alabilmenizi sağlar.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:col-start-2 sm:text-sm"
                  onClick={handleLocationPermission}
                >
                  <FaLockOpen className="mr-2 h-5 w-5" />
                  İzin Ver
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  onClick={closeLocationModal}
                >
                  <FaLock className="mr-2 h-5 w-5" />
                  Şimdi Değil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konum Paylaşım Bilgi Modalı */}
      {showingModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className={`absolute inset-0 bg-gray-500 ${modalAnimating ? 'opacity-0' : 'opacity-75'} transition-opacity duration-300`}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 ${modalAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} transition-all duration-300`}>
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  {locationShared ? (
                    <FaCheckCircle className="h-6 w-6 text-green-600 animate-pulse" />
                  ) : (
                    <FaExclamationCircle className="h-6 w-6 text-red-600 animate-pulse" />
                  )}
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {locationShared ? 'Konumunuz Paylaşılıyor' : 'Konum Paylaşımı Durduruldu'}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {locationShared 
                        ? "Şu anda konumunuz müşteriler ve yöneticilerle paylaşılıyor. Bu, taşıma taleplerini daha kolay almanızı sağlar." 
                        : "Konum paylaşımınız durduruldu. Taşıma talepleri alabilirsiniz ancak müşteriler sizi haritada göremeyecek."}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:text-sm"
                  onClick={() => {
                    setModalAnimating(true);
                    setTimeout(() => {
                      setShowingModal(false);
                      setModalAnimating(false);
                    }, 300);
                  }}
                >
                  Anladım
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 