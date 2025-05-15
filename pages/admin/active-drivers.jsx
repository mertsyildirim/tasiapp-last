'use client'

import React, { useState, useEffect } from 'react'
import { FaPlus, FaSearch, FaEdit, FaTrash, FaMapMarkerAlt, FaPhone, FaEnvelope, FaTruck, FaSpinner, FaChevronLeft, FaChevronRight, FaChevronDown, FaIdCard, FaCheck, FaUser, FaExclamationCircle } from 'react-icons/fa'
import AdminLayout from '../../components/admin/Layout'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { useRouter } from 'next/router'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import io from 'socket.io-client'

// Google Maps API anahtarı
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAKht3SqaVJpufUdq-vVQEfBEQKejT9Z8k";

export default function ActiveDriversPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('')
  const [activeDrivers, setActiveDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDrivers, setTotalDrivers] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [onDeliveryCount, setOnDeliveryCount] = useState(0)
  const [map, setMap] = useState(null)
  const [driverMarkers, setDriverMarkers] = useState([])
  const [freelancerMarkers, setFreelancerMarkers] = useState([])
  const [selectedTab, setSelectedTab] = useState('all')
  const [showDriverDetailModal, setShowDriverDetailModal] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [users, setUsers] = useState([])
  const [socket, setSocket] = useState(null)

  // Google Maps yükleme
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  })

  // Harita container stili
  const containerStyle = {
    width: '100%',
    height: '400px'
  }

  // Türkiye'nin merkezi - Ankara
  const center = {
    lat: 39.9334,
    lng: 32.8597
  }

  // Map yükleme callback
  const onLoad = React.useCallback(function callback(map) {
    setMap(map)
  }, [])

  // Map unmount callback
  const onUnmount = React.useCallback(function callback() {
    setMap(null)
  }, [])

  // Belirli bir konuma zoom yapma
  const zoomToLocation = (position) => {
    if (map && position) {
      // Konum objesini ayarla
      setSelectedLocation(position);
      
      // Haritayı o konuma yakınlaştır
      map.panTo(position);
      map.setZoom(15); // Yakınlaştırma seviyesi
      
      // Harita alanına scroll
      const mapElement = document.getElementById('driver-map');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // WebSocket bağlantısını kur
  useEffect(() => {
    // Socket.io bağlantısını oluştur
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socketio',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true
    })

    // Bağlantı başarılı olduğunda
    socketInstance.on('connect', () => {
      console.log('Socket bağlantısı başarılı')
    })

    // Bağlantı hatası olduğunda
    socketInstance.on('connect_error', (error) => {
      console.error('Socket bağlantı hatası:', error)
    })

    // Yeniden bağlanma denemesi olduğunda
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Yeniden bağlanma denemesi: ${attemptNumber}`)
    })

    // Kullanıcı durumu değişikliğini dinle
    socketInstance.on('userStatusChange', (data) => {
      console.log('Kullanıcı durumu değişti:', data)
      
      // Kullanıcı listesini güncelle
      setUsers(prevUsers => {
        // Eğer kullanıcı çevrimiçi olduysa ve sürücü/freelance ise listeye ekle
        if (data.isOnline && (data.userType === 'driver' || data.userType === 'freelance')) {
          // Kullanıcı zaten listede var mı kontrol et
          const userExists = prevUsers.some(user => user._id === data._id)
          if (!userExists) {
            return [...prevUsers, data]
          }
        }
        
        // Eğer kullanıcı çevrimdışı olduysa listeden çıkar
        if (!data.isOnline) {
          return prevUsers.filter(user => user._id !== data._id)
        }
        
        return prevUsers
      })
    })

    // Bağlantı koptuğunda
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket bağlantısı koptu:', reason)
    })

    // Socket instance'ını state'e kaydet
    setSocket(socketInstance)

    // Component unmount olduğunda bağlantıyı kapat
    return () => {
      if (socketInstance) {
        socketInstance.disconnect()
      }
    }
  }, [])

  // Kullanıcıları getir
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        // Sadece çevrimiçi olan sürücü ve freelance kullanıcıları filtrele
        const onlineUsers = data.users.filter(user => 
          (user.userType === 'driver' || user.userType === 'freelance') && 
          user.isOnline === true
        )
        setUsers(onlineUsers)
      } else {
        console.error('Kullanıcılar getirilemedi:', data.message)
      }
    } catch (error) {
      console.error('Kullanıcılar getirilirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  // Kullanıcıları yükle
  useEffect(() => {
    fetchUsers();
  }, []);

  // API'den aktif sürücüleri çek
  useEffect(() => {
    fetchDrivers();
  }, [currentPage, searchTerm, selectedTab]);

  // Aktif freelancer konumlarını getir
  const fetchActiveFreelancers = async () => {
    try {
      const response = await fetch('/api/locations/active-freelancers', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Aktif freelancer konum verileri yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        // Freelancer markerlara dönüştür
        const markers = data.locations.map(loc => {
          return {
            position: { lat: loc.latitude, lng: loc.longitude },
            title: loc.userName || 'Freelancer',
            id: loc._id,
            type: 'freelancer',
            userName: loc.userName || 'İsimsiz Freelancer',
            contactPerson: loc.contactPerson || '',
            phone: loc.phone || 'N/A',
            email: loc.email || 'N/A',
            userId: loc.userId || ''
          };
        });
        
        setFreelancerMarkers(markers);
        console.log(`${markers.length} freelancer konumu yüklendi`);
      } else {
        console.error('Freelancer verileri yüklenirken bir hata oluştu:', data.message);
      }
    } catch (error) {
      console.error('Freelancer konum verisi yükleme hatası:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Seçilen sekmeye göre status parametresini belirle
      let statusFilter = '';
      switch(selectedTab) {
        case 'active':
          statusFilter = 'active';
          break;
        case 'on_delivery':
          statusFilter = 'on_delivery';
          break;
        case 'offline':
          statusFilter = 'offline';
          break;
        default:
          statusFilter = '';
      }

      const response = await fetch(`/api/admin/active-drivers?page=${currentPage}&search=${searchTerm}${statusFilter ? `&status=${statusFilter}` : ''}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Aktif sürücü verileri yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        setActiveDrivers(data.drivers);
        setTotalPages(data.totalPages);
        setTotalDrivers(data.total || 0);
        setActiveCount(data.active || 0);
        setOnDeliveryCount(data.onDelivery || 0);
      } else {
        throw new Error(data.message || 'Veri yüklenirken bir hata oluştu');
      }
    } catch (error) {
      setError(error.message);
      console.error('Sürücü verisi yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sürücü konumlarını haritaya ekle
  useEffect(() => {
    if (activeDrivers.length > 0 && isLoaded) {
      // Sürücü konumlarını oluştur
      const markers = activeDrivers
        .filter(driver => {
          // Konum bilgisi string ise ayrıştır, yoksa atla
          if (typeof driver.location === 'string' && driver.location.includes(',')) {
            return true;
          }
          return false;
        })
        .map(driver => {
          // Konum bilgisini ayrıştır (örn: "41.0082, 28.9784" formatı)
          const locationParts = driver.location.split(',');
          if (locationParts.length >= 2) {
            const lat = parseFloat(locationParts[0].trim());
            const lng = parseFloat(locationParts[1].trim());
            
            if (!isNaN(lat) && !isNaN(lng)) {
              return {
                position: { lat, lng },
                title: driver.name,
                id: driver.id,
                status: driver.status
              };
            }
          }
          return null;
        })
        .filter(marker => marker !== null);

      setDriverMarkers(markers);
    }
  }, [activeDrivers, isLoaded]);

  // Sayfa değiştirme
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Arama işlemi
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDrivers();
  };

  // Durum renk sınıfları
  const getStatusColor = (status) => {
    switch(status) {
      case 'Aktif':
      case 'active':
      case 'online':
        return 'bg-green-100 text-green-800'
      case 'Taşıma sırasında':
      case 'on_delivery':
      case 'busy':
        return 'bg-purple-100 text-purple-800'
      case 'offline':
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  // Durumu formatla
  const formatStatus = (status) => {
    switch(status) {
      case 'active':
      case 'online':
        return 'Aktif'
      case 'on_delivery':
      case 'busy':
        return 'Taşıma sırasında'
      case 'offline':
      case 'inactive':
        return 'Çevrimdışı'
      default:
        return status || 'Bilinmiyor'
    }
  }

  // Sayfa numaraları oluştur
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    const halfVisiblePages = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(currentPage - halfVisiblePages, 1);
    let endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(endPage - maxVisiblePages + 1, 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };
  
  // Yükleniyor durumunu göster
  if (loading) {
    return (
      <AdminLayout title="Aktif Sürücüler">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-gray-600">Sürücü verileri yükleniyor...</p>
        </div>
      </AdminLayout>
    )
  }
  
  // Hata durumunu göster
  if (error) {
    return (
      <AdminLayout title="Aktif Sürücüler">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="bg-red-100 text-red-800 p-4 rounded-lg max-w-lg text-center">
            <p className="font-medium mb-2">Hata</p>
            <p>{error}</p>
          </div>
        </div>
      </AdminLayout>
    )
  }
  
  // Veri yok durumunu göster
  if (activeDrivers.length === 0) {
    return (
      <AdminLayout title="Aktif Sürücüler">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-lg font-medium">Aktif Sürücü Listesi</h1>
            <p className="text-gray-500 text-sm mt-1">Sistemde anlık olarak aktif olan tüm sürücüleri görüntüle ve takip et</p>
          </div>
          <div className="flex flex-col w-full md:flex-row md:w-auto gap-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
              <div className="relative w-full md:w-auto">
                <input 
                  type="text" 
                  placeholder="Sürücü ara..." 
                  className="pl-10 pr-4 py-2 w-full md:min-w-[250px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Ara</button>
            </form>
            <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2">
              <FaPlus />
              <span>Yeni Sürücü</span>
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FaTruck className="text-5xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Aktif sürücü bulunamadı</h3>
          <p className="text-gray-600 mb-6">Şu anda sistemde aktif sürücü bulunmuyor veya sürücüler henüz kayıtlı değil.</p>
          <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 inline-flex items-center gap-2">
            <FaPlus />
            <span>Yeni Sürücü Ekle</span>
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Aktif Sürücüler">
      <div className={showDriverDetailModal ? "blur-sm" : ""}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            {/* Sekmeler - Carriers sayfasından uyarlandı */}
            <div className="flex space-x-2 flex-wrap">
              <button
                onClick={() => setSelectedTab('all')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'all' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } mb-2`}
              >
                Tüm Sürücüler
              </button>
              <button
                onClick={() => setSelectedTab('active')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'active' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } mb-2`}
              >
                Çevrimiçi
              </button>
              <button
                onClick={() => setSelectedTab('on_delivery')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'on_delivery' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } mb-2`}
              >
                Taşımada
              </button>
              <button
                onClick={() => setSelectedTab('offline')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'offline' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } mb-2`}
              >
                Çevrimdışı
              </button>
            </div>
          </div>
          <div className="flex flex-col w-full md:flex-row md:w-auto gap-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
              <div className="relative w-full md:w-auto">
                <input 
                  type="text" 
                  placeholder="Sürücü ara..." 
                  className="pl-10 pr-4 py-2 w-full md:min-w-[250px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Ara</button>
            </form>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="flex flex-row gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <FaIdCard className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm">Toplam Aktif Kullanıcı</h3>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <FaCheck className="text-green-600" />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm">Çevrimiçi Sürücüler</h3>
                <p className="text-2xl font-bold">{users.filter(user => user.userType === 'driver').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="flex items-center">
              <div className="bg-orange-100 p-3 rounded-full mr-4">
                <FaTruck className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm">Taşımada</h3>
                <p className="text-2xl font-bold">{users.filter(user => user.status === 'busy' || user.status === 'on_delivery').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sürücü Haritası */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold">Sürücü ve Freelancer Konumları</h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="inline-flex items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="#FFFFFF" strokeWidth="0.5" />
                </svg>
                Aktif Sürücü
              </span>
              <span className="inline-flex items-center mx-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#8B5CF6" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="#FFFFFF" strokeWidth="0.5" />
                </svg>
                Taşımada
              </span>
              <span className="inline-flex items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="#FFFFFF" strokeWidth="0.5" />
                </svg>
                Freelancer
              </span>
            </p>
          </div>
          {loadError && (
            <div className="h-64 bg-gray-100 p-4 flex items-center justify-center">
              <div className="text-center text-red-500">
                <FaMapMarkerAlt className="mx-auto mb-2 text-red-500 h-8 w-8" />
                <p>Harita yüklenirken bir hata oluştu.</p>
                <p className="text-sm">Hata: {loadError.message}</p>
              </div>
            </div>
          )}
          {!loadError && !isLoaded && (
            <div className="h-64 bg-gray-100 p-4 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <FaSpinner className="mx-auto mb-2 text-orange-500 h-8 w-8 animate-spin" />
                <p>Harita yükleniyor...</p>
              </div>
            </div>
          )}
          {!loadError && isLoaded && (
            <div className="h-96">
              <GoogleMap
                id="driver-map"
                mapContainerStyle={containerStyle}
                center={selectedLocation || center}
                zoom={selectedLocation ? 15 : 6}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                  draggable: driverMarkers.length > 0 || freelancerMarkers.length > 0,
                  scrollwheel: driverMarkers.length > 0 || freelancerMarkers.length > 0,
                  disableDoubleClickZoom: driverMarkers.length === 0 && freelancerMarkers.length === 0,
                  gestureHandling: driverMarkers.length > 0 || freelancerMarkers.length > 0 ? 'auto' : 'none'
                }}
              >
                {/* Sürücülerin konumları */}
                {driverMarkers.map((marker) => (
                  <Marker
                    key={`driver-${marker.id}`}
                    position={marker.position}
                    title={marker.title}
                    icon={{
                      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                      fillColor: marker.status === 'active' || marker.status === 'online' 
                        ? '#10B981' // yeşil - aktif
                        : marker.status === 'on_delivery' || marker.status === 'busy'
                          ? '#8B5CF6' // mor - taşıma sırasında
                          : '#9CA3AF', // gri - diğer durumlar
                      fillOpacity: 1,
                      strokeWeight: 1,
                      strokeColor: '#FFFFFF',
                      scale: 2,
                      anchor: new window.google.maps.Point(12, 22),
                    }}
                  />
                ))}
                
                {/* Freelancer'ların konumları */}
                {freelancerMarkers.map((marker) => (
                  <Marker
                    key={`freelancer-${marker.id}`}
                    position={marker.position}
                    title={marker.title}
                    icon={{
                      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                      fillColor: '#F59E0B', // turuncu - freelancer
                      fillOpacity: 1,
                      strokeWeight: 1,
                      strokeColor: '#FFFFFF',
                      scale: 2,
                      anchor: new window.google.maps.Point(12, 22),
                    }}
                  />
                ))}
              </GoogleMap>
            </div>
          )}
          {driverMarkers.length === 0 && freelancerMarkers.length === 0 && isLoaded && !loadError && (
            <div className="h-48 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <FaMapMarkerAlt className="mx-auto mb-2 text-orange-500 h-8 w-8" />
                <p>Haritada gösterilecek konum bulunamadı.</p>
                <p className="text-sm text-gray-400 mt-1">Harita etkileşimi devre dışı bırakıldı.</p>
              </div>
            </div>
          )}
        </div>

        {/* Tablo */}
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Kullanıcı
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Tip
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Durum
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Son Görülme
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Detay</span>
                      </th>
                </tr>
              </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <span className="text-lg font-medium text-orange-700">
                                  {user.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                        </div>
                        <div className="ml-4">
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {user.userType === 'driver' ? 'Sürücü' : 'Freelance'}
                    </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Çevrimiçi
                      </span>
                    </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(user.lastSeen).toLocaleString('tr-TR')}
                    </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button 
                            onClick={() => setShowDriverDetailModal(user)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Detay
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
} 