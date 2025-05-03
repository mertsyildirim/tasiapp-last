'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaBuilding } from 'react-icons/fa'
import Head from 'next/head'
import GoogleMapReact from 'google-map-react'

export default function IletisimPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)
  const [generalSettings, setGeneralSettings] = useState({
    contactEmail: 'iletisim@tasiapp.com',
    phone: '+90 212 123 4567',
    address: 'İstanbul, Türkiye',
    workingHours: {
      start: '09:00',
      end: '18:00'
    }
  })

  // Google Maps API için gerekli ayarlar
  const mapApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAKht3SqaVJpufUdq-vVQEfBEQKejT9Z8k"
  
  // Türkiye'nin merkez koordinatları
  const mapDefaults = {
    center: {
      lat: 39.0066701,
      lng: 35.24720162457031
    },
    zoom: 6
  }

  // Harita stilleri
  const mapOptions = {
    styles: [
      // Tüm ülke sınırlarını gizle
      {
        "featureType": "administrative.country",
        "elementType": "geometry.stroke",
        "stylers": [
          { "visibility": "off" }
        ]
      },
      // Sadece Türkiye sınırlarını göster ve turuncu yap
      {
        "featureType": "administrative.country",
        "elementType": "geometry.stroke",
        "stylers": [
          { "color": "#ff6b00" },
          { "weight": 2.5 },
          { "visibility": "simplified" }
        ]
      },
      // Türkiye için özel stil (GeoJSON kullanarak)
      {
        "featureType": "administrative.country",
        "elementType": "labels",
        "stylers": [
          { "visibility": "off" }
        ]
      }
    ],
    mapTypeId: 'roadmap', // Varsayılan harita görünümü
    fullscreenControl: false,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    keyboardShortcuts: false,
    gestureHandling: 'none',
    restriction: {
      latLngBounds: {
        north: 42.5,
        south: 35.5,
        west: 25.0,
        east: 45.0,
      },
      strictBounds: false
    }
  }

  useEffect(() => {
    // Genel ayarları API'den çek
    const fetchGeneralSettings = async () => {
      try {
        // Veri çekme işlemini deneme sayısı sınırlandırılıyor
        const response = await fetch('/api/admin/general-settings', {
          cache: 'force-cache', // Veriyi önbelleğe almak için
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            // API'den gelen verileri kullan
            setGeneralSettings(prevState => {
              // Eğer veriler aynıysa state'i güncelleme
              if (JSON.stringify(prevState) === JSON.stringify(result.data)) {
                return prevState;
              }
              return result.data;
            });
          }
        } else {
          console.warn('Genel ayarlar API\'den alınamadı, varsayılan değerler kullanılıyor')
          // API başarısız olursa varsayılan değerlerde kalacak
        }
      } catch (error) {
        console.error('Genel ayarlar yüklenirken hata:', error)
        // Hata durumunda varsayılan değerlerde kalacak
      }
    }

    fetchGeneralSettings()
    
    // Sayfa yüklendiğinde scroll pozisyonunu en üste ayarla
    window.scrollTo(0, 0);
    
  }, []) // Boş bağımlılık dizisi - yalnızca bir kez çalışacak

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      // Form verilerini API'ye gönder
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const result = await response.json()
        
        setSubmitStatus({
          success: true,
          message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.'
        })
        
        // Formu sıfırla
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        })
      } else {
        throw new Error('Sunucu yanıt vermedi.')
      }
    } catch (error) {
      console.error('Form gönderilirken hata:', error)
      setSubmitStatus({
        success: false,
        message: 'Mesajınız gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Harita yüklendiğinde çalışacak
  const handleApiLoaded = (map, maps) => {
    // Türkiye sınırını daha belirgin yapmak için
    if (map) {
      // Türkiye'ye odaklan
      map.setCenter(mapDefaults.center);
      map.setZoom(mapDefaults.zoom);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>İletişim | Taşı App</title>
        <meta name="description" content="Taşı App ile iletişime geçin. Sorularınız ve önerileriniz için bize ulaşın." />
      </Head>
      
      {/* Header */}
      <nav className="bg-white shadow-md py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Taşı.app" className="h-10" />
          </Link>
          <div className="hidden md:flex space-x-6 items-center">
            <Link href="/" className="text-gray-600 hover:text-orange-600 transition">
              Anasayfa
            </Link>
            <Link href="/#services" className="text-gray-600 hover:text-orange-600 transition">
              Hizmetlerimiz
            </Link>
            <Link href="/#features" className="text-gray-600 hover:text-orange-600 transition">
              Neden Biz?
            </Link>
            <Link href="/iletisim" className="text-orange-600 font-medium transition">
              İletişim
            </Link>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-bold text-white mb-4">İletişim</h1>
          <p className="text-white text-lg max-w-2xl mx-auto">
            Taşı App ekibi olarak sorularınızı yanıtlamak ve önerilerinizi dinlemek için buradayız. 
            Hemen bizimle iletişime geçin.
          </p>
        </div>
      </div>
      
      {/* Contact Info & Form Section */}
      <div className="container mx-auto px-4 py-16 -mt-24 relative z-10">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Contact Info */}
            <div className="bg-gray-50 p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">İletişim Bilgileri</h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-orange-100 p-3 rounded-full mr-4">
                    <FaPhone className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Telefon</h3>
                    <p className="text-gray-600">{generalSettings.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-orange-100 p-3 rounded-full mr-4">
                    <FaEnvelope className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">E-posta</h3>
                    <p className="text-gray-600">{generalSettings.contactEmail}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-orange-100 p-3 rounded-full mr-4">
                    <FaMapMarkerAlt className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Adres</h3>
                    <p className="text-gray-600">{generalSettings.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-orange-100 p-3 rounded-full mr-4">
                    <FaClock className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Çalışma Saatleri</h3>
                    <p className="text-gray-600">Hafta içi: {generalSettings.workingHours.start} - {generalSettings.workingHours.end}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-medium text-gray-800 mb-4">Bizi Takip Edin</h3>
                <div className="flex space-x-4">
                  <a href="#" className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                    </svg>
                  </a>
                  <a href="#" className="bg-blue-400 text-white p-2 rounded-full hover:bg-blue-500 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                  <a href="#" className="bg-pink-600 text-white p-2 rounded-full hover:bg-pink-700 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a href="#" className="bg-blue-800 text-white p-2 rounded-full hover:bg-blue-900 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                    </svg>
                  </a>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-medium text-gray-800 mb-4">Hizmet Bölgelerimiz</h3>
                <p className="text-gray-600">
                  Şimdi <span className="font-bold underline">İstanbul</span>, <span className="font-bold underline">İzmir</span> ve <span className="font-bold underline">Ankara</span>. Yakında Tüm Türkiye'de...
                </p>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Bize Ulaşın</h2>
              
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Adınız Soyadınız
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        E-posta Adresiniz
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon Numaranız
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Konu
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Mesajınız
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows="5"
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    ></textarea>
                  </div>
                  
                  {submitStatus && (
                    <div className={`p-4 rounded-md ${submitStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {submitStatus.message}
                    </div>
                  )}
                  
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-3 px-4 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Map Section */}
      <div className="w-full h-[500px] -mt-24 relative z-0 mb-0">
        <div style={{ height: '100%', width: '100%', pointerEvents: 'none', borderTop: '4px solid #ff6b00', borderBottom: '4px solid #ff6b00' }}>
          <GoogleMapReact
            bootstrapURLKeys={{ key: mapApiKey }}
            defaultCenter={mapDefaults.center}
            defaultZoom={mapDefaults.zoom}
            options={mapOptions}
            yesIWantToUseGoogleMapApiInternals
            onGoogleApiLoaded={({ map, maps }) => handleApiLoaded(map, maps)}
            draggable={false}
          >
            {/* Harita içeriği buraya eklenebilir */}
          </GoogleMapReact>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-0">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <img src="/logo.png" alt="Taşı.app" className="h-8 mb-4" />
              <p className="text-gray-400 mb-4">
                Türkiye'nin en güvenilir ve hızlı taşımacılık platformu. Tek tıkla taşıyıcı bulun, anlık takip edin.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Hızlı Erişim</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-400 hover:text-orange-500">Anasayfa</Link></li>
                <li><Link href="/#services" className="text-gray-400 hover:text-orange-500">Hizmetlerimiz</Link></li>
                <li><Link href="/#features" className="text-gray-400 hover:text-orange-500">Neden Biz?</Link></li>
                <li><Link href="/iletisim" className="text-gray-400 hover:text-orange-500">İletişim</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">İletişim</h3>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-400">
                  <FaPhone className="mr-2 text-gray-500" />
                  {generalSettings.phone}
                </li>
                <li className="flex items-center text-gray-400">
                  <FaEnvelope className="mr-2 text-gray-500" />
                  {generalSettings.contactEmail}
                </li>
                <li className="flex items-center text-gray-400">
                  <FaMapMarkerAlt className="mr-2 text-gray-500" />
                  {generalSettings.address}
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Taşı.app. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 