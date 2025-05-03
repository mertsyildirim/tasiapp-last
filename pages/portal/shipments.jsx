import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import PortalLayout from '../../components/portal/Layout';
import { FaTruck, FaBox, FaSearch, FaFilter, FaPlus, FaEye, FaTimes, FaChartLine, FaUsers, FaTachometerAlt, FaStar, FaIdCard, FaCar, FaRoute, FaMapMarkerAlt, FaClock, FaUser, FaBuilding, FaMoneyBill, FaFileAlt, FaRegCalendarAlt, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaArrowRight, FaSortAmountDown, FaSortAmountUp, FaMapMarkedAlt } from 'react-icons/fa';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Head from 'next/head';
import Script from 'next/script';

export default function Shipments() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    pending: 0
  });
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Harita görüntüleme için gerekli state'ler
  const [showMap, setShowMap] = useState(false);
  const [mapData, setMapData] = useState(null);
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef(null);

  // Şoför ve araç bilgileri için yeni state'ler ekleyelim:
  const [isEditingDriverVehicle, setIsEditingDriverVehicle] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [companyVehicles, setCompanyVehicles] = useState([
    { id: 1, name: 'Ford Transit - 34ABC123' },
    { id: 2, name: 'Mercedes Sprinter - 34DEF456' },
    { id: 3, name: 'Fiat Ducato - 34GHI789' },
    { id: 4, name: 'Volkswagen Crafter - 34JKL012' },
    { id: 5, name: 'Renault Master - 34MNO345' }
  ]);

  // Gerçek araç ve sürücü bilgilerini getirmek için state ve fonksiyonları ekliyorum:
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingDriversVehicles, setLoadingDriversVehicles] = useState(false);

  // Hook'ları en üste taşıyorum ve koşullu kullanımdan kaçınıyorum
  // Veri yükleme hook'u
  useEffect(() => {
    const fetchShipmentsData = async () => {
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

        // API'den taşıma verilerini al
        try {
          console.log("Taşıma verileri alınıyor...");
          
          // Filtreleme parametreleri
          const params = new URLSearchParams();
          if (statusFilter) {
            params.append('status', statusFilter);
          }
          
          const response = await fetch(`/api/portal/shipments?${params}`);
          
          if (!response.ok) {
            throw new Error(`API yanıt hatası: ${response.status}`);
          }
          
          const data = await response.json();
          console.log("API'den gelen taşımalar:", data);
          
          if (data.success) {
            setShipments(data.shipments);
            
            // İstatistikleri hesapla
            const totalShipments = data.shipments.length;
            const activeShipments = data.shipments.filter(s => s.status === 'waiting-pickup' || s.status === 'in-transit').length;
            const completedShipments = data.shipments.filter(s => s.status === 'delivered').length;
            const pendingShipments = data.shipments.filter(s => s.status === 'pending').length;
            
            setStats({
              total: totalShipments,
              active: activeShipments,
              completed: completedShipments,
              pending: pendingShipments
            });
          } else {
            console.error("API başarısız cevap döndü:", data.message);
            setError(data.message || 'Taşımalar yüklenirken bir hata oluştu');
          }
        } catch (apiError) {
          console.error("API hatası:", apiError);
          setError('Taşıma verileri yüklenirken bir hata oluştu');
        }

      } catch (error) {
        console.error('Taşımalar veri yükleme hatası:', error);
        
        if (error.response?.status === 401) {
          router.push('/portal/login');
          return;
        }
        
        setError('Taşımalar verileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchShipmentsData();
  }, [router, session, status, statusFilter]);

  // ESC tuşuna basıldığında harita modalını kapat - her zaman çalışan hook
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && showMap) {
        closeMap();
      }
    };

    // Event listener ekle
    document.addEventListener('keydown', handleEscapeKey);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showMap]); // closeMap burada kullanılıyor ama tanımı fonksiyondan sonra - dependency olarak eklemiyoruz
  
  // Harita görünür olduğunda ve script yüklendiyse haritayı başlat - her zaman çalışan hook
  useEffect(() => {
    if (showMap && mapData && mapScriptLoaded) {
      // API tamamen yüklenene kadar bekle
      const timer = setTimeout(() => {
        console.log('Harita gösterilmeye çalışılıyor');
        initMap();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [showMap, mapData, mapScriptLoaded]); // initMap burada kullanılıyor ama tanımı fonksiyondan sonra

  // Seçilen taşıma değiştiğinde şoför ve araç bilgilerini güncelle
  useEffect(() => {
    if (selectedShipment) {
      setDriverName(selectedShipment.driverName || '');
      setVehicleInfo(selectedShipment.vehicleInfo || '');
      setIsEditingDriverVehicle(false);
    }
  }, [selectedShipment]);

  // Seçilen taşıma değiştiğinde şoför ve araç bilgilerini güncelle
  useEffect(() => {
    if (selectedShipment) {
      setSelectedDriverId(selectedShipment.driverId || '');
      setSelectedVehicleId(selectedShipment.vehicleId || '');
      setIsEditingDriverVehicle(false);
      
      // Sürücü ve araç verilerini getir
      fetchDriversAndVehicles();
    }
  }, [selectedShipment]);
  
  // Sürücü ve araç verilerini API'den getiren fonksiyon
  const fetchDriversAndVehicles = async () => {
    try {
      setLoadingDriversVehicles(true);
      
      let driversData = [];
      let vehiclesData = [];
      
      try {
        // Sürücüleri getirmeyi dene
        const driversResponse = await axios.get('/api/portal/drivers');
        if (driversResponse.data.success) {
          driversData = driversResponse.data.drivers;
        }
      } catch (driverError) {
        console.warn('Sürücü verileri getirilirken API hatası:', driverError);
        // API hatası durumunda örnek sürücü verileri
        driversData = [
          { _id: "driver1", name: "Ahmet Yılmaz", phone: "0532 123 4567" },
          { _id: "driver2", name: "Mehmet Demir", phone: "0533 456 7890" },
          { _id: "driver3", name: "Ayşe Kaya", phone: "0535 789 0123" },
          { _id: "driver4", name: "Mustafa Şahin", phone: "0536 234 5678" },
          { _id: "driver5", name: "Zeynep Yıldız", phone: "0538 567 8901" }
        ];
      }
      
      try {
        // Araçları getirmeyi dene
        const vehiclesResponse = await axios.get('/api/portal/vehicles');
        if (vehiclesResponse.data.success) {
          vehiclesData = vehiclesResponse.data.vehicles;
        }
      } catch (vehicleError) {
        console.warn('Araç verileri getirilirken API hatası:', vehicleError);
        // API hatası durumunda örnek araç verileri
        vehiclesData = [
          { _id: "vehicle1", brand: "Ford", model: "Transit", licensePlate: "34ABC123" },
          { _id: "vehicle2", brand: "Mercedes", model: "Sprinter", licensePlate: "34DEF456" },
          { _id: "vehicle3", brand: "Fiat", model: "Ducato", licensePlate: "34GHI789" },
          { _id: "vehicle4", brand: "Volkswagen", model: "Crafter", licensePlate: "34JKL012" },
          { _id: "vehicle5", brand: "Renault", model: "Master", licensePlate: "34MNO345" }
        ];
      }
      
      // Elde edilen verileri state'e kaydet
      setDrivers(driversData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Sürücü ve araç verileri getirilirken hata:', error);
      
      // Genel hata durumunda örnek veriler
      setDrivers([
        { _id: "driver1", name: "Ahmet Yılmaz", phone: "0532 123 4567" },
        { _id: "driver2", name: "Mehmet Demir", phone: "0533 456 7890" },
        { _id: "driver3", name: "Ayşe Kaya", phone: "0535 789 0123" }
      ]);
      
      setVehicles([
        { _id: "vehicle1", brand: "Ford", model: "Transit", licensePlate: "34ABC123" },
        { _id: "vehicle2", brand: "Mercedes", model: "Sprinter", licensePlate: "34DEF456" },
        { _id: "vehicle3", brand: "Fiat", model: "Ducato", licensePlate: "34GHI789" }
      ]);
    } finally {
      setLoadingDriversVehicles(false);
    }
  };

  // Filtrelenmiş shipments için işlev
  const getFilteredShipments = () => {
    return shipments
      .filter(shipment => {
        // Arama filtrelemesi
        if (searchTerm && searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          return (
            String(shipment.id || '').toLowerCase().includes(term) ||
            String(shipment.customer || shipment.customerName || '').toLowerCase().includes(term) ||
            String(shipment.pickupLocation || shipment.from || '').toLowerCase().includes(term) ||
            String(shipment.deliveryLocation || shipment.to || '').toLowerCase().includes(term)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Sıralama
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        
        if (sortOrder === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
  };

  // Durum bilgisine göre stil ve ikon belirle
  const getStatusInfo = (status) => {
    switch (status) {
      case 'waiting-pickup':
        return {
          label: 'Alım Bekliyor',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          icon: <FaClock className="mr-1 h-3 w-3" />
        };
      case 'in-transit':
        return {
          label: 'Taşıma Halinde',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          icon: <FaTruck className="mr-1 h-3 w-3" />
        };
      case 'delivered':
        return {
          label: 'Teslim Edildi',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          icon: <FaCheckCircle className="mr-1 h-3 w-3" />
        };
      case 'pending':
        return {
          label: 'Beklemede',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          icon: <FaExclamationTriangle className="mr-1 h-3 w-3" />
        };
      case 'cancelled':
        return {
          label: 'İptal Edildi',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          icon: <FaTimesCircle className="mr-1 h-3 w-3" />
        };
      default:
        return {
          label: status || 'Bilinmiyor',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          icon: <FaTruck className="mr-1 h-3 w-3" />
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Filtrelenmiş taşımalar
  const filteredShipments = getFilteredShipments();

  // Tarih formatı
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  // Harita görüntüleme fonksiyonu
  const handleViewMap = (shipment) => {
    // Yükleme durumunu aktifleştir
    setMapLoading(true);
    
    // Harita için gerekli verileri hazırla
    setMapData({
      pickupLocation: shipment.pickupLocation || shipment.from || '',
      deliveryLocation: shipment.deliveryLocation || shipment.to || '',
      distance: shipment.distance,
      pickupCoords: shipment.pickupCoords || null, // Alış koordinatları
      deliveryCoords: shipment.deliveryCoords || null // Teslimat koordinatları
    });
    
    // Harita modalını aç
    setShowMap(true);
  };

  // Harita modalını kapat
  const closeMap = () => {
    setShowMap(false);
    setMapLoading(true); // Bir sonraki açılış için yükleme durumunu sıfırla
  };
  
  // Şoför ve araç bilgilerini kaydetme fonksiyonu
  const handleSaveDriverVehicle = async () => {
    try {
      // Eğer sürücü veya araç seçilmediyse uyarı göster
      if (!selectedDriverId) {
        alert("Lütfen bir sürücü seçin");
        return;
      }

      if (!selectedVehicleId) {
        alert("Lütfen bir araç seçin");
        return;
      }

      // Taşıma ID'si kontrolü
      if (!selectedShipment || !selectedShipment._id) {
        alert("Taşıma ID bulunamadı");
        return;
      }

      // Seçilen sürücü ve araç bilgilerini al
      const selectedDriver = drivers.find(driver => driver._id === selectedDriverId);
      const selectedVehicle = vehicles.find(vehicle => vehicle._id === selectedVehicleId);

      if (!selectedDriver || !selectedVehicle) {
        alert("Seçilen sürücü veya araç bulunamadı");
        return;
      }

      const driverName = selectedDriver.name;
      const vehicleInfo = `${selectedVehicle.brand} ${selectedVehicle.model} - ${selectedVehicle.licensePlate}`;
      
      // Güncelleme için yükleniyor durumunu gösterebiliriz
      setIsEditingDriverVehicle(false);
      // API'ye güncelleme isteği
      try {
        console.log(`Taşıma güncelleniyor ID: ${selectedShipment._id}`);
        const response = await axios.put(`/api/portal/shipments?id=${selectedShipment._id}`, {
          driverId: selectedDriverId,
          vehicleId: selectedVehicleId,
          driverName,
          vehicleInfo
        });
        
        if (response.data.success) {
          console.log("Veritabanı güncelleme başarılı:", response.data);
          
          // API yanıtı başarılı ise, güncellenmiş taşımayı kullan
          const updatedShipment = response.data.shipment;
          
          // Başarılı olursa, seçili taşımayı güncelle
          setSelectedShipment(updatedShipment || {
            ...selectedShipment,
            driverId: selectedDriverId,
            vehicleId: selectedVehicleId,
            driverName,
            vehicleInfo,
            updatedAt: new Date().toISOString()
          });
          
          // Taşımalar listesini güncelle
          setShipments(prev => prev.map(shipment => 
            shipment._id === selectedShipment._id 
              ? updatedShipment || { 
                  ...shipment, 
                  driverId: selectedDriverId,
                  vehicleId: selectedVehicleId,
                  driverName, 
                  vehicleInfo,
                  updatedAt: new Date().toISOString()
                }
              : shipment
          ));
          
          // Başarı mesajı gösterelim
          alert("Sürücü ve araç bilgileri veritabanına kaydedildi");
        } else {
          console.warn("API başarısız yanıt döndü:", response.data.message);
          alert(`Veritabanı güncellemesi başarısız: ${response.data.message}`);
          
          // Düzenleme modunu tekrar açalım
          setIsEditingDriverVehicle(true);
        }
      } catch (apiError) {
        console.error("API hatası:", apiError);
        alert(`Veritabanı güncellemesi başarısız: ${apiError.message}`);
        
        // Düzenleme modunu tekrar açalım
        setIsEditingDriverVehicle(true);
      }
    } catch (error) {
      console.error("Sürücü ve araç bilgileri güncellenirken hata:", error);
      alert("Güncelleme sırasında bir hata oluştu: " + error.message);
      
      // Düzenleme modunu tekrar açalım
      setIsEditingDriverVehicle(true);
    }
  };
  
  // Google Maps API yüklendikten sonra haritayı başlat
  const handleMapScriptLoad = () => {
    console.log('Google Maps API script yüklendi');
    setMapScriptLoaded(true);
    // Eğer harita zaten gösteriliyorsa ve veriler hazırsa haritayı başlat
    if (showMap && mapData) {
      // API tamamen yüklenene kadar bekle
      setTimeout(() => {
        if (window.google && window.google.maps) {
          console.log('Google Maps API hazır, harita başlatılıyor');
          initMap();
        } else {
          console.error('Google Maps API tam olarak yüklenemedi');
        }
      }, 1000); // API'nin tamamen yüklenmesi için 1 saniye bekle
    }
  };

  // Haritayı başlat
  const initMap = () => {
    try {
      // Maps API yüklenmemişse dön
      if (!window.google || !window.google.maps) {
        console.error('Google Maps API bulunamadı');
        return;
      }
      
      console.log('initMap çalıştı, Google Maps API:', window.google.maps);
      console.log('Harita veri:', mapData);
      
      // Map container'ı kontrol et
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        console.error('Harita container elementi bulunamadı');
        return;
      }
      
      // Geocoder ve DirectionsService 
      try {
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#FF6B00",
            strokeWeight: 5,
            strokeOpacity: 0.7
          }
        });
        
        // Map oluştur (İstanbul merkez)
        const map = new window.google.maps.Map(mapElement, {
          center: { lat: 41.0082, lng: 28.9784 },
          zoom: 10,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true
        });
        
        directionsRenderer.setMap(map);
        
        // Marker ikonları
        const pickupIcon = {
          url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
          scaledSize: new window.google.maps.Size(40, 40)
        };
        
        const deliveryIcon = {
          url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
          scaledSize: new window.google.maps.Size(40, 40)
        };
        
        // Koordinatları kontrol et ve kullan
        if (mapData && mapData.pickupCoords && mapData.deliveryCoords) {
          console.log('Koordinat verisi bulundu:', mapData.pickupCoords, mapData.deliveryCoords);
          
          // Koordinat formatlarını kontrol et ve düzelt
          let pickupLat, pickupLng, deliveryLat, deliveryLng;
          
          // Pickup koordinatları
          if (typeof mapData.pickupCoords === 'string') {
            try {
              // "lat,lng" formatını ayır
              const [lat, lng] = mapData.pickupCoords.split(',').map(coord => parseFloat(coord.trim()));
              pickupLat = lat;
              pickupLng = lng;
            } catch (e) {
              console.error('Alış koordinatları ayrıştırılamadı:', e);
            }
          } else if (typeof mapData.pickupCoords === 'object' && mapData.pickupCoords !== null) {
            // {lat: number, lng: number} veya {latitude: number, longitude: number} formatı
            pickupLat = mapData.pickupCoords.lat || mapData.pickupCoords.latitude;
            pickupLng = mapData.pickupCoords.lng || mapData.pickupCoords.longitude;
          }
          
          // Delivery koordinatları
          if (typeof mapData.deliveryCoords === 'string') {
            try {
              // "lat,lng" formatını ayır
              const [lat, lng] = mapData.deliveryCoords.split(',').map(coord => parseFloat(coord.trim()));
              deliveryLat = lat;
              deliveryLng = lng;
            } catch (e) {
              console.error('Teslimat koordinatları ayrıştırılamadı:', e);
            }
          } else if (typeof mapData.deliveryCoords === 'object' && mapData.deliveryCoords !== null) {
            // {lat: number, lng: number} veya {latitude: number, longitude: number} formatı
            deliveryLat = mapData.deliveryCoords.lat || mapData.deliveryCoords.latitude;
            deliveryLng = mapData.deliveryCoords.lng || mapData.deliveryCoords.longitude;
          }
          
          if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
            // Koordinatlardan LatLng objeleri oluştur
            const pickupLatLng = new window.google.maps.LatLng(pickupLat, pickupLng);
            const deliveryLatLng = new window.google.maps.LatLng(deliveryLat, deliveryLng);
            
            // Rota oluştur
            directionsService.route({
              origin: pickupLatLng,
              destination: deliveryLatLng,
              travelMode: window.google.maps.TravelMode.DRIVING
            }, (response, status) => {
              if (status === 'OK') {
                directionsRenderer.setDirections(response);
                
                // Marker'ları ekle - doğru rota üzerindeki konumları kullanalım
                const route = response.routes[0];
                const legStart = route.legs[0].start_location;
                const legEnd = route.legs[0].end_location;
                
                // Başlangıç işaretçisi
                new window.google.maps.Marker({
                  position: legStart,
                  map: map,
                  icon: pickupIcon,
                  title: "Alınacak Adres"
                });
                
                // Bitiş işaretçisi
                new window.google.maps.Marker({
                  position: legEnd,
                  map: map,
                  icon: deliveryIcon,
                  title: "Teslim Adresi"
                });
                
                // Haritayı sınırla
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(legStart);
                bounds.extend(legEnd);
                map.fitBounds(bounds);
                
                // Harita yükleme tamamlandı
                setMapLoading(false);
              } else {
                console.error('Rota oluşturma hatası:', status);
                // Rota oluşturulamadıysa direkt koordinatları kullanarak markerları göster
                const pickupMarker = new window.google.maps.Marker({
                  position: pickupLatLng,
                  map: map,
                  icon: pickupIcon,
                  title: "Alınacak Adres"
                });
                
                const deliveryMarker = new window.google.maps.Marker({
                  position: deliveryLatLng,
                  map: map,
                  icon: deliveryIcon,
                  title: "Teslim Adresi"
                });
                
                // Haritayı iki noktayı gösterecek şekilde yakınlaştır
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(pickupLatLng);
                bounds.extend(deliveryLatLng);
                map.fitBounds(bounds);
                
                // Harita yükleme tamamlandı
                setMapLoading(false);
              }
            });
          } else {
            console.error('Geçerli koordinat verisi bulunamadı, adres bazlı geocoding yapılacak');
            performGeocodingForMap(map, directionsService, directionsRenderer, pickupIcon, deliveryIcon);
          }
        } else {
          console.log('Koordinat verisi bulunamadı, adres bazlı geocoding yapılacak');
          performGeocodingForMap(map, directionsService, directionsRenderer, pickupIcon, deliveryIcon);
        }
      } catch (error) {
        console.error('Google Maps API objeleri oluşturulurken hata:', error);
        setMapLoading(false); // Hata durumunda yükleme durumunu kapat
      }
    } catch (error) {
      console.error('Harita başlatılırken hata:', error);
      setMapLoading(false); // Hata durumunda yükleme durumunu kapat
    }
  };

  // Adres ile harita oluşturma (geocoding)
  const performGeocodingForMap = (map, directionsService, directionsRenderer, pickupIcon, deliveryIcon) => {
    if (!mapData) {
      setMapLoading(false);
      return;
    }
    
    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode({ address: mapData.pickupLocation }, (pickupResults, pickupStatus) => {
      if (pickupStatus !== 'OK') {
        console.error('Harita hata: Alınacak konum bulunamadı');
        setMapLoading(false);
        return;
      }
      
      geocoder.geocode({ address: mapData.deliveryLocation }, (deliveryResults, deliveryStatus) => {
        if (deliveryStatus !== 'OK') {
          console.error('Harita hata: Teslim konumu bulunamadı');
          setMapLoading(false);
          return;
        }
        
        const pickupLocation = pickupResults[0].geometry.location;
        const deliveryLocation = deliveryResults[0].geometry.location;
        
        // Rota isteği
        directionsService.route({
          origin: pickupLocation,
          destination: deliveryLocation,
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (response, status) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(response);
            
            // Marker'ları ekle - doğru rota üzerindeki konumları kullanalım
            const route = response.routes[0];
            const legStart = route.legs[0].start_location;
            const legEnd = route.legs[0].end_location;
            
            // Başlangıç işaretçisi
            new window.google.maps.Marker({
              position: legStart,
              map: map,
              icon: pickupIcon,
              title: "Alınacak Adres"
            });
            
            // Bitiş işaretçisi
            new window.google.maps.Marker({
              position: legEnd,
              map: map,
              icon: deliveryIcon,
              title: "Teslim Adresi"
            });
            
            // Haritayı sınırla
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(legStart);
            bounds.extend(legEnd);
            map.fitBounds(bounds);
            
            // Harita yükleme tamamlandı
            setMapLoading(false);
          } else {
            console.error('Rota çizim hatası:', status);
            setMapLoading(false);
          }
        });
      });
    });
  };

  return (
    <>
      <Head>
        <title>Taşımalar - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı Taşımalar" />
      </Head>
      
      {/* Google Maps API Script - Sadece bir kez yüklenir */}
      {showMap && !mapScriptLoaded && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAKht3SqaVJpufUdq-vVQEfBEQKejT9Z8k'}&libraries=places`}
          onLoad={handleMapScriptLoad}
          onError={(e) => console.error('Google Maps API yükleme hatası:', e)}
          strategy="afterInteractive"
        />
      )}
      
      <PortalLayout title="Taşımalar">
        <div className="space-y-6 p-4">
          {/* Üst Bilgi Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-orange-100 rounded-full">
                  <FaBox className="h-5 w-5 text-orange-500" />
                </div>
                <span className="text-xs text-orange-700 font-semibold bg-orange-50 px-2 py-1 rounded-full">
                  Toplam
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Taşıma Sayısı</h3>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-green-100 rounded-full">
                  <FaTruck className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                  Aktif
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Aktif Taşımalar</h3>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <FaClock className="h-5 w-5 text-yellow-500" />
                </div>
                <span className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2 py-1 rounded-full">
                  Bekleyen
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Bekleyen Taşımalar</h3>
              <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaCheckCircle className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  Tamamlanan
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Tamamlanan Taşımalar</h3>
              <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* Arama ve Filtreler */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Taşımalarda ara..."
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Tüm Taşımalar</option>
                    <option value="waiting-pickup">Alım Bekliyor</option>
                    <option value="in-transit">Taşıma Halinde</option>
                    <option value="delivered">Teslim Edildi</option>
                    <option value="pending">Beklemede</option>
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
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center justify-center"
                >
                  {sortOrder === 'desc' ? (
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Taşımalar</h3>

            {filteredShipments.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Görüntülenecek taşıma bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredShipments.map((shipment) => {
                  const statusInfo = getStatusInfo(shipment.status);
                  const isActive = selectedShipment && selectedShipment._id === shipment._id;
                  
                  return (
                    <div 
                      key={shipment._id || shipment.id} 
                      className={`border ${isActive ? 'border-orange-300' : 'border-gray-200'} rounded-lg p-4 hover:shadow-md transition-shadow ${isActive ? 'bg-orange-50' : ''}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium text-gray-900">{shipment._id?.substring(0, 8) || shipment.id || 'ID Belirtilmemiş'}</h4>
                            <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full flex items-center ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 md:mt-0 flex">
                          <span className="text-lg font-bold text-orange-500">{shipment.price ? `${shipment.price} ₺` : '-'}</span>
                          <button 
                            onClick={() => setSelectedShipment(shipment)}
                            className="ml-4 text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <FaEye className="mr-1" />
                            Detaylar
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-start my-2 text-sm">
                        <div className="flex items-start mb-2 md:mb-0">
                          <FaMapMarkerAlt className="text-red-500 mt-1 mr-1" />
                          <div>
                            <p className="text-gray-700">{shipment.pickupLocation || shipment.from || '-'}</p>
                            <div className="flex items-center my-1">
                              <FaArrowRight className="text-gray-400 mx-2" />
                              <p className="text-gray-500 text-xs">{formatDistance(shipment.distance)}</p>
                            </div>
                            <p className="text-gray-700">{shipment.deliveryLocation || shipment.to || '-'}</p>
                            <button 
                              onClick={() => handleViewMap(shipment)}
                              className="mt-2 text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                            >
                              <FaMapMarkedAlt className="mr-2" />
                              Haritada Görüntüle
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="mr-6">
                            <p className="text-xs text-gray-500 mb-1">Taşıma Tipi</p>
                            <p className="text-gray-700">{shipment.transportType || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Oluşturulma</p>
                            <p className="text-gray-700">{formatDate(shipment.createdAt).split(' ')[0]}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Taşıma Detayları Modal */}
        {selectedShipment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold">Taşıma Detayları</h2>
                <button 
                  onClick={() => setSelectedShipment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Taşıma Bilgileri</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taşıma ID:</span>
                        <span className="font-medium">{selectedShipment._id?.substring(0, 8) || selectedShipment.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Durum:</span>
                        <span className={`px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getStatusInfo(selectedShipment.status).bgColor} ${getStatusInfo(selectedShipment.status).textColor}`}>
                          {getStatusInfo(selectedShipment.status).icon}
                          <span className="ml-1">{getStatusInfo(selectedShipment.status).label}</span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Oluşturulma:</span>
                        <span>{formatDate(selectedShipment.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Son Güncelleme:</span>
                        <span>{formatDate(selectedShipment.updatedAt)}</span>
                      </div>

                      {/* Şoför ve Araç bilgileri - düzenleme moduna göre değişir */}
                      {isEditingDriverVehicle ? (
                        // Düzenleme modu açıksa form göster
                        <>
                          {loadingDriversVehicles ? (
                            <div className="mt-3 flex justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                              <span className="ml-2 text-blue-500">Sürücü ve araç verileri yükleniyor...</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col mt-3">
                                <label className="text-gray-600 mb-1">Şoför:</label>
                                <select
                                  value={selectedDriverId}
                                  onChange={(e) => setSelectedDriverId(e.target.value)}
                                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Sürücü seçiniz</option>
                                  {drivers.map(driver => (
                                    <option key={driver._id} value={driver._id}>
                                      {driver.name} ({driver.phone})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col mt-3">
                                <label className="text-gray-600 mb-1">Araç:</label>
                                <select
                                  value={selectedVehicleId}
                                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">Araç seçiniz</option>
                                  {vehicles.map(vehicle => (
                                    <option key={vehicle._id} value={vehicle._id}>
                                      {vehicle.brand} {vehicle.model} - {vehicle.licensePlate}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}
                          <div className="flex justify-end mt-3 space-x-2">
                            <button
                              onClick={() => setIsEditingDriverVehicle(false)}
                              className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                              İptal
                            </button>
                            <button
                              onClick={handleSaveDriverVehicle}
                              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                            >
                              Kaydet
                            </button>
                          </div>
                        </>
                      ) : (
                        // Düzenleme modu kapalıysa statik bilgiler göster
                        <>
                          <div className="flex justify-between mt-3">
                            <span className="text-gray-600">Şoför:</span>
                            <span className="font-medium">{selectedShipment.driverName || '-'}</span>
                          </div>
                          <div className="flex justify-between mt-3">
                            <span className="text-gray-600">Araç:</span>
                            <span className="font-medium">{selectedShipment.vehicleInfo || '-'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Güzergah</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-gray-600">Alış Noktası:</span>
                        <div className="font-medium mt-1 flex items-center">
                          <FaMapMarkerAlt className="text-red-500 mr-2" />
                          {selectedShipment.pickupLocation || selectedShipment.from || '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Teslimat Noktası:</span>
                        <div className="font-medium mt-1 flex items-center">
                          <FaMapMarkerAlt className="text-green-500 mr-2" />
                          {selectedShipment.deliveryLocation || selectedShipment.to || '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Mesafe:</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-medium">
                            {formatDistance(selectedShipment.distance)}
                          </span>
                          <button 
                            onClick={() => handleViewMap(selectedShipment)}
                            className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium ml-4 px-2 py-1 border border-blue-300 rounded hover:bg-blue-50"
                          >
                            <FaMapMarkedAlt className="mr-2" />
                            Haritada Görüntüle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedShipment(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Kapat
                  </button>
                  <button
                    onClick={() => setIsEditingDriverVehicle(true)}
                    className="px-4 py-2 border border-blue-300 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 flex items-center"
                  >
                    <FaCar className="mr-2" />
                    Sürücü ve Araç Bilgileri Ekle
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Harita Modal */}
        {showMap && mapData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-medium text-lg">Rota Haritası</h3>
                <button 
                  onClick={closeMap}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <div className="flex flex-col md:flex-row items-center mb-4 text-sm">
                  <div className="flex items-center mb-2 md:mb-0 md:mr-6">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    <span>Alınacak: {mapData.pickupLocation}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    <span>Teslim: {mapData.deliveryLocation}</span>
                  </div>
                  <div className="ml-auto font-medium">
                    Mesafe: {formatDistance(mapData.distance)}
                  </div>
                </div>
                <div className="relative">
                  <div id="map" ref={mapRef} className="w-full h-96 bg-gray-100 rounded-lg"></div>
                  
                  {/* Harita Yükleniyor Göstergesi */}
                  {mapLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-lg">
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-2"></div>
                        <p className="text-orange-600 font-medium">Harita yükleniyor...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Not: Rotalar ve mesafeler yaklaşık değerlerdir. Gerçek güzergâh ve mesafe değişiklik gösterebilir.
                </div>
              </div>
            </div>
          </div>
        )}
      </PortalLayout>
    </>
  );
} 