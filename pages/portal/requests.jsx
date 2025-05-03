import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import PortalLayout from '../../components/portal/Layout';
import { 
  FaClipboardCheck, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp, 
  FaEye, FaLocationArrow, FaArrowRight, FaCalendarAlt, FaTag, 
  FaBox, FaCheckCircle, FaClock, FaExclamationTriangle, FaMoneyBillWave,
  FaTruck, FaMapMarkedAlt, FaTimes
} from 'react-icons/fa';

export default function Requests() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('waiting-approve');
  const [sortOrder, setSortOrder] = useState('desc'); // desc (yeniden eskiye) veya asc (eskiden yeniye)
  const [activeRequest, setActiveRequest] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapData, setMapData] = useState(null);
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const [mapLoading, setMapLoading] = useState(true); // Harita yükleniyor durumu
  const mapRef = useRef(null);

  // Talepler verileri
  const [requests, setRequests] = useState([]);

  // Kullanıcı verilerini ve talepleri getir
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

        // API'den talepleri getir
        try {
          console.log("Taşıma talepleri alınıyor...");
          
          // Önce filtresiz tüm talepleri alma isteği yap - istatistikler için
          const allRequestsResponse = await fetch(`/api/portal/requests?page=1&limit=100`);
          
          if (!allRequestsResponse.ok) {
            throw new Error(`API yanıt hatası: ${allRequestsResponse.status}`);
          }
          
          const allRequestsData = await allRequestsResponse.json();
          const allRequests = allRequestsData.success ? allRequestsData.requests : [];
          
          // Sonra filtrelenmiş talepleri al - görüntüleme için
          const params = new URLSearchParams();
          if (statusFilter !== 'all') {
            params.append('status', statusFilter);
          }
          params.append('page', '1');
          params.append('limit', '50'); // Sayfada gösterilecek maksimum talep sayısı
          
          const filteredResponse = await fetch(`/api/portal/requests?${params}`);
          
          if (!filteredResponse.ok) {
            throw new Error(`API yanıt hatası: ${filteredResponse.status}`);
          }
          
          const filteredData = await filteredResponse.json();
          
          if (filteredData.success) {
            // Tüm istatistikler için request dizisini güncelle fakat görüntüleme
            // için filtrelemeyi getFilteredRequests() ile yap
            setRequests(allRequests);
          } else {
            console.error("API başarısız cevap döndü:", filteredData.message);
            setError(filteredData.message || 'Talepler yüklenirken bir hata oluştu');
          }
        } catch (apiError) {
          console.error("API hatası:", apiError);
          setError('Taşıma talepleri yüklenirken bir hata oluştu');
        }
      } catch (error) {
        console.error('Talepler veri yükleme hatası:', error);
        setError('Talepler verileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, status, statusFilter]);

  // Talepleri filtreleme ve sıralama
  const getFilteredRequests = () => {
    console.log('Portal - Filtreleme öncesi talep sayısı:', requests.length);
    console.log('Portal - Tüm talep durumları:', [...new Set(requests.map(r => r.status))]);
    
    return requests
      .filter(request => {
        // Arama filtresi
        if (searchTerm && searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          const matches = (
            (String(request.id || '').toLowerCase().includes(term)) ||
            (String(request.customerName || '').toLowerCase().includes(term)) ||
            (String(request.pickupLocation || '').toLowerCase().includes(term)) ||
            (String(request.deliveryLocation || '').toLowerCase().includes(term)) ||
            (String(request.transportType || '').toLowerCase().includes(term))
          );
          
          if (!matches) return false;
        }
        
        // Status filtresi - aktif seçili filtreye göre
        if (statusFilter !== 'all') {
          const requestStatus = String(request.status || '').toLowerCase();
          const filterStatus = statusFilter.toLowerCase();
          return requestStatus === filterStatus;
        } else {
          // 'Tüm Talepler' için özel filtre
          const status = String(request.status || '').toLowerCase();
          // Sadece paid, approved ve waiting-approve durumundakileri göster
          return status === 'paid' || status === 'approved' || status === 'waiting-approve';
        }
      })
      .sort((a, b) => {
        // Sıralama
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        
        if (sortOrder === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
  };

  // Talep durumuna göre renk ve ikon belirle
  const getStatusInfo = (status) => {
    // Statüsü olmayan durumlarda varsayılan değer
    if (!status) {
      return {
        label: 'Bilinmiyor',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
        icon: <FaClipboardCheck className="mr-1 h-3 w-3" />
      };
    }

    // Status değerini küçük harfe çevirerek kontrol et
    const lowercaseStatus = String(status).toLowerCase();
    
    // Yeni / New kontrol
    if (lowercaseStatus === 'new' || lowercaseStatus === 'yeni') {
      return {
        label: 'Yeni',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
        icon: <FaClipboardCheck className="mr-1 h-3 w-3" />
      };
    }
    
    // Taşıyıcı Onayı Bekleniyor / Waiting Approve
    if (lowercaseStatus === 'waiting-approve' || lowercaseStatus === 'waiting approve' || lowercaseStatus === 'tasiyici onayi bekliyor') {
      return {
        label: 'Onay Bekliyor',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        icon: <FaClock className="mr-1 h-3 w-3" />
      };
    }
    
    // Onaylandı / Approved kontrol
    if (lowercaseStatus === 'approved' || lowercaseStatus === 'onaylandi' || lowercaseStatus === 'onaylandı') {
      return {
        label: 'Onaylandı',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        icon: <FaCheckCircle className="mr-1 h-3 w-3" />
      };
    }
    
    // Kabul edilen / Accepted kontrol - geçiş için destek
    if (lowercaseStatus === 'accepted' || lowercaseStatus === 'kabul edildi') {
      return {
        label: 'Kabul Edildi',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        icon: <FaCheckCircle className="mr-1 h-3 w-3" />
      };
    }
    
    // Tamamlandı / Completed kontrol
    if (lowercaseStatus === 'completed' || lowercaseStatus === 'tamamlandi' || lowercaseStatus === 'tamamlandı') {
      return {
        label: 'Tamamlandı',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        icon: <FaCheckCircle className="mr-1 h-3 w-3" />
      };
    }
    
    // Süresi geçti / Expired kontrol
    if (lowercaseStatus === 'expired' || lowercaseStatus === 'suresi gecti' || lowercaseStatus === 'süresi geçti') {
      return {
        label: 'Süresi Geçti',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        icon: <FaExclamationTriangle className="mr-1 h-3 w-3" />
      };
    }
    
    // Beklemede / Waiting kontrol
    if (lowercaseStatus === 'waiting' || lowercaseStatus === 'beklemede') {
      return {
        label: 'Beklemede',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
        icon: <FaClock className="mr-1 h-3 w-3" />
      };
    }
    
    // Ödemesi Yapıldı / Paid kontrol
    if (lowercaseStatus === 'paid' || lowercaseStatus === 'odendi' || lowercaseStatus === 'ödendi') {
      return {
        label: 'Taşıma Atandı',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        icon: <FaMoneyBillWave className="mr-1 h-3 w-3" />
      };
    }
    
    // Varsayılan durum (tanınmayan status değeri)
    return {
      label: status,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200',
      icon: <FaClipboardCheck className="mr-1 h-3 w-3" />
    };
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

  // Tarih formatını düzenle
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Aktif talep detaylarını göster/gizle
  const toggleRequestDetails = (request) => {
    if (activeRequest && activeRequest.id === request.id) {
      setActiveRequest(null);
    } else {
      setActiveRequest(request);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      // Gerçek bir API entegrasyonu
      const response = await fetch(`/api/portal/accept-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requestId })
      });
      
      if (!response.ok) {
        throw new Error('Talep kabul edilemedi');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Lokalde güncelleme
        setRequests(prevRequests => 
          prevRequests.map(req => 
            req.id === requestId ? { ...req, status: 'approved' } : req
          )
        );
        
        // Modal'ı kapat
        setActiveRequest(null);
      } else {
        console.error('API hatası:', data.message);
      }
    } catch (error) {
      console.error('Talep kabul hatası:', error);
    }
  };

  // Taşımaya Git butonuna tıklandığında
  const handleViewShipment = (requestId) => {
    // Taşımalar sayfasına yönlendir ve istenilen talep ID'sini query ile gönder
    router.push(`/portal/shipments?requestId=${requestId}`);
  };

  // Harita görüntüleme fonksiyonu
  const handleViewMap = (request) => {
    // Yükleme durumunu aktifleştir
    setMapLoading(true);
    
    // Harita için gerekli verileri hazırla
    setMapData({
      pickupLocation: request.pickupLocation,
      deliveryLocation: request.deliveryLocation,
      distance: request.distance,
      pickupCoords: request.pickupCoords || null, // Alış koordinatları
      deliveryCoords: request.deliveryCoords || null // Teslimat koordinatları
    });
    
    // Harita modalını aç
    setShowMap(true);
  };

  // Harita modalını kapat
  const closeMap = () => {
    setShowMap(false);
    setMapLoading(true); // Bir sonraki açılış için yükleme durumunu sıfırla
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
            useGeocodingForMap(map, directionsService, directionsRenderer, pickupIcon, deliveryIcon);
          }
        } else {
          console.log('Koordinat verisi bulunamadı, adres bazlı geocoding yapılacak');
          useGeocodingForMap(map, directionsService, directionsRenderer, pickupIcon, deliveryIcon);
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
  const useGeocodingForMap = (map, directionsService, directionsRenderer, pickupIcon, deliveryIcon) => {
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

  // Harita görünür olduğunda ve script yüklendiyse haritayı başlat
  useEffect(() => {
    if (showMap && mapData && mapScriptLoaded) {
      // API tamamen yüklenene kadar bekle
      const timer = setTimeout(() => {
        console.log('Harita gösterilmeye çalışılıyor');
        initMap();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [showMap, mapData, mapScriptLoaded]);
  
  // ESC tuşuna basıldığında harita modalını kapat
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
  }, [showMap]);

  // Yükleniyor durumu
  if (loading) {
    return (
      <PortalLayout title="Talepler">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </PortalLayout>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <PortalLayout title="Talepler">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      </PortalLayout>
    );
  }

  // Filtrelenmiş talepler
  const filteredRequests = getFilteredRequests();
  
  // Debug - User bilgisini konsola yazdır
  console.log("User bilgisi:", user);
  
  // Debug - Paid statüsündeki talepleri ve taşıyıcı bilgilerini konsola yazdır
  console.log("Paid statüsündeki talepler:", requests.filter(r => String(r.status || '').toLowerCase() === 'paid').map(r => ({
    id: r.id || r._id,
    status: r.status,
    carrier: r.carrier,
    carrierId: r.carrierId,
    customerName: r.customerName
  })));
  
  // İstatistik hesaplamaları - Filtreleme seçeneklerinden bağımsız olarak tüm taleplere dayalı
  const waitingApproveCount = requests.filter(r => r.status === 'waiting-approve').length;
  
  const approvedByMeCount = requests.filter(r => {
    const status = String(r.status || '').toLowerCase();
    // Sadece approved olanlardan, taşıyıcısı ben olanları göster
    return status === 'approved' && 
           ((r.carrier && String(r.carrier) === String(user?.id)) || 
            (r.carrierId && String(r.carrierId) === String(user?.id)));
  }).length;
  
  const paidToMeCount = requests.filter(r => {
    const status = String(r.status || '').toLowerCase();
    // Sadece paid olanlardan, taşıyıcısı ben olanları göster
    return status === 'paid';
  }).length;
  
  const missedRequestsCount = requests.filter(r => {
    const status = String(r.status || '').toLowerCase();
    // Approved statüsündeki talepler ama taşıyıcısı ben olmayan
    return status === 'approved' && 
           !(r.carrier && String(r.carrier) === String(user?.id)) && 
           !(r.carrierId && String(r.carrierId) === String(user?.id));
  }).length;

  return (
    <>
      <Head>
        <title>Talepler - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı Talepler" />
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

      <PortalLayout title="Talepler">
        <div className="space-y-6 p-4">
          {/* Üst Bilgi Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <FaClock className="h-5 w-5 text-yellow-500" />
                </div>
                <span className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2 py-1 rounded-full">
                  Bekliyor
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Onay Bekleyen</h3>
              <p className="text-2xl font-bold text-gray-800">
                {waitingApproveCount}
              </p>
              <p className="mt-2 text-xs text-yellow-600">
                <FaClock className="inline mr-1" />
                <span>Onayınızı bekliyor</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-green-100 rounded-full">
                  <FaCheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                  Aktif
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Kabul Edilmiş</h3>
              <p className="text-2xl font-bold text-gray-800">
                {approvedByMeCount}
              </p>
              <p className="mt-2 text-xs text-green-600">
                <FaCheckCircle className="inline mr-1" />
                <span>Sizin tarafınızdan onaylandı</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-green-100 rounded-full">
                  <FaMoneyBillWave className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                  Taşıma Atandı
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Taşıma Atandı</h3>
              <p className="text-2xl font-bold text-gray-800">
                {paidToMeCount}
              </p>
              <p className="mt-2 text-xs text-green-600">
                <FaMoneyBillWave className="inline mr-1" />
                <span>Ödeme tamamlandı</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-red-100 rounded-full">
                  <FaExclamationTriangle className="h-5 w-5 text-red-500" />
                </div>
                <span className="text-xs text-red-700 font-semibold bg-red-50 px-2 py-1 rounded-full">
                  Kaçırılan
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Kaçırılan Talepler</h3>
              <p className="text-2xl font-bold text-gray-800">
                {missedRequestsCount}
              </p>
              <p className="mt-2 text-xs text-red-600">
                <FaExclamationTriangle className="inline mr-1" />
                <span>Başka taşıyıcı atandı</span>
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
                    placeholder="Talep ara..."
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
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                  >
                    <option value="waiting-approve">Onay Bekliyor</option>
                    <option value="approved">Kabul Ettiklerim</option>
                    <option value="all">Tüm Talepler</option>
                    <option value="paid">Taşıma Atananlar</option>
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
                  <div className="mt-2 text-xs text-gray-500 text-right">
                    <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 mr-1">ESC</kbd>
                    tuşu ile haritayı kapatabilirsiniz
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Talepler Listesi */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Taşıma Talepleri</h3>
            
            {filteredRequests.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Filtrelere uygun talep bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map((request) => {
                  const statusInfo = getStatusInfo(request.status);
                  const isActive = activeRequest && activeRequest.id === request.id;
                  
                  return (
                    <div 
                      key={request.id} 
                      className={`border ${isActive ? 'border-orange-300' : 'border-gray-200'} rounded-lg p-4 hover:shadow-md transition-shadow ${isActive ? 'bg-orange-50' : ''}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium text-gray-900">{request.id}</h4>
                            <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full flex items-center ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 md:mt-0 flex">
                          <span className="text-lg font-bold text-orange-500">{request.price} ₺</span>
                          <button 
                            onClick={() => toggleRequestDetails(request)}
                            className="ml-4 text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <FaEye className="mr-1" />
                            {isActive ? 'Gizle' : 'Detaylar'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-start my-2 text-sm">
                        <div className="flex items-start mb-2 md:mb-0">
                          <FaLocationArrow className="text-gray-400 mt-1 mr-1" />
                          <div>
                            <p className="text-gray-700">{request.pickupLocation}</p>
                            <div className="flex items-center my-1">
                              <FaArrowRight className="text-gray-400 mx-2" />
                              <p className="text-gray-500 text-xs">{formatDistance(request.distance)}</p>
                            </div>
                            <p className="text-gray-700">{request.deliveryLocation}</p>
                            <button 
                              onClick={() => handleViewMap(request)}
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
                            <p className="text-gray-700">{request.transportType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Araç Tipi</p>
                            <p className="text-gray-700">{request.vehicleType || request.vehicle || '-'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Taşıma Atandı (paid) durumundaki talepler için "Taşımaya Git" butonu */}
                      {String(request.status || '').toLowerCase() === 'paid' && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleViewShipment(request.id)}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center text-sm"
                          >
                            <FaTruck className="mr-1.5" />
                            Taşımaya Git
                          </button>
                        </div>
                      )}

                      {isActive && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Taşıma Bilgileri</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Yükleme Tarihi</p>
                                    <p className="text-sm">{formatDate(request.loadingDateTime || request.created_at || new Date())}</p>
                                  </div>
                                </div>
                                <div className="flex items-start mb-2">
                                  <FaTag className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Oluşturulma</p>
                                    <p className="text-sm">{formatDate(request.createdAt || request.created_at || new Date())}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Yük Detayları</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                {request.packageInfo && request.packageInfo.length > 0 ? (
                                  request.packageInfo.map((pkg, idx) => (
                                    <div key={idx} className="flex items-start mb-2">
                                      <FaBox className="text-orange-500 mt-1 mr-2" />
                                      <div>
                                        <p className="text-sm font-medium">{pkg.name}</p>
                                        <p className="text-sm">{pkg.count} adet - {pkg.weight} kg</p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-sm text-gray-500">Yük detayı bulunmuyor</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            {request.status === 'waiting-approve' && (
                              <button
                                onClick={() => handleAcceptRequest(request.id)}
                                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                              >
                                Talebi Kabul Et
                              </button>
                            )}
                            {request.status === 'approved' && (
                              <div className="flex flex-col items-end">
                                <span className="text-green-600 font-medium mb-1">
                                  <FaCheckCircle className="inline mr-1" />
                                  Bu talebi kabul ettiniz
                                </span>
                                <span className="text-sm text-gray-500">
                                  Taşımalar sayfasından takip edebilirsiniz
                                </span>
                              </div>
                            )}
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