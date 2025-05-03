import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import PortalLayout from '../../components/portal/Layout';
import { FaTruck, FaBox, FaSearch, FaFilter, FaPlus, FaEye, FaTimes, FaChartLine, FaUsers, FaTachometerAlt, FaStar, FaIdCard, FaCar, FaRoute, FaMapMarkerAlt, FaClock, FaUser, FaBuilding, FaPhone, FaEnvelope, FaRedo, FaSortAmountDown, FaSortAmountUp, FaCalendarAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import Head from 'next/head';

// Google Maps API anahtarı
const GOOGLE_MAPS_API_KEY = "AIzaSyAKht3SqaVJpufUdq-vVQEfBEQKejT9Z8k";

export default function Tracking() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const timeoutRef = useRef(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    driver: 'all'
  });

  // Örnek sürücü verileri
  const [drivers] = useState([
    { 
      id: 'DRV001',
      name: 'Ahmet Yılmaz', 
      phone: '0532 555 1234',
      email: 'ahmet@example.com',
      vehicle: '34 ABC 123 - Mercedes-Benz Actros',
      license: 'B Sınıfı',
      status: 'active',
      totalDeliveries: 128,
      rating: 4.7,
      location: { lat: 41.0082, lng: 28.9784 },
      lastUpdate: '10:30'
    },
    { 
      id: 'DRV002',
      name: 'Mehmet Demir', 
      phone: '0533 444 5678',
      email: 'mehmet@example.com',
      vehicle: '06 XYZ 789 - Volvo FH16',
      license: 'B Sınıfı',
      status: 'active',
      totalDeliveries: 95,
      rating: 4.5,
      location: { lat: 39.9334, lng: 32.8597 },
      lastUpdate: '10:28'
    },
    { 
      id: 'DRV003',
      name: 'Ayşe Kaya', 
      phone: '0535 333 9012',
      email: 'ayse@example.com',
      vehicle: '35 DEF 456 - Scania R450',
      license: 'B Sınıfı',
      status: 'inactive',
      totalDeliveries: 67,
      rating: 4.3,
      location: { lat: 38.4237, lng: 27.1428 },
      lastUpdate: '10:25'
    }
  ]);

  // Örnek sevkiyat verileri
  const [shipments] = useState([
    {
      id: 'SHP1001',
      customerName: 'ABC Elektronik A.Ş.',
      pickupLocation: 'Kadıköy, İstanbul',
      deliveryLocation: 'Beşiktaş, İstanbul',
      distance: '12.5 km',
      status: 'in_transit',
      driverName: 'Ahmet Yılmaz',
      driverPhone: '0532 123 4567',
      vehicleInfo: 'Mercedes Sprinter - 34 ABC 123',
      estimatedDelivery: '2024-06-15T16:30:00',
      startTime: '2024-06-15T14:30:00',
      lastUpdated: '2024-06-15T15:15:00',
      currentLocation: 'Şişli, İstanbul',
      completedSteps: 2,
      totalSteps: 4,
      createdAt: '2024-06-10T09:15:00',
      trackingCode: 'TR85412'
    },
    {
      id: 'SHP1002',
      customerName: 'XYZ Mobilya Ltd.',
      pickupLocation: 'Ataşehir, İstanbul',
      deliveryLocation: 'Sarıyer, İstanbul',
      distance: '25.3 km',
      status: 'delivered',
      driverName: 'Mehmet Demir',
      driverPhone: '0533 234 5678',
      vehicleInfo: 'Iveco Daily - 34 DEF 456',
      estimatedDelivery: '2024-06-14T12:00:00',
      startTime: '2024-06-14T09:30:00',
      lastUpdated: '2024-06-14T11:45:00',
      currentLocation: 'Sarıyer, İstanbul',
      completedSteps: 4,
      totalSteps: 4,
      createdAt: '2024-06-09T14:30:00',
      trackingCode: 'TR74123'
    },
    {
      id: 'SHP1003',
      customerName: 'DEF Tekstil San.',
      pickupLocation: 'Bakırköy, İstanbul',
      deliveryLocation: 'Beylikdüzü, İstanbul',
      distance: '18.8 km',
      status: 'loading',
      driverName: 'Ayşe Kaya',
      driverPhone: '0535 345 6789',
      vehicleInfo: 'Ford Transit - 34 GHI 789',
      estimatedDelivery: '2024-06-15T18:00:00',
      startTime: '2024-06-15T15:30:00',
      lastUpdated: '2024-06-15T15:30:00',
      currentLocation: 'Bakırköy, İstanbul',
      completedSteps: 1,
      totalSteps: 4,
      createdAt: '2024-06-08T11:20:00',
      trackingCode: 'TR96325'
    },
    {
      id: 'SHP1004',
      customerName: 'GHI Market Zinciri',
      pickupLocation: 'Pendik, İstanbul',
      deliveryLocation: 'Tuzla, İstanbul',
      distance: '8.2 km',
      status: 'scheduled',
      driverName: 'Ali Tekin',
      driverPhone: '0536 456 7890',
      vehicleInfo: 'Renault Master - 34 JKL 012',
      estimatedDelivery: '2024-06-16T13:30:00',
      startTime: '2024-06-16T11:00:00',
      lastUpdated: '2024-06-15T14:15:00',
      currentLocation: '-',
      completedSteps: 0,
      totalSteps: 4,
      createdAt: '2024-06-10T16:45:00',
      trackingCode: 'TR31654'
    },
    {
      id: 'SHP1005',
      customerName: 'JKL İnşaat A.Ş.',
      pickupLocation: 'Kartal, İstanbul',
      deliveryLocation: 'Maltepe, İstanbul',
      distance: '6.5 km',
      status: 'delayed',
      driverName: 'Zeynep Arslan',
      driverPhone: '0537 567 8901',
      vehicleInfo: 'Fiat Doblo - 34 MNO 345',
      estimatedDelivery: '2024-06-15T12:30:00',
      startTime: '2024-06-15T10:15:00',
      lastUpdated: '2024-06-15T13:00:00',
      currentLocation: 'Kartal, İstanbul',
      completedSteps: 1,
      totalSteps: 4,
      createdAt: '2024-06-07T10:10:00',
      trackingCode: 'TR45987'
    }
  ]);

  const mapContainerStyle = {
    width: '100%',
    height: '600px'
  };

  const center = {
    lat: 39.9334,
    lng: 32.8597
  };

  // Harita options'ları memo ile optimize ediliyor
  const mapOptions = useMemo(() => ({
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    gestureHandling: 'greedy',
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  }), []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    // Filtreleme işlemleri burada yapılacak
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      dateRange: 'all',
      driver: 'all'
    });
  };

  const handleMapLoad = () => {
    setMapLoaded(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleMapError = () => {
    setMapError(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const reloadMap = () => {
    // Sayfa yeniden yüklenmeden basit bir yeniden deneme mekanizması
    setMapError(false);
    setLoadingTimeout(false);
    setMapLoaded(false);
    
    // Yeniden yükleme öncesinde kısa bir gecikme ekleyin
    setTimeout(() => {
      const mapContainer = document.getElementById('map-container');
      if (mapContainer) {
        // İçeriği temizle ve yeniden oluştur
        mapContainer.innerHTML = '';
        renderMap();
      } else {
        // Element bulunamazsa sayfayı yenile
        window.location.reload();
      }
    }, 500);
  };

  // Kullanıcı verilerini ve taşımaları getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Sadece session kontrolü yap
        if (status === 'loading') return;
        
        if (!session) {
          router.push('/portal/login');
          return;
        }

        // Kullanıcı bilgilerini session'dan al
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          type: session.user.type,
          role: session.user.role,
          status: session.user.status
        });

        // Gerçek bir API entegrasyonu için buraya fetch eklenebilir
        // const response = await fetch('/api/portal/tracking', {
        //   headers: {
        //     'Authorization': `Bearer ${session.accessToken}`
        //   }
        // });
        
        // if (response.ok) {
        //   const data = await response.json();
        //   setShipments(data.shipments);
        // }

      } catch (error) {
        console.error('Takip verileri yükleme hatası:', error);
        setError('Takip verileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, status]);

  // Taşımaları filtreleme ve sıralama
  const getFilteredShipments = () => {
    return shipments
      .filter(shipment => {
        // Durum filtresi
        if (filters.status !== 'all' && shipment.status !== filters.status) {
          return false;
        }
        
        // Arama filtresi
        if (searchTerm && searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          return (
            shipment.id.toLowerCase().includes(term) ||
            shipment.customerName.toLowerCase().includes(term) ||
            shipment.pickupLocation.toLowerCase().includes(term) ||
            shipment.deliveryLocation.toLowerCase().includes(term) ||
            shipment.driverName.toLowerCase().includes(term) ||
            shipment.trackingCode.toLowerCase().includes(term)
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sıralama
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        
        if (filters.dateRange === 'asc' ? dateA < dateB : dateA > dateB) {
          return -1;
        } else if (dateA > dateB) {
          return 1;
        } else {
          return 0;
        }
      });
  };

  // Taşıma durumuna göre renk ve ikon belirle
  const getStatusInfo = (status) => {
    switch (status) {
      case 'scheduled':
        return {
          label: 'Planlandı',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          icon: <FaCalendarAlt className="mr-1 h-3 w-3" />
        };
      case 'loading':
        return {
          label: 'Yükleniyor',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          icon: <FaTruck className="mr-1 h-3 w-3" />
        };
      case 'in_transit':
        return {
          label: 'Taşınıyor',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          icon: <FaRoute className="mr-1 h-3 w-3" />
        };
      case 'delivered':
        return {
          label: 'Teslim Edildi',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          icon: <FaCheckCircle className="mr-1 h-3 w-3" />
        };
      case 'delayed':
        return {
          label: 'Gecikti',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          icon: <FaClock className="mr-1 h-3 w-3" />
        };
      case 'cancelled':
        return {
          label: 'İptal Edildi',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          icon: <FaExclamationTriangle className="mr-1 h-3 w-3" />
        };
      default:
        return {
          label: 'Bilinmiyor',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: <FaTruck className="mr-1 h-3 w-3" />
        };
    }
  };

  // Tarih formatını düzenle
  const formatDate = (dateString) => {
    if (!dateString || dateString === '-') return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Aktif taşıma detaylarını göster/gizle
  const toggleShipmentDetails = (shipment) => {
    if (selectedShipment && selectedShipment.id === shipment.id) {
      setSelectedShipment(null);
    } else {
      setSelectedShipment(shipment);
    }
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <>
        <Head>
          <title>Takip - TaşıApp</title>
          <meta name="description" content="TaşıApp Taşıyıcı Portalı Takip" />
        </Head>
        <PortalLayout title="Takip">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        </PortalLayout>
      </>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <>
        <Head>
          <title>Takip - TaşıApp</title>
          <meta name="description" content="TaşıApp Taşıyıcı Portalı Takip" />
        </Head>
        <PortalLayout title="Takip">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        </PortalLayout>
      </>
    );
  }

  // Filtrelenmiş taşımalar
  const filteredShipments = getFilteredShipments();

  const renderMap = () => {
    // Hata veya zaman aşımı durumlarında alternatif içerik göster
    if (mapError || loadingTimeout) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-gray-100">
          <div className="text-center p-6">
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
              <p>Haritada bir sorun oluştu.</p>
              <p className="text-sm mt-2">
                {mapError 
                  ? "Google Maps API yüklenirken hata oluştu." 
                  : "Harita uzun süre yüklenemedi. Bağlantınızı kontrol edin."}
              </p>
            </div>
            <button 
              onClick={reloadMap}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center justify-center mx-auto"
            >
              <FaRedo className="mr-2" /> Tekrar Dene
            </button>
          </div>
        </div>
      );
    }

    return (
      <div id="map-container" className="h-full w-full">
        <LoadScript 
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          onLoad={handleMapLoad}
          onError={handleMapError}
          loadingElement={
            <div className="h-full w-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-orange-500 mx-auto mb-6"></div>
                <p className="text-gray-600">Harita yükleniyor...</p>
                <p className="text-gray-500 text-sm mt-2">Bu işlem biraz zaman alabilir</p>
                {!mapLoaded && !mapError && loadingTimeout && (
                  <button 
                    onClick={reloadMap}
                    className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center justify-center mx-auto"
                  >
                    <FaRedo className="mr-2" /> Tekrar Dene
                  </button>
                )}
              </div>
            </div>
          }
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={6}
            options={mapOptions}
          >
            {drivers.map(driver => (
              <Marker
                key={driver.id}
                position={driver.location}
                onClick={() => setSelectedDriver(driver)}
                icon={{
                  url: driver.status === 'active' 
                    ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                }}
              />
            ))}

            {selectedDriver && (
              <InfoWindow
                position={selectedDriver.location}
                onCloseClick={() => setSelectedDriver(null)}
              >
                <div className="p-2">
                  <h3 className="font-medium text-gray-900">{selectedDriver.name}</h3>
                  <p className="text-sm text-gray-500">{selectedDriver.vehicle}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Son güncelleme: {selectedDriver.lastUpdate}
                  </p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Takip - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı Takip" />
      </Head>
      <PortalLayout title="Takip">
        <div className="space-y-6 p-4">
          {/* Üst Bilgi Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaTruck className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  Toplam
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Toplam Taşıma</h3>
              <p className="text-2xl font-bold text-gray-800">{shipments.length}</p>
              <p className="mt-2 text-xs text-blue-600">
                <FaCheckCircle className="inline mr-1" />
                <span>Tüm taşımalar</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-green-100 rounded-full">
                  <FaRoute className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                  Aktif
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Aktif Taşımalar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {shipments.filter(s => s.status === 'in_transit' || s.status === 'loading').length}
              </p>
              <p className="mt-2 text-xs text-green-600">
                <FaCheckCircle className="inline mr-1" />
                <span>Devam ediyor</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaCalendarAlt className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  Planlandı
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Planlanan Taşımalar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {shipments.filter(s => s.status === 'scheduled').length}
              </p>
              <p className="mt-2 text-xs text-blue-600">
                <FaClock className="inline mr-1" />
                <span>Bekleyen taşımalar</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-green-100 rounded-full">
                  <FaCheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                  Tamamlanan
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Tamamlanan Taşımalar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {shipments.filter(s => s.status === 'delivered').length}
              </p>
              <p className="mt-2 text-xs text-green-600">
                <FaCheckCircle className="inline mr-1" />
                <span>Başarıyla teslim edildi</span>
              </p>
            </div>
          </div>

          {/* Arama ve Filtre */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Taşıma ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                  >
                    <option value="all">Tüm Taşımalar</option>
                    <option value="scheduled">Planlandı</option>
                    <option value="loading">Yükleniyor</option>
                    <option value="in_transit">Taşınıyor</option>
                    <option value="delivered">Teslim Edildi</option>
                    <option value="delayed">Gecikti</option>
                    <option value="cancelled">İptal Edildi</option>
                  </select>
                  <FaFilter className="absolute left-3 top-3 text-gray-400" />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, dateRange: prev.dateRange === 'asc' ? 'desc' : 'asc' }))}
                  className="w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center justify-center"
                >
                  {filters.dateRange === 'asc' ? (
                    <>
                      <FaSortAmountDown className="mr-2" />
                      Yeniden Eskiye
                    </>
                  ) : (
                    <>
                      <FaSortAmountUp className="mr-2" />
                      Eskiden Yeniye
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Taşımalar Listesi */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Taşıma Takibi</h3>
            
            {filteredShipments.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Filtrelere uygun taşıma bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredShipments.map((shipment) => {
                  const statusInfo = getStatusInfo(shipment.status);
                  const isActive = selectedShipment && selectedShipment.id === shipment.id;
                  return (
                    <div 
                      key={shipment.id} 
                      className={`border ${isActive ? 'border-orange-300' : 'border-gray-200'} rounded-lg p-4 hover:shadow-md transition-shadow ${isActive ? 'bg-orange-50' : ''}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium text-gray-900">{shipment.id}</h4>
                            <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full flex items-center ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{shipment.customerName}</p>
                        </div>
                        <div className="mt-2 md:mt-0 flex">
                          <span className="text-sm font-medium text-gray-700">Takip Kodu: <span className="font-bold">{shipment.trackingCode}</span></span>
                          <button 
                            onClick={() => toggleShipmentDetails(shipment)}
                            className="ml-4 text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <FaEye className="mr-1" />
                            {isActive ? 'Gizle' : 'Detaylar'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-start my-2 text-sm">
                        <div className="flex items-start mb-2 md:mb-0">
                          <FaMapMarkerAlt className="text-gray-400 mt-1 mr-1" />
                          <div>
                            <p className="text-gray-700">{shipment.pickupLocation}</p>
                            <div className="flex items-center my-1">
                              <div className="h-5 border-l border-dashed border-gray-400 mx-2"></div>
                            </div>
                            <p className="text-gray-700">{shipment.deliveryLocation}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="mr-6">
                            <p className="text-xs text-gray-500 mb-1">Sürücü</p>
                            <p className="text-gray-700">{shipment.driverName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Güncel Konum</p>
                            <p className="text-gray-700">{shipment.currentLocation}</p>
                          </div>
                        </div>
                      </div>

                      {/* Takip ilerleme durumu */}
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full" 
                            style={{ width: `${(shipment.completedSteps / shipment.totalSteps) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-right">
                          {shipment.completedSteps} / {shipment.totalSteps} adım tamamlandı
                        </div>
                      </div>

                      {isActive && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Taşıma Bilgileri</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Tahmini Teslim</p>
                                    <p className="text-sm">{formatDate(shipment.estimatedDelivery)}</p>
                                  </div>
                                </div>
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Başlangıç Zamanı</p>
                                    <p className="text-sm">{formatDate(shipment.startTime)}</p>
                                  </div>
                                </div>
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Son Güncelleme</p>
                                    <p className="text-sm">{formatDate(shipment.lastUpdated)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Sürücü ve Araç Bilgileri</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start mb-2">
                                  <FaTruck className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Araç Bilgisi</p>
                                    <p className="text-sm">{shipment.vehicleInfo}</p>
                                  </div>
                                </div>
                                <div className="flex items-start mb-2">
                                  <FaMapMarkerAlt className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Güncel Konum</p>
                                    <p className="text-sm">{shipment.currentLocation}</p>
                                  </div>
                                </div>
                                <div className="flex items-start mb-2">
                                  <FaRoute className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Toplam Mesafe</p>
                                    <p className="text-sm">{shipment.distance}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={() => window.open(`/portal/tracking/${shipment.id}`, '_blank')}
                              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                            >
                              Detaylı Takip
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PortalLayout>
    </>
  );
} 