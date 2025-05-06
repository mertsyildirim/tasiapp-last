import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { 
  FaTruck, FaClock, FaMapMarkedAlt, FaBoxOpen, FaBox, 
  FaShieldAlt, FaArrowLeft, FaSpinner, FaMoneyBillWave, FaRuler,
  FaMapPin, FaLocationArrow, FaImage, FaTimes, FaCheckCircle, FaInfoCircle, FaBolt, FaCalendar,
  FaBars, FaUser, FaSignOutAlt, FaSearch, FaArrowRight
} from 'react-icons/fa'
import { 
  useLoadScript, 
  GoogleMap, 
  Marker, 
  Autocomplete, 
  DirectionsRenderer 
} from '@react-google-maps/api'
import Link from 'next/link'
import { calculateBasePrice } from '../../lib/pricing'
import { applyCampaign } from '../../lib/campaign'
import { useAuth } from '../../lib/auth'
import { useSession } from 'next-auth/react'

const libraries = ['places']
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

export default function ServiceTemplatePage({ service, serviceId }) {
  const router = useRouter()
  const [pickup, setPickup] = useState('')
  const [delivery, setDelivery] = useState('')
  const [pickupMarker, setPickupMarker] = useState(null)
  const [deliveryMarker, setDeliveryMarker] = useState(null)
  const [pickupAutocomplete, setPickupAutocomplete] = useState(null)
  const [deliveryAutocomplete, setDeliveryAutocomplete] = useState(null)
  const [directions, setDirections] = useState(null)
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [pickupError, setPickupError] = useState('')
  const [deliveryError, setDeliveryError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [volume, setVolume] = useState(1) // m³ cinsinden hacim
  const [weight, setWeight] = useState(100) // kg cinsinden ağırlık
  const [loadType, setLoadType] = useState('mixed') // mixed, boxed, palletized
  const [isSelectingPickup, setIsSelectingPickup] = useState(false)
  const [isSelectingDelivery, setIsSelectingDelivery] = useState(false)
  const [activeInput, setActiveInput] = useState(null)
  const [showTransportDetails, setShowTransportDetails] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedTimeOption, setSelectedTimeOption] = useState('asap') // 'asap' veya 'specific'
  const [packageDetails, setPackageDetails] = useState({
    weight: '',
    volume: '',
    pieces: '',
    notes: ''
  })
  const [packageInfo, setPackageInfo] = useState({})
  const [packageCount, setPackageCount] = useState(1)
  const [packageWeight, setPackageWeight] = useState(0)
  const [packageVolume, setPackageVolume] = useState(0)
  const [packageImages, setPackageImages] = useState([])
  const [showSummary, setShowSummary] = useState(false)
  const [estimatedPrice, setEstimatedPrice] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestSuccess, setRequestSuccess] = useState(false)
  const [requestId, setRequestId] = useState('')
  const [basePrice, setBasePrice] = useState(0)
  const [isNight, setIsNight] = useState(false)
  const [routeChanged, setRouteChanged] = useState(false)
  const [lastSavedRoute, setLastSavedRoute] = useState({ pickup: '', delivery: '' })
  const [detailsChanged, setDetailsChanged] = useState(false)
  const [lastSavedDetails, setLastSavedDetails] = useState({
    selectedTimeOption: '',
    selectedDate: '',
    selectedTime: '',
    packageInfo: {},
    packageCount: 1,
    packageWeight: 0,
    packageVolume: 0,
    notes: ''
  })
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [campaignCode, setCampaignCode] = useState('');
  const [isApplyingCampaign, setIsApplyingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  
  // Header için eklenen state değişkenleri
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = useRef(null);
  const { isAuthenticated, user, logout } = useAuth();
  const { data: session } = useSession();
  
  // Servis detaylarını saklamak için state
  const [serviceDetails, setServiceDetails] = useState({
    name: service?.name || 'Hizmet Adı',
    description: service?.description || 'Hizmet açıklaması burada yer alacak.',
    features: [],
    loadTypes: [],
    primaryColor: 'bg-red-500',
    secondaryColor: 'bg-red-100',
    textPrimaryColor: 'text-red-800',
    textSecondaryColor: 'text-red-600',
    ringColor: 'ring-red-500'
  })

  // DirectionsRenderer örneğini ref olarak tut
  const directionsRendererRef = useRef(null)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: libraries,
    language: "tr",
    region: "TR"
  })

  const mapRef = useRef(null)
  
  // Çıkış işlemi için fonksiyon
  const handleLogout = () => {
    logout();
    router.push('/');
  };
  
  // Dropdown dışı tıklamaları işlemek için event listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileMenu && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    };

    // Sayfa üzerindeki tıklamaları dinle
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    // Temizleme fonksiyonu
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMobileMenu]);
  
  // Directions temizleme yardımcı fonksiyonu
  const clearRoutes = () => {
    // Directions state'ini temizle
    setDirections(null);
    setDistance('');
    setDuration('');
    
    // DirectionsRenderer varsa haritadan kaldır
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
  };

  // Harita yüklendiğinde referansı kaydet
  const onMapLoad = React.useCallback((map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Servis bilgilerine göre detayları güncelle
  useEffect(() => {
    if (service) {
      console.log('Service bilgisi alındı:', service)
      
      // Renk ayarlarını belirle
      let primaryColor = 'bg-red-500'
      let secondaryColor = 'bg-red-100'
      let textPrimaryColor = 'text-red-800'
      let textSecondaryColor = 'text-red-600'
      let ringColor = 'ring-red-500'
      
      // Servis tipine göre renk belirleme
      if (service.category === 'evden-eve' || (service.name && service.name.toLowerCase().includes('evden'))) {
        primaryColor = 'bg-blue-500'
        secondaryColor = 'bg-blue-100'
        textPrimaryColor = 'text-blue-800'
        textSecondaryColor = 'text-blue-600'
        ringColor = 'ring-blue-500'
      } else if (service.category === 'ofis' || (service.name && service.name.toLowerCase().includes('ofis'))) {
        primaryColor = 'bg-green-500'
        secondaryColor = 'bg-green-100'
        textPrimaryColor = 'text-green-800'
        textSecondaryColor = 'text-green-600'
        ringColor = 'ring-green-500'
      }
      
      // Servis özelliklerini oluştur
      const features = [
        {
          icon: <FaMoneyBillWave />,
          title: 'Ekonomik Fiyatlar',
          description: service.urgentFee ? `Acil teslimat ücreti: ${service.urgentFee} TL` : 'Uygun fiyat garantisi'
        },
        {
          icon: <FaShieldAlt />,
          title: 'Güvenli Taşıma',
          description: service.nightFee ? `Gece teslimat ücreti: ${service.nightFee} TL` : 'Eşyalarınız sigortalı olarak taşınır'
        }
      ]
      
      // Yük tiplerini oluştur
      const loadTypes = []
      
      if (service.packageTitle1) {
        loadTypes.push({
          title: service.packageTitle1,
          description: 'Farklı tip ve boyutlarda'
        })
      }
      
      if (service.packageTitle2) {
        loadTypes.push({
          title: service.packageTitle2,
          description: 'Standart kolilerde'
        })
      }
      
      if (service.packageTitle3) {
        loadTypes.push({
          title: service.packageTitle3,
          description: 'Paletlenmiş durumda'
        })
      }
      
      // Eğer packageTitles varsa, onları kullan
      if (service.packageTitles && service.packageTitles.length > 0) {
        loadTypes.length = 0 // Önceki içeriği temizle
        
        service.packageTitles.forEach(pkg => {
          loadTypes.push({
            title: pkg.title,
            description: pkg.subtitle ? (Array.isArray(pkg.subtitle) ? pkg.subtitle.join(', ') : pkg.subtitle) : ''
          })
        })
      }
      
      // Eğer hiç yük tipi yoksa, varsayılanları ekle
      if (loadTypes.length === 0) {
        loadTypes.push({
          title: 'Karışık Yük',
          description: 'Farklı tip ve boyutlarda'
        })
        loadTypes.push({
          title: 'Kolili Yük',
          description: 'Standart kolilerde'
        })
        loadTypes.push({
          title: 'Paletli Yük',
          description: 'Paletlenmiş durumda'
        })
      }
      
      // Service detaylarını güncelle
      setServiceDetails({
        name: service.name || 'Hizmet Adı',
        description: service.description || 'Hizmet açıklaması',
        features,
        loadTypes,
        primaryColor,
        secondaryColor,
        textPrimaryColor,
        textSecondaryColor,
        ringColor
      })
    }
  }, [service])

  // Adresler değiştiğinde markerleri kontrol et
  useEffect(() => {
    // Adreslerden biri silinirse ilgili markeri de temizle
    if (!pickup || pickup.trim() === '') {
      setPickupMarker(null);
      setPickupError('');
      clearRoutes();
    }
    
    if (!delivery || delivery.trim() === '') {
      setDeliveryMarker(null);
      setDeliveryError('');
      clearRoutes();
    }

    // Rota değişimini kontrol et
    if (showTransportDetails) {
      // Eğer adresler önceden kaydedilmişlerden farklıysa
      if (pickup !== lastSavedRoute.pickup || delivery !== lastSavedRoute.delivery) {
        setRouteChanged(true);
      } else {
        setRouteChanged(false);
      }
    }
  }, [pickup, delivery, showTransportDetails, lastSavedRoute]);
  
  // Markerlar değiştiğinde rota çizgisini kesin olarak temizle
  useEffect(() => {
    // Eğer iki marker da yoksa, harita üzerindeki rotayı temizle
    if (!pickupMarker || !deliveryMarker) {
      clearRoutes();
    } else {
      // Her iki marker da varsa ve harita yüklenmiş ise rota hesapla
      if (isLoaded && pickupMarker && deliveryMarker) {
        calculateRoute();
      }
    }
  }, [pickupMarker, deliveryMarker, isLoaded]);

  // Harita ile ilgili işlevleri component içine taşıdım
  const onPickupLoad = (autocomplete) => {
    setPickupAutocomplete(autocomplete)
  }

  const onDeliveryLoad = (autocomplete) => {
    setDeliveryAutocomplete(autocomplete)
  }

  const onPickupPlaceChanged = () => {
    if (pickupAutocomplete) {
      const place = pickupAutocomplete.getPlace();
      if (place && place.geometry) {
        setPickup(place.formatted_address);
        setPickupMarker({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
        setPickupError('');

        // Eğer teslimat noktası da seçilmişse rota çiz
        if (deliveryMarker) {
          calculateRoute();
        }
      } else {
        // Geçerli bir yer seçilmediyse
        setPickupMarker(null);
      }
    }
  }

  const onDeliveryPlaceChanged = () => {
    if (deliveryAutocomplete) {
      const place = deliveryAutocomplete.getPlace();
      if (place && place.geometry) {
        setDelivery(place.formatted_address);
        setDeliveryMarker({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
        setDeliveryError('');

        // Eğer alış noktası da seçilmişse rota çiz
        if (pickupMarker) {
          calculateRoute();
        }
      } else {
        // Geçerli bir yer seçilmediyse
        setDeliveryMarker(null);
      }
    }
  }

  const handlePickupSelectClick = () => {
    // Eğer zaten pickup seçme modundaysak (Onayla butonuna basıldıysa)
    if (isSelectingPickup) {
      // Haritanın merkezini al
      if (mapRef.current && window.google && window.google.maps) {
        const center = mapRef.current.getCenter();
        const centerPos = {
          lat: center.lat(),
          lng: center.lng()
        };
        
        // Merkezdeki koordinatları gerçek pickup marker'a dönüştür
        setPickupMarker(centerPos);
        
        // Geocoder kullanarak adres bilgisini al
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: centerPos }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setPickup(results[0].formatted_address);
          }
        });
        
        // Mobil cihazda harita cursor'unun stilini normale döndür
        if (mapRef.current) {
          mapRef.current.setOptions({
            draggableCursor: null
          });
        }
      }
      
      // Seçim modunu kapat
      setIsSelectingPickup(false);
      setActiveInput(null);
    } 
    // Eğer Haritadan Seç'e basıldıysa
    else {
      // Haritanın merkezini al
      if (mapRef.current && window.google && window.google.maps) {
        if (!isMobile) {
          // Mobil değilse cursor'u özel marker ile değiştir
          mapRef.current.setOptions({
            draggableCursor: "url('/marker_orange.png'), auto"
          });
        }
        
        // Seçim modunu aç
        setIsSelectingPickup(true);
        setIsSelectingDelivery(false);
        setActiveInput('pickup');
      }
    }
  };

  const handleDeliverySelectClick = () => {
    // Eğer zaten delivery seçme modundaysak (Onayla butonuna basıldıysa)
    if (isSelectingDelivery) {
      // Haritanın merkezini al
      if (mapRef.current && window.google && window.google.maps) {
        const center = mapRef.current.getCenter();
        const centerPos = {
          lat: center.lat(),
          lng: center.lng()
        };
        
        // Merkezdeki koordinatları gerçek delivery marker'a dönüştür
        setDeliveryMarker(centerPos);
        
        // Geocoder kullanarak adres bilgisini al
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: centerPos }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setDelivery(results[0].formatted_address);
          }
        });
        
        // Mobil cihazda harita cursor'unun stilini normale döndür
        if (mapRef.current) {
          mapRef.current.setOptions({
            draggableCursor: null
          });
        }
      }
      
      // Seçim modunu kapat
      setIsSelectingDelivery(false);
      setActiveInput(null);
    } 
    // Eğer Haritadan Seç'e basıldıysa
    else {
      // Haritanın merkezini al
      if (mapRef.current && window.google && window.google.maps) {
        if (!isMobile) {
          // Mobil değilse cursor'u özel marker ile değiştir
          mapRef.current.setOptions({
            draggableCursor: "url('/marker_orange.png'), auto"
          });
        }
        
        // Seçim modunu aç
        setIsSelectingDelivery(true);
        setIsSelectingPickup(false);
        setActiveInput('delivery');
      }
    }
  };

  const handleMapClick = (e) => {
    // Eğer mobil cihaz ise haritaya tıklayarak seçim yapılmasını engelle
    if (isMobile) {
      return;
    }
    
    // Places etkileşimini kontrol et
    if (e.placeId) {
      // Place tıklaması var, işlem yapma
      console.log("Place öğesine tıklandı:", e.placeId);
      return;
    }
    
    // Aktif bir seçim yoksa hiçbir şey yapma
    if (!activeInput) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const coords = { lat, lng };
    const geocoder = new window.google.maps.Geocoder();

    if (activeInput === 'pickup') {
      setPickupMarker(coords);
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setPickup(results[0].formatted_address);
        }
      });
      setIsSelectingPickup(false);
      setActiveInput(null);
      
      // Cursor'u normale döndür
      if (mapRef.current) {
        mapRef.current.setOptions({
          draggableCursor: null
        });
      }
    } else if (activeInput === 'delivery') {
      setDeliveryMarker(coords);
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setDelivery(results[0].formatted_address);
        }
      });
      setIsSelectingDelivery(false);
      setActiveInput(null);
      
      // Cursor'u normale döndür
      if (mapRef.current) {
        mapRef.current.setOptions({
          draggableCursor: null
        });
      }
    }

    // Rota güncelle
    if (pickupMarker && deliveryMarker) {
      calculateRoute();
    }
  };

  const calculateRoute = () => {
    // İki konum da girilmemişse rota hesaplama
    if (!pickupMarker || !deliveryMarker || !isLoaded) {
      if (!pickupMarker) setPickupError('Lütfen geçerli bir alış noktası seçin');
      if (!deliveryMarker) setDeliveryError('Lütfen geçerli bir teslimat noktası seçin');
      
      // Rotayı temizle
      clearRoutes();
      return;
    }

    setIsProcessing(true);
    
    // Harita yüklü değilse veya Google API hazır değilse işlem yapma
    if (!window.google || !window.google.maps || !mapRef.current) {
      setIsProcessing(false);
      return;
    }
    
    // Önce eski rotayı temizle
    clearRoutes();
    
    const directionsService = new window.google.maps.DirectionsService();

    // Her çağrıda zaman damgası ekleyelim - bu sayede işlemin sırası takip edilebilir
    const requestTimestamp = Date.now();
    
    directionsService.route(
      {
        origin: pickupMarker,
        destination: deliveryMarker,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        setIsProcessing(false);
        
        // İşlem tamamlandığında hala aynı markerlar var mı kontrol et
        const bothMarkersStillExist = pickupMarker && deliveryMarker;
        
        if (status === window.google.maps.DirectionsStatus.OK && bothMarkersStillExist) {
          // Önce mevcut DirectionsRenderer'ı temizle
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null);
          }
          
          // Yeni bir DirectionsRenderer oluştur
          const directionsRenderer = new window.google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#FF6B00',
              strokeWeight: 5,
              strokeOpacity: 0.8
            }
          });
          
          // Haritaya bağla
          directionsRenderer.setMap(mapRef.current);
          
          // Rotayı ayarla
          directionsRenderer.setDirections(result);
          
          // Referansı kaydet
          directionsRendererRef.current = directionsRenderer;
          
          // State'leri güncelle
          setDirections(result);
          
          // Mesafe ve süre bilgilerini al
          const route = result.routes[0];
          if (route && route.legs[0]) {
            setDistance(route.legs[0].distance.text);
            setDuration(route.legs[0].duration.text);
            
            // Haritayı rotaya sığdır
            if (mapRef.current) {
              const bounds = new window.google.maps.LatLngBounds();
              bounds.extend(pickupMarker);
              bounds.extend(deliveryMarker);
              mapRef.current.fitBounds(bounds);
              
              // Aşırı yakınlaşmayı önlemek için zoom seviyesini kontrol et
              const zoomLevel = mapRef.current.getZoom();
              if (zoomLevel > 16) {
                mapRef.current.setZoom(16);
              } else if (zoomLevel < 5) {
                mapRef.current.setZoom(5);
              }
            }
          }
        } else {
          // Hata durumu veya markerlar değişmişse directions'ı temizle
          console.error(`Rota hesaplanamadı veya markerlar değişti. Status: ${status}`);
          clearRoutes();
        }
      }
    );
  }

  // Component unmount olduğunda tüm harita referanslarını temizle
  useEffect(() => {
    return () => {
      // Cleanup fonksiyonu
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
    };
  }, []);

  // Paket detayları değişiklik işleyicisi
  const handlePackageInfoChange = (packageId, selectedSubId) => {
    setPackageInfo(prev => ({
      ...prev,
      [packageId]: selectedSubId
    }));
  };

  // Kampanya fetch fonksiyonu
  const fetchCampaign = async () => {
    try {
      const res = await fetch('/api/admin/campaigns');
      const campaigns = await res.json();
      const now = new Date();

      let matched = null;

      if (campaignCode) {
        matched = campaigns.find(c =>
          c.code === campaignCode &&
          c.isActive &&
          new Date(c.startDate) <= now &&
          new Date(c.endDate) >= now &&
          (c.usageLimit === 0 || c.usageCount < c.usageLimit)
        );
      } else {
        matched = campaigns.find(c =>
          c.isActive &&
          (!c.code || c.code === '') &&
          new Date(c.startDate) <= now &&
          new Date(c.endDate) >= now &&
          (c.usageLimit === 0 || c.usageCount < c.usageLimit)
        );
      }

      setActiveCampaign(matched || null);
    } catch (err) {
      console.error('Kampanya kontrol hatası:', err);
      setActiveCampaign(null);
    }
  };

  // Kampanya kodu uygulama fonksiyonu
  const handleApplyCampaign = async () => {
    if (!campaignCode.trim()) {
      setCampaignError('Lütfen bir kampanya kodu girin');
      return;
    }

    setIsApplyingCampaign(true);
    setCampaignError('');

    try {
      await fetchCampaign();
      
      if (!activeCampaign) {
        throw new Error('Geçerli bir kampanya bulunamadı');
      }

      if (estimatedPrice < activeCampaign.minOrderAmount) {
        throw new Error(`Bu kampanyayı kullanmak için minimum ${activeCampaign.minOrderAmount} TL tutarında sipariş vermelisiniz`);
      }

      setCampaignError('');
      // Kampanya başarılı mesajı eklenebilir
    } catch (error) {
      setCampaignError(error.message);
      setActiveCampaign(null);
    } finally {
      setIsApplyingCampaign(false);
    }
  };

  // Kampanya kaldırma fonksiyonu
  const handleRemoveCampaign = () => {
    setActiveCampaign(null);
    setEstimatedPrice(basePrice);
    setCampaignCode('');
    setCampaignError('');
  };

  // Kampanyaları yükle
  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/admin/campaigns');
      const campaigns = await res.json();
      const now = new Date();

      const validCampaigns = campaigns.filter(c =>
        c.isActive &&
        new Date(c.startDate) <= now &&
        new Date(c.endDate) >= now &&
        (c.usageLimit === 0 || c.usageCount < c.usageLimit)
      );

      setAvailableCampaigns(validCampaigns);
    } catch (err) {
      console.error('Kampanya listesi alınamadı:', err);
    }
  };

  // Sayfa yüklendiğinde kampanyaları getir
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Dropdown için onChange handler
  const handleDropdownChange = (e) => {
    const campaignId = e.target.value;
    if (!campaignId || campaignId === '') {
      handleRemoveCampaign();
      return;
    }
    const selected = availableCampaigns.find(c => c._id === campaignId);
    if (selected) {
      setActiveCampaign(selected);
    }
  };

  // calculateEstimatedPrice fonksiyonunu güncelle
  const calculateEstimatedPrice = () => {
    if (!distance) return 0;
    
    const distanceValue = parseFloat(distance.replace(/[^0-9,.]/g, '').replace(',', '.'));
    
    const now = new Date();
    const hour = now.getHours();
    const isNightTime = hour >= 20 || hour < 8;
    setIsNight(isNightTime);
    
    // Anasayfadaki hesaplama yöntemi ile aynı
    const options = {
      // Sadece "urgent" (Acil gönderi) seçildiğinde isUrgent true olacak
      isUrgent: selectedTimeOption === 'urgent',
      isNight: isNightTime
    };
    
    // Anasayfadaki gibi service objesinden değerleri al
    const pricingData = {
      basePrice: Number(service?.basePrice || 0),
      baseKm: Number(service?.baseKm || 0),
      pricePerKm: Number(service?.pricePerKm || 0),
      urgentFee: Number(service?.urgentFee || 0),
      nightFee: Number(service?.nightFee || 0)
    };
    
    // Baz fiyatı hesapla
    const base = calculateBasePrice(distanceValue, options, pricingData);
    
    // Debug için log ekle
    console.log("Fiyat Hesaplama (Servis Sayfası):", {
      mesafe: distance,
      mesafeValue: distanceValue,
      basePrice: pricingData.basePrice,
      baseKm: pricingData.baseKm,
      pricePerKm: pricingData.pricePerKm,
      isUrgent: options.isUrgent,
      urgentFee: pricingData.urgentFee,
      isNight: options.isNight,
      nightFee: pricingData.nightFee,
      hesaplananFiyat: base
    });
    
    setBasePrice(base);
    
    return base;
  };

  // Kampanya değiştiğinde fiyatı hesapla
  useEffect(() => {
    if (basePrice !== null && !isNaN(basePrice)) {
      // Kampanya hesaplaması yapılmayacak, direkt base fiyatı kullanılacak
      setEstimatedPrice(basePrice);
    }
  }, [basePrice]);

  // Distance değiştiğinde fiyatı hesapla
  useEffect(() => {
    if (distance) {
      const price = calculateEstimatedPrice();
      // Direkt hesaplanan fiyatı kullan
      setEstimatedPrice(price);
    }
  }, [distance, selectedTimeOption]);

  // Taşıma özeti gösterildiğinde detayları kaydet
  useEffect(() => {
    if (showSummary) {
      // Detayları kaydet
      setLastSavedDetails({
        selectedTimeOption,
        selectedDate,
        selectedTime,
        packageInfo,
        packageCount,
        packageWeight,
        packageVolume,
        notes: packageDetails.notes
      });
      setDetailsChanged(false);
      
      // Fiyatı güncelle
      const price = calculateEstimatedPrice();
      setEstimatedPrice(price);
    }
  }, [showSummary]);

  // Detaylar değiştiğinde takip et
  useEffect(() => {
    if (showSummary) {
      // Eğer herhangi bir detay değiştiyse
      if (
        selectedTimeOption !== lastSavedDetails.selectedTimeOption ||
        selectedDate !== lastSavedDetails.selectedDate ||
        selectedTime !== lastSavedDetails.selectedTime ||
        packageCount !== lastSavedDetails.packageCount ||
        packageWeight !== lastSavedDetails.packageWeight ||
        packageVolume !== lastSavedDetails.packageVolume ||
        packageDetails.notes !== lastSavedDetails.notes ||
        JSON.stringify(packageInfo) !== JSON.stringify(lastSavedDetails.packageInfo)
      ) {
        setDetailsChanged(true);
      } else {
        setDetailsChanged(false);
      }
    }
  }, [
    showSummary,
    selectedTimeOption,
    selectedDate,
    selectedTime,
    packageInfo,
    packageCount,
    packageWeight,
    packageVolume,
    packageDetails.notes,
    lastSavedDetails
  ]);

  // Fiyat formatı
  const formatCurrency = (amount) => {
    // Eğer değer 10'un katı ise direkt o değeri kullan, değilse 10'un katına yukarı yuvarla
    const roundedValue = amount % 10 === 0 ? amount : Math.ceil(amount / 10) * 10;
    
    // Anasayfada kullanılan formata uygun şekilde: 1.250,00 TL
    return `${roundedValue.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} TL`;
  };

  // Taşıma talebi oluşturma fonksiyonu
  const createTransportRequest = async () => {
    if (!pickupMarker || !deliveryMarker || !distance) {
      setRequestError('Lütfen taşıma bilgilerini doğru şekilde doldurun');
      return;
    }

    setIsLoading(true);
    setRequestError('');

    try {
      // Tarih ve saati birleştir
      const loadingDateTime = selectedTimeOption === 'asap' 
        ? '2-3 saat içinde'
        : selectedDate && selectedTime 
          ? `${selectedDate}T${selectedTime}:00` 
          : new Date().toISOString();

      // Paket görüntülerini base64'e dönüştür (Gerçek uygulamada dosya yükleme servisi kullanılmalı)
      const imagePromises = packageImages.map(image => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(image);
        });
      });
      
      const packageImagesBase64 = await Promise.all(imagePromises);

      // API'ye gönderilecek verileri hazırla
      const requestData = {
        // Müşteri Bilgileri - gerçek uygulamada oturum bilgilerinden alınacak
        customerName: 'Test Kullanıcı', // Kullanıcı adı
        customerPhone: '5553334444',    // Kullanıcı telefonu
        
        // Lokasyon Bilgileri
        pickupLocation: pickup,
        deliveryLocation: delivery,
        pickupMarker: pickupMarker,
        deliveryMarker: deliveryMarker,
        distance: distance || 0,
        
        // Taşıma Detayları
        selectedTimeOption: selectedTimeOption,
        selectedDate: selectedDate,
        selectedTime: selectedTime,
        loadingDate: loadingDateTime,
        
        // Servis Bilgileri
        transportType: service?.name || '',
        transportTypeId: service?._id || serviceId || '',
        transportTypes: [service?._id || serviceId || ''],
        vehicle: service?.vehicleType || '',
        
        // Paket Bilgileri
        packageInfo: packageInfo,
        packageCount: packageCount,
        packageWeight: packageWeight,
        packageVolume: packageVolume,
        packageImages: packageImagesBase64,
        
        // İçerik Detayları
        contentDetails: {
          weight: packageWeight || 0,
          volume: packageVolume || 0,
          pieces: packageCount || 1,
          description: '',
          specialNotes: '',
          selectedSubtitle: packageInfo || {}
        },
        
        // Not
        notes: packageDetails.notes || '',
        
        // Durum Bilgileri
        status: 'new',
        currentStep: 1,
        
        // Fiyat
        price: estimatedPrice || 0
      };
      
      console.log('Gönderilecek veriler:', requestData);
      
      const response = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Talep başarıyla oluşturuldu:', result);
        setRequestSuccess(true);
        setRequestId(result.request?.id || result.request?._id);
        
        // Kullanıcıyı anasayfaya yönlendir (3 sn sonra)
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        console.error('Talep oluşturma hatası:', result);
        setRequestError('Talep oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Talep oluşturma işlemi sırasında hata:', error);
      setRequestError('Talep oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Taşıma detayları açıldığında son rotayı kaydet
  useEffect(() => {
    if (showTransportDetails) {
      setLastSavedRoute({
        pickup: pickup,
        delivery: delivery
      });
      setRouteChanged(false);
    }
  }, [showTransportDetails]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Anasayfadan alınan header başlangıcı */}
      <nav className="bg-white shadow-md py-4 sticky top-0 z-[100] w-full">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Taşı.app" className="h-10" />
          </Link>
          <div className="hidden md:flex space-x-6 items-center">
            <Link href="/" className="text-gray-600 hover:text-orange-600 transition">Anasayfa</Link>
            <Link 
              href="/#services" 
              className="text-gray-600 hover:text-orange-600 transition group relative"
            >
              Hizmetlerimiz
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/#features" className="text-gray-600 hover:text-orange-600 transition group relative">
              Neden Biz?
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/iletisim" className="text-gray-600 hover:text-orange-600 transition group relative">
              İletişim
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            
            {isAuthenticated || session ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/profile" 
                  className="px-4 py-2 text-sm font-medium text-orange-600 bg-white border border-orange-600 rounded-md hover:bg-orange-50"
                >
                  Profilim
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
                >
                  Çıkış Yap
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700">
                  Giriş Yap
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium text-orange-600 bg-white border border-orange-600 rounded-md hover:bg-orange-50">
                  Kayıt Ol
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobil Menü */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-orange-500 hover:text-orange-600 focus:outline-none"
            >
              {showMobileMenu ? (
                <FaTimes className="w-6 h-6 text-orange-500" />
              ) : (
                <FaBars className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>
      
      {/* Mobil Menü Açılır Panel */}
      {showMobileMenu && (
        <div ref={mobileMenuRef} className="md:hidden fixed inset-x-0 z-50 bg-white shadow-lg transition-all duration-300 ease-in-out border-t border-gray-200">
          <div className="px-4 pt-4 pb-3 space-y-4">
            {!(isAuthenticated || session) ? (
              <>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex space-x-2">
                    <Link 
                      href="/login" 
                      onClick={() => setShowMobileMenu(false)}
                      className="flex-1 py-2 text-center text-sm font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                      Giriş Yap
                    </Link>
                    <Link 
                      href="/register" 
                      onClick={() => setShowMobileMenu(false)}
                      className="flex-1 py-2 text-center text-sm font-medium rounded-md border border-orange-500 text-orange-500 hover:bg-orange-50 transition-colors"
                    >
                      Kayıt Ol
                    </Link>
                  </div>
                </div>
                <div className="border-t border-gray-200"></div>
              </>
            ) : (
              <>
                <div className="bg-gray-50 p-3 rounded-lg mb-2">
                  <Link 
                    href="/profile" 
                    onClick={() => setShowMobileMenu(false)}
                    className="block w-full py-2.5 text-center font-medium rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  >
                    Profilim
                  </Link>
                </div>
                <button 
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-base font-medium rounded-md text-orange-600 hover:bg-orange-50"
                >
                  Çıkış Yap
                </button>
                <div className="my-2 border-t border-gray-200"></div>
              </>
            )}
            <Link href="/" className="block px-3 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-orange-600">
              Anasayfa
            </Link>
            <Link 
              href="/#services" 
              onClick={() => setShowMobileMenu(false)}
              className="block px-3 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-orange-600"
            >
              Hizmetlerimiz
            </Link>
            <Link 
              href="/#features" 
              onClick={() => setShowMobileMenu(false)}
              className="block px-3 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-orange-600"
            >
              Neden Biz?
            </Link>
            <Link 
              href="/iletisim" 
              onClick={() => setShowMobileMenu(false)}
              className="block px-3 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-orange-600"
            >
              İletişim
            </Link>
          </div>
        </div>
      )}
      {/* Anasayfadan alınan header sonu */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className={`bg-orange-500 text-white p-6`}>
            <h1 className="text-3xl font-bold flex items-center">
              <FaTruck className="mr-3" />
              {serviceDetails.name}
            </h1>
            <p className="mt-2">{serviceDetails.description}</p>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Taşıma Detayları</h2>
              <p className="text-gray-600 mb-4">
                {service && service.detailedDescription 
                  ? service.detailedDescription 
                  : ""}
              </p>
            </div>
            
            {/* Harita Bölümü */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Rota Planlaması</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Harita Giriş Alanı */}
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alış Noktası
                    </label>
                    {isLoaded ? (
                      <div className="relative">
                        <Autocomplete
                          onLoad={onPickupLoad}
                          onPlaceChanged={onPickupPlaceChanged}
                        >
                          <input
                            type="text"
                            value={pickup}
                            onChange={(e) => {
                              setPickup(e.target.value);
                              // Kullanıcı input'u temizlerse marker'ı da temizle
                              if (e.target.value === '') {
                                setPickupMarker(null);
                                clearRoutes();
                              }
                            }}
                            placeholder="Alış noktasını girin..."
                            className={`w-full px-3 py-2 border ${pickupError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${serviceDetails.ringColor} shadow-sm pr-24`}
                          />
                        </Autocomplete>
                        <button 
                          onClick={handlePickupSelectClick}
                          className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isSelectingPickup ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"} text-white px-3 py-1 rounded-md transition-colors text-sm`}
                        >
                          {isMobile && isSelectingPickup ? "Onayla" : (isSelectingPickup ? "Seçim Yapılıyor" : "Haritadan Seç")}
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={pickup}
                          onChange={(e) => setPickup(e.target.value)}
                          placeholder="Yükleniyor..."
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none shadow-sm bg-gray-100 pr-24"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-400 text-white px-3 py-1 rounded-md text-sm opacity-50">
                          Haritadan Seç
                        </div>
                      </div>
                    )}
                    {pickupError && <p className="text-red-500 text-xs mt-1">{pickupError}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teslimat Noktası
                    </label>
                    {isLoaded ? (
                      <div className="relative">
                        <Autocomplete
                          onLoad={onDeliveryLoad}
                          onPlaceChanged={onDeliveryPlaceChanged}
                        >
                          <input
                            type="text"
                            value={delivery}
                            onChange={(e) => {
                              setDelivery(e.target.value);
                              // Kullanıcı input'u temizlerse marker'ı da temizle
                              if (e.target.value === '') {
                                setDeliveryMarker(null);
                                clearRoutes();
                              }
                            }}
                            placeholder="Teslimat noktasını girin..."
                            className={`w-full px-3 py-2 border ${deliveryError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${serviceDetails.ringColor} shadow-sm pr-24`}
                          />
                        </Autocomplete>
                        <button 
                          onClick={handleDeliverySelectClick}
                          className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isSelectingDelivery ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"} text-white px-3 py-1 rounded-md transition-colors text-sm`}
                        >
                          {isMobile && isSelectingDelivery ? "Onayla" : (isSelectingDelivery ? "Seçim Yapılıyor" : "Haritadan Seç")}
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={delivery}
                          onChange={(e) => setDelivery(e.target.value)}
                          placeholder="Yükleniyor..."
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none shadow-sm bg-gray-100 pr-24"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-400 text-white px-3 py-1 rounded-md text-sm opacity-50">
                          Haritadan Seç
                        </div>
                      </div>
                    )}
                    {deliveryError && <p className="text-red-500 text-xs mt-1">{deliveryError}</p>}
                  </div>

                  {distance && duration && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                      <h3 className="text-lg font-semibold text-orange-800 mb-2">Rota Bilgileri</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-orange-600">Mesafe</p>
                          <p className="font-medium text-orange-900">{distance}</p>
                        </div>
                        <div>
                          <p className="text-sm text-orange-600">Tahmini Süre</p>
                          <p className="font-medium text-orange-900">{duration}</p>
                        </div>
                      </div>
                      
                      <button
                        className={`w-full mt-4 py-3 px-4 ${showTransportDetails && !routeChanged ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center`}
                        onClick={() => {
                          if (showTransportDetails && routeChanged) {
                            // Eğer taşıma detayları açıksa ve rota değiştiyse güncelleme yap
                            setLastSavedRoute({
                              pickup: pickup,
                              delivery: delivery
                            });
                            setRouteChanged(false);
                            
                            // Taşıma detayları bölümüne scroll et
                            setTimeout(() => {
                              const detailsSection = document.getElementById('transport-details-section');
                              if (detailsSection) {
                                detailsSection.scrollIntoView({ behavior: 'smooth' });
                              }
                            }, 100);
                          } else if (!showTransportDetails) {
                            // Eğer taşıma detayları kapalıysa açılmasını sağla
                            setShowTransportDetails(true);
                            setLastSavedRoute({
                              pickup: pickup,
                              delivery: delivery
                            });
                            
                            // Taşıma detayları bölümüne scroll et
                            setTimeout(() => {
                              const detailsSection = document.getElementById('transport-details-section');
                              if (detailsSection) {
                                detailsSection.scrollIntoView({ behavior: 'smooth' });
                              }
                            }, 100);
                          }
                          // Eğer taşıma detayları açıksa ve rota değişmediyse buton zaten pasif
                        }}
                        disabled={showTransportDetails && !routeChanged}
                      >
                        <span>{showTransportDetails && routeChanged ? "Güncelle" : "Devam Et"}</span>
                      </button>
                    </div>
                  )}
                  
                  {!distance && !duration && pickupMarker && !deliveryMarker && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                      <div className="flex items-center">
                        <FaMapMarkedAlt className="text-orange-500 text-xl mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-base font-semibold text-orange-800">Teslimat Noktası Gerekli</h3>
                          <p className="text-sm text-orange-600">Rotayı görmek için lütfen teslimat noktasını da belirleyin</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!distance && !duration && !pickupMarker && deliveryMarker && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                      <div className="flex items-center">
                        <FaMapMarkedAlt className="text-orange-500 text-xl mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-base font-semibold text-orange-800">Alış Noktası Gerekli</h3>
                          <p className="text-sm text-orange-600">Rotayı görmek için lütfen alış noktasını da belirleyin</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!distance && !duration && !pickupMarker && !deliveryMarker && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                      <div className="flex items-center">
                        <FaMapMarkedAlt className="text-orange-500 text-xl mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-base font-semibold text-orange-800">Rota Bilgisi</h3>
                          <p className="text-sm text-orange-600">Alış ve teslimat noktalarını belirleyin</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isProcessing && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                      <div className="flex items-center">
                        <FaSpinner className="animate-spin text-orange-500 text-xl mr-3 flex-shrink-0" />
                        <div>
                          <h3 className="text-base font-semibold text-orange-800">Hesaplanıyor</h3>
                          <p className="text-sm text-orange-600">Rota bilgileri hesaplanıyor...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Harita Gösterimi */}
                <div className="md:col-span-2 h-[400px] relative">
                  {loadError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="text-center text-red-500">
                        <p>Harita yüklenirken bir hata oluştu.</p>
                        <p className="text-sm">Hata: {loadError.message}</p>
                      </div>
                    </div>
                  )}
                  
                  {!loadError && !isLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="text-center text-gray-500">
                        <FaSpinner className="mx-auto mb-2 text-orange-500 h-8 w-8 animate-spin" />
                        <p>Harita yükleniyor...</p>
                      </div>
                    </div>
                  )}
                  
                  {isLoaded && (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ lat: 41.0082, lng: 28.9784 }} // İstanbul
                      zoom={12}
                      options={{
                        zoomControl: true,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: true,
                        clickableIcons: false, // POI'lerin tıklanabilir olmasını engeller
                        disableDefaultUI: false, // Default UI görünür
                        gestureHandling: "greedy", // Ctrl+scroll olmadan direkt scroll ile zoom
                        styles: [
                          {
                            featureType: "poi", // Points of Interest (POI)
                            elementType: "labels",
                            stylers: [
                              { visibility: "on" }, // Places görünür
                              { lightness: 30 } // Places soluk görünür
                            ]
                          }
                        ]
                      }}
                      onLoad={onMapLoad}
                      onClick={handleMapClick}
                    >
                      {pickupMarker && (
                        <Marker 
                          position={pickupMarker}
                          icon={{
                            url: '/marker_red.png',
                            scaledSize: new window.google.maps.Size(32, 32),
                            origin: new window.google.maps.Point(0, 0),
                            anchor: new window.google.maps.Point(16, 32)
                          }}
                        />
                      )}
                      {deliveryMarker && (
                        <Marker 
                          position={deliveryMarker}
                          icon={{
                            url: '/marker_green.png',
                            scaledSize: new window.google.maps.Size(32, 32),
                            origin: new window.google.maps.Point(0, 0),
                            anchor: new window.google.maps.Point(16, 32)
                          }}
                        />
                      )}
                      {/* DirectionsRenderer artık React tarafından render edilmeyecek, direkt haritaya ekleniyor */}
                    </GoogleMap>
                  )}
                  
                  {/* Haritadan Seç göstergeleri */}
                  {(isSelectingPickup || isSelectingDelivery) && (
                    <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                      <div className="bg-white px-4 py-2 rounded-full shadow-md text-sm font-medium text-gray-700 flex items-center">
                        <FaLocationArrow className="mr-2 text-orange-500" />
                        {isSelectingPickup ? "Alış noktasını haritadan seçin" : "Teslimat noktasını haritadan seçin"}
                      </div>
                    </div>
                  )}
                  
                  {(isSelectingPickup || isSelectingDelivery) && isMobile && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <FaMapPin className="text-orange-500 text-4xl transform -translate-y-8" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Taşıma Detayları Bölümü - Sadece Devam Et'e tıklandığında görünür */}
            {showTransportDetails && (
              <div id="transport-details-section" className="bg-white p-6 rounded-lg shadow-lg mt-8 border border-orange-100">
                <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                  <FaBoxOpen className="text-orange-500 mr-2" />
                  Taşıma Detayları
                </h2>
                
                <div className="space-y-6">
                  {/* Tarih ve Saat Seçimi */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Teslimat Zamanı</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Zaman Seçenekleri - Buton şeklinde */}
                      <button
                        type="button"
                        onClick={() => setSelectedTimeOption('asap')}
                        className={`py-3 px-4 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${
                          selectedTimeOption === 'asap' 
                            ? 'border-orange-500 bg-orange-50 text-orange-700' 
                            : 'border-gray-300 hover:border-orange-300 text-gray-700'
                        }`}
                      >
                        <FaClock className="text-xl mb-2" />
                        <span className="font-medium text-sm">En Kısa Sürede</span>
                        <span className="text-xs mt-1 text-gray-500">2-3 saat içinde</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setSelectedTimeOption('urgent')}
                        className={`py-3 px-4 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${
                          selectedTimeOption === 'urgent' 
                            ? 'border-red-500 bg-red-50 text-red-700' 
                            : 'border-gray-300 hover:border-red-300 text-gray-700'
                        }`}
                      >
                        <FaBolt className="text-xl mb-2" />
                        <span className="font-medium text-sm">Acil Gönderi</span>
                        <span className="text-xs mt-1 text-gray-500">90 dk içinde</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setSelectedTimeOption('specific')}
                        className={`py-3 px-4 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${
                          selectedTimeOption === 'specific' 
                            ? 'border-orange-500 bg-orange-50 text-orange-700' 
                            : 'border-gray-300 hover:border-orange-300 text-gray-700'
                        }`}
                      >
                        <FaCalendar className="text-xl mb-2" />
                        <span className="font-medium text-sm">Belirli Bir Tarihte</span>
                        <span className="text-xs mt-1 text-gray-500">Tarih ve saat seçin</span>
                      </button>
                    </div>
                    
                    {/* Tarih ve Saat Seçicileri - Sadece "Belirli bir tarihte" seçildiyse göster */}
                    {selectedTimeOption === 'specific' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tarih
                          </label>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Saat
                          </label>
                          <input
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Paket Detayları */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Paket Detayları</h3>
                    
                    {service?.packageTitles && service.packageTitles.length > 0 ? (
                      <div className="space-y-6">
                        {service.packageTitles.map((packageTitle) => (
                          <div key={packageTitle.id} className="bg-orange-50 p-4 rounded-lg">
                            <p className="text-base font-semibold text-gray-800 mb-2">{packageTitle.title}</p>
                            
                            {packageTitle.subtitle && packageTitle.subtitle.length > 0 && (
                              <div className="space-y-2 ml-1">
                                {packageTitle.subtitle.map((sub, subIndex) => {
                                  const subtitleText = typeof sub === 'string' ? sub : sub.text;
                                  const subId = `${packageTitle.id}_sub_${subIndex}`;
                                  
                                  return (
                                    <div key={subIndex} className="flex items-center">
                                      <input
                                        type="radio"
                                        id={subId}
                                        name={`package_${packageTitle.id}`}
                                        checked={packageInfo[packageTitle.id] === subId}
                                        onChange={() => handlePackageInfoChange(packageTitle.id, subId)}
                                        className="h-4 w-4 text-orange-500 border-gray-300 focus:ring-orange-400"
                                      />
                                      <label htmlFor={subId} className="ml-2 text-sm text-gray-700">
                                        {subtitleText}
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ağırlık (kg)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={packageWeight}
                            onChange={(e) => setPackageWeight(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hacim (m³)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={packageVolume}
                            onChange={(e) => setPackageVolume(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Parça Sayısı
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={packageCount}
                            onChange={(e) => setPackageCount(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Paket Görüntüleri */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Paket Görüntüleri</h3>
                    <div className="mb-3">
                      <p className="text-sm text-gray-500">Taşınacak paketlerin fotoğraflarını ekleyebilirsiniz. Bu gönderi hazırlarken ve olası anlaşmazlıklarda yardımcı olacaktır.</p>
                    </div>
                  
                    <div className="flex flex-nowrap overflow-x-auto gap-3 mb-4 pb-2">
                      {packageImages.length < 5 && (
                        <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32">
                          <label className="block h-full cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center h-full">
                              <FaImage className="text-gray-400 text-xl mb-1" />
                              <span className="text-xs text-gray-500 text-center px-1">Görüntü Ekle</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                multiple
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    const filesToAdd = Array.from(e.target.files);
                                    const availableSlots = 5 - packageImages.length;
                                    
                                    // Sadece boş slot kadar resim ekle
                                    if (availableSlots > 0) {
                                      const newImages = [
                                        ...packageImages,
                                        ...filesToAdd.slice(0, availableSlots)
                                      ];
                                      setPackageImages(newImages);
                                    }
                                    
                                    e.target.value = ""; // Input'u sıfırla
                                  }
                                }}
                              />
                            </div>
                          </label>
                        </div>
                      )}
                      
                      {packageImages.map((image, index) => (
                        <div key={index} className="relative group flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32">
                          <div className="h-full overflow-hidden rounded-lg shadow-sm border border-gray-200 bg-gray-50">
                            <img 
                              src={URL.createObjectURL(image)} 
                              alt={`Paket görüntüsü ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newImages = [...packageImages];
                              newImages.splice(index, 1);
                              setPackageImages(newImages);
                            }}
                            className="absolute bottom-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">En fazla 5 görüntü ekleyebilirsiniz. Kabul edilen formatlar: JPG, PNG, JPEG.</p>
                  </div>
                  
                  {/* Not Alanı */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Not
                    </label>
                    <textarea
                      rows="3"
                      value={packageDetails.notes}
                      onChange={(e) => setPackageDetails({...packageDetails, notes: e.target.value})}
                      placeholder="Taşıma ile ilgili eklemek istediğiniz notlar..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                    ></textarea>
                  </div>
                  
                  {/* İleri Butonu */}
                  <div className="mt-8">
                    <button
                      className={`w-full py-3 px-4 ${showSummary && !detailsChanged ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white font-medium rounded-lg transition-colors shadow-sm`}
                      onClick={() => {
                        if (showSummary && detailsChanged) {
                          // Eğer özet açıksa ve detaylar değiştiyse, özeti güncelle
                          setLastSavedDetails({
                            selectedTimeOption,
                            selectedDate,
                            selectedTime,
                            packageInfo,
                            packageCount,
                            packageWeight,
                            packageVolume,
                            notes: packageDetails.notes
                          });
                          setDetailsChanged(false);
                          
                          // Fiyatı yeniden hesapla
                          const price = calculateEstimatedPrice();
                          setEstimatedPrice(price);
                          
                          // Özet bölümüne scroll et
                          setTimeout(() => {
                            const summarySection = document.getElementById('transport-summary-section');
                            if (summarySection) {
                              summarySection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }, 100);
                        } else if (!showSummary) {
                          // Eğer özet kapalıysa özeti göster
                          setShowSummary(true);
                          
                          // Mevcut detayları kaydet
                          setLastSavedDetails({
                            selectedTimeOption,
                            selectedDate,
                            selectedTime,
                            packageInfo,
                            packageCount,
                            packageWeight,
                            packageVolume,
                            notes: packageDetails.notes
                          });
                          
                          // Özet bölümüne scroll et
                          setTimeout(() => {
                            const summarySection = document.getElementById('transport-summary-section');
                            if (summarySection) {
                              summarySection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }, 100);
                        }
                      }}
                      disabled={showSummary && !detailsChanged}
                    >
                      {showSummary && detailsChanged ? "Özeti Güncelle" : "Taşıma Özeti"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Taşıma Özeti Bölümü */}
            {showSummary && (
              <div id="transport-summary-section" className="bg-white p-6 rounded-lg shadow-lg mt-8 border border-orange-100">
                <h2 className="text-xl font-semibold mb-6 text-gray-800 flex items-center">
                  <FaInfoCircle className="text-orange-500 mr-2" />
                  Taşıma Özeti
                </h2>
                
                <div className="space-y-6">
                  {/* Rota Bilgileri */}
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Rota Bilgileri</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Alış Noktası</p>
                        <p className="font-medium text-gray-800">{pickup}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Teslimat Noktası</p>
                        <p className="font-medium text-gray-800">{delivery}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-500">Mesafe</p>
                        <p className="font-medium text-gray-800">{distance}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tahmini Süre</p>
                        <p className="font-medium text-gray-800">{duration}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Paket Detayları */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Taşıma Detayları</h3>
                    
                    <div className="space-y-3">
                      {/* Teslimat Zamanı */}
                      <div>
                        <p className="text-sm text-gray-500">Teslimat Zamanı</p>
                        {selectedTimeOption === 'asap' ? (
                          <p className="font-medium text-gray-800">En kısa sürede (2-3 saat içinde)</p>
                        ) : selectedTimeOption === 'urgent' ? (
                          <p className="font-medium text-gray-800">Acil gönderi (90 dk içinde)</p>
                        ) : (
                          <p className="font-medium text-gray-800">{selectedDate} - {selectedTime}</p>
                        )}
                      </div>
                      
                      {/* Seçilen Paket Türleri */}
                      {service?.packageTitles && service.packageTitles.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-500">Seçilen Paket Türleri</p>
                          {Object.entries(packageInfo).map(([packageId, selectedSubId]) => {
                            const packageTitle = service.packageTitles.find(pt => pt.id === packageId);
                            if (!packageTitle) return null;
                            
                            const subIndex = selectedSubId.split('_sub_')[1];
                            const selectedSubtitle = packageTitle.subtitle[parseInt(subIndex)];
                            const subtitleText = typeof selectedSubtitle === 'string' ? selectedSubtitle : selectedSubtitle?.text;
                            
                            return (
                              <div key={packageId} className="flex items-center mt-1">
                                <FaCheckCircle className="text-green-500 mr-2" />
                                <span className="font-medium text-gray-800">{packageTitle.title}: </span>
                                <span className="ml-1 text-gray-700">{subtitleText}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Manuel Paket Bilgileri */}
                      {(!service?.packageTitles || service.packageTitles.length === 0) && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Toplam Ağırlık</p>
                            <p className="font-medium text-gray-800">{packageWeight} kg</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Toplam Hacim</p>
                            <p className="font-medium text-gray-800">{packageVolume} m³</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Parça Sayısı</p>
                            <p className="font-medium text-gray-800">{packageCount} adet</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Notlar */}
                      {packageDetails.notes && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-500">Notlar</p>
                          <p className="text-gray-700">{packageDetails.notes}</p>
                        </div>
                      )}
                      
                      {/* Paket Görüntüleri */}
                      {packageImages.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-2">Yüklenen Görüntüler ({packageImages.length})</p>
                          <div className="flex flex-nowrap overflow-x-auto gap-3 pb-2">
                            {packageImages.map((image, index) => (
                              <div key={index} className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                                <div className="h-full overflow-hidden rounded-lg shadow-sm border border-gray-200 bg-gray-50">
                                  <img 
                                    src={URL.createObjectURL(image)} 
                                    alt={`Paket görüntüsü ${index + 1}`} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Fiyat Bilgisi */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Fiyat Bilgisi</h3>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Toplam Tutar</p>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(estimatedPrice)}</p>
                        <p className="text-xs text-gray-500 mt-1">*Tahmini fiyat, kesin fiyat onay sonrası belirlenecektir.</p>
                      </div>
                      
                      <button
                        className={`py-3 px-6 ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white font-medium rounded-lg transition-colors shadow-sm flex items-center`}
                        onClick={createTransportRequest}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <FaSpinner className="animate-spin mr-2" />
                            İşleniyor...
                          </>
                        ) : (
                          'Taşıma Talebi Oluştur'
                        )}
                      </button>
                    </div>
                    
                    {requestError && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                        {requestError}
                      </div>
                    )}
                    
                    {requestSuccess && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-600 text-sm">
                        Taşıma talebiniz başarıyla oluşturuldu! Talep numaranız: {requestId}
                        <br />
                        Anasayfaya yönlendiriliyorsunuz...
                      </div>
                    )}
                    
                    {/* Kampanyalar */}
                    {availableCampaigns.length > 0 && (
                      <div className="mt-4 border-t border-green-200 pt-4">
                        <p className="text-sm text-gray-500">Kampanya</p>
                        <select
                          className="w-full border px-3 py-2 rounded-md bg-white mt-1"
                          value={activeCampaign?._id || ''}
                          onChange={handleDropdownChange}
                        >
                          <option value="">Kampanya Seçin</option>
                          {availableCampaigns.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name} - {c.discountType === 'percentage' ? `%${c.discountValue}` : `${formatCurrency(c.discountValue)} TL`} indirim
                            </option>
                          ))}
                        </select>
                        
                        {activeCampaign && (
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-sm">
                              <span className="text-orange-500 font-medium">{activeCampaign.name}</span>
                              <span className="text-gray-500 ml-1">
                                ({activeCampaign.discountType === 'percentage' ? `%${activeCampaign.discountValue}` : `${formatCurrency(activeCampaign.discountValue)} TL`} indirim)
                              </span>
                            </div>
                            <button
                              onClick={handleRemoveCampaign}
                              className="text-sm text-red-500 hover:text-red-700"
                            >
                              Kaldır
                            </button>
                          </div>
                        )}
  
                        {campaignError && (
                          <p className="text-sm text-red-500 mt-1">{campaignError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}