'use client'

import React, { useState, useEffect } from 'react'
import { FaSearch, FaEye, FaCheck, FaTimes, FaSms, FaMapMarkerAlt, FaTruck, FaCompass, FaCalendarAlt, FaMoneyBillWave, FaEnvelope, FaSpinner, FaClipboardList, FaBuilding, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import AdminLayout from '../../components/admin/Layout'
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api'
import axios from 'axios'
import { useRouter } from 'next/router'

// Google Maps API anahtarı
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAKht3SqaVJpufUdq-vVQEfBEQKejT9Z8k";

export default function RequestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(null)
  const [showConfirmSmsModal, setShowConfirmSmsModal] = useState(null)
  const [smsSending, setSmsSending] = useState(false)
  const [smsSuccess, setSmsSuccess] = useState(false)
  const [directions, setDirections] = useState(null)
  const [map, setMap] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRequests, setTotalRequests] = useState(0)
  const [requests, setRequests] = useState([])
  const [shipmentCount, setShipmentCount] = useState(0)
  const itemsPerPage = 10

  // Google Maps yükleme
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  })

  // Map container style
  const containerStyle = {
    width: '100%',
    height: '350px'
  }

  // Harita merkezi - İstanbul
  const center = {
    lat: 41.0082,
    lng: 28.9784
  }

  // Map load callback
  const onLoad = React.useCallback(function callback(map) {
    setMap(map)
  }, [])

  // Map unmount callback
  const onUnmount = React.useCallback(function callback() {
    setMap(null)
  }, [])

  // Örnek şehir koordinatları
  const getCoordinatesForCity = (city) => {
    const cities = {
      'İstanbul': { lat: 41.0082, lng: 28.9784 },
      'Ankara': { lat: 39.9334, lng: 32.8597 },
      'İzmir': { lat: 38.4237, lng: 27.1428 },
      'Bursa': { lat: 40.1885, lng: 29.0610 },
      'Antalya': { lat: 36.8841, lng: 30.7056 },
      'Konya': { lat: 37.8715, lng: 32.4941 },
      'Mersin': { lat: 36.8120, lng: 34.6415 },
      'Eskişehir': { lat: 39.7667, lng: 30.5256 },
      'Muğla': { lat: 37.2153, lng: 28.3636 },
    };
    
    if (!city) return cities['İstanbul'];
    
    const cityName = city.split(',')[0].trim();
    return cities[cityName] || cities['İstanbul']; // Varsayılan olarak İstanbul
  }

  // API'den talep verilerini getirme
  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Talepler için veriler getiriliyor...');
        
        // API'den talepleri getir
        let apiUrl = `/api/admin/requests?page=${currentPage}&limit=${itemsPerPage}`;
        
        // Filtre ekle
        if (selectedTab !== 'all') {
          apiUrl += `&status=${selectedTab}`;
        }
        
        // Arama terimi ekle
        if (searchTerm) {
          apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
        }
        
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API yanıtı alındı:', response.status);
        
        if (data.success) {
          const { requests: requestsData, pagination } = data;
          console.log(`${requestsData.length} talep verisi alındı`);
          
          setRequests(requestsData);
          setTotalPages(pagination.totalPages);
          setTotalRequests(pagination.total);
        } else {
          console.error('API başarısız yanıt döndü:', data);
          setError(data.message || 'Talepler alınırken bir hata oluştu');
        }
      } catch (error) {
        console.error('Talep verilerini alma hatası:', error);
        
        // Hata detaylarını kaydet
        let errorMessage = 'Talep verileri alınırken bir sorun oluştu.';
        
        if (error.response) {
          // Sunucudan yanıt geldi ancak 2XX aralığında bir durum kodu değil
          console.error('Hata yanıtı:', error.response.status, error.response.data);
          
          if (error.response.status === 404) {
            errorMessage = 'API endpoint bulunamadı. Lütfen sistem yöneticinize başvurun.';
          } else if (error.response.status === 500) {
            errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
          }
          
          errorMessage += ' Detay: ' + (error.response.data?.message || error.message);
        } else if (error.request) {
          // İstek yapıldı ancak yanıt alınamadı
          console.error('İstek gönderildi ancak yanıt alınamadı');
          errorMessage = 'Sunucu yanıt vermiyor. Lütfen internet bağlantınızı kontrol edin.';
        } else {
          // İstek ayarlanırken bir şeyler ters gitti
          console.error('İstek oluşturulurken hata:', error.message);
          errorMessage = 'İstek oluşturulurken bir hata oluştu: ' + error.message;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    // Router hazır olduğunda ve bileşen mount edildiğinde verileri getir
    if (router.isReady) {
      console.log('Router hazır, verileri getirme başlatılıyor');
      fetchRequests();
    }
  }, [router.isReady, router, currentPage, selectedTab, searchTerm]);

  // Taşıma sayısını getir
  useEffect(() => {
    const fetchShipmentCount = async () => {
      try {
        const response = await fetch('/api/admin/shipments/count', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setShipmentCount(data.count);
        }
      } catch (error) {
        console.error('Taşıma sayısı alınırken hata:', error);
      }
    };
    
    fetchShipmentCount();
  }, []);

  // Rota çizimi için
  const getRoute = (from, to) => {
    if (!isLoaded || !map) return;

    const fromCoords = getCoordinatesForCity(from);
    const toCoords = getCoordinatesForCity(to);

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: fromCoords,
        destination: toCoords,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error(`Rota bulunamadı: ${status}`);
        }
      }
    );
  };

  // ESC tuşu ile modalları kapatma
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showRequestDetailModal) setShowRequestDetailModal(null);
        if (showConfirmSmsModal) setShowConfirmSmsModal(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showRequestDetailModal, showConfirmSmsModal]);

  // Talep detaylarını görüntüleme
  const handleViewRequest = (request) => {
    setShowRequestDetailModal(request);
    if (request.from && request.to) {
      getRoute(request.from, request.to);
    }
  };

  // SMS gönderme modalını açma
  const handleSendSMS = (request) => {
    setShowConfirmSmsModal(request);
  };

  // SMS gönderme işlemi
  const confirmSendSMS = async () => {
    if (!showConfirmSmsModal) return;
    
    setSmsSending(true);
    setSmsSuccess(false);

    try {
      const response = await fetch('/api/admin/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          requestId: showConfirmSmsModal._id,
          phone: showConfirmSmsModal.phone,
          message: `Sayın ${showConfirmSmsModal.customerName}, talebiniz ${showConfirmSmsModal.status === 'approved' ? 'onaylandı' : 'reddedildi'}. Detaylar için web sitemizi ziyaret edebilirsiniz.`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSmsSuccess(true);
        setTimeout(() => {
          setShowConfirmSmsModal(null);
          setSmsSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('SMS gönderme hatası:', error);
      setError('SMS gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setSmsSending(false);
    }
  };

  // Durum rengini belirleme
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Sayfa değiştirme
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Sayfa numaralarını oluşturma
  const getPageNumbers = () => {
    const pageNumbers = [];
      for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Taşıma Talepleri" isBlurred={showRequestDetailModal || showConfirmSmsModal}>
      <div className={showRequestDetailModal || showConfirmSmsModal ? "blur-sm" : ""}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex space-x-2 flex-wrap">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'all' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } mb-2`}
            >
              Tüm Talepler
            </button>
            <button
              onClick={() => setSelectedTab('new')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'new' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } mb-2`}
            >
              Yeni
            </button>
            <button
              onClick={() => setSelectedTab('searching')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'searching' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } mb-2`}
            >
              Taşıyıcı Aranıyor
            </button>
            <button
              onClick={() => setSelectedTab('awaiting')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'awaiting' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } mb-2`}
            >
              Taşıyıcı Onayı Bekleniyor
            </button>
            <button
              onClick={() => setSelectedTab('rejected')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'rejected' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } mb-2`}
            >
              Taşıyıcı Onay Olmadı
            </button>
            <button
              onClick={() => setSelectedTab('payment')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'payment' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } mb-2`}
            >
              Ödeme Bekleniyor
            </button>
            <button
              onClick={() => setSelectedTab('sms')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'sms' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } mb-2`}
            >
              SMS Gönderilecek
            </button>
            <button
              onClick={() => setSelectedTab('canceled')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'canceled' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } mb-2`}
            >
              İptal Edildi
            </button>
          </div>
          <div className="flex flex-col w-full md:flex-row md:w-auto gap-4">
            <div className="relative w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Talep ara..." 
                className="pl-10 pr-4 py-2 w-full md:min-w-[250px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
          
        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Talep</p>
                <p className="text-2xl font-semibold text-gray-900">{totalRequests}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FaClipboardList className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taşıyıcı Onaylı Talep</p>
                <p className="text-2xl font-semibold text-green-600">
                  {requests.filter(r => r.status === 'Ödeme Bekleniyor').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FaCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Onaylanmayan Talep</p>
                <p className="text-2xl font-semibold text-red-600">
                  {requests.filter(r => r.status === 'Taşıyıcı Onay Olmadı').length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <FaTimes className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Randevu Oluşturulan Talep</p>
                <p className="text-2xl font-semibold text-purple-600">
                  {shipmentCount || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FaCalendarAlt className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
          
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* Yükleniyor */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 mb-6 flex justify-center items-center">
            <FaSpinner className="text-orange-600 text-2xl animate-spin mr-3" />
            <p className="text-gray-700">Talepler yükleniyor...</p>
          </div>
        )}

        {/* Talep Listesi */}
        {!loading && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Talep No
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Müşteri
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nereden
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nereye
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.length > 0 ? (
                    requests.map((request) => (
                    <tr key={request._id || Math.random()} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{request._id ? request._id.substring(0, 8) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              {request.name ? request.name.charAt(0).toUpperCase() : 'M'}
                            </span>
                            </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{request.name}</div>
                            <div className="text-sm text-gray-500">{request.phone}</div>
                            </div>
                          </div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.from}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.to}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status === 'pending' && 'Beklemede'}
                          {request.status === 'approved' && 'Onaylandı'}
                          {request.status === 'rejected' && 'Reddedildi'}
                          {request.status === 'completed' && 'Tamamlandı'}
                          {request.status === 'cancelled' && 'İptal Edildi'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewRequest(request)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Detayları Görüntüle"
                            >
                              <FaEye />
                            </button>
                              <button
                                onClick={() => handleSendSMS(request)}
                            className="text-green-600 hover:text-green-900"
                            title="SMS Gönder"
                              >
                                <FaSms />
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      {searchTerm ? 'Arama kriterlerine uygun talep bulunamadı.' : 'Henüz talep bulunmuyor.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Toplam Kayıt Bilgisi ve Sayfalama */}
            <div className="bg-white px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Toplam <span className="font-medium text-gray-900">{requests.length}</span> talep bulundu
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
        )}
      </div>

      {/* Talep Detay Modalı */}
      {showRequestDetailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Talep Detayları
                      </h3>
                <button
                  onClick={() => setShowRequestDetailModal(null)}
                        className="text-gray-400 hover:text-gray-500"
                >
                        <FaTimes />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                        <h4 className="text-md font-medium text-gray-700 mb-2">Müşteri Bilgileri</h4>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <div className="flex items-center mb-3">
                            <div className="flex-shrink-0 h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-500 font-medium text-lg">
                                {showRequestDetailModal.name ? showRequestDetailModal.name.charAt(0).toUpperCase() : 'M'}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{showRequestDetailModal.name}</div>
                              <div className="text-sm text-gray-500">{showRequestDetailModal.phone}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center">
                              <FaEnvelope className="text-gray-400 mr-2" />
                              <span>{showRequestDetailModal.email || 'E-posta yok'}</span>
                            </div>
                            <div className="flex items-center">
                              <FaBuilding className="text-gray-400 mr-2" />
                              <span>{showRequestDetailModal.company || 'Şirket yok'}</span>
                            </div>
                          </div>
                    </div>
                  </div>

                      <div>
                        <h4 className="text-md font-medium text-gray-700 mb-2">Taşıma Bilgileri</h4>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <div className="grid grid-cols-1 gap-3 text-sm">
                            <div className="flex items-center">
                        <FaMapMarkerAlt className="text-red-500 mr-2" /> 
                              <span><strong>Nereden:</strong> {showRequestDetailModal.from}</span>
                            </div>
                            <div className="flex items-center">
                        <FaMapMarkerAlt className="text-green-500 mr-2" /> 
                              <span><strong>Nereye:</strong> {showRequestDetailModal.to}</span>
                    </div>
                            <div className="flex items-center">
                              <FaCalendarAlt className="text-blue-500 mr-2" />
                              <span><strong>Tarih:</strong> {new Date(showRequestDetailModal.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                            <div className="flex items-center">
                              <FaMoneyBillWave className="text-yellow-500 mr-2" />
                              <span><strong>Fiyat:</strong> {showRequestDetailModal.price ? `${showRequestDetailModal.price} TL` : 'Belirtilmemiş'}</span>
                            </div>
                          </div>
                        </div>
                    </div>
                  </div>

                    <div className="mt-6">
                      <h4 className="text-md font-medium text-gray-700 mb-2">Durum Bilgisi</h4>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(showRequestDetailModal.status)}`}>
                              {showRequestDetailModal.status === 'pending' && 'Beklemede'}
                              {showRequestDetailModal.status === 'approved' && 'Onaylandı'}
                              {showRequestDetailModal.status === 'rejected' && 'Reddedildi'}
                              {showRequestDetailModal.status === 'completed' && 'Tamamlandı'}
                              {showRequestDetailModal.status === 'cancelled' && 'İptal Edildi'}
                            </span>
                            <span className="ml-2 text-sm text-gray-500">
                              {showRequestDetailModal.statusUpdatedAt ? 
                                `Son güncelleme: ${new Date(showRequestDetailModal.statusUpdatedAt).toLocaleDateString('tr-TR')}` : 
                                'Güncelleme tarihi yok'}
                            </span>
                      </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSendSMS(showRequestDetailModal)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <FaSms className="mr-1" /> SMS Gönder
                            </button>
                    </div>
                        </div>
                      </div>
                </div>

                    {showRequestDetailModal.from && showRequestDetailModal.to && (
                      <div className="mt-6">
                        <h4 className="text-md font-medium text-gray-700 mb-2">Rota Haritası</h4>
                        <div className="bg-gray-50 p-4 rounded-md h-80">
                      {isLoaded ? (
                        <GoogleMap
                          mapContainerStyle={containerStyle}
                          center={center}
                              zoom={6}
                          onLoad={onLoad}
                          onUnmount={onUnmount}
                            >
                              {directions && <DirectionsRenderer directions={directions} />}
                        </GoogleMap>
                          ) : loadError ? (
                            <div className="h-full flex items-center justify-center text-red-500">
                              Harita yüklenirken bir hata oluştu: {loadError.message}
                            </div>
                      ) : (
                            <div className="h-full flex items-center justify-center">
                              <FaSpinner className="animate-spin h-8 w-8 text-blue-500" />
                        </div>
                      )}
                    </div>
                  </div>
                    )}
                    
                    {showRequestDetailModal.notes && (
                      <div className="mt-6">
                        <h4 className="text-md font-medium text-gray-700 mb-2">Notlar</h4>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <p className="text-sm text-gray-700">{showRequestDetailModal.notes}</p>
                    </div>
                  </div>
                    )}
                </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowRequestDetailModal(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS Gönderme Onay Modalı */}
      {showConfirmSmsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        SMS Gönder
                      </h3>
                <button
                  onClick={() => setShowConfirmSmsModal(null)}
                        className="text-gray-400 hover:text-gray-500"
                >
                        <FaTimes />
                </button>
              </div>

              {smsSuccess ? (
                      <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <FaCheck className="h-5 w-5 text-green-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-green-800">SMS başarıyla gönderildi</h3>
                            <div className="mt-2 text-sm text-green-700">
                              <p>SMS, {showConfirmSmsModal.phone} numarasına gönderildi.</p>
                            </div>
                          </div>
                        </div>
                </div>
              ) : (
                <>
                        <div className="mb-4">
                          <p className="text-sm text-gray-500">
                            Aşağıdaki müşteriye SMS göndermek istediğinize emin misiniz?
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-md mb-4">
                          <div className="flex items-center mb-2">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-500 font-medium">
                                {showConfirmSmsModal.name ? showConfirmSmsModal.name.charAt(0).toUpperCase() : 'M'}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{showConfirmSmsModal.name}</div>
                              <div className="text-sm text-gray-500">{showConfirmSmsModal.phone}</div>
                            </div>
                  </div>

                          <div className="text-sm text-gray-700">
                            <p><strong>Talep No:</strong> #{showConfirmSmsModal._id.substring(0, 8)}</p>
                            <p><strong>Durum:</strong> {
                              showConfirmSmsModal.status === 'pending' && 'Beklemede' ||
                              showConfirmSmsModal.status === 'approved' && 'Onaylandı' ||
                              showConfirmSmsModal.status === 'rejected' && 'Reddedildi' ||
                              showConfirmSmsModal.status === 'completed' && 'Tamamlandı' ||
                              showConfirmSmsModal.status === 'cancelled' && 'İptal Edildi'
                            }</p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="sms-message" className="block text-sm font-medium text-gray-700 mb-1">
                            SMS Mesajı
                          </label>
                          <textarea
                            id="sms-message"
                            rows="3"
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            defaultValue={`Sayın ${showConfirmSmsModal.name}, taşıma talebiniz ${showConfirmSmsModal.status === 'approved' ? 'onaylandı' : 'reddedildi'}. Detaylar için web sitemizi ziyaret edebilirsiniz.`}
                          ></textarea>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!smsSuccess && (
                    <button
                    type="button"
                      onClick={confirmSendSMS}
                      disabled={smsSending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {smsSending ? (
                        <>
                        <FaSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                        <FaSms className="-ml-1 mr-2 h-4 w-4" />
                          SMS Gönder
                        </>
                      )}
                    </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirmSmsModal(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {smsSuccess ? 'Kapat' : 'İptal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 