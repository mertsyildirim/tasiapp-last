import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { 
  FaTruck, FaClock, FaMapMarkedAlt, FaBoxOpen, FaBox, 
  FaShieldAlt, FaBolt, FaArrowLeft, FaSpinner
} from 'react-icons/fa'
import { 
  useLoadScript, 
  GoogleMap, 
  Marker, 
  Autocomplete, 
  DirectionsRenderer 
} from '@react-google-maps/api'
import Link from 'next/link'

const libraries = ['places']
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

export default function KuryePage() {
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
  const [packageWeight, setPackageWeight] = useState(5)
  const [packageSize, setPackageSize] = useState('medium') // small, medium, large
  const [packageType, setPackageType] = useState('small') // small, medium, document

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: libraries,
    language: "tr",
    region: "TR"
  })

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const containerStyle = {
    width: '100%',
    height: isMobile ? '300px' : '450px',
  }

  const center = {
    lat: 41.0082,
    lng: 28.9784 // İstanbul
  }

  const onLoad = map => {
    // Map yüklendikten sonra yapılacak işlemler
  }

  const onUnmount = map => {
    // Map bileşeni kaldırıldığında yapılacak işlemler
  }

  const onPickupLoad = autocomplete => {
    setPickupAutocomplete(autocomplete)
  }

  const onDeliveryLoad = autocomplete => {
    setDeliveryAutocomplete(autocomplete)
  }

  const onPickupPlaceChanged = () => {
    if (pickupAutocomplete) {
      const place = pickupAutocomplete.getPlace()
      if (place.geometry) {
        setPickup(place.formatted_address)
        setPickupMarker({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        })
        setPickupError('')

        // Eğer teslimat noktası da seçilmişse rota çiz
        if (deliveryMarker) {
          calculateRoute(
            { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
            deliveryMarker
          )
        }
      }
    }
  }

  const onDeliveryPlaceChanged = () => {
    if (deliveryAutocomplete) {
      const place = deliveryAutocomplete.getPlace()
      if (place.geometry) {
        setDelivery(place.formatted_address)
        setDeliveryMarker({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        })
        setDeliveryError('')

        // Eğer alış noktası da seçilmişse rota çiz
        if (pickupMarker) {
          calculateRoute(
            pickupMarker,
            { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
          )
        }
      }
    }
  }

  const calculateRoute = (origin, destination) => {
    if (!window.google) return

    const directionsService = new window.google.maps.DirectionsService()
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result)
          // Mesafe ve süre bilgisini al
          const route = result.routes[0].legs[0]
          setDistance(route.distance.text)
          setDuration(route.duration.text)
        } else {
          console.error(`Rota hesaplanamadı: ${status}`)
        }
      }
    )
  }

  const handleContinue = () => {
    let hasError = false

    if (!pickup) {
      setPickupError('Lütfen alış noktasını belirtin')
      hasError = true
    }

    if (!delivery) {
      setDeliveryError('Lütfen teslimat noktasını belirtin')
      hasError = true
    }

    if (!hasError) {
      setIsProcessing(true)
      // Taşıma bilgilerini sakla ve taşıyıcı bulma sayfasına yönlendir
      setTimeout(() => {
        localStorage.setItem('kuryeDelivery', JSON.stringify({
          pickup,
          delivery,
          distance,
          duration,
          packageType,
          type: 'Kurye Hizmeti'
        }))
        router.push('/tasiyici-bul')
      }, 1000)
    }
  }

  const getPackageTypeLabel = () => {
    switch (packageType) {
      case 'small':
        return 'Küçük Paket (1-5 kg)'
      case 'medium':
        return 'Orta Boy Paket (5-10 kg)'
      case 'document':
        return 'Evrak/Doküman'
      default:
        return 'Küçük Paket (1-5 kg)'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/">
                <img src="/logo.png" alt="Taşı.app" className="h-10" />
              </Link>
            </div>
            <div className="hidden md:flex space-x-6 items-center">
              <Link href="/" className="text-gray-600 hover:text-orange-600 transition">
                Ana Sayfa
              </Link>
              <Link href="/#services" className="text-gray-600 hover:text-orange-600 transition">
                Hizmetlerimiz
              </Link>
              <Link href="/#features" className="text-gray-600 hover:text-orange-600 transition">
                Neden Biz?
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-orange-600 transition">
                İletişim
              </Link>
            </div>
            
            {/* Mobil Menü */}
            <div className="md:hidden flex items-center">
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center text-gray-600 hover:text-orange-500"
          >
            <FaArrowLeft className="mr-2" />
            Ana Sayfaya Dön
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-purple-500 text-white p-6">
            <h1 className="text-3xl font-bold flex items-center">
              <FaBox className="mr-3" />
              Kurye Hizmeti
            </h1>
            <p className="mt-2">Hızlı ve güvenli kurye taşıma hizmetleri ile küçük paketlerinizi aynı gün teslim ediyoruz.</p>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Taşıma Detayları</h2>
              <p className="text-gray-600 mb-4">
                Alış ve teslimat noktalarını seçerek kurye hizmetimizden hemen yararlanmaya başlayın.
              </p>

              {loadError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
                  Harita yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.
                </div>
              )}

              {/* Paket Türü Seçimi */}
              <div className="mb-6">
                <h3 className="text-base font-medium text-gray-700 mb-3">Paket Türünü Seçin</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      packageType === 'small' 
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => setPackageType('small')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 ${
                        packageType === 'small' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                      }`}>
                        {packageType === 'small' && (
                          <div className="w-3 h-3 bg-white rounded-full m-auto"></div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Küçük Paket</p>
                        <p className="text-sm text-gray-500">1-5 kg arası</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      packageType === 'medium' 
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => setPackageType('medium')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 ${
                        packageType === 'medium' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                      }`}>
                        {packageType === 'medium' && (
                          <div className="w-3 h-3 bg-white rounded-full m-auto"></div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Orta Boy Paket</p>
                        <p className="text-sm text-gray-500">5-10 kg arası</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      packageType === 'document' 
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => setPackageType('document')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 mr-3 flex-shrink-0 ${
                        packageType === 'document' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                      }`}>
                        {packageType === 'document' && (
                          <div className="w-3 h-3 bg-white rounded-full m-auto"></div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Evrak/Doküman</p>
                        <p className="text-sm text-gray-500">1 kg altı</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Harita */}
              <div className="mb-6">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={11}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    options={{
                      zoomControl: true,
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: true,
                    }}
                  >
                    {pickupMarker && (
                      <Marker 
                        position={pickupMarker}
                        icon={{
                          path: window.google.maps.SymbolPath.CIRCLE,
                          scale: 10,
                          fillColor: '#22c55e',
                          fillOpacity: 1,
                          strokeColor: '#ffffff',
                          strokeWeight: 2,
                        }}
                      />
                    )}
                    {deliveryMarker && (
                      <Marker 
                        position={deliveryMarker}
                        icon={{
                          path: window.google.maps.SymbolPath.CIRCLE,
                          scale: 10,
                          fillColor: '#ef4444',
                          fillOpacity: 1,
                          strokeColor: '#ffffff',
                          strokeWeight: 2,
                        }}
                      />
                    )}
                    {directions && (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          polylineOptions: {
                            strokeColor: '#9333ea',
                            strokeWeight: 6,
                            strokeOpacity: 0.8,
                          },
                          suppressMarkers: true,
                        }}
                      />
                    )}
                  </GoogleMap>
                ) : (
                  <div className="w-full rounded-lg bg-gray-100 flex items-center justify-center" style={{ height: isMobile ? '300px' : '450px' }}>
                    <div className="text-center">
                      <FaSpinner className="animate-spin text-3xl text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Harita Yükleniyor...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Alış ve Teslimat Adresleri */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alış Noktası
                  </label>
                  {isLoaded ? (
                    <Autocomplete onLoad={onPickupLoad} onPlaceChanged={onPickupPlaceChanged}>
                      <div>
                        <input
                          type="text"
                          value={pickup}
                          onChange={(e) => setPickup(e.target.value)}
                          placeholder="Alış adresini girin"
                          className={`w-full px-4 py-2 border ${pickupError ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                        {pickupError && <p className="mt-1 text-sm text-red-600">{pickupError}</p>}
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teslimat Noktası
                  </label>
                  {isLoaded ? (
                    <Autocomplete onLoad={onDeliveryLoad} onPlaceChanged={onDeliveryPlaceChanged}>
                      <div>
                        <input
                          type="text"
                          value={delivery}
                          onChange={(e) => setDelivery(e.target.value)}
                          placeholder="Teslimat adresini girin"
                          className={`w-full px-4 py-2 border ${deliveryError ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                        {deliveryError && <p className="mt-1 text-sm text-red-600">{deliveryError}</p>}
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
                </div>
              </div>

              {/* Rota Bilgileri */}
              {distance && duration && (
                <div className="mb-8 p-4 bg-purple-50 border border-purple-100 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-800 mb-2">Rota Bilgileri</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-purple-600">Mesafe</p>
                      <p className="font-medium text-purple-900">{distance}</p>
                    </div>
                    <div>
                      <p className="text-sm text-purple-600">Tahmini Süre</p>
                      <p className="font-medium text-purple-900">{duration}</p>
                    </div>
                    <div>
                      <p className="text-sm text-purple-600">Paket Türü</p>
                      <p className="font-medium text-purple-900">{getPackageTypeLabel()}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hizmet Avantajları */}
              <div className="border-t pt-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">Kurye Hizmeti Avantajları</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start">
                    <div className="shrink-0">
                      <div className="flex items-center justify-center w-12 h-12 rounded-md bg-purple-100 text-purple-600">
                        <FaClock />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-base font-medium">Hızlı Teslim</h4>
                      <p className="mt-1 text-sm text-gray-500">Şehir içi 2-3 saat içinde teslimat</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="shrink-0">
                      <div className="flex items-center justify-center w-12 h-12 rounded-md bg-purple-100 text-purple-600">
                        <FaMapMarkedAlt />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-base font-medium">Canlı Takip</h4>
                      <p className="mt-1 text-sm text-gray-500">Kurye konumunu anlık olarak takip edin</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="shrink-0">
                      <div className="flex items-center justify-center w-12 h-12 rounded-md bg-purple-100 text-purple-600">
                        <FaShieldAlt />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-base font-medium">Güvenli Taşıma</h4>
                      <p className="mt-1 text-sm text-gray-500">Tüm gönderileriniz sigortalı ve güvende</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Devam Butonu */}
              <div className="text-right">
                <button
                  onClick={handleContinue}
                  disabled={isProcessing || !pickupMarker || !deliveryMarker}
                  className={`px-8 py-3 rounded-lg text-white font-medium ${
                    isProcessing || !pickupMarker || !deliveryMarker
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center">
                      <FaSpinner className="animate-spin mr-2" />
                      İşleniyor...
                    </span>
                  ) : (
                    "Taşıyıcı Bul"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 