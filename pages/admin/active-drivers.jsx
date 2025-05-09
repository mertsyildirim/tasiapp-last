'use client'

import React, { useState, useEffect } from 'react'
import { FaPlus, FaSearch, FaEdit, FaTrash, FaMapMarkerAlt, FaPhone, FaEnvelope, FaTruck, FaSpinner, FaChevronLeft, FaChevronRight, FaChevronDown, FaIdCard, FaCheck, FaUser, FaExclamationCircle } from 'react-icons/fa'
import AdminLayout from '../../components/admin/Layout'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { useRouter } from 'next/router'
import axios from 'axios'
import { useSession } from 'next-auth/react'

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

  // API'den aktif freelancerları çek
  useEffect(() => {
    fetchActiveFreelancers();
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
            phone: loc.phone || 'N/A',
            email: loc.email || 'N/A'
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
                Aktif
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
                <h3 className="text-gray-500 text-sm">Toplam Aktif Sürücü</h3>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <FaCheck className="text-green-600" />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm">Müsait Sürücüler</h3>
                <p className="text-2xl font-bold">{activeDrivers.filter(d => d.status !== 'busy').length}</p>
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
                <p className="text-2xl font-bold">{activeDrivers.filter(d => d.status === 'busy').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full mr-4">
                <FaUser className="text-yellow-600" />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm">Aktif Freelancer</h3>
                <p className="text-2xl font-bold">{freelancerMarkers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sürücü Haritası */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold">Sürücü ve Freelancer Konumları</h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span> Aktif Sürücü, 
              <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mx-1"></span> Taşımada, 
              <span className="inline-block w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-orange-500 mx-1"></span> Freelancer
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
                mapContainerStyle={containerStyle}
                center={center}
                zoom={6}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                  zoomControl: false,
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
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: marker.status === 'active' || marker.status === 'online' 
                        ? '#10B981' // yeşil - aktif
                        : marker.status === 'on_delivery' || marker.status === 'busy'
                          ? '#8B5CF6' // mor - taşıma sırasında
                          : '#9CA3AF', // gri - diğer durumlar
                      fillOpacity: 0.8,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2,
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
                      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      scale: 8,
                      fillColor: '#F59E0B', // turuncu - freelancer
                      fillOpacity: 0.9,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2,
                      rotation: 0
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

        {/* Sürücü Listesi */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sürücü</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Araç</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Aktivite</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                          {driver.name?.charAt(0) || "?"}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                          <div className="text-sm text-gray-500">{driver.company}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-sm text-gray-900">
                          <FaPhone className="mr-2 text-gray-500" /> {driver.phone || 'N/A'}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <FaEnvelope className="mr-2 text-gray-500" /> {driver.email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.vehicleType || driver.vehicle?.type || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{driver.licensePlate || driver.vehicle?.licensePlate || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(driver.status)}`}>
                        {formatStatus(driver.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.location || 'Bilinmiyor'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.lastActive || driver.lastSeen || 'Bilinmiyor'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button className="text-orange-600 hover:text-orange-900 transition-colors" title="Takip Et">
                          <FaMapMarkerAlt className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Toplam <span className="font-medium text-gray-900">{activeDrivers.length}</span> aktif sürücü bulundu
              </p>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-sm text-gray-700">
                  <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                </span>
                
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
} 