import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import PortalLayout from '../../components/portal/Layout';
import { FaTruck, FaBox, FaMoneyBillWave, FaUsers, FaChartLine, FaRegClock, FaRegCalendarAlt, FaMapMarkerAlt, FaTimes, FaWeight, FaPhone, FaUser, FaBuilding, FaFileAlt, FaMoneyBill, FaBell, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaMapMarkedAlt, FaClock, FaRoute, FaArrowRight, FaEye } from 'react-icons/fa';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import Script from 'next/script';

export default function Dashboard() {
  const router = useRouter();
  const session = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalShipments: 0,
    activeShipments: 0, 
    completedShipments: 0,
    pendingPayments: 0,
    totalRevenue: '₺0',
    todayShipments: 0,
    totalDrivers: 0,
    totalVehicles: 0,
    monthlyRevenue: 0,
    pendingDocuments: 0,
    notifications: [],
    formatTotalRevenue: null,
    uniqueCustomers: 0,
    performanceRate: 0
  });

  // Modal kapatma fonksiyonu
  const closeModal = () => {
    setSelectedShipment(null);
    setShowModal(false);
  };

  // ESC tuşu ile modalı kapatma
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) closeModal();
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  // Google Maps API'sinin yüklenmesini takip eden state
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef(null);

  // Google Maps Script yüklendiğinde çağrılacak fonksiyon
  const handleMapScriptLoad = () => {
    console.log('Google Maps API yüklendi');
    setMapScriptLoaded(true);
  };

  // Google Maps API'sinin yüklenip yüklenmediğini kontrol et
  useEffect(() => {
    // Sayfa yüklendiğinde Google Maps API'si zaten yüklenmişse
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      console.log('Google Maps API zaten yüklenmiş');
      setMapScriptLoaded(true);
    }
  }, []);

  // Harita oluşturma ve gösterme fonksiyonu
  const initMap = () => {
    if (!selectedShipment || !mapRef.current || !window.google) {
      console.error('Harita oluşturulamadı: Gerekli veriler eksik');
      setMapLoading(false);
      return;
    }

    try {
      console.log('Harita başlatılıyor...');
      
      try {
        // Google Maps objeleri oluştur
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true, // Kendi markerlarımızı kullanacağız
          polylineOptions: {
            strokeColor: '#FF8C00',
            strokeWeight: 5
          }
        });
        
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 39.9334, lng: 32.8597 }, // Türkiye merkezi
          zoom: 7,
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
        
        // Adres bilgilerini kullanarak geocoding yap
        const geocoder = new window.google.maps.Geocoder();
        
        // Pickup adresi geocoding
        const pickupAddress = selectedShipment.pickupLocation || selectedShipment.from || selectedShipment.pickupAddress || 'İstanbul, Türkiye';
        const deliveryAddress = selectedShipment.deliveryLocation || selectedShipment.to || selectedShipment.deliveryAddress || 'Ankara, Türkiye';
        
        geocoder.geocode({ address: pickupAddress }, (pickupResults, pickupStatus) => {
          if (pickupStatus !== 'OK') {
            console.error('Harita hata: Alınacak konum bulunamadı', pickupAddress);
            setMapLoading(false);
            return;
          }
          
          // Delivery adresi geocoding
          geocoder.geocode({ address: deliveryAddress }, (deliveryResults, deliveryStatus) => {
            if (deliveryStatus !== 'OK') {
              console.error('Harita hata: Teslim konumu bulunamadı', deliveryAddress);
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
                setTimeout(() => {
                  setMapLoading(false);
                }, 500);
              } else {
                console.error('Rota çizim hatası:', status);
                setMapLoading(false);
              }
            });
          });
        });
      } catch (error) {
        console.error('Google Maps API objeleri oluşturulurken hata:', error);
        setMapLoading(false); // Hata durumunda yükleme durumunu kapat
      }
    } catch (error) {
      console.error('Harita başlatılırken hata:', error);
      setMapLoading(false);
    }
  };

  // Aktif gönderi verilerini getir
  const [activeShipments, setActiveShipments] = useState([]);
  const [recentShipments, setRecentShipments] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);

  // Harita oluşturulmasını takip eden useEffect
  useEffect(() => {
    if (showModal && selectedShipment && mapScriptLoaded && mapRef.current) {
      console.log('Harita modalı görüntüleniyor, harita başlatılacak');
      setMapLoading(true); // Harita yüklemeye başlarken loading durumunu aktifleştir
      
      // Haritayı başlat
      const timer = setTimeout(() => {
        initMap();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [showModal, mapScriptLoaded, selectedShipment]);

  // Modal kapatıldığında harita yükleme durumunu sıfırla
  useEffect(() => {
    if (!showModal) {
      setMapLoading(true);
    }
  }, [showModal]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Session kontrolü ve debug
        console.log("Session durumu:", session);
        
        if (!session || session.status === 'unauthenticated') {
          console.error("Oturum bulunamadı veya geçersiz");
          router.push('/portal/login');
          return;
        }

        // Session data kontrolü
        if (!session.data) {
          console.error("Session data bulunamadı");
          router.push('/portal/login');
          return;
        }

        // Kullanıcı bilgilerini session.data'dan al (next-auth yapısına uygun)
        setUser({
          id: session.data?.user?.id,
          email: session.data?.user?.email,
          name: session.data?.user?.name,
          type: session.data?.user?.userType,
          role: session.data?.user?.role,
          status: session.data?.user?.status
        });

        // Tüm API çağrılarını bir Promise.all içinde yapalım
        console.log("API istekleri başlatılıyor...");
        
        try {
          // 1. Dashboard verilerini al
          const dashboardPromise = axios.get('/api/portal/dashboard');
          
          // 2. Shipments verilerini al
          const shipmentsPromise = axios.get('/api/portal/shipments');
          
          // 3. Requests verilerini al
          const requestsPromise = axios.get('/api/portal/requests');
          
          // Tüm API çağrılarını bekleyelim
          const [dashboardResponse, shipmentsResponse, requestsResponse] = await Promise.all([
            dashboardPromise, shipmentsPromise, requestsPromise
          ]);
          
          console.log("Tüm API çağrıları tamamlandı");
          
          // Dashboard verileri
          if (dashboardResponse.data.success) {
            const data = dashboardResponse.data;
            
            // Shipments verileri
            let shipmentsData = [];
            if (shipmentsResponse.data.success) {
              shipmentsData = shipmentsResponse.data.shipments || [];
              console.log("Shipments API'den gelen taşıma sayısı:", shipmentsData.length);
            }
            
            // Active shipments için shipments API'dan gelen detaylı verileri kullan
            let activeShipmentsData = [];
            if (data.activeShipmentsData && data.activeShipmentsData.length > 0) {
              // Shipments API'dan gelen detaylı verileri eşleştir
              if (shipmentsData.length > 0) {
                // Shipments API'dan gelen detaylı taşıma verilerinden active olanları bul
                activeShipmentsData = shipmentsData
                  .filter(shipment => !shipment.status || 
                    shipment.status === 'waiting-pickup' || 
                    shipment.status === 'in-transit' || 
                    shipment.status === 'pending')
                  .slice(0, 3); // Sadece ilk 3 tanesini al
              } else {
                // Shipments API'den veri gelmezse dashboard API verilerini kullan
                activeShipmentsData = data.activeShipmentsData;
              }
            }
            
            // Requests verileri
            let requestsData = [];
            if (requestsResponse.data.success) {
              requestsData = requestsResponse.data.requests || [];
              console.log("Requests API'den gelen talep sayısı:", requestsData.length);
            }
            
            // En son 3 talebi al
            const latestRequests = requestsData
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
              .slice(0, 3);
            
            // Tüm verileri state'e kaydet
            setRecentRequests(latestRequests);
            console.log("Son talepler state'e kaydedildi:", latestRequests.length);
            
            // Dashboard istatistikleri
            setStats({
              ...data,
              activeShipmentsData: activeShipmentsData,
              recentRequestsData: latestRequests
            });
            
            console.log("Dashboard verileri güncellendi");
          } else {
            console.error("Dashboard API başarılı yanıt vermedi:", dashboardResponse.data);
            setError('Dashboard verileri alınamadı: ' + (dashboardResponse.data.message || 'Bilinmeyen hata'));
          }
        } catch (apiError) {
          console.error("API çağrıları sırasında hata:", apiError);
          setError('API çağrıları sırasında bir hata oluştu');
        }
      } catch (error) {
        console.error('Dashboard veri yükleme hatası:', error);
        
        if (error.response) {
          console.error('API hata detayları:', error.response.data);
        }
        
        if (error.response?.status === 401) {
          // Oturum hatası varsa login sayfasına yönlendir
          router.push('/portal/login');
          return;
        }
        
        setError('Dashboard verileri yüklenirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      } finally {
        setLoading(false);
      }
    };

    // Session hazır olduğunda API isteği yap
    if (session.status === 'authenticated') {
      fetchDashboardData();
    }
  }, [router, session]);

  // Taleplerin durumunu izle
  useEffect(() => {
    console.log("Güncel recentRequests:", recentRequests?.length || 0, recentRequests);
  }, [recentRequests]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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

  // Gönderi türüne göre icon render etme
  const renderShipmentIcon = (type) => {
    switch(type) {
      case 'kurye':
        return <FaTruck className="text-orange-500" />;
      case 'express':
        return <FaBox className="text-orange-500" />;
      case 'palet':
        return <FaBox className="text-orange-500" />;
      default:
        return <FaBox className="text-orange-500" />;
    }
  };

  // Detay modalı
  const ShipmentDetailModal = () => {
    if (!selectedShipment) return null;

    // Haritaya Google Maps'in yüklenmesini izle ve harita başlat
    useEffect(() => {
      if (!selectedShipment || !mapScriptLoaded || !mapRef.current) return;
    
      const timer = setTimeout(() => {
        console.log('Harita gösterilmeye çalışılıyor');
        initMap();
      }, 1000);
    
      return () => clearTimeout(timer);
    }, [selectedShipment, mapScriptLoaded]);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Taşıma Detayları</h2>
              <p className="text-sm text-gray-500 mt-1">#{selectedShipment.shipmentId || selectedShipment._id?.substring(0, 8) || selectedShipment.id || 'N/A'}</p>
            </div>
            <button
              onClick={closeModal}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FaTimes className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Durum ve Temel Bilgiler */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="p-3 rounded-full bg-orange-100 mr-4">
                  {renderShipmentIcon(selectedShipment.type || 'standard')}
                </span>
                <div>
                  <p className="text-lg font-semibold">{(selectedShipment.type || 'STANDARD').toUpperCase()}</p>
                  <p className="text-sm text-gray-500">
                    {selectedShipment.pickupDate ? new Date(selectedShipment.pickupDate).toLocaleDateString('tr-TR') : 
                     selectedShipment.createdAt ? new Date(selectedShipment.createdAt).toLocaleDateString('tr-TR') : 
                     'Tarih Belirtilmedi'}
                  </p>
                </div>
              </div>
              <span className={`text-sm font-semibold px-4 py-2 rounded-full ${
                selectedShipment.status === 'completed' || selectedShipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                selectedShipment.status === 'in_progress' || selectedShipment.status === 'on_the_way' || selectedShipment.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                selectedShipment.status === 'waiting-pickup' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {selectedShipment.status === 'completed' ? 'Tamamlandı' :
                 selectedShipment.status === 'delivered' ? 'Teslim Edildi' :
                 selectedShipment.status === 'in_progress' ? 'İşlemde' :
                 selectedShipment.status === 'on_the_way' || selectedShipment.status === 'in-transit' ? 'Yolda' :
                 selectedShipment.status === 'waiting-pickup' ? 'Alım Bekliyor' :
                 selectedShipment.status || 'Beklemede'}
              </span>
            </div>

            {/* Harita Başlığı */}
            <div className="flex items-center mb-2">
              <FaMapMarkedAlt className="text-orange-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Taşıma Güzergahı</h3>
            </div>

            {/* Harita - Basitleştirilmiş ve yükleme sorunu çözülmüş hali */}
            <div className="h-[400px] bg-gray-100 rounded-lg overflow-hidden relative">
              {/* Script ve harita gösterimi */}
              {!mapScriptLoaded && (
                <Script
                  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAKht3SqaVJpufUdq-vVQEfBEQKejT9Z8k'}&libraries=places`}
                  onLoad={handleMapScriptLoad}
                  onError={(e) => console.error('Google Maps API yükleme hatası:', e)}
                  strategy="afterInteractive"
                />
              )}
              
              {/* Harita konteyneri */}
              <div id="shipment-map" ref={mapRef} className="w-full h-full"></div>
              
              {/* Harita bilgileri - adres gösterimi */}
              <div className="absolute top-4 left-4 right-4 z-10 bg-white bg-opacity-90 p-4 rounded-md shadow-md">
                <h3 className="font-bold text-gray-800 mb-3 flex items-center">
                  <FaMapMarkedAlt className="text-orange-500 mr-2" />
                  Rota Bilgileri
                </h3>
                <div className="flex flex-col space-y-3">
                  <div className="flex items-start">
                    <span className="inline-block w-4 h-4 bg-green-500 rounded-full mr-2 mt-1 flex-shrink-0"></span>
                    <div>
                      <p className="font-medium text-sm">Alış Noktası:</p>
                      <p className="text-sm text-gray-700">{selectedShipment.pickupLocation || selectedShipment.from || selectedShipment.pickupAddress || 'Belirtilmedi'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center my-1 text-xs text-gray-500">
                    <div className="border-l-2 border-gray-300 h-6 mx-2"></div>
                    <FaRoute className="text-orange-500 mx-1" />
                    <span>{formatDistance(selectedShipment.distance || 0)}</span>
                    <div className="border-l-2 border-gray-300 h-6 mx-2"></div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="inline-block w-4 h-4 bg-red-500 rounded-full mr-2 mt-1 flex-shrink-0"></span>
                    <div>
                      <p className="font-medium text-sm">Teslimat Noktası:</p>
                      <p className="text-sm text-gray-700">{selectedShipment.deliveryLocation || selectedShipment.to || selectedShipment.deliveryAddress || 'Belirtilmedi'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Harita yükleniyor göstergesi */}
              {mapLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70">
                  <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-md">
                    <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-orange-500 mb-3"></div>
                    <p className="text-orange-600 font-medium text-lg">Harita Yükleniyor</p>
                    <p className="text-sm text-gray-500 mt-2">Rota hesaplanıyor, lütfen bekleyin...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Detay Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Konum Bilgileri - /portal/shipments formatında */}
              

              {/* Kargo Bilgileri */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-800">Kargo Bilgileri</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <FaWeight className="text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium">Ağırlık</p>
                      <p className="text-gray-600">{selectedShipment.weight || 'Belirtilmedi'}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaBox className="text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium">Hacim</p>
                      <p className="text-gray-600">{selectedShipment.volume || 'Belirtilmedi'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Müşteri Bilgileri */}
              

              {/* Taşıma Bilgileri */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-800">Taşıma Bilgileri</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <FaTruck className="text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium">Sürücü</p>
                      <p className="text-gray-600">{selectedShipment.driver || 'Atanmadı'}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaRegClock className="text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium">Araç</p>
                      <p className="text-gray-600">{selectedShipment.vehicle || 'Atanmadı'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ödeme Bilgileri */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-800">Ödeme Bilgileri</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <FaMoneyBill className="text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium">Tutar</p>
                      <p className="text-gray-600">₺{selectedShipment.amount?.toLocaleString('tr-TR') || '0'}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaFileAlt className="text-gray-500 mr-3" />
                    <div>
                      <p className="font-medium">Ödeme Durumu</p>
                      <p className="text-gray-600">{
                        selectedShipment.paymentStatus === 'completed' ? 'Ödendi' :
                        selectedShipment.paymentStatus === 'pending' ? 'Beklemede' :
                        selectedShipment.paymentStatus || 'Beklemede'
                      }</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Gönderi card'ını render etme - shipments sayfasındaki formatı kullan
  const renderShipmentCard = (shipment, isRecent = false) => {
    console.log(`Taşıma kartı render ediliyor:`, {
      id: shipment.id || shipment._id,
      status: shipment.status,
      type: shipment.type,
      from: shipment.from,
      pickupLocation: shipment.pickupLocation,
      to: shipment.to,
      deliveryLocation: shipment.deliveryLocation,
      distance: shipment.distance
    });
    
    // Durum bilgisine göre stil ve ikon belirle
    const getStatusInfo = (status) => {
      switch (status) {
        case 'completed':
        case 'delivered':
          return {
            label: 'Tamamlandı',
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
            icon: <FaCheckCircle className="mr-1 h-3 w-3" />
          };
        case 'in_progress':
        case 'on_the_way':
        case 'in-transit':
          return {
            label: 'Yolda',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-800',
            icon: <FaTruck className="mr-1 h-3 w-3" />
          };
        case 'waiting-pickup':
          return {
            label: 'Alım Bekliyor',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
            icon: <FaClock className="mr-1 h-3 w-3" />
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
            label: status || 'Beklemede',
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-800',
            icon: <FaTruck className="mr-1 h-3 w-3" />
          };
      }
    };
    
    // Harita görüntüleme fonksiyonu - Konum bilgileri eklendi
    const handleViewMap = () => {
      // Taşıma detayları ve haritayı göster
      setSelectedShipment({
        ...shipment,
        // Konum bilgilerini farklı formatlardan birleştir (shipments sayfasındaki gibi)
        pickupLocation: shipment.pickupLocation || shipment.from || shipment.pickupAddress || 'Belirtilmedi',
        deliveryLocation: shipment.deliveryLocation || shipment.to || shipment.deliveryAddress || 'Belirtilmedi',
      });
      setShowModal(true);
      setMapLoading(true); // Harita yüklenmeye başladığını belirt
    };
    
    const statusInfo = getStatusInfo(shipment.status);
    
    return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500 hover:shadow-lg transition duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <span className="p-2 rounded-full bg-orange-100 mr-3">
              {renderShipmentIcon(shipment.type || 'standard')}
          </span>
          <div>
              <h3 className="font-bold text-gray-800">{shipment.shipmentId || (shipment._id ? shipment._id.substring(0, 8) : shipment.id) || 'N/A'}</h3>
              <p className="text-sm text-gray-500">{(shipment.type || 'standard').toUpperCase()}</p>
            </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center ${statusInfo.bgColor} ${statusInfo.textColor}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </span>
      </div>

      <div className="flex items-start text-sm mb-3">
        <div className="flex flex-col w-full">
          <div className="flex items-start mb-1">
            <FaMapMarkerAlt className="text-red-500 mt-1 mr-2 flex-shrink-0" />
            <span className="text-gray-700 truncate">{shipment.pickupLocation || shipment.from || shipment.pickupAddress || 'Çıkış Adresi'}</span>
          </div>
          
          <div className="flex items-center justify-center my-1 text-xs text-gray-500">
            <div className="border-l-2 border-gray-300 h-4 mx-2"></div>
            <FaArrowRight className="text-gray-400 mx-1" />
            <span>{formatDistance(shipment.distance || '0')}</span>
            <div className="border-l-2 border-gray-300 h-4 mx-2"></div>
          </div>
          
          <div className="flex items-start">
            <FaMapMarkerAlt className="text-green-500 mt-1 mr-2 flex-shrink-0" />
            <span className="text-gray-700 truncate">{shipment.deliveryLocation || shipment.to || shipment.deliveryAddress || 'Varış Adresi'}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center text-xs text-gray-500">
          <FaRegCalendarAlt className="mr-1" />
            {shipment.pickupDate ? new Date(shipment.pickupDate).toLocaleDateString('tr-TR') : 
             shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString('tr-TR') : 
             'Tarih Belirtilmedi'}
        </div>
        <button 
          onClick={handleViewMap}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center"
        >
          <FaMapMarkedAlt className="mr-1" />
          Detayları Gör
        </button>
        </div>
      </div>
    );
  };

  // Ödeme kartını render etme
  const renderPaymentCard = (payment) => (
    <div key={payment.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500 hover:shadow-lg transition duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <span className="p-2 rounded-full bg-green-100 mr-3">
            <FaMoneyBillWave className="h-5 w-5 text-green-500" />
          </span>
          <div>
            <h3 className="font-bold text-gray-800">{payment.description || `Ödeme #${payment.id}`}</h3>
            <p className="text-sm text-gray-500">
              {payment.period || (payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('tr-TR') : '')}
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          payment.status === 'completed' ? 'bg-green-100 text-green-800' :
          payment.status === 'pending' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {payment.status === 'completed' ? 'Ödendi' :
           payment.status === 'pending' ? 'Beklemede' :
           payment.status || 'İşlemde'}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center text-xs text-gray-500">
          <FaTruck className="mr-1" />
          <span>{payment.totalDeliveries || 1} Taşıma</span>
        </div>
        <div className="font-bold text-gray-800">
          {payment.formattedAmount || `₺${payment.amount?.toLocaleString('tr-TR') || '0'}`}
        </div>
      </div>
    </div>
  );

  // Fatura kartını render etme
  const renderInvoiceCard = (invoice) => (
    <div key={invoice.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 hover:shadow-lg transition duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <span className="p-2 rounded-full bg-blue-100 mr-3">
            <FaFileAlt className="h-5 w-5 text-blue-500" />
          </span>
          <div>
            <h3 className="font-bold text-gray-800">{invoice.invoiceNo || `Fatura #${invoice.id}`}</h3>
            <div className="flex items-center">
              <p className="text-sm text-gray-500">
                {invoice.period || (invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('tr-TR') : '')}
              </p>
              {invoice.type && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {invoice.type}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          invoice.status === 'approved' || invoice.status === 'completed' ? 'bg-green-100 text-green-800' :
          invoice.status === 'pending' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {invoice.status === 'approved' || invoice.status === 'completed' ? 'Onaylandı' :
           invoice.status === 'pending' ? 'Beklemede' :
           invoice.status || 'İşlemde'}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center text-xs text-gray-500">
          <FaTruck className="mr-1" />
          <span>{invoice.totalDeliveries || 1} Taşıma</span>
        </div>
        <div className="font-bold text-gray-800">
          {invoice.formattedAmount || `₺${invoice.amount?.toLocaleString('tr-TR') || '0'}`}
        </div>
      </div>
    </div>
  );

  // Talep kartını render etme
  const renderRequestCard = (request) => {
    // Null veya undefined request kontrolü
    if (!request) {
      console.error('Geçersiz talep verisi:', request);
      return null;
    }

    // Durum bilgisine göre stil ve ikon belirle
    const getRequestStatusInfo = (status) => {
      switch (status) {
        case 'approved':
          return {
            label: 'Onaylandı',
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
            icon: <FaCheckCircle className="mr-1 h-3 w-3" />
          };
        case 'pending':
          return {
            label: 'Beklemede',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
            icon: <FaExclamationTriangle className="mr-1 h-3 w-3" />
          };
        case 'rejected':
          return {
            label: 'Reddedildi',
            bgColor: 'bg-red-100',
            textColor: 'text-red-800',
            icon: <FaTimesCircle className="mr-1 h-3 w-3" />
          };
        default:
          return {
            label: status || 'Yeni',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-800',
            icon: <FaExclamationTriangle className="mr-1 h-3 w-3" />
          };
      }
    };
    
    const statusInfo = getRequestStatusInfo(request.status);
    
    return (
      <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500 hover:shadow-lg transition duration-200">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            <span className="p-2 rounded-full bg-orange-100 mr-3">
              <FaBox className="text-orange-500" />
            </span>
            <div>
              <h3 className="font-bold text-gray-800">{request.requestId || (request._id ? request._id.substring(0, 8) : request.id) || 'N/A'}</h3>
              <p className="text-sm text-gray-500">{(request.type || 'Standart').toUpperCase()}</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center ${statusInfo.bgColor} ${statusInfo.textColor}`}>
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>

        <div className="flex items-start text-sm mb-3">
          <div className="flex flex-col w-full">
            <div className="flex items-start mb-1">
              <FaMapMarkerAlt className="text-red-500 mt-1 mr-2 flex-shrink-0" />
              <span className="text-gray-700 truncate">{request.pickupLocation || request.from || 'Belirtilmedi'}</span>
            </div>
            
            {request.distance && (
              <div className="flex items-center justify-center my-1 text-xs text-gray-500">
                <div className="border-l-2 border-gray-300 h-4 mx-2"></div>
                <FaArrowRight className="text-gray-400 mx-1" />
                <span>{formatDistance(request.distance)}</span>
                <div className="border-l-2 border-gray-300 h-4 mx-2"></div>
              </div>
            )}
            
            <div className="flex items-start">
              <FaMapMarkerAlt className="text-green-500 mt-1 mr-2 flex-shrink-0" />
              <span className="text-gray-700 truncate">{request.deliveryLocation || request.to || 'Belirtilmedi'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center text-xs text-gray-500">
            <FaRegCalendarAlt className="mr-1" />
            {request.createdAt ? new Date(request.createdAt).toLocaleDateString('tr-TR') : 'Tarih Belirtilmedi'}
          </div>
          <button 
            onClick={() => router.push(`/portal/requests?id=${request._id || request.id}`)}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center"
          >
            <FaEye className="mr-1" />
            Detayları Gör
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Panel - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı Panel" />
        {/* Google Maps API'sini sayfanın kendisinde yüklüyoruz, Script bileşeni kullanacağız */}
      </Head>
      <PortalLayout title="Kontrol Paneli">
        <div className="flex flex-col h-full">
          <div className="flex-grow py-4 px-4">
            {/* Dashboard içeriği */}
            <div className="grid grid-cols-1 gap-6 pb-6">
              
              {/* 1. İstatistik Kutucukları */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <FaTruck className="h-5 w-5 text-orange-500" />
                    </div>
                    <span className="text-xs text-orange-700 font-semibold bg-orange-50 px-2 py-1 rounded-full">
                      Aktif
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Aktif Taşımalar</h3>
                  <p className="text-2xl font-bold text-gray-800">{stats.activeShipments}</p>
                  <p className="mt-2 text-xs text-green-600">
                    <FaChartLine className="inline mr-1" />
                    <span>Toplam {stats.totalShipments} taşıma</span>
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <FaMoneyBillWave className="h-5 w-5 text-orange-500" />
                    </div>
                    <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                      Toplam
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Toplam Kazanç</h3>
                  <p className="text-2xl font-bold text-gray-800">{stats.formatTotalRevenue || `₺${stats.totalRevenue?.toLocaleString('tr-TR') || '0'}`}</p>
                  <p className="mt-2 text-xs text-green-600">
                    <FaChartLine className="inline mr-1" />
                    <span>{stats.completedShipments} tamamlanan taşıma</span>
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <FaUsers className="h-5 w-5 text-orange-500" />
                    </div>
                    <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2 py-1 rounded-full">
                      Tekil
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Müşteriler</h3>
                  <p className="text-2xl font-bold text-gray-800">{stats.uniqueCustomers || 0}</p>
                  <p className="mt-2 text-xs text-green-600">
                    <FaChartLine className="inline mr-1" />
                    <span>Toplam {stats.totalShipments} taşıma</span>
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <FaChartLine className="h-5 w-5 text-orange-500" />
                    </div>
                    <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                      Oran
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Performans</h3>
                  <p className="text-2xl font-bold text-gray-800">%{stats.performanceRate || 0}</p>
                  <p className="mt-2 text-xs text-green-600">
                    <FaChartLine className="inline mr-1" />
                    <span>{stats.completedShipments} tamamlanan / {stats.totalShipments} toplam</span>
                  </p>
                </div>
              </div>

              {/* 2. Listeler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aktif Taşımalar */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Aktif Taşımalar</h2>
                    <button 
                      onClick={() => router.push('/portal/shipments')}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Tümünü Gör
                    </button>
                  </div>
                  <div className="space-y-4">
                    {console.log("Render sırasında mevcut aktif taşımalar:", stats.activeShipmentsData)}
                    {stats.activeShipmentsData && stats.activeShipmentsData.length > 0 ? (
                      stats.activeShipmentsData.map(shipment => renderShipmentCard(shipment))
                    ) : (
                      <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <FaTruck className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">Aktif taşıma bulunmuyor</p>
                        <p className="text-xs text-gray-400">Taşıma oluşturulduğunda burada listelenecektir</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Son Alınan Talepler */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Son Alınan Talepler</h2>
                    <button 
                      onClick={() => router.push('/portal/requests')}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Tümünü Gör
                    </button>
                  </div>
                  <div className="space-y-4">
                    {recentRequests && recentRequests.length > 0 ? (
                      recentRequests.map(request => (
                        <div key={request._id || request.id || Math.random().toString()}>
                          {renderRequestCard(request)}
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <FaExclamationTriangle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">Alınan talepler bulunmuyor</p>
                        <p className="text-xs text-gray-400">
                          {loading ? 'Talepler yükleniyor...' : 'Talepler oluşturulduğunda burada listelenecektir'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ödemelerim ve Faturalarım */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Ödemelerim */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Son Ödemeler</h2>
                    <button 
                      onClick={() => router.push('/portal/payments')}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Tümünü Gör
                    </button>
                  </div>
                  <div className="space-y-4">
                    {stats.paymentsData && stats.paymentsData.length > 0 ? (
                      stats.paymentsData.map(payment => renderPaymentCard(payment))
                    ) : (
                      <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <FaMoneyBillWave className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">Ödeme kaydı bulunmuyor</p>
                        <p className="text-xs text-gray-400">Ödemeler gerçekleştiğinde burada listelenecektir</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Faturalarım */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Son Faturalar</h2>
                    <button 
                      onClick={() => router.push('/portal/invoices')}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Tümünü Gör
                    </button>
                  </div>
                  <div className="space-y-4">
                    {stats.invoicesData && stats.invoicesData.length > 0 ? (
                      stats.invoicesData.map(invoice => renderInvoiceCard(invoice))
                    ) : (
                      <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <FaFileAlt className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">Fatura kaydı bulunmuyor</p>
                        <p className="text-xs text-gray-400">Faturalar oluşturulduğunda burada listelenecektir</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Alt çizgi - ekranın altına sabitlenmiş */}
          <div className="w-full border-t border-gray-200 mt-auto"></div>
        </div>
        {showModal && <ShipmentDetailModal />}
      </PortalLayout>
    </>
  );
} 