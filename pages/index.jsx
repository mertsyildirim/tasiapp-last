'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { FaTruck, FaBoxOpen, FaMapMarkedAlt, FaShieldAlt, FaClock, FaHandshake, FaLocationArrow, FaBuilding, FaHome, FaWarehouse, FaSpinner, FaPallet, FaBox, FaImage, FaTrash, FaMapMarkerAlt, FaCheck, FaStar, FaPhone, FaInfoCircle, FaCheckCircle, FaEnvelope, FaMapPin, FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaSnowflake, FaBolt, FaTools, FaLock, FaMoneyBillWave, FaMapMarked, FaArrowLeft, FaSignOutAlt, FaRoute, FaTimes, FaCalendar, FaUser, FaBars, FaEdit } from 'react-icons/fa'
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer, Autocomplete, StandaloneSearchBox, AdvancedMarkerElement } from '@react-google-maps/api'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'
import { toast } from 'react-toastify'
import { useSession } from 'next-auth/react';
import Modal from 'react-modal';
import { calculateBasePrice } from '../lib/pricing';
import { applyCampaign } from '../lib/campaign';
import axios from 'axios';

// Google Maps için kütüphaneleri tanımla
const libraries = ['places'];

// API anahtarını environment variable'dan al
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Step Bar Component
const StepBar = ({ currentStep }) => {
  // Kullanıcı giriş yapmışsa veya session varsa kullanılacak adımlar
  const { isAuthenticated, user } = useAuth();
  const { data: session } = useSession();
  
  // Giriş durumuna göre uygun adımları belirle
  const isLoggedIn = isAuthenticated || session;
  const steps = isLoggedIn
    ? ['Tür', 'Detay', 'Özet', 'Taşıyıcı', 'Ödeme'] // Giriş yapmış kullanıcılar için
    : ['Tür', 'Detay', 'Özet', 'İletişim', 'Taşıyıcı', 'Ödeme']; // Giriş yapmamış kullanıcılar için
  
  // Mevcut adım indeksini, giriş durumuna göre ayarla
  const adjustedCurrentStep = (currentStep) => {
    // Eğer kullanıcı giriş yapmışsa ve mevcut adım iletişim adımından sonraysa, adım indeksini bir azalt
    if (isLoggedIn && currentStep >= 3) {
      return currentStep - 1;
    }
    return currentStep;
  };
  
  return (
    <div className="flex justify-between items-center mb-6 w-full max-w-4xl mx-auto px-2 sm:px-4">
      {steps.map((step, index) => (
        <div key={index} className="flex flex-col items-center relative min-w-0 flex-1">
          {/* Çizgi (her yuvarlaklı numaradan önce, ilk hariç) */}
          {index > 0 && (
            <div 
              className={`absolute top-[13px] sm:top-[16px] md:top-[20px] h-0.5 left-[-50%] w-full ${
                index <= adjustedCurrentStep(currentStep) ? 'bg-orange-500' : 'bg-gray-200'
              }`} 
            />
          )}
          
          {/* Numara */}
          <div className={`flex items-center justify-center w-6 h-6 sm:w-8 md:w-10 sm:h-8 md:h-10 rounded-full text-xs sm:text-sm md:text-base z-10 ${
            index <= adjustedCurrentStep(currentStep) ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {index + 1}
          </div>
          
          {/* Adım Adı */}
          <span className={`mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm text-center truncate w-full px-0.5 sm:px-1 ${
            index <= adjustedCurrentStep(currentStep) ? 'text-orange-500 font-medium' : 'text-gray-500'
          }`}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
};

// Modal stilleri için yeni CSS sınıfları
const modalStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    overflow: 'hidden'
  },
  content: {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    maxWidth: '64rem',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '1.5rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  }
};

// Modal bileşeni
const CustomModal = ({ isOpen, onClose, children }) => {
  // Modal açıldığında body'e overflow-hidden ekle, kapandığında kaldır
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup fonksiyonu
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.content} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export default function MusteriSayfasi() {
  const [pickupAddress, setPickupAddress] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedTransportType, setSelectedTransportType] = useState('')
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [showSearchingModal, setShowSearchingModal] = useState(false)
  const [showCarrierAcceptedModal, setShowCarrierAcceptedModal] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [directions, setDirections] = useState(null)
  const [map, setMap] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mapError, setMapError] = useState(null)
  const [pickupAutocomplete, setPickupAutocomplete] = useState(null)
  const [deliveryAutocomplete, setDeliveryAutocomplete] = useState(null)
  const [pickupPlace, setPickupPlace] = useState(null)
  const [deliveryPlace, setDeliveryPlace] = useState(null)
  const [duration, setDuration] = useState('')
  const [pickupMarker, setPickupMarker] = useState(null)
  const [deliveryMarker, setDeliveryMarker] = useState(null)
  const [otpSent, setOtpSent] = useState(false)
  const [showWaitingApprovalModal, setShowWaitingApprovalModal] = useState(false)
  const [showCarrierDetailsModal, setShowCarrierDetailsModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedService, setSelectedService] = useState({
    basePrice: 119,
    baseKm: 3,
    pricePerKm: 18,
    urgentFee: 50,
    nightFee: 40
  });
  const [serviceModalStep, setServiceModalStep] = useState(0);
  const [showTransportDetails, setShowTransportDetails] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showDefaultModal, setShowDefaultModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [packageDetails, setPackageDetails] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [contentDetails, setContentDetails] = useState({
    weight: '',
    volume: '',
    pieces: '',
    description: '',
    specialNotes: '',
    notes: '' // Not alanı için yeni property
  });
  const [modalStep, setModalStep] = useState(0);
  const { isAuthenticated, user, logout } = useAuth();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  const router = useRouter()
  const { data: session } = useSession();

  const [isSelectingPickup, setIsSelectingPickup] = useState(false);
  const [isSelectingDelivery, setIsSelectingDelivery] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const searchBoxRef = useRef(null);
  const [searchInput, setSearchInput] = useState('');
  const [isMapMode, setIsMapMode] = useState(false);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const mapRef = useRef(null);
  const [activeInput, setActiveInput] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [distance, setDistance] = useState(5.4); // Harita veya inputtan alınabilir
  const [isUrgent, setIsUrgent] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [campaignCodeMode, setCampaignCodeMode] = useState(false);
  const [campaignCode, setCampaignCode] = useState('');
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [isApplyingCampaign, setIsApplyingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [basePrice, setBasePrice] = useState(null);

  const [packageCount, setPackageCount] = useState(1);
  const [packageWeight, setPackageWeight] = useState(0);
  const [packageVolume, setPackageVolume] = useState(0);

  // Türkiye'deki büyük şehirlerin sınırları
  const cityBounds = {
    'İstanbul': {
      north: 41.3200,
      south: 40.8000,
      east: 29.4500,
      west: 28.1000
    },
    'Ankara': {
      north: 40.1000,
      south: 39.7000,
      east: 33.0000,
      west: 32.5000
    },
    'İzmir': {
      north: 38.6000,
      south: 38.2000,
      east: 27.4000,
      west: 26.8000
    },
    'Bursa': {
      north: 40.3000,
      south: 39.9000,
      east: 29.4000,
      west: 28.8000
    },
    'Antalya': {
      north: 37.1000,
      south: 36.7000,
      east: 31.0000,
      west: 30.4000
    }
  }

  // Kullanıcının şehrini tespit et
  const [userCity, setUserCity] = useState(null);

  const [bothMarkersSelected, setBothMarkersSelected] = useState(false);

  // Profil verisi için yeni state
  const [profileData, setProfileData] = useState(null);

  // Genel ayarlar için state
  const [generalSettings, setGeneralSettings] = useState({
    contactEmail: 'iletisim@tasiapp.com',
    phone: '+90 212 123 4567',
    address: 'İstanbul, Türkiye',
    workingHours: {
      start: '09:00',
      end: '18:00'
    }
  });

  // Ana bileşenin başında yeni state ekleyelim
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  
  // Yeni modallar için state'ler
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [registerError, setRegisterError] = useState('')

  // Yeni useEffect - dışarı tıklandığında dropdown'ı kapatan fonksiyon
  // Ana bileşenin başında yeni state ekleyelim
  const mobileMenuRef = useRef(null);

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

  useEffect(() => {
    const detectUserCity = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setUserCity(data.city);
      } catch (error) {
        console.error('Şehir tespiti yapılamadı:', error);
        setUserCity('İstanbul'); // Varsayılan olarak İstanbul
      }
    };
    
    detectUserCity();
  }, []);

  useEffect(() => {
    if (!(pickupMarker && deliveryMarker && pickupAddress && deliveryAddress)) {
      setBothMarkersSelected(false);
    }
  }, [pickupMarker, deliveryMarker, pickupAddress, deliveryAddress]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => URL.createObjectURL(file));
    setUploadedImages([...uploadedImages, ...newImages]);
  };

  const handleContentChange = (e) => {
    const { name, value } = e.target;
    setContentDetails({
      ...contentDetails,
      [name]: value
    });
  };

  const handleContinueToStep2 = async () => {
    // Kontrol: Alt başlıkları olan başlıklar için en az bir alt başlık seçilmiş olmalı
    let validationPassed = true;
    let warningMessage = "";
    
    if (selectedService?.packageTitles) {
      for (const packageTitle of selectedService.packageTitles) {
        // Alt başlığı olan tüm ana başlıklar için kontrol
        if (packageTitle.subtitle && packageTitle.subtitle.length > 0) {
          // Bu başlığın alt başlıklarından herhangi biri seçili mi?
          const hasSelectedSubtitle = packageTitle.subtitle.some((_, subIndex) => {
            const subId = `${packageTitle.id}_sub_${subIndex}`;
            return packageInfo[subId] === 'true';
          });
          if (!hasSelectedSubtitle) {
            validationPassed = false;
            warningMessage = `"${packageTitle.title}" için lütfen bir seçenek işaretleyin.`;
            break;
          }
        }
      }
    }
    
    if (!validationPassed) {
      toast.warning(warningMessage);
      return false;
    }
    
    try {
      // Debug için gönderilecek verileri kontrol et
      console.log('Seçilen Tarih:', selectedDate);
      console.log('Seçilen Saat:', selectedTime);
      console.log('Pickup Address:', pickupAddress);
      console.log('Delivery Address:', deliveryAddress);
      console.log('Content Details:', contentDetails);
      console.log('Package Info:', packageInfo);
      console.log('Transport Type:', selectedTransportType);

      // Tarih ve saati birleştir
      const loadingDateTime = selectedTimeOption === 'asap' 
        ? '2-3 saat içinde'
        : selectedDate && selectedTime 
          ? `${selectedDate}T${selectedTime}:00` 
          : new Date().toISOString();

      const requestData = {
        customerName: user?.name || session?.user?.name || 'Üye Olmayan Kullanıcı',
        customerPhone: user?.phone || session?.user?.phone || '5551112233',
        pickupLocation: pickupAddress,
        deliveryLocation: deliveryAddress,
        pickupMarker: pickupMarker,
        deliveryMarker: deliveryMarker,
        distance: distance || 0,
        status: 'waiting-approve', // 'new' -> 'waiting-approve' olarak değiştirildi
        transportType: selectedTransportType || '',
        packageInfo: packageInfo || {},
        loadingDate: loadingDateTime,
        description: contentDetails?.description || '',
        specialNotes: contentDetails?.specialNotes || '',
        notes: contentDetails?.notes || '', // Not alanı eklendi
        weight: contentDetails?.weight || 0,
        volume: contentDetails?.volume || 0,
        pieces: contentDetails?.pieces || 0
      };

      // Debug için request data'yı kontrol et
      console.log('API\'ye gönderilecek veri:', requestData);

      const response = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Debug için response'u kontrol et
      console.log('API Response Status:', response.status);
      const responseText = await response.text();
      console.log('API Response Text:', responseText);

      if (!response.ok) {
        throw new Error(`API isteği başarısız oldu: ${response.status} - ${responseText}`);
      }

      const result = JSON.parse(responseText);
      console.log('Talep başarıyla kaydedildi:', result);
      
      // Modal'ları güncelle
      setShowModal(false);
      setShowSummaryModal(true);
      setCurrentStep(2);

      // Başarı mesajı göster
      toast.success('Taşıma detayları başarıyla kaydedildi');
      
      // Veritabanında currentStep değerini güncelle
      if (result.request && result.request.id) {
        await updateRequestStep(result.request.id, 2);
      }
      
      return true;
    } catch (error) {
      console.error('Talep kaydedilirken hata detayı:', error);
      toast.error('Talep kaydedilirken bir hata oluştu. Lütfen tüm alanları kontrol edip tekrar deneyin.');
      return false;
    }
  };

  const handleBackToStep1 = () => {
    setServiceModalStep(1);
  };

  // Google Maps yükleme işlemi
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });

  useEffect(() => {
    if (loadError) {
      console.error("Google Maps yükleme hatası:", loadError);
      setMapError(loadError.message);
    }
  }, [loadError]);

  const containerStyle = {
    width: '100%',
    height: isMobile ? '250px' : '400px'
  }

  const center = {
    lat: 41.0082,
    lng: 28.9784
  }

  // Türkiye sınırları
  const turkeyBounds = {
    north: 42.1000,
    south: 35.8000,
    east: 44.8000,
    west: 26.0000
  }

  // Marker seçimlerini localStorage'dan yükle
  useEffect(() => {
    const savedPickupMarker = localStorage.getItem('pickupMarker');
    const savedDeliveryMarker = localStorage.getItem('deliveryMarker');
    const savedPickupAddress = localStorage.getItem('pickupAddress');
    const savedDeliveryAddress = localStorage.getItem('deliveryAddress');

    if (savedPickupMarker) setPickupMarker(JSON.parse(savedPickupMarker));
    if (savedDeliveryMarker) setDeliveryMarker(JSON.parse(savedDeliveryMarker));
    if (savedPickupAddress) setPickupAddress(savedPickupAddress);
    if (savedDeliveryAddress) setDeliveryAddress(savedDeliveryAddress);
  }, []);

  // Marker seçimlerini localStorage'a kaydet
  useEffect(() => {
    if (pickupMarker) localStorage.setItem('pickupMarker', JSON.stringify(pickupMarker));
    if (deliveryMarker) localStorage.setItem('deliveryMarker', JSON.stringify(deliveryMarker));
    if (pickupAddress) localStorage.setItem('pickupAddress', pickupAddress);
    if (deliveryAddress) localStorage.setItem('deliveryAddress', deliveryAddress);
  }, [pickupMarker, deliveryMarker, pickupAddress, deliveryAddress]);

  // Harita yüklendiğinde
  const onLoad = useCallback((map) => {
    mapRef.current = map;
    const directionsRenderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#FF6B00',
        strokeWeight: 5
      }
    });
    directionsRenderer.setMap(map);
    setDirectionsRenderer(directionsRenderer);

    // Sadece iki input da boşsa userLocation'a ortala
    if (!pickupAddress && !deliveryAddress && userLocation) {
      map.setCenter(userLocation);
      map.setZoom(12);
    }
    // Sadece iki marker ve iki adres seçildiğinde fitMapToMarkers fonksiyonu ile harita hareket edecek
  }, [userLocation]);

  const onUnmount = useCallback(() => {
    if (mapRef.current) {
      mapRef.current = null;
    }
  }, []);

  const onPickupLoad = (autocomplete) => {
    setPickupAutocomplete(autocomplete);
  }

  const onDeliveryLoad = (autocomplete) => {
    setDeliveryAutocomplete(autocomplete);
  }

  const fitMapToMarkers = () => {
    if (
      mapRef.current &&
      pickupMarker && deliveryMarker &&
      pickupAddress && deliveryAddress &&
      bothMarkersSelected
    ) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(pickupMarker);
      bounds.extend(deliveryMarker);
      mapRef.current.fitBounds(bounds);
    }
  };

  const onPickupPlaceChanged = () => {
    if (pickupAutocomplete) {
      const place = pickupAutocomplete.getPlace();
      if (place.geometry) {
        const location = place.geometry.location;
        const coords = {
          lat: location.lat(),
          lng: location.lng()
        };
        setPickupMarker(coords);
        setPickupCoords(coords);
        setPickupAddress(place.formatted_address);

        if (deliveryMarker && pickupAddress && deliveryAddress) {
          setBothMarkersSelected(true);
          updateRoute();
          fitMapToMarkers();
        }
      }
    }
  };

  const onDeliveryPlaceChanged = () => {
    if (deliveryAutocomplete) {
      const place = deliveryAutocomplete.getPlace();
      if (place.geometry) {
        const location = place.geometry.location;
        const coords = {
          lat: location.lat(),
          lng: location.lng()
        };
        setDeliveryMarker(coords);
        setDeliveryCoords(coords);
        setDeliveryAddress(place.formatted_address);

        if (pickupMarker && pickupAddress && deliveryAddress) {
          setBothMarkersSelected(true);
          updateRoute();
          fitMapToMarkers();
        }
      }
    }
  };

  useEffect(() => {
    if (map) {
      const renderer = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
                polylineOptions: {
          strokeColor: "#f97316",
          strokeWeight: 5,
        },
      });
      setDirectionsRenderer(renderer);
    }
  }, [map]);

  const updateRoute = async () => {
    if (!directionsRenderer || !window.google?.maps) return;
    if (!pickupMarker || !deliveryMarker) {
      directionsRenderer.setDirections({ routes: [] });
      setRouteInfo(null);
      return;
    }

    try {
      const directionsService = new window.google.maps.DirectionsService();
      const origin = new window.google.maps.LatLng(pickupMarker.lat, pickupMarker.lng);
      const destination = new window.google.maps.LatLng(deliveryMarker.lat, deliveryMarker.lng);

      const result = await directionsService.route({
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      directionsRenderer.setDirections(result);
      directionsRenderer.setOptions({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#FF6B00',
          strokeWeight: 5
        }
      });

      const route = result.routes[0].legs[0];
      const calculatedKm = route.distance.value / 1000;
      setDistance(calculatedKm);
      setRouteInfo({
        distance: route.distance.text,
        duration: route.duration.text
      });
    } catch (error) {
      console.error('Rota hesaplanırken hata:', error);
      directionsRenderer.setDirections({ routes: [] });
      setRouteInfo(null);
    }
  };

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  const updateRouteInfo = async (origin, destination) => {
    if (!origin || !destination) return;

    const directionsService = new window.google.maps.DirectionsService();
    
    try {
      const result = await directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      const route = result.routes[0].legs[0];
      setRouteInfo({
        distance: route.distance.text,
        duration: route.duration.text
      });
    } catch (error) {
      console.error("Rota hesaplanırken hata oluştu:", error);
      setRouteInfo(null);
    }
  };

  const handlePickupInputChange = (e) => {
    const value = e.target.value;
    setPickupAddress(value);
    
    // Input değeri değiştiğinde Places API'sini kullan
    if (value && value.length > 3 && pickupAutocomplete) {
      // Autocomplete'in önerilerini göster
      pickupAutocomplete.set('input', value);
    }
  };

  const handleDeliveryInputChange = (e) => {
    const value = e.target.value;
    setDeliveryAddress(value);
    
    // Input değeri değiştiğinde Places API'sini kullan
    if (value && value.length > 3 && deliveryAutocomplete) {
      // Autocomplete'in önerilerini göster
      deliveryAutocomplete.set('input', value);
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
      setPickupCoords(coords);
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setPickupAddress(results[0].formatted_address);
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
      setDeliveryCoords(coords);
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setDeliveryAddress(results[0].formatted_address);
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
      updateRoute();
    }
  };

  const handlePickupFocus = () => {
    // Eğer teslimat noktası seçili değilse ve alım noktası seçiliyse
    if (pickupMarker && !deliveryMarker) {
      map?.panTo(pickupMarker)
      map?.setZoom(16)
    }
  }

  const handleDeliveryFocus = () => {
    // Eğer alım noktası seçili değilse ve teslimat noktası seçiliyse
    if (deliveryMarker && !pickupMarker) {
      map?.panTo(deliveryMarker)
      map?.setZoom(16)
    }
  }

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '')
    if (val.length <= 10) {
      setPhoneNumber(val)
      
      if (val.length > 0) {
        let formatted = val
        if (val.length > 3) {
          formatted = `${val.slice(0, 3)} ${val.slice(3)}`
        }
        if (val.length > 6) {
          formatted = `${formatted.slice(0, 7)} ${formatted.slice(7)}`
        }
        setFormattedPhoneNumber(formatted)
      } else {
        setFormattedPhoneNumber('')
      }
    }
  }

  const handlePhoneSubmit = () => {
    if (phoneNumber.length === 10) {
      setShowPhoneModal(false)
      setShowOTPModal(true)
    }
  }

  const handleOTPSubmit = () => {
    if (otpCode.length === 6) {
      setShowPhoneModal(false);
      setShowSearchingModal(true);
      setCurrentStep(4); // İletişim adımından sonra taşıyıcı adımı için 4
      
      // 3 saniye sonra taşıyıcı onay bekleme ekranına geç
      setTimeout(() => {
        setShowSearchingModal(false);
        setShowWaitingApprovalModal(true);
      }, 3000);
    }
  };

  const handleTransportTypeSelect = (service) => {
    setSelectedService(service);
    // Taşıma türü seçildiğinde API çağrısını yap
    let customerName =
      (profileData && (profileData.firstName || profileData.lastName))
        ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
        : (user?.name || session?.user?.name || 'Üye Olmayan Kullanıcı');
    let customerPhone =
      (profileData && profileData.phone)
        ? profileData.phone
        : (user?.phone || session?.user?.phone || '5551112233');
    
    console.log('Seçilen servis detayları:', service);

    fetch('/api/admin/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        customerPhone,
        pickupLocation: pickupAddress,
        deliveryLocation: deliveryAddress,
        distance,
        status: 'new', // 'Yeni' -> 'new' olarak değiştirildi (filtreleme için)
        transportType: service.name,
        transportTypeId: service._id?.toString() || '', // toString eklendi
        transportTypes: [service._id?.toString() || ''], // Filtreleme için gerekli dizi formatında
        vehicle: service.vehicleType || '',
        packageInfo: packageInfo || {}, // Alt başlık bilgileri eklendi
        notes: contentDetails?.notes || '', // Not alanı eklendi
        currentStep: 1 // Taşıma türü seçildiğinde step 1'dir
      })
    })
    .then(response => {
      console.log('API yanıt durumu:', response.status);
      return response.json(); 
    })
    .then(data => {
      console.log('Talep oluşturma yanıtı:', data);
      if (data.success) {
        setCurrentStep(1);
        
        // Talep ID'sini localStorage'a kaydet
        if (data.request && data.request.id) {
          console.log('Talep ID localStorage\'a kaydediliyor:', data.request.id);
          localStorage.setItem('currentRequestId', data.request.id);
        } else if (data.request && data.request._id) {
          // _id formatında geldiyse
          console.log('Talep _id localStorage\'a kaydediliyor:', data.request._id);
          localStorage.setItem('currentRequestId', data.request._id);
        } else {
          console.error('Talep ID bulunamadı:', data);
        }
      } else {
        console.error('Talep oluşturma başarısız:', data.message);
        toast.error(data.message || 'Talep kaydedilemedi!');
      }
    })
    .catch(err => {
      toast.error('Sunucuya bağlanırken hata oluştu!');
    });
  };

  const handleFindCarrier = () => {
    setShowSummaryModal(false);

    // Mevcut talepId'yi bul
    const requestId = localStorage.getItem('currentRequestId');

    // Kullanıcı giriş yapmış mı kontrol et
    if (isAuthenticated || session) {
      // Giriş yapmışsa doğrudan taşıyıcı arama sayfasına yönlendir
      setShowSearchingModal(true);
      setCurrentStep(3); // Giriş yapmış kullanıcılar için taşıyıcı adımı 3
      
      // Step güncellemesi yap
      if (requestId) {
        updateRequestStep(requestId, 3);
      }

      // 3 saniye sonra taşıyıcı onay modalını göster
      setTimeout(() => {
        setShowSearchingModal(false);
        setShowWaitingApprovalModal(true);
      }, 3000);
    } else {
      // Giriş yapmamışsa iletişim bilgilerini iste
      setShowPhoneModal(true);
      setCurrentStep(3);
      
      // Step güncellemesi yap
      if (requestId) {
        updateRequestStep(requestId, 3);
      }
    }
  };

  const handleBackToSummary = () => {
    setShowPhoneModal(false);
    setShowOTPModal(false);
    setOtpSent(false);
    setOtpCode('');
    setCurrentStep(1);
    setShowSummaryModal(true);
  };

  const handleBackToTransportType = () => {
    setShowSummaryModal(false);
    setCurrentStep(0);
    setShowModal(true);
  };


  const handleTestSearch = () => {
    setCurrentStep(4);
    setShowPhoneModal(false);
    setShowSearchingModal(true);

    setTimeout(() => {
      setShowSearchingModal(false);
      setShowWaitingApprovalModal(true);
    }, 3000);
  };

  const handlePayment = () => {
    setShowCarrierDetailsModal(false);
    setShowPaymentModal(true);
    
    // Mevcut talepId'yi bul
    const requestId = localStorage.getItem('currentRequestId');
    
    // Giriş durumuna göre doğru adım değerini ayarla
    if (isAuthenticated || session) {
      setCurrentStep(4); // Giriş yapmış kullanıcılar için ödeme adımı 4
      // Step güncellemesi yap
      if (requestId) {
        updateRequestStep(requestId, 4);
      }
    } else {
      setCurrentStep(5); // Giriş yapmamış kullanıcılar için ödeme adımı 5
      // Step güncellemesi yap
      if (requestId) {
        updateRequestStep(requestId, 5);
      }
    }
    
    logActivity('odeme_baslatildi');
  };

  const handlePaymentComplete = () => {
    setModalStep(7);
    
    // Mevcut talepId'yi bul
    const requestId = localStorage.getItem('currentRequestId');
    
    // Step güncellemesi yap (ödeme tamamlandı adımı)
    if (requestId) {
      updateRequestStep(requestId, 5);
    }
    
    logActivity('odeme_tamamlandi');
  };

  // Modal açılışlarında currentStep'i sıfırla
  useEffect(() => {
    if (showModal) {
      setCurrentStep(0);
    }
  }, [showModal]);

  // ESC tuşu için event listener
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showModal, showSummaryModal, showPhoneModal, showSearchingModal, showWaitingApprovalModal, showCarrierDetailsModal, showPaymentModal, showPaymentSuccessModal]);

  // Modal kapatma fonksiyonu
  const handleCloseModal = () => {
    if (showPaymentSuccessModal) {
      setShowPaymentSuccessModal(false);
      setCurrentStep(5);
    } else if (showPaymentModal) {
      setShowPaymentModal(false);
      setCurrentStep(4);
    } else if (showCarrierDetailsModal) {
      setShowCarrierDetailsModal(false);
      setCurrentStep(4);
    } else if (showWaitingApprovalModal) {
      setShowWaitingApprovalModal(false);
      setCurrentStep(4);
    } else if (showSearchingModal) {
      setShowSearchingModal(false);
      setCurrentStep(4);
    } else if (showPhoneModal) {
      setShowPhoneModal(false);
      setCurrentStep(3);
    } else if (showOTPModal) {
      setShowOTPModal(false);
      setCurrentStep(3);
    } else if (showTransportSummaryModal) {
      setShowTransportSummaryModal(false);
      setCurrentStep(2);
    } else if (showSummaryModal) {
      setShowSummaryModal(false);
      setCurrentStep(1);
    } else if (showModal) {
      setShowModal(false);
      setCurrentStep(0);
    }
  };

  // Devam Et butonuna tıklandığında
  const handleContinue = async () => {
    if (pickupAddress && deliveryAddress) {
      if (currentStep === 0) {
        // Profilden al, yoksa yedek kullan
        let customerName =
          (profileData && (profileData.firstName || profileData.lastName))
            ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
            : (user?.name || session?.user?.name || 'Test Kullanıcı');
        let customerPhone =
          (profileData && profileData.phone)
            ? profileData.phone
            : (user?.phone || session?.user?.phone || '5551112233');

        setShowModal(true);
        setCurrentStep(0);
      }
      // Diğer adımlar için mevcut davranış
      switch (currentStep) {
        case 1:
          setShowSummaryModal(true);
          break;
        case 2:
          // Giriş yapılmışsa iletişim bilgileri modalını atla
          if (isAuthenticated || session) {
            // Eğer giriş yapılmışsa, iletişim modalını atlayıp doğrudan taşıyıcı arama aşamasına git
            setShowSearchingModal(true);
            setCurrentStep(3); // Giriş yapmış kullanıcılar için taşıyıcı adımı 3
            
            // 3 saniye sonra taşıyıcı onay bekleme ekranına geç
            setTimeout(() => {
              setShowSearchingModal(false);
              setShowWaitingApprovalModal(true);
            }, 3000);
          } else {
            // Giriş yapılmamışsa iletişim bilgileri modalını göster
          setShowPhoneModal(true);
            setCurrentStep(3);
          }
          break;
        case 3:
          if (isAuthenticated || session) {
            // Giriş yapmış kullanıcı için taşıyıcı detayları modalını göster
          setShowCarrierDetailsModal(true);
            // Giriş yapmış kullanıcılar için adım numarası 3'te kalmalı
          } else {
            // Giriş yapmamış kullanıcı için taşıyıcı detayları modalını göster
            setShowCarrierDetailsModal(true);
            setCurrentStep(4); // Giriş yapmamış kullanıcılar için taşıyıcı adımı 4
          }
          break;
        case 4:
          if (isAuthenticated || session) {
            // Giriş yapmış kullanıcı için ödeme modalını göster
          setShowPaymentModal(true);
            setCurrentStep(4); // Giriş yapmış kullanıcılar için ödeme adımı 4
          } else {
            // Giriş yapmamış kullanıcı için ödeme modalını göster
            setShowPaymentModal(true);
            setCurrentStep(5); // Giriş yapmamış kullanıcılar için ödeme adımı 5
          }
          break;
        default:
          setShowModal(true);
          setCurrentStep(0);
      }
    } else {
      alert("Lütfen önce alış ve teslimat adreslerini seçiniz.");
    }
  };

  // Mevcut onClick fonksiyonlarını güncelle
  const closeButtons = {
    showModal: () => setShowModal(false),
    showSummaryModal: () => setShowSummaryModal(false),
    showPhoneModal: () => setShowPhoneModal(false),
    showSearchingModal: () => setShowSearchingModal(false),
    showWaitingApprovalModal: () => setShowWaitingApprovalModal(false),
    showCarrierDetailsModal: () => setShowCarrierDetailsModal(false),
    showPaymentModal: () => setShowPaymentModal(false),
    showPaymentSuccessModal: () => setShowPaymentSuccessModal(false)
  };

  const handleBackToPhone = () => {
    setShowOTPModal(false);
    setShowPhoneModal(true);
  };

  const handleBackToCarrierSearch = () => {
    setShowCarrierDetailsModal(false);
    setShowSearchingModal(true);
    setCurrentStep(4);
  };

  const handleBackToCarrierDetails = () => {
    setShowWaitingApprovalModal(false);
    setShowCarrierDetailsModal(true);
    setCurrentStep(4);
  };

  const handleServicesClick = (e) => {
    e.preventDefault();
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
    logActivity('hizmet_secildi', { hizmetId: e.currentTarget.dataset.id });
  };

  // Geri butonları için yeni fonksiyonlar
  const handleBackToPreviousStep = () => {
    // Giriş yapmış kullanıcılar ve yapmamış kullanıcılar için adım kontrolü
    const isLoggedIn = isAuthenticated || session;
    
    if (currentStep === 3) {
      if (isLoggedIn) {
        // Giriş yapmış kullanıcı için taşıyıcı adımından taşıma özeti adımına dön
        setShowSearchingModal(false);
        setShowWaitingApprovalModal(false);
        setShowTransportSummaryModal(true);
        setCurrentStep(2);
      } else {
      // İletişim Bilgileri adımından Taşıma Özeti adımına dön
      setShowPhoneModal(false);
      setShowOTPModal(false);
      setShowTransportSummaryModal(true);
      setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      // Taşıma Özeti adımından Taşıma Detayları adımına dön
      setShowTransportSummaryModal(false);
      setShowSummaryModal(true);
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // Taşıma Detayları adımından Taşıma Türü Seçimi adımına dön
      setShowSummaryModal(false);
      setShowModal(true);
      setCurrentStep(0);
    } else if (currentStep === 4) {
      if (isLoggedIn) {
        // Giriş yapmış kullanıcı için ödeme adımından taşıyıcı adımına dön
        setShowPaymentModal(false);
        setShowWaitingApprovalModal(true);
        setCurrentStep(3);
      } else {
        // Giriş yapmamış kullanıcı için taşıyıcı adımından iletişim adımına dön
        setShowSearchingModal(false);
        setShowWaitingApprovalModal(false);
        setShowPhoneModal(true);
        setCurrentStep(3);
      }
    } else if (currentStep === 5 && !isLoggedIn) {
      // Giriş yapmamış kullanıcı için ödeme adımından taşıyıcı adımına dön
      setShowPaymentModal(false);
      setShowWaitingApprovalModal(true);
      setCurrentStep(4);
    }
  };

  const handleBackToWaitingApproval = () => {
    setShowPaymentModal(false);
    setShowWaitingApprovalModal(true);
    setCurrentStep(4);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Modal içeriğini currentStep'e göre göster
  const renderModalContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
              Alış ve teslimat noktalarını harita üzerinde belirleyin.
            </p>
            <div className="mb-6 space-y-4">
              {isLoaded ? (
                <div className={`relative ${isMobile ? "-mx-4 w-screen" : ""}`}>
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={12}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onClick={handleMapClick}
                    options={{
                      zoomControl: true,
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: true,
                      // Places aktif ama etkileşim engellendi
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
                  >
                    {isLoaded && window.google && window.google.maps && pickupMarker && (
                      <Marker 
                        position={pickupMarker}
                        icon={{
                          url: '/marker_red.png',
                          scaledSize: new window.google.maps.Size(32, 32),
                          origin: new window.google.maps.Point(0, 0),
                          anchor: new window.google.maps.Point(16, 32)
                        }}
                        title="Alış Noktası"
                      />
                    )}
                    {isLoaded && window.google && window.google.maps && deliveryMarker && (
                      <Marker 
                        position={deliveryMarker}
                        icon={{
                          url: '/marker_green.png',
                          scaledSize: new window.google.maps.Size(32, 32),
                          origin: new window.google.maps.Point(0, 0),
                          anchor: new window.google.maps.Point(16, 32)
                        }}
                        title="Teslimat Noktası"
                      />
                    )}
                    {directions && (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          suppressMarkers: true,
                          polylineOptions: {
                            strokeColor: '#FF6B00',
                            strokeWeight: 5
                          }
                        }}
                      />
                    )}
                  </GoogleMap>
                </div>
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="flex flex-col items-center text-gray-500">
                    <FaSpinner className="animate-spin text-3xl mb-2" />
                    <p>Harita yükleniyor...</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alınacak Adres
                  </label>
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={onPickupLoad}
                      onPlaceChanged={onPickupPlaceChanged}
                      options={{
                        componentRestrictions: { country: "tr" },
                        types: ["address", "establishment", "geocode"],
                        fields: ["formatted_address", "geometry", "name", "place_id"],
                        bounds: {
                          north: 42.1000, // Türkiye'nin kuzey sınırı
                          south: 35.8000, // Türkiye'nin güney sınırı
                          east: 44.8000,  // Türkiye'nin doğu sınırı
                          west: 26.0000   // Türkiye'nin batı sınırı
                        },
                        strictBounds: true
                      }}
                    >
                        <div>
                      <input 
                        type="text" 
                        value={pickupAddress}
                        onChange={handlePickupInputChange}
                        onFocus={handlePickupFocus}
                            placeholder="Alış noktası"
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                        </div>
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      placeholder="Harita yükleniyor..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      disabled
                    />
                  )}
                  <button 
                    onClick={handlePickupSelectClick}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isSelectingPickup ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"} text-white px-3 py-1 rounded-md transition-colors`}
                  >
                      {isMobile && isSelectingPickup ? "Onayla" : (isSelectingPickup ? "Seçim Yapılıyor" : "Haritadan Seç")}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teslimat Noktası
                  </label>
                  {isLoaded ? (
                    <Autocomplete
                      onLoad={onDeliveryLoad}
                      onPlaceChanged={onDeliveryPlaceChanged}
                      options={{
                        componentRestrictions: { country: "tr" },
                        types: ["establishment", "geocode"],
                        fields: ["formatted_address", "geometry", "name", "place_id"]
                      }}
                    >
                      <div>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={handleDeliveryInputChange}
                        onFocus={handleDeliveryFocus}
                            placeholder="Teslimat noktası"
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                        </div>
                    </Autocomplete>
                  ) : (
                    <input
                      type="text"
                      placeholder="Harita yükleniyor..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      disabled
                    />
                  )}
                  <button 
                      onClick={handleDeliverySelectClick}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isSelectingDelivery ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"} text-white px-3 py-1 rounded-md transition-colors`}
                  >
                      {isMobile && isSelectingDelivery ? "Onayla" : (isSelectingDelivery ? "Seçim Yapılıyor" : "Haritadan Seç")}
                  </button>
                </div>
              </div>
              
              {distance && duration && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Rota Bilgileri</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-600">Mesafe</p>
                      <p className="font-medium text-blue-900">{distance}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Tahmini Süre</p>
                      <p className="font-medium text-blue-900">{duration}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700">Taşıma Türü</h3>
              <p className="text-gray-600">{selectedTransportType}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Alış Noktası</h3>
              <p className="text-gray-600">{pickupLocation}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Teslim Noktası</h3>
              <p className="text-gray-600">{deliveryLocation}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Tarih ve Saat</h3>
              <p className="text-gray-600">{selectedDate} {selectedTime}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Paket Bilgileri</h3>
              <p className="text-gray-600">{packageDetails}</p>
            </div>
          </div>
        )
      default:
        return null;
    }
  }

  // Hizmetleri yükle
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const response = await fetch('/api/admin/services');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setServices(data);
      } else {
        console.error('API yanıtında hizmet verisi bulunmuyor', data);
        setServices([]);
      }
    } catch (error) {
      console.error('Hizmetler yüklenirken hata:', error);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  // Aktivite loglama fonksiyonu
  const logActivity = async (action, details = {}) => {
    try {
      await fetch('/api/logs/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          details,
          page: 'anasayfa'
        })
      });
    } catch (error) {
      console.error('Aktivite loglama hatası:', error);
    }
  };

  // Sayfa yüklendiğinde
  useEffect(() => {
    logActivity('sayfa_goruntulendi');
  }, []);

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
            setPickupAddress(results[0].formatted_address);
          }
        });
        
        // Mobil cihazda ise, geçici markeri temizle
        if (isMobile) {
          setShowTempMarker(false);
          setTempMarkerPosition(null);
          setTempMarkerType('');
        } else {
          // Mobil değilse cursor'u normale döndür
          if (mapRef.current) {
            mapRef.current.setOptions({
              draggableCursor: null
            });
          }
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
        const center = mapRef.current.getCenter();
        const centerPos = {
          lat: center.lat(),
          lng: center.lng()
        };
        
        if (isMobile) {
          // Mobil cihazda geçici marker ayarla
          setTempMarkerPosition(centerPos);
          setShowTempMarker(true);
          setTempMarkerType('pickup');
        } else {
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
            setDeliveryAddress(results[0].formatted_address);
          }
        });
        
        // Mobil cihazda ise, geçici markeri temizle
        if (isMobile) {
          setShowTempMarker(false);
          setTempMarkerPosition(null);
          setTempMarkerType('');
        } else {
          // Mobil değilse cursor'u normale döndür
          if (mapRef.current) {
            mapRef.current.setOptions({
              draggableCursor: null
            });
          }
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
        const center = mapRef.current.getCenter();
        const centerPos = {
          lat: center.lat(),
          lng: center.lng()
        };
        
        if (isMobile) {
          // Mobil cihazda geçici marker ayarla
          setTempMarkerPosition(centerPos);
          setShowTempMarker(true);
          setTempMarkerType('delivery');
        } else {
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

  const handlePlaceSelect = (place) => {
    if (place.geometry) {
      setPickupAddress(place.formatted_address);
      setPickupMarker({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      setShowPickupSearch(false);
      updateRouteInfo(place.formatted_address, deliveryAddress);
    } else if (place.geometry) {
      setDeliveryAddress(place.formatted_address);
      setDeliveryMarker({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
      setShowDeliverySearch(false);
      updateRouteInfo(pickupAddress, place.formatted_address);
    }
  };

  const handleSearch = () => {
    if (searchBoxRef.current) {
      searchBoxRef.current.panTo({
        lat: searchBoxRef.current.getCenter().lat(),
        lng: searchBoxRef.current.getCenter().lng()
      });
      searchBoxRef.current.setZoom(15);
    }
  };

  useEffect(() => {
    if (pickupAddress && deliveryAddress && window.google && window.google.maps) {
      // Adresler değiştiğinde
      const geocoder = new window.google.maps.Geocoder();
      
      // Alınacak adres için koordinatları al
      geocoder.geocode({ address: pickupAddress }, (results, status) => {
        if (status === "OK" && results[0]) {
          const pickupCoords = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          };
          
          // Teslim adresi için koordinatları al
          geocoder.geocode({ address: deliveryAddress }, (results, status) => {
            if (status === "OK" && results[0]) {
              const deliveryCoords = {
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng()
              };
              
              // Her iki koordinat da hazır olduğunda rotayı güncelle
              updateRoute(pickupCoords, deliveryCoords);
            }
          });
        }
      });
    } else if (pickupCoords && deliveryCoords) {
      // Koordinatlar değiştiğinde direkt güncelle
      updateRoute(pickupCoords, deliveryCoords);
    }
  }, [pickupAddress, deliveryAddress, pickupCoords, deliveryCoords]);

  useEffect(() => {
    if (mapRef.current && window.google && window.google.maps) {
      if (pickupMarker || deliveryMarker) {
        const bounds = new window.google.maps.LatLngBounds();
        if (pickupMarker) bounds.extend(pickupMarker);
        if (deliveryMarker) bounds.extend(deliveryMarker);
        mapRef.current.fitBounds(bounds);
        mapRef.current.setZoom(mapRef.current.getZoom() - 1);
      }
    }
  }, [pickupMarker, deliveryMarker]);

  const handleCenterMap = () => {
    if (mapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Eğer marker'lar varsa, onları bounds'a ekle
      if (pickupMarker) {
        bounds.extend(pickupMarker);
      }
      if (deliveryMarker) {
        bounds.extend(deliveryMarker);
      }
      
      // Eğer en az bir marker varsa, haritayı o marker'lara göre ortala
      if (pickupMarker || deliveryMarker) {
        mapRef.current.fitBounds(bounds);
        // Bounds'a biraz padding ekle
        const padding = 50;
        mapRef.current.setZoom(mapRef.current.getZoom() - 1);
      } else {
        // Hiç marker yoksa varsayılan merkeze dön
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(11);
      }
    }
  };

  // Kullanıcının konumunu al
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Konum alınamadı:', error);
        }
      );
    }
  }, []);

  // Sayfa yüklendiğinde input değerlerini sıfırla
  useEffect(() => {
    setPickupAddress('');
    setDeliveryAddress('');
    setPickupMarker(null);
    setDeliveryMarker(null);
    setDirections(null);
  }, []);

  useEffect(() => {
    // Input'larda adres yoksa ve haritada marker yoksa rota çizgisini kaldır
    if (!pickupAddress && !deliveryAddress && !pickupMarker && !deliveryMarker) {
      setDirections(null);
    }
  }, [pickupAddress, deliveryAddress, pickupMarker, deliveryMarker]);

  useEffect(() => {
    // Sadece ilk yüklemede çalışsın
    const isFirstLoad = !localStorage.getItem('mapInitialized');
    
    if (isFirstLoad && mapRef.current && window.google && window.google.maps) {
      if (pickupMarker || deliveryMarker) {
        const bounds = new window.google.maps.LatLngBounds();
        if (pickupMarker) bounds.extend(pickupMarker);
        if (deliveryMarker) bounds.extend(deliveryMarker);
        mapRef.current.fitBounds(bounds);
        mapRef.current.setZoom(mapRef.current.getZoom() - 1);
      }
      localStorage.setItem('mapInitialized', 'true');
    }
  }, []); // Boş dependency array ile sadece bir kez çalışacak

  const [packageInfo, setPackageInfo] = useState({});
  const [packageImages, setPackageImages] = useState([]);

  const handlePackageInfoChange = (index, value) => {
    setPackageInfo(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handleRemoveImage = (index) => {
    setPackageImages(prev => prev.filter((_, i) => i !== index));
  };

  // Yeni state ekle
  const [showTransportSummaryModal, setShowTransportSummaryModal] = useState(false);

  {/* Taşıma Özeti Modal */}
  <Modal
    isOpen={showTransportSummaryModal}
    onRequestClose={() => setShowTransportSummaryModal(false)}
    className="modal-content"
    overlayClassName="modal-overlay"
  >
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <StepBar currentStep={currentStep} />
        <button onClick={() => setShowTransportSummaryModal(false)} className="text-gray-500 hover:text-gray-700">
          <FaTimes size={24} />
        </button>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Taşıma Özeti</h2>
      </div>

      <div className="space-y-6">
        {/* Adres Bilgileri */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Adres Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Alış Adresi</p>
              <p className="font-medium">{pickupAddress}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Teslimat Adresi</p>
              <p className="font-medium">{deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Seçilen Hizmet */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Seçilen Hizmet</h3>
          <div className="flex items-center space-x-4">
            {(() => {
              // Alt başlık seçilmiş mi kontrol et
              const selectedSubtitle = Object.entries(packageInfo).find(([key, value]) => value === 'true' && key.includes('_sub_'));
              if (selectedSubtitle) {
                const [titleId, subIndex] = selectedSubtitle[0].split('_sub_');
                const title = selectedService.packageTitles.find(t => t.id === titleId);
                const sub = title?.subtitle[parseInt(subIndex)];
                if (sub?.relatedServiceId) {
                  const relatedService = services.find(s => s._id === sub.relatedServiceId);
                  if (relatedService) {
                    return (
                      <>
                        {relatedService.icon && (
                          <img 
                            src={relatedService.icon} 
                            alt={relatedService.name} 
                            className="w-12 h-12 object-contain"
                          />
                        )}
                        <div>
                          <p className="font-medium text-lg">{relatedService.name}</p>
                          <p className="text-gray-600">{relatedService.description}</p>
                          {relatedService.price && (
                            <p className="text-orange-500 font-semibold mt-2">
                              {relatedService.price} TL&apos;den başlayan fiyatlarla
                            </p>
                          )}
                        </div>
                      </>
                    );
                  }
                }
              }
              // Eğer alt başlık seçilmemişse veya relatedServiceId yoksa, normal seçilen hizmeti göster
              return (
                <>
                  {selectedService?.icon && (
                    <img 
                      src={selectedService.icon} 
                      alt={selectedService.name} 
                      className="w-12 h-12 object-contain"
                    />
                  )}
                  <div>
                    <p className="font-medium text-lg">{selectedService?.name}</p>
                    <p className="text-gray-600">{selectedService?.description}</p>
                    {selectedService?.price && (
                      <p className="text-orange-500 font-semibold mt-2">
                        {selectedService.price} TL&apos;den başlayan fiyatlarla
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Taşıma Detayları */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Taşıma Detayları</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Mesafe</p>
              <p className="font-medium">{routeInfo?.distance || 'Hesaplanıyor...'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Tahmini Süre</p>
              <p className="font-medium">{routeInfo?.duration || 'Hesaplanıyor...'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Tarih</p>
              <p className="font-medium">{selectedDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Saat</p>
              <p className="font-medium">{selectedTime}</p>
            </div>
          </div>
        </div>

        {/* Paket Bilgileri */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Paket Bilgileri</h3>
          <div className="space-y-4">
            {selectedService?.packageTitles?.map((packageTitle) => (
              <div key={packageTitle.id}>
                <p className="text-base font-semibold text-gray-800 mb-2">{packageTitle.title}</p>
                
                {packageTitle.subtitle && packageTitle.subtitle.length > 0 && (
                  <div className="ml-4">
                    {packageTitle.subtitle.map((sub, subIndex) => {
                      const subtitleText = typeof sub === 'string' ? sub : sub.text;
                      const subId = `${packageTitle.id}_sub_${subIndex}`;
                      const isSelected = packageInfo[subId] === 'true';
                      const relatedService = sub.relatedServiceId ? services.find(s => s._id === sub.relatedServiceId) : null;
                      if (isSelected) {
                        return (
                          <div key={subIndex} className="flex flex-col py-1">
                            <div className="flex items-center">
                              <span className="text-green-500 mr-2">
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <p className="text-sm text-gray-700">{subtitleText}</p>
                            </div>
                            {relatedService && (
                              <p className="text-xs text-blue-600 mt-1 ml-7">*Paketiniz &quot;{relatedService.name}&quot; ile taşınacaktır</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            ))}
            
            {/* Yedek kod - Eski içerik türleri için */}
            {!selectedService?.packageTitles && selectedService?.package_info_titles?.map((title, index) => (
              title.trim() && packageInfo[index] && (
                <div key={index}>
                  <p className="text-sm text-gray-500 mb-1">{title}</p>
                  <p className="font-medium">{packageInfo[index]}</p>
                </div>
              )
            ))}
            {contentDetails.weight && (
              <div>
                <p className="font-medium">{contentDetails.weight} kg</p>
              </div>
            )}
            {contentDetails.volume && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Hacim</p>
                <p className="font-medium">{contentDetails.volume} m³</p>
              </div>
            )}
            {contentDetails.pieces && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Parça Sayısı</p>
                <p className="font-medium">{contentDetails.pieces} adet</p>
              </div>
            )}
            {contentDetails.description && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Açıklama</p>
                <p className="font-medium">{contentDetails.description}</p>
              </div>
            )}
            {contentDetails.specialNotes && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Özel Notlar</p>
                <p className="font-medium">{contentDetails.specialNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Fiyat Bilgisi */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Fiyat Bilgisi</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 text-right">Tahmini Fiyat</p>
              <p className="text-2xl font-bold text-orange-500">
                {selectedService?.price ? `${calculatedPrice} TL` : 'Hesaplanıyor...'}
              </p>
            </div>
            <div className="text-sm text-gray-500 text-right">
              * Fiyat, mesafe ve kampanyalara göre otomatik hesaplanır
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => {
            setShowTransportSummaryModal(false);
            setShowSummaryModal(true);
            setCurrentStep(1);
          }}
          className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
        >
          <FaEdit className="mr-2" />
          Düzenle
        </button>
        <button
          onClick={() => {
            setShowTransportSummaryModal(false);
            setShowPhoneModal(true);
            setCurrentStep(3);
          }}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Devam Et
        </button>
      </div>
    </div>
  </Modal>

  const handlePriceCalculate = () => {
    const now = new Date();
    const hour = now.getHours();
    const isNight = hour >= 20 || hour < 8;

    const options = {
      isUrgent: false,
      isNight: isNight
    };

    const pricingData = {
      basePrice: Number(selectedService?.basePrice || 0),
      baseKm: Number(selectedService?.baseKm || 0),
      pricePerKm: Number(selectedService?.pricePerKm || 0),
      urgentFee: Number(selectedService?.urgentFee || 0),
      nightFee: Number(selectedService?.nightFee || 0)
    };

    const base = calculateBasePrice(distance, options, pricingData);
    setBasePrice(base);
    
    
    // Aktif kampanya varsa uygula, yoksa base fiyatı kullan
    if (activeCampaign) {
      let final = base;
      if (activeCampaign.discountType === 'percentage') {
        final = base * (1 - activeCampaign.discountValue / 100);
      } else if (activeCampaign.discountType === 'fixed') {
        final = base - activeCampaign.discountValue;
      }
      setCalculatedPrice(final);
    } else {
      setCalculatedPrice(base);
    }
  };

  // Mesafe değiştiğinde fiyatı otomatik hesapla
  useEffect(() => {
    if (selectedService && distance > 0) {
      handlePriceCalculate();
    }
  }, [distance, selectedService, isUrgent, isNight]);

  // Varsayılan hizmet verisini API'den çek
  useEffect(() => {
    const fetchDefaultService = async () => {
      try {
        const res = await fetch('/api/services/default');
        if (res.ok) {
          const data = await res.json();
          setSelectedService(data);
        }
      } catch (error) {
        console.error('Varsayılan hizmet verisi çekilemedi:', error);
      }
    };
    fetchDefaultService();
  }, []);

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

      if (calculatedPrice < activeCampaign.minOrderAmount) {
        throw new Error(`Bu kampanyayı kullanmak için minimum ${activeCampaign.minOrderAmount} TL tutarında sipariş vermelisiniz`);
      }

      setCampaignError('');
      toast.success('Kampanya başarıyla uygulandı');
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
    setCalculatedPrice(basePrice);
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

  // Sadece sayfa yüklendiğinde kampanyaları getir
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Kampanya seçildiğinde
  const handleSelectCampaign = (id) => {
    const selected = availableCampaigns.find(c => c._id === id);
    setActiveCampaign(selected || null);
  };

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

  // Kampanya değiştiğinde fiyatı hesapla
  useEffect(() => {
    if (basePrice !== null && !isNaN(basePrice)) {
      if (activeCampaign && activeCampaign.isActive) {
        const campaignType = activeCampaign.discountType === 'percentage' ? 'percent' : activeCampaign.discountType;
        const discounted = applyCampaign(
          basePrice,
          {
            type: campaignType,
            discountValue: activeCampaign.discountValue,
            minAmount: activeCampaign.minOrderAmount || 0,
            isActive: true,
            code: activeCampaign.code || null
          },
          {
            code: activeCampaign.code || null
          }
        );
        setCalculatedPrice(discounted);
      } else {
        setCalculatedPrice(basePrice);
      }
    }
  }, [activeCampaign, basePrice]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Kullanıcı profilini çek
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get('/api/users/profile');
        if (response.data && (response.data.firstName || response.data.lastName || response.data.phone)) {
          setProfileData(response.data);
        }
      } catch (err) {
        setProfileData(null);
      }
    };
    fetchProfile();
  }, []);

  const handleContentDetailsChange = (field, value) => {
    setContentDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Taşıyıcılar Bulundu modali açıldığında otomatik olarak talep oluştur
  useEffect(() => {
    if (showWaitingApprovalModal) {
      // Yeni bir talep oluştur ve requests koleksiyonuna ekle
      console.log('Seçili servis bilgileri:', selectedService);
      
      const requestData = {
        customerName: user?.name || session?.user?.name || 'Üye Olmayan Kullanıcı',
        customerPhone: user?.phone || session?.user?.phone || '5551112233',
        pickupLocation: pickupAddress,
        deliveryLocation: deliveryAddress,
        pickupMarker: pickupMarker,
        deliveryMarker: deliveryMarker,
        distance: distance || 0,
        status: 'waiting-approve', // 'new' -> 'waiting-approve' olarak değiştirildi
        // Taşıma tipi bilgilerini doğru formatta ekle
        transportType: selectedService?.name || '',
        transportTypeId: selectedService?._id?.toString() || '',
        // Taşıyıcı filtreleme için gerekli ek alanlar
        transportTypes: [selectedService?._id?.toString() || ''], // Array formatında transportTypeId ekle
        vehicle: selectedService?.vehicleType || '',
        createdAt: new Date().toISOString(),
        price: calculatedPrice || basePrice || 0
      };
      
      console.log('Oluşturulacak talep verileri:', requestData);
      
      // API'ye gönder
      fetch('/api/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Talep başarıyla oluşturuldu, taşıyıcı portalında görüntülenebilir:', data);
        } else {
          console.error('Talep oluşturulamadı:', data.message);
        }
      })
      .catch(err => {
        console.error('API hatası:', err);
      });
      
      // 5 saniye sonra ödeme modalını göster
      const timer = setTimeout(() => {
        setShowWaitingApprovalModal(false);
        setShowPaymentModal(true);
        setCurrentStep(5);
        logActivity('odeme_baslatildi');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showWaitingApprovalModal]);
  
  // Taşıyıcı Onayladı fonksiyonu artık sadece modallar arasında geçiş yapıyor
  const handleTestApproval = () => {
    setShowWaitingApprovalModal(false);
    setShowPaymentModal(true);
    
    // Giriş durumuna göre doğru adım değerini ayarla
    if (isAuthenticated || session) {
      setCurrentStep(4); // Giriş yapmış kullanıcılar için ödeme adımı 4
    } else {
      setCurrentStep(5); // Giriş yapmamış kullanıcılar için ödeme adımı 5
    }
    
    logActivity('odeme_baslatildi');
  };

  // Tarih formatını düzenleyecek yardımcı fonksiyon
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
  };

  // Genel ayarları yükle
  useEffect(() => {
    const fetchGeneralSettings = async () => {
      try {
        const response = await fetch('/api/admin/general-settings');
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setGeneralSettings(result.data);
          }
        }
      } catch (error) {
        console.error('Genel ayarlar yüklenirken hata:', error);
      }
    };

    fetchGeneralSettings();
  }, []);

  // Mobil harita işaretleme için yeni state'ler ekleyelim:
  const [tempMarkerPosition, setTempMarkerPosition] = useState(null);
  const [showTempMarker, setShowTempMarker] = useState(false);
  const [tempMarkerType, setTempMarkerType] = useState(''); // 'pickup' veya 'delivery'

  // Tarih ve Saat Seçimi
  const [selectedTimeOption, setSelectedTimeOption] = useState('asap');

  // Step değişikliklerini veritabanına kaydetmek için yardımcı fonksiyon
  const updateRequestStep = async (requestId, step) => {
    if (!requestId) {
      console.error('updateRequestStep: Talep ID bulunamadı');
      return;
    }
    
    console.log(`Step güncellemesi başlatılıyor: ID=${requestId}, Step=${step}`);
    
    try {
      const response = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          currentStep: step
        }),
      });
      
      if (!response.ok) {
        console.error('Step güncellemesi başarısız oldu:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Hata detayı:', errorText);
        return false;
      }
      
      const data = await response.json();
      console.log('Step güncelleme sonucu:', data);
      
      if (data.success) {
        console.log(`Step başarıyla güncellendi: ${step}`);
      } else {
        console.error('Step güncelleme yanıtı başarısız:', data.message);
      }
      
      return data.success;
    } catch (error) {
      console.error('Step güncellemesi sırasında hata:', error);
      return false;
    }
  };

  // Kullanıcı giriş işlemi
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      setLoginError("Lütfen tüm alanları doldurun");
      return;
    }
    
    try {
      setIsLoggingIn(true);
      setLoginError('');
      
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: loginEmail,
          password: loginPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Giriş yapılırken bir hata oluştu");
      }
      
      // Başarılı giriş
      toast.success("Giriş başarılı!");
      
      // Kullanıcı bilgilerini güncelle
      // useAuth hook'u üzerinden user state'ini güncelle ya da sayfayı yenile
      
      // Modalı kapat ve kaldığı yerden devam et
      setShowLoginModal(false);
      
      // Sayfayı yenileyerek oturum bilgilerini güncelle
      window.location.reload();
      
    } catch (error) {
      setLoginError(error.message || "Giriş yapılırken bir hata oluştu");
      console.error("Giriş hatası:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  // Kullanıcı kayıt işlemi
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!registerName || !registerEmail || !registerPhone || !registerPassword) {
      setRegisterError("Lütfen tüm alanları doldurun");
      return;
    }
    
    try {
      setIsRegistering(true);
      setRegisterError('');
      
      const response = await fetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: registerName,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Kayıt olurken bir hata oluştu");
      }
      
      // Başarılı kayıt
      toast.success("Kayıt başarılı! Giriş yapabilirsiniz.");
      
      // Kayıt olur olmaz otomatik giriş yap
      const loginResponse = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: registerEmail,
          password: registerPassword
        }),
      });
      
      if (loginResponse.ok) {
        // Modalı kapat ve kaldığı yerden devam et
        setShowRegisterModal(false);
        
        // Sayfayı yenileyerek oturum bilgilerini güncelle
        window.location.reload();
      } else {
        // Kayıt başarılı ama giriş başarısızsa, giriş modalını aç
        setShowRegisterModal(false);
        setShowLoginModal(true);
      }
      
    } catch (error) {
      setRegisterError(error.message || "Kayıt olurken bir hata oluştu");
      console.error("Kayıt hatası:", error);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <main className={`min-h-screen bg-gray-100 flex flex-col ${showModal || showSummaryModal || showPhoneModal || showSearchingModal || showWaitingApprovalModal || showCarrierDetailsModal || showPaymentModal || showPaymentSuccessModal ? 'modal-blur' : ''}`}>
      <div className="flex-grow">
        {/* Navigation */}
        <nav className="bg-white shadow-md py-4 sticky top-0 z-[100] w-full">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="Taşı.app" className="h-10" />
            </Link>
            <div className="hidden md:flex space-x-6 items-center">
              <Link href="#" className="text-gray-600 hover:text-orange-600 transition">Anasayfa</Link>
              <Link 
                href="#services" 
                onClick={handleServicesClick}
                className="text-gray-600 hover:text-orange-600 transition group relative"
              >
                Hizmetlerimiz
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link href="#features" className="text-gray-600 hover:text-orange-600 transition group relative">
                Neden Biz?
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link href="/iletisim" className="text-gray-600 hover:text-orange-600 transition group relative">
                İletişim
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
              </Link>
              
              {isAuthenticated ? (
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
              {!isAuthenticated ? (
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
              <Link href="#" className="block px-3 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-orange-600">
                Anasayfa
              </Link>
              <Link 
                href="#services" 
                onClick={(e) => {
                  handleServicesClick(e);
                  setShowMobileMenu(false);
                }}
                className="block px-3 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-orange-600"
              >
                Hizmetlerimiz
              </Link>
              <Link 
                href="#features" 
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
        
        {/* Hero Section */}
        <div className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center py-8 md:py-12">
              <div className="md:w-1/2 mb-8 md:mb-0">
                {/* Mobilde önce başlık ve açıklama */}
                {/* Başlık ve açıklama */}
                <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Güvenli ve Hızlı Taşımacılık Hizmeti
                </h1>
                <p className="text-white text-lg mb-8">
                  Türkiye&apos;nin her yerine güvenli, hızlı ve ekonomik taşımacılık hizmeti. Tek tıkla taşıyıcı bulun, anlık takip edin.
                </p>
                
                {/* Mobilde görsel */}
                {/*<div className="md:hidden w-full flex justify-center mb-8">
                  <img 
                    src="/hero-truck.png" 
                    alt="Taşıma Hizmeti" 
                    className="max-w-full h-auto max-h-[200px] object-contain animate-float"
                    style={{
                      filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))'
                    }}
                  />
                </div>*/}
                <div className="flex justify-center md:justify-start">
                <button
                  onClick={() => {
                    const servicesSection = document.getElementById('services');
                    servicesSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-orange-500 text-white px-8 py-3 rounded-xl hover:bg-orange-600 transition-all transform hover:scale-105 flex items-center text-lg"
                >
                  Hizmetlerimiz
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              </div>
              
              {/* Masaüstünde görsel sağda gösterilir */}
              <div className="md:flex md:w-1/2 justify-center md:justify-end hidden">
                <img 
                  src="/hero-truck.png" 
                  alt="Taşıma Hizmeti" 
                  className="max-w-[90%] h-auto max-h-[300px] object-contain animate-float"
                  style={{
                    filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Map Section */}
        <div className={`container mx-auto ${isMobile ? 'px-0 overflow-hidden -mt-24' : 'px-4 -mt-16'} py-12 bg-white rounded-t-3xl shadow-lg`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${isMobile ? "order-2 -mt-40 px-4 z-10" : ""} md:col-span-1 space-y-4`}>
              {!isMobile && <h2 className="text-2xl font-bold mb-6">Rotanızı Belirleyin</h2>}
              
              <div>
                <label className="block text-gray-700 font-bold mb-2">Alınacak Adres</label>
                <div className="relative z-50">
                    {isLoaded ? (
                    <Autocomplete
                      onLoad={onPickupLoad}
                      onPlaceChanged={onPickupPlaceChanged}
                      options={{
                        componentRestrictions: { country: "tr" },
                        types: ["address", "establishment", "geocode"],
                        fields: ["formatted_address", "geometry", "name", "place_id"],
                        bounds: {
                          north: 42.1000, // Türkiye'nin kuzey sınırı
                          south: 35.8000, // Türkiye'nin güney sınırı
                          east: 44.8000,  // Türkiye'nin doğu sınırı
                          west: 26.0000   // Türkiye'nin batı sınırı
                        },
                        strictBounds: true
                      }}
                    >
                        <div>
                      <input 
                        type="text" 
                        value={pickupAddress}
                        onChange={handlePickupInputChange}
                        onFocus={handlePickupFocus}
                            placeholder="Alış noktası"
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                        </div>
                    </Autocomplete>
                    ) : (
                      <input
                        type="text"
                        placeholder="Harita yükleniyor..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        disabled
                      />
                  )}
                  <button 
                      onClick={handlePickupSelectClick}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isSelectingPickup ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"} text-white px-3 py-1 rounded-md transition-colors`}
                  >
                      {isMobile && isSelectingPickup ? "Onayla" : (isSelectingPickup ? "Seçim Yapılıyor" : "Haritadan Seç")}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 font-bold mb-2">Teslim Edilecek Adres</label>
                <div className="relative z-40">
                    {isLoaded ? (
                    <Autocomplete
                      onLoad={onDeliveryLoad}
                      onPlaceChanged={onDeliveryPlaceChanged}
                      options={{
                        componentRestrictions: { country: "tr" },
                        types: ["establishment", "geocode"],
                        fields: ["formatted_address", "geometry", "name", "place_id"]
                      }}
                    >
                        <div>
                      <input 
                        type="text" 
                        value={deliveryAddress}
                        onChange={handleDeliveryInputChange}
                        onFocus={handleDeliveryFocus}
                            placeholder="Teslimat noktası"
                            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                        </div>
                    </Autocomplete>
                    ) : (
                      <input
                        type="text"
                        placeholder="Harita yükleniyor..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        disabled
                      />
                  )}
                  <button 
                      onClick={handleDeliverySelectClick}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${isSelectingDelivery ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"} text-white px-3 py-1 rounded-md transition-colors`}
                  >
                      {isMobile && isSelectingDelivery ? "Onayla" : (isSelectingDelivery ? "Seçim Yapılıyor" : "Haritadan Seç")}
                  </button>
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Rota Bilgisi</h3>
                <div>
                    {(!pickupMarker || !deliveryMarker || !routeInfo) ? (
                    <p className="text-gray-500 text-sm mb-3">Önce adres seçimi yapınız.</p>
                  ) : (
                    <div className="flex space-x-6">
                      <div>
                        <span className="text-gray-600 block">Mesafe</span>
                          <span className="font-bold">{routeInfo.distance || '---'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block">Süre</span>
                          <span className="font-bold">{routeInfo.duration || '---'}</span>
                      </div>
                    </div>
                  )}
                  {routeInfo && (
                    <p className="text-xs text-gray-500 mt-2 italic">*Mesafe ve süre bilgileri tahminidir. Trafik durumuna bağlı olarak değişebilir.</p>
                  )}
                  <button
                    className={`w-full mt-3 px-4 py-2 rounded-lg transition ${
                        (!pickupAddress || !deliveryAddress) 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                    }`}
                    onClick={handleContinue}
                      disabled={!pickupAddress || !deliveryAddress}
                  >
                    Devam Et
                  </button>
                </div>
              </div>
            </div>
            
            <div className={`${isMobile ? "order-1 mb-4 mx-[-1rem] w-[calc(100%+2rem)] relative -mt-2" : ""} md:col-span-2 h-[400px] md:h-[400px] relative`}>
              {isMobile && (
                <h2 className="text-2xl font-bold -mt-4 mb-2 text-left px-8 w-full">Rotanızı Belirleyin</h2>
              )}
              {mapError && (
                <div className="h-[250px] md:h-[400px] w-full relative bg-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-600">
                    <FaInfoCircle className="mx-auto mb-2 text-3xl text-red-500" />
                    <p>Harita yüklenirken bir sorun oluştu.</p>
                    <p className="text-xs mt-2">Hata: {mapError}</p>
                  </div>
                </div>
              )}
              {!mapError && isLoaded && (
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={center}
                    zoom={11}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                    onClick={handleMapClick}
                    options={{
                      zoomControl: !isMobile,
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: !isMobile,
                      // Places aktif ama etkileşim engellendi
                      clickableIcons: false, // POI'lerin tıklanabilir olmasını engeller
                      disableDefaultUI: isMobile, // Mobilde tüm UI'ı gizle
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
                  >
                    {isLoaded && window.google && window.google.maps && pickupMarker && (
                      <Marker 
                        position={pickupMarker} 
                        icon={{
                          url: '/marker_red.png',
                          scaledSize: new window.google.maps.Size(32, 32),
                          origin: new window.google.maps.Point(0, 0),
                          anchor: new window.google.maps.Point(16, 32)
                        }}
                        title="Alış Noktası"
                      />
                    )}
                    {isLoaded && window.google && window.google.maps && deliveryMarker && (
                      <Marker 
                        position={deliveryMarker}
                        icon={{
                          url: '/marker_green.png',
                          scaledSize: new window.google.maps.Size(32, 32),
                          origin: new window.google.maps.Point(0, 0),
                          anchor: new window.google.maps.Point(16, 32)
                        }}
                        title="Teslimat Noktası"
                      />
                    )}
                    {directions && (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          suppressMarkers: true,
                          polylineOptions: {
                            strokeColor: '#FF6B00',
                            strokeWeight: 5
                          }
                        }}
                      />
                  )}

                    {/* Mobil seçim için geçici marker */}
                    {isLoaded && window.google && window.google.maps && showTempMarker && tempMarkerPosition && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                        <img 
                          src={tempMarkerType === 'pickup' ? '/marker_red.png' : '/marker_green.png'} 
                          className="w-8 h-8 animate-bounce" 
                          style={{transform: 'translateY(-16px)', opacity: 0.9}}
                          alt={tempMarkerType === 'pickup' ? "Alış Noktası" : "Teslimat Noktası"}
                        />
                      </div>
                  )}
                </GoogleMap>
              )}

                {/* Harita kontrol butonları */}
                {!mapError && isLoaded && (
                  <div className="absolute top-20 right-4 z-50 flex flex-col gap-2">
                    {/* Mevcut konum butonu - sadece haritadan seçim yapılırken göster */}
                    {(isSelectingPickup || isSelectingDelivery) && (
                      <button
                        className="bg-white p-3 rounded-full shadow hover:shadow-lg"
                        onClick={() => {
                          // Kullanıcının mevcut konumunu al
                          if (navigator.geolocation && mapRef.current) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                const currentLocation = {
                                  lat: position.coords.latitude,
                                  lng: position.coords.longitude
                                };
                                // Haritayı mevcut konuma merkez
                                mapRef.current.panTo(currentLocation);
                                mapRef.current.setZoom(15);
                              },
                              (error) => {
                                console.error('Konum alınamadı:', error);
                                alert('Konum izni vermediğiniz için işlem gerçekleştirilemiyor. Lütfen konum izni verin.');
                              }
                            );
                          }
                        }}
                      >
                        <FaLocationArrow className="text-orange-500 text-xl" />
                      </button>
                    )}
                    
                    {/* Rota merkezleme butonu - sadece her iki adres girildiğinde göster */}
                    {pickupMarker && deliveryMarker && (
                      <button
                        className="bg-white p-3 rounded-full shadow hover:shadow-lg"
                        onClick={() => {
                          if (!mapRef.current || !window.google?.maps) return;

                          const map = mapRef.current;

                          if (pickupMarker && deliveryMarker) {
                            const bounds = new window.google.maps.LatLngBounds();
                            bounds.extend(pickupMarker);
                            bounds.extend(deliveryMarker);
                            map.fitBounds(bounds);
                          } else if (pickupMarker) {
                            map.setCenter(pickupMarker);
                            map.setZoom(14);
                          } else if (deliveryMarker) {
                            map.setCenter(deliveryMarker);
                            map.setZoom(14);
                          }
                        }}
                      >
                        <FaRoute className="text-orange-500" />
                      </button>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div id="services" className="container mx-auto px-4 py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Hizmetlerimiz</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            İhtiyacınıza en uygun taşıma hizmetini seçin, size en yakın taşıyıcıyı anında bulalım.
          </p>
          
          {loadingServices ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {services.map((service) => (
                <div 
                  key={service._id}
                className={`bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ${
                    service.isActive ? 'hover:shadow-2xl hover:-translate-y-1 cursor-pointer' : 'opacity-75 cursor-not-allowed'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                    if (service.isActive) {
                      const targetUrl = service.redirectUrl || `/services/${service._id}`;
                      router.push(targetUrl);
                    }
                  }}
                >
                  <div className={`${service.isActive ? 'bg-orange-500' : 'bg-gray-400'} py-2 md:py-4 relative`}>
                    <div className="flex items-center justify-center">
                      {service.icon && (
                        <img 
                          src={service.icon} 
                          alt={service.name} 
                          className="w-12 h-12 md:w-16 md:h-16 object-contain"
                        />
                      )}
                    </div>
                    {!service.isActive && (
                      <div className="absolute top-1 right-1 md:top-2 md:right-2 bg-white/20 text-white text-[10px] md:text-xs font-medium px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full">
                      Yakında
                      </div>
                  )}
                </div>
                <div className="p-4 md:p-6">
                    <h3 className="text-lg md:text-2xl font-semibold text-gray-900 mb-1 md:mb-2 text-left">
                      {service.name}
                    </h3>
                    <p className="text-xs md:text-base text-gray-600 text-left line-clamp-3">
                    {service.description}
                  </p>
                    {service.price && service.isActive && (
                      <div className="mt-2 md:mt-4 text-left">
                        <span className="text-orange-600 font-semibold text-sm md:text-base">
                          {service.price} TL
                        </span>
                        <span className="text-gray-500 text-xs md:text-sm">&apos;den başlayan fiyatlarla</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Features Section */}
        <div id="features" className="container mx-auto px-4 py-10 md:py-16">
          <div className="w-full h-1 mb-12 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Neden Bizi Tercih Etmelisiniz?</h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            Taşı, yenilikçi yaklaşımı ve kullanıcı dostu arayüzü ile taşımacılık sektörüne yeni bir soluk getiriyor.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-2 md:mb-4">
                <FaClock className="text-xl md:text-2xl text-orange-500" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">7/24 Hizmet</h3>
              <p className="text-sm md:text-base text-gray-600">
                Günün her saati taşıma ihtiyaçlarınız için yanınızdayız. Acil durumlar için öncelikli destek sağlıyoruz.
              </p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-2 md:mb-4">
                <FaShieldAlt className="text-xl md:text-2xl text-orange-500" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">Güvenli Taşıma</h3>
              <p className="text-sm md:text-base text-gray-600">
                Eşyalarınız sigortalı ve güvende. Profesyonel taşıyıcılarımız özenle seçiliyor ve düzenli denetleniyor.
              </p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-2 md:mb-4">
                <FaMoneyBillWave className="text-xl md:text-2xl text-orange-500" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">Uygun Fiyat</h3>
              <p className="text-sm md:text-base text-gray-600">
                Rekabetçi fiyatlarla kaliteli hizmet. Size en yakın taşıyıcıyı bularak maliyetleri optimize ediyoruz.
              </p>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-2 md:mb-4">
                <FaMapMarkedAlt className="text-xl md:text-2xl text-orange-500" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">Anlık Takip</h3>
              <p className="text-sm md:text-base text-gray-600">
                Eşyalarınızın konumunu gerçek zamanlı takip edin. Taşıma sürecini harita üzerinden canlı olarak izleyin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
            {/* Logo ve Açıklama */}
            <div className="col-span-1 md:col-span-3">
              <img src="/logo.png" alt="Taşı.app" className="h-8 mb-4" />
              <p className="text-gray-400 mb-4">
                Türkiye&apos;nin en güvenilir ve hızlı taşımacılık platformu. Tek tıkla taşıyıcı bulun, anlık takip edin.
              </p>
              <div className="flex space-x-4">
                <Link href="#" className="text-gray-400 hover:text-orange-500 transition">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-orange-500 transition">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-orange-500 transition">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </Link>
                <Link href="#" className="text-gray-400 hover:text-orange-500 transition">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </Link>
              </div>
            </div>

            <div className="col-span-1">
              <h3 className="text-lg font-semibold mb-4">Hizmetlerimiz</h3>
              <ul className="space-y-2">
                {services.map((service) => (
                  <li key={service._id}>
                    {service.isActive ? (
                      <Link 
                        href={service.redirectUrl || `/services/${service._id}`}
                        className="text-gray-400 hover:text-orange-500 flex items-center"
                      >
                        {service.name}
                      </Link>
                    ) : (
                      <span className="text-gray-500 opacity-75 flex items-center cursor-not-allowed">
                        {service.name}
                        <span className="text-xs text-gray-500 ml-2">(Yakında)</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-1">
              <h3 className="text-lg font-semibold mb-4">Taşıyıcı</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/portal/login" className="text-gray-400 hover:text-orange-500">
                    Taşıyıcı Portal Girişi
                  </Link>
                </li>
                <li>
                  <Link href="/portal/register" className="text-gray-400 hover:text-orange-500 border border-gray-700 hover:border-orange-500 rounded px-3 py-1 inline-flex items-center transition-colors">
                    Taşıyıcı Olun
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-1">
              <h3 className="text-lg font-semibold mb-4">İletişim</h3>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-400">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <span>{generalSettings.phone}</span>
                </li>
                <li className="flex items-center text-gray-400">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  {generalSettings.contactEmail}
                </li>
                <li className="flex items-center text-gray-400">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {generalSettings.address}
                </li>
                <li className="flex items-center text-gray-400">
                  <FaClock className="h-5 w-5 mr-2" />
                  <span>{generalSettings.workingHours.start} - {generalSettings.workingHours.end}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Alt Footer */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2024 Taşı.app. Tüm hakları saklıdır.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <Link href="#" className="text-gray-400 hover:text-orange-500 text-sm transition">Gizlilik Politikası</Link>
                <Link href="#" className="text-gray-400 hover:text-orange-500 text-sm transition">Kullanım Şartları</Link>
                <Link href="#" className="text-gray-400 hover:text-orange-500 text-sm transition">KVKK</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showModal && (
        <CustomModal isOpen={showModal} onClose={() => setShowModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <StepBar currentStep={currentStep} />
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
                </button>
              </div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Taşıma Türü</h2>
                        </div>
            <div className="grid grid-cols-2 gap-4">
              {services.map((service) => (
                <div 
                  key={service._id}
                  className={`p-4 sm:p-6 border rounded-lg cursor-pointer transition-all ${
                    service.isActive 
                      ? selectedService?._id === service._id
                        ? 'border-orange-500 shadow-lg'
                        : 'hover:border-orange-500 hover:shadow-lg'
                      : 'opacity-75 cursor-not-allowed'
                          }`}
                          onClick={() => {
                    if (service.isActive) {
                      handleTransportTypeSelect(service);
                    }
                  }}
                >
                  <div className="flex items-center mb-4">
                    {service.icon && (
                      <img 
                        src={service.icon} 
                        alt={service.name} 
                        className="w-10 h-10 sm:w-12 sm:h-12 object-contain mr-3 sm:mr-4"
                      />
                    )}
                    <h3 className="text-base sm:text-xl font-semibold">{service.name}</h3>
                </div>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 line-clamp-2">{service.description}</p>
                  {service.price && service.isActive && (
                    <div className="mt-3 sm:mt-4">
                      <span className="text-orange-600 font-semibold text-sm sm:text-base">
                        {service.price} TL
                      </span>
                      <span className="text-gray-500 text-xs sm:text-sm">&apos;den başlayan fiyatlarla</span>
                    </div>
                  )}
                  {!service.isActive && (
                    <div className="mt-3 sm:mt-4">
                      <span className="bg-gray-100 text-gray-500 text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full">
                        Yakında
                      </span>
        </div>
      )}
            </div>
              ))}
          </div>
          <div className="flex justify-end mt-6">
              <button
                  onClick={() => {
                if (selectedService?._id) {
                  setShowModal(false);
                  setShowSummaryModal(true);
                  setCurrentStep(1);
                }
              }}
              className={`px-6 py-2 ${
                selectedService?._id 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } rounded-lg transition-colors`}
              disabled={!selectedService?._id}
            >
              {!selectedService?._id ? "Lütfen taşıma türü seçin" : "Sonraki"}
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {showSummaryModal && (
        <CustomModal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <StepBar currentStep={currentStep} />
              <button onClick={() => setShowSummaryModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
              </button>
            </div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Taşıma Detayları</h2>
            </div>
              <div className="space-y-6">
              {/* Seçilen Taşıma Türü ve Rota Bilgileri */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Seçilen Taşıma Türü */}
                  <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Seçilen Taşıma Türü</h3>
                  <div className="p-4 bg-orange-50 rounded-lg flex items-center">
                    {selectedService?.icon && (
                      <img 
                        src={selectedService.icon} 
                        alt={selectedService.name} 
                        className="w-12 h-12 object-contain mr-4"
                      />
                    )}
                        <div>
                      <p className="font-medium text-gray-800">{selectedService?.name}</p>
                      <p className="text-sm text-gray-600">{selectedService?.description}</p>
                    </div>
                  </div>
                </div>

                {/* Rota Bilgileri */}
                    <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Rota Bilgileri</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Alış Noktası</p>
                      <p className="font-medium text-gray-800">{pickupAddress}</p>
                        </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Teslimat Noktası</p>
                      <p className="font-medium text-gray-800">{deliveryAddress}</p>
                      </div>
                    {routeInfo && (
                      <div className="flex gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg flex-1">
                          <p className="text-sm text-gray-500">Mesafe</p>
                          <p className="font-medium text-gray-800">{routeInfo.distance}</p>
                    </div>
                        <div className="p-3 bg-gray-50 rounded-lg flex-1">
                          <p className="text-sm text-gray-500">Tahmini Süre</p>
                          <p className="font-medium text-gray-800">{routeInfo.duration}</p>
                        </div>
                      </div>
      )}
                  </div>
                </div>
              </div>

              {/* Taşıma Tarih ve Saat */}
                        <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Taşıma Tarih ve Saat</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Taşıma Zamanı</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setSelectedTimeOption('asap')}
                        className={`flex-1 px-4 py-2 rounded-lg border ${
                          selectedTimeOption === 'asap'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        En kısa sürede
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTimeOption('specific')}
                        className={`flex-1 px-4 py-2 rounded-lg border ${
                          selectedTimeOption === 'specific'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Belirli bir zamanda
                      </button>
                    </div>
                  </div>

                  {selectedTimeOption === 'specific' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alış Tarihi</label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alış Saati</label>
                        <input
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Paket Detayları */}
                    <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Paket Detayları</h3>
                  <div className="space-y-4">
                  {/* Paket Bilgileri */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Dinamik packageTitles dizisinden gelen başlıkları kullan */}
                    {selectedService?.packageTitles?.map((packageTitle, index) => (
                      <div key={packageTitle.id} className="w-full">
                        <label className="block text-base font-semibold text-gray-700 mb-1 flex items-center">
                          {packageTitle.icon && (
                            <span className="mr-2">
                              <i className={packageTitle.icon}></i>
                            </span>
                          )}
                          {packageTitle.title}
                          {packageTitle.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                      </label>
                        {packageTitle.type === 'input' && (
                        <input
                          type="text"
                            value={packageInfo[packageTitle.id] || ''}
                            onChange={(e) => handlePackageInfoChange(packageTitle.id, e.target.value)}
                            className={`w-full p-2 border ${packageTitle.required ? 'border-orange-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder={`${packageTitle.title} giriniz`}
                            required={packageTitle.required}
                          />
                        )}
                        {packageTitle.type === 'number' && (
                        <input
                            type="number"
                            value={packageInfo[packageTitle.id] || ''}
                            onChange={(e) => handlePackageInfoChange(packageTitle.id, e.target.value)}
                            className={`w-full p-2 border ${packageTitle.required ? 'border-orange-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                            placeholder={`${packageTitle.title} giriniz`}
                            required={packageTitle.required}
                          />
                        )}
                        {packageTitle.type === 'checkbox' && (
                          <div className="mt-2">
                            {/* Title kısmı kaldırıldı, başlık tekrarını önlemek için */}
                      </div>
                    )}
                        
                        {/* Alt başlıklar varsa göster */}
                        {packageTitle.subtitle && packageTitle.subtitle.length > 0 && (
                          <div className="mt-2 ml-4 space-y-2">
                            {packageTitle.subtitle.map((sub, subIndex) => {
                              const subtitleText = typeof sub === 'string' ? sub : sub.text;
                              const subtitleIcon = typeof sub === 'string' ? '' : (sub.icon || '');
                              const subId = `${packageTitle.id}_sub_${subIndex}`;
                              
                              return (
                                <div key={subIndex} className="flex items-center">
                        <input
                                    type="radio"
                                    id={subId}
                                    name={`${packageTitle.id}_options`}
                                    checked={packageInfo[subId] === 'true'}
                                    onChange={(e) => {
                                      // Önce tüm diğer seçimleri temizle
                                      packageTitle.subtitle.forEach((_, idx) => {
                                        if (idx !== subIndex) {
                                          const otherId = `${packageTitle.id}_sub_${idx}`;
                                          handlePackageInfoChange(otherId, 'false');
                                        }
                                      });
                                      // Sonra seçilen opsiyonu güncelle
                                      handlePackageInfoChange(subId, e.target.checked ? 'true' : 'false');
                                    }}
                                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 mr-2"
                                  />
                                  {subtitleIcon && (
                                    <span className="mr-2 text-orange-500">
                                      <i className={subtitleIcon}></i>
                                    </span>
                                  )}
                                  <label htmlFor={subId} className="text-sm text-gray-600">{subtitleText}</label>
                                </div>
                              );
                            })}
        </div>
      )}
                      </div>
                    ))}
                    
                    {/* Geriye dönük uyumluluk için olan packageTitle1-4 alanları kaldırıldı */}
              </div>

                  {/* Paket Görüntüleri */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Paket Görüntüleri
                    </label>
                <div className="space-y-4">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FaImage className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Görüntü yüklemek için tıklayın</span>
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG veya JPEG</p>
                </div>
                            <input 
                        type="file"
                            className="hidden" 
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                          />
                      </label>
                    </div>

                      {/* Yüklenen Görüntüler */}
                      {packageImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {packageImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img 
                                src={image} 
                                alt={`Paket görüntüsü ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                        <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                        ))}
                    </div>
              )}
                      </div>
                  </div>
                </div>
                  </div>

                  {/* Not Alanı */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Not</h3>
                    <textarea
                      name="notes"
                      value={contentDetails.notes || ''}
                      onChange={handleContentChange}
                      placeholder="Taşıma ile ilgili notlarınızı buraya yazabilirsiniz..."
                      rows="4"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-700 placeholder-gray-400"
                    ></textarea>
                  </div>

                  {/* Butonlar */}
              <div className="flex justify-between mt-8">
                    <button
                  onClick={handleBackToTransportType}
                  className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                    >
                  <FaArrowLeft className="mr-2" />
                      Geri
                    </button>
                    <button
                      onClick={async () => {
                    await handleContinueToStep2();
                    setShowSummaryModal(false);
                    setShowTransportSummaryModal(true);
                        setCurrentStep(2);
                      }}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                  Sonraki
                    </button>
                  </div>
                </div>
            </div>
        </CustomModal>
      )}

      {showTransportSummaryModal && (
        <CustomModal isOpen={showTransportSummaryModal} onClose={() => setShowTransportSummaryModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <StepBar currentStep={currentStep} />
              <button onClick={() => setShowTransportSummaryModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
              </button>
            </div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Taşıma Özeti</h2>
              </div>

            <div className="space-y-6">
              {/* Adres Bilgileri */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Adres Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <p className="text-sm text-gray-500 mb-1">Alış Adresi</p>
                    <p className="font-medium">{pickupAddress}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 mb-1">Teslimat Adresi</p>
                    <p className="font-medium">{deliveryAddress}</p>
                  </div>
                </div>
              </div>

              {/* Seçilen Hizmet */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Seçilen Hizmet</h3>
                <div className="flex items-center space-x-4">
                  {(() => {
                    // Alt başlık seçilmiş mi kontrol et
                    const selectedSubtitle = Object.entries(packageInfo).find(([key, value]) => value === 'true' && key.includes('_sub_'));
                    if (selectedSubtitle) {
                      const [titleId, subIndex] = selectedSubtitle[0].split('_sub_');
                      const title = selectedService.packageTitles.find(t => t.id === titleId);
                      const sub = title?.subtitle[parseInt(subIndex)];
                      if (sub?.relatedServiceId) {
                        const relatedService = services.find(s => s._id === sub.relatedServiceId);
                        if (relatedService) {
                          return (
                            <>
                              {relatedService.icon && (
                                <img 
                                  src={relatedService.icon} 
                                  alt={relatedService.name} 
                                  className="w-12 h-12 object-contain"
                                />
                              )}
                              <div>
                                <p className="font-medium text-lg">{relatedService.name}</p>
                                <p className="text-gray-600">{relatedService.description}</p>
                                {relatedService.price && (
                                  <p className="text-orange-500 font-semibold mt-2">
                                    {relatedService.price} TL&apos;den başlayan fiyatlarla
                                  </p>
                                )}
                              </div>
                            </>
                          );
                        }
                      }
                    }
                    // Eğer alt başlık seçilmemişse veya relatedServiceId yoksa, normal seçilen hizmeti göster
                    return (
                      <>
                        {selectedService?.icon && (
                          <img 
                            src={selectedService.icon} 
                            alt={selectedService.name} 
                            className="w-12 h-12 object-contain"
                          />
                        )}
                        <div>
                          <p className="font-medium text-lg">{selectedService?.name}</p>
                          <p className="text-gray-600">{selectedService?.description}</p>
                          {selectedService?.price && (
                            <p className="text-orange-500 font-semibold mt-2">
                              {selectedService.price} TL&apos;den başlayan fiyatlarla
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Taşıma Detayları */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Taşıma Detayları</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <p className="text-sm text-gray-500 mb-1">Mesafe</p>
                    <p className="font-medium">{routeInfo?.distance || 'Hesaplanıyor...'}</p>
                    </div>
                    <div>
                    <p className="text-sm text-gray-500 mb-1">Tahmini Süre</p>
                    <p className="font-medium">{routeInfo?.duration || 'Hesaplanıyor...'}</p>
                  </div>
                  
                  {selectedTimeOption === 'asap' ? (
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-sm text-gray-500 mb-1">Taşıma Zamanı</p>
                      <p className="font-medium">En kısa sürede (2-3 saat içinde)</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Tarih</p>
                        <p className="font-medium">{formatDate(selectedDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Saat</p>
                        <p className="font-medium">{selectedTime || 'Seçilmedi'}</p>
                      </div>
                    </>
                  )}
                  
                </div>
              </div>

              {/* Paket Bilgileri */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Paket Bilgileri</h3>
                <div className="space-y-4">
                  {selectedService?.packageTitles?.map((packageTitle) => (
                    <div key={packageTitle.id}>
                      <p className="text-base font-semibold text-gray-800 mb-2">{packageTitle.title}</p>
                      
                      {packageTitle.subtitle && packageTitle.subtitle.length > 0 && (
                        <div className="ml-4">
                          {packageTitle.subtitle.map((sub, subIndex) => {
                            const subtitleText = typeof sub === 'string' ? sub : sub.text;
                            const subId = `${packageTitle.id}_sub_${subIndex}`;
                            const isSelected = packageInfo[subId] === 'true';
                            const relatedService = sub.relatedServiceId ? services.find(s => s._id === sub.relatedServiceId) : null;
                            if (isSelected) {
                              return (
                                <div key={subIndex} className="flex flex-col py-1">
                                  <div className="flex items-center">
                                    <span className="text-green-500 mr-2">
                                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    </span>
                                    <p className="text-sm text-gray-700">{subtitleText}</p>
                                  </div>
                                  {relatedService && (
                                    <p className="text-xs text-blue-600 mt-1 ml-7">*Paketiniz &quot;{relatedService.name}&quot; ile taşınacaktır</p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Yedek kod - Eski içerik türleri için */}
                  {!selectedService?.packageTitles && selectedService?.package_info_titles?.map((title, index) => (
                    title.trim() && packageInfo[index] && (
                      <div key={index}>
                        <p className="text-sm text-gray-500 mb-1">{title}</p>
                        <p className="font-medium">{packageInfo[index]}</p>
                    </div>
                    )
                  ))}
                  {contentDetails.weight && (
                    <div>
                      <p className="font-medium">{contentDetails.weight} kg</p>
                    </div>
                  )}
                  {contentDetails.volume && (
                  <div>
                      <p className="text-sm text-gray-500 mb-1">Hacim</p>
                      <p className="font-medium">{contentDetails.volume} m³</p>
                </div>
              )}
                  {contentDetails.pieces && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Parça Sayısı</p>
                      <p className="font-medium">{contentDetails.pieces} adet</p>
                    </div>
                  )}
                  {contentDetails.description && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Açıklama</p>
                      <p className="font-medium">{contentDetails.description}</p>
                    </div>
                  )}
                  {contentDetails.specialNotes && (
                  <div>
                      <p className="text-sm text-gray-500 mb-1">Özel Notlar</p>
                      <p className="font-medium">{contentDetails.specialNotes}</p>
                </div>
              )}
                </div>
              </div>

              {/* Fiyat Bilgisi */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Fiyat Bilgisi</h3>
                <div className="flex justify-between items-center">
              <div>
                    <p className="text-sm text-gray-500">Tahmini Fiyat</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {calculatedPrice !== null ? `${formatCurrency(calculatedPrice)} TL` : 'Hesaplanıyor...'}
                    </p>
              </div>
                  <div className="text-sm text-gray-500 text-right">
                    * Fiyat, mesafe ve kampanyalara göre otomatik hesaplanır
              </div>
            </div>
          </div>
        </div>
                
            <div className="flex justify-between mt-8">
              <button
                onClick={() => {
                  setShowTransportSummaryModal(false);
                  setShowSummaryModal(true);
                  setCurrentStep(1);
                }}
                className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <FaEdit className="mr-2" />
                Düzenle
              </button>
              <button
                onClick={() => {
                  setShowTransportSummaryModal(false);
                  // Giriş yapılmış mı kontrol et
                  if (isAuthenticated || session) {
                    // Kullanıcı giriş yapmışsa telefon modalını atla
                    setShowSearchingModal(true);
                    setCurrentStep(3); // Giriş yapmış kullanıcılar için taşıyıcı adımı 3
                    
                    // 3 saniye sonra taşıyıcı onay bekleme ekranına geç
                    setTimeout(() => {
                      setShowSearchingModal(false);
                      setShowWaitingApprovalModal(true);
                    }, 3000);
                  } else {
                    // Giriş yapılmamışsa telefon modalını göster
                  setShowPhoneModal(true);
                  setCurrentStep(3);
                  }
                }}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Devam Et
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {showOTPModal && (
        <CustomModal isOpen={showOTPModal} onClose={() => setShowOTPModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <StepBar currentStep={currentStep} />
              <button onClick={() => setShowOTPModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
              </button>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Telefon Doğrulama</h2>
              <p className="text-gray-600 mb-6">
                {formattedPhoneNumber} numaralı telefonunuza gönderilen 6 haneli kodu giriniz.
              </p>
              <div className="max-w-xs mx-auto">
                <input
                  type="text"
                  maxLength="6"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 text-center text-2xl tracking-widest border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="000000"
                />
              </div>
              <div className="mt-6">
                <button
                  className={`px-6 py-2 rounded-lg transition flex items-center mx-auto ${
                    otpCode.length === 6
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={handleOTPSubmit}
                  disabled={otpCode.length !== 6}
                >
                  İleri
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </CustomModal>
      )}

      {showSearchingModal && (
        <CustomModal isOpen={showSearchingModal} onClose={() => setShowSearchingModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <StepBar currentStep={currentStep} />
              <button onClick={() => setShowSearchingModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mb-6"></div>
              <h2 className="text-2xl font-semibold text-center mb-4">Taşıyıcı Aranıyor</h2>
              <p className="text-gray-600 text-center max-w-md">
                Taşımanıza uygun taşıyıcılar aranıyor. Bu işlem birkaç dakika sürebilir.
              </p>
          </div>
        </div>
        </CustomModal>
      )}
      
      {showPhoneModal && (
        <CustomModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <StepBar currentStep={currentStep} />
              <button
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => setShowPhoneModal(false)}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">İletişim Bilgileri</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              {/* Sol Taraf - Telefon ve Kod Doğrulama */}
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">Telefon Numarası</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center">
                      <span className="bg-gray-100 p-2 sm:p-3 rounded-l-lg border border-r-0 border-gray-300 text-gray-600 text-sm sm:text-base">+90</span>
                      <input
                        type="text"
                        value={formattedPhoneNumber}
                        onChange={handlePhoneChange}
                        className="flex-1 p-2 sm:p-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"
                        placeholder="5XX XXX XX XX"
                        disabled={otpSent}
                      />
                    </div>
                    {!otpSent && (
                      <button
                        className={`w-full px-4 py-2 rounded-lg transition ${
                          phoneNumber.length === 10
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={() => {
                          if (phoneNumber.length === 10) {
                            setOtpSent(true);
                          }
                        }}
                        disabled={phoneNumber.length !== 10}
                      >
                        Kod Gönder
                      </button>
                    )}
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">Doğrulama Kodu</h3>
                    <div className="space-y-3 sm:space-y-4">
                      <input
                        type="text"
                        maxLength="6"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-2xl tracking-widest"
                        placeholder="000000"
                      />
                      <button
                        className={`w-full px-4 py-2 rounded-lg transition ${
                          otpCode.length === 6
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        onClick={handleOTPSubmit}
                        disabled={otpCode.length !== 6}
                      >
                        Doğrula
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sağ Taraf - Bilgilendirme */}
              <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-3">Bilgilendirme</h3>
                <p className="text-gray-600 text-sm sm:text-base flex items-center mb-2">
                  Telefon numaranızı kimse ile paylaşmıyoruz.
                  <FaLock className="text-green-500 ml-2" />
                </p>
                <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                  <div className="flex items-start">
                    <FaInfoCircle className="text-orange-500 mt-1 mr-2 flex-shrink-0" />
                    <p className="text-sm text-orange-800">
                      Üye girişi yapmadan devam ediyorsunuz. Siparişinizin geçmişini görmek ve kampanyalı fiyatlardan yararlanmak için giriş yapabilir veya kayıt olabilirsiniz.
                    </p>
                  </div>
                  
                  <div className="flex space-x-3 mt-3">
                    <button 
                      onClick={() => setShowLoginModal(true)}
                      className="flex-1 text-center bg-white border border-orange-300 text-orange-700 px-3 py-2 rounded-lg font-medium text-sm hover:bg-orange-50 transition-colors"
                    >
                      Giriş Yap
                    </button>
                    <button 
                      onClick={() => setShowRegisterModal(true)}
                      className="flex-1 text-center bg-white border border-orange-300 text-orange-700 px-3 py-2 rounded-lg font-medium text-sm hover:bg-orange-50 transition-colors"
                    >
                      Kayıt Ol
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CustomModal>
      )}
      
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-md w-full mx-4 md:mx-auto text-center">
            <div className="mb-4">
              <FaSpinner className="animate-spin text-orange-500 w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Taşıyıcı Aranıyor</h2>
            <p className="text-gray-600 mb-6">Taşıma talebiniz için en uygun taşıyıcıyı arıyoruz. Bu işlem birkaç dakika sürebilir.</p>
            
            <button
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              onClick={() => setShowSearchingModal(false)}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <CustomModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <StepBar currentStep={currentStep} />
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
              </button>
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-semibold mb-6">Ödeme</h2>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Toplam Tutar</span>
                  <div className="text-right">
                    {activeCampaign ? (
                      <>
                        <p className="line-through text-gray-400 text-sm mb-1">
                          {formatCurrency(basePrice)} TL
                        </p>
                        <span className="text-2xl font-bold text-green-600">{formatCurrency(calculatedPrice)} TL</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">{formatCurrency(basePrice)} TL</span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  * Fiyatlar KDV dahildir
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kampanya Seç
                  </label>
                  <select
                    className="w-full border px-3 py-2 rounded-md bg-white"
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
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Ödeme Yöntemi</h3>
                
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="payment" className="mr-3" defaultChecked />
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Kredi Kartı</span>
                  </div>
                </label>

                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kart Numarası
                    </label>
                    <input
                      type="text"
                      className="w-full border px-3 py-2 rounded-md"
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Son Kullanma Tarihi
                      </label>
                      <input
                        type="text"
                        className="w-full border px-3 py-2 rounded-md"
                        placeholder="AA/YY"
                        maxLength="5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        className="w-full border px-3 py-2 rounded-md"
                        placeholder="123"
                        maxLength="3"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kart Üzerindeki İsim
                    </label>
                    <input
                      type="text"
                      className="w-full border px-3 py-2 rounded-md"
                      placeholder="Ad Soyad"
                    />
                  </div>
                </div>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 mt-4">
                  <input type="radio" name="payment" className="mr-3" />
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Havale/EFT</span>
                  </div>
                </label>
              </div>

              <div className="mt-8">
                <button
                  onClick={async () => {
                    try {
                      // Ödeme başarılı olduğunda request status'ünü güncelle
                      const requestId = requestData?.id || localStorage.getItem('currentRequestId');
                      if (requestId) {
                        const response = await fetch(`/api/requests/${requestId}/update-status`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            status: 'paid',
                          }),
                        });
                        
                        if (!response.ok) {
                          console.error('Ödeme durumu güncellenirken hata oluştu');
                        } else {
                          console.log('Talep durumu "paid" olarak güncellendi ve shipments koleksiyonuna kopyalandı');
                        }
                      }
                      
                      // Ödeme modal'ını kapat, başarılı modal'ını göster
                      setShowPaymentModal(false);
                      setShowPaymentSuccessModal(true);
                    } catch (error) {
                      console.error('Ödeme işlemi sırasında hata:', error);
                      setShowPaymentModal(false);
                      setShowPaymentSuccessModal(true);
                    }
                  }}
                  className="w-full bg-orange-500 text-white py-3 px-6 rounded-lg hover:bg-orange-600 transition-colors text-lg font-medium"
                >
                  Ödemeyi Tamamla
                </button>
              </div>
            </div>
          </div>
        </CustomModal>
      )}

      {showPaymentSuccessModal && (
        <CustomModal isOpen={showPaymentSuccessModal} onClose={() => setShowPaymentSuccessModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <StepBar currentStep={currentStep} />
              <button onClick={() => setShowPaymentSuccessModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
                  </button>
                </div>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mb-6"></div>
              <h2 className="text-2xl font-semibold text-center mb-4">Ödeme Başarılı</h2>
              <p className="text-gray-600 text-center max-w-md">
                Ödemeniz başarıyla tamamlandı. Taşıyıcınız hakkında detaylı bilgi almak için lütfen taşıyıcı detaylarını görüntüleyin.
              </p>
                            </div>
                            </div>
        </CustomModal>
      )}

      {showWaitingApprovalModal && (
        <CustomModal isOpen={showWaitingApprovalModal} onClose={() => setShowWaitingApprovalModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <StepBar currentStep={currentStep} />
              <button onClick={() => setShowWaitingApprovalModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-6 relative flex justify-center">
                <div className="relative">
                  <FaCheckCircle className="text-orange-500 w-16 h-16" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-center mb-4">Taşıyıcılar Bulundu!</h2>
              <p className="text-gray-600 text-center max-w-md mb-6">
                3 taşıyıcı bulundu ve onayları bekleniyor. İlk onay veren taşıyıcı sizinle eşleşecek.
              </p>
              <div className="flex justify-center space-x-2 mb-6">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <div className="flex flex-col space-y-2 w-full">
                <button
                  className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => setShowWaitingApprovalModal(false)}
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </CustomModal>
      )}
      
      {/* Giriş Yap Modalı */}
      {showLoginModal && (
        <CustomModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Giriş Yap</h2>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
              </button>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                  {loginError}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  id="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="ornek@email.com"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre
                </label>
                <input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="********"
                  required
                />
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <Link href="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700">
                  Şifremi Unuttum
                </Link>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className={`px-6 py-2 rounded-lg transition ${
                    isLoggingIn
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {isLoggingIn ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Giriş Yapılıyor...
                    </span>
                  ) : (
                    'Giriş Yap'
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-6 border-t border-gray-200 pt-4">
              <p className="text-center text-sm text-gray-600">
                Hesabınız yok mu?{' '}
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowRegisterModal(true);
                  }}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Hemen Kayıt Olun
                </button>
              </p>
            </div>
          </div>
        </CustomModal>
      )}
      
      {/* Kayıt Ol Modalı */}
      {showRegisterModal && (
        <CustomModal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Kayıt Ol</h2>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-500 hover:text-gray-700">
                <FaTimes size={24} />
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="space-y-4">
              {registerError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                  {registerError}
                </div>
              )}
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad
                </label>
                <input
                  id="name"
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ali Veli"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <input
                  id="register-email"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="ornek@email.com"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <div className="flex">
                  <span className="bg-gray-100 px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg text-gray-500">+90</span>
                  <input
                    id="register-phone"
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value.replace(/\D/g, '').substring(0, 10))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="5XX XXX XX XX"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre
                </label>
                <input
                  id="register-password"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="En az 6 karakter"
                  required
                />
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isRegistering}
                  className={`w-full py-2 rounded-lg transition ${
                    isRegistering
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {isRegistering ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Kayıt Olunuyor...
                    </span>
                  ) : (
                    'Kayıt Ol'
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-6 border-t border-gray-200 pt-4">
              <p className="text-center text-sm text-gray-600">
                Zaten hesabınız var mı?{' '}
                <button
                  onClick={() => {
                    setShowRegisterModal(false);
                    setShowLoginModal(true);
                  }}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Giriş Yapın
                </button>
              </p>
            </div>
          </div>
        </CustomModal>
      )}
    </main>
  )
} 
