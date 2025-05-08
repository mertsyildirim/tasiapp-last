import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaMapMarkedAlt, FaRoute, FaCalendarAlt, FaMapMarkerAlt, FaClock, FaTruck, FaFilter, FaSearch, FaPlus, FaEye, FaEyeSlash, FaDirections, FaTimes } from 'react-icons/fa';
import Link from 'next/link';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';

export default function FreelanceRoutes() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showMap, setShowMap] = useState(false);
  
  // Google Maps API key
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAKht3SqaVJpufUdq-vVQEfBEQKejT9Z8k";

  // Örnek veri
  useEffect(() => {
    if (status === 'loading') return;
    
    console.log("Freelance Routes - Session durumu:", status, "Session:", session);
    
    if (!session) {
      // Oturum yoksa boş verilerle devam et
      setRoutes([]);
      setFilteredRoutes([]);
      setLoading(false);
      return;
    }

    // Rota verilerini API'den al
    const fetchRoutes = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/portal/freelance-routes');
        const data = await response.json();
        
        if (data.success) {
          console.log('Rotalar başarıyla alındı:', data);
          
          // API'den gelen verileri ata
          setRoutes(data.routes || []);
          setFilteredRoutes(data.routes || []);
        } else {
          console.error('Rota verisi alınamadı:', data.message);
          // Hata durumunda boş veri göster
          setRoutes([]);
          setFilteredRoutes([]);
        }
      } catch (error) {
        console.error('Rota verisi alınırken hata:', error);
        // Hata durumunda boş veri göster
        setRoutes([]);
        setFilteredRoutes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [status, router, session]);

  // Filtreleme
  useEffect(() => {
    if (!routes.length) return;
    
    let result = [...routes];
    
    // Durum filtresi
    if (filter !== 'all') {
      result = result.filter(route => route.status === filter);
    }
    
    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(route => 
        route.title.toLowerCase().includes(term) ||
        route.startLocation.toLowerCase().includes(term) ||
        route.endLocation.toLowerCase().includes(term) ||
        route.description.toLowerCase().includes(term)
      );
    }
    
    setFilteredRoutes(result);
  }, [routes, filter, searchTerm]);

  // Yükleme durumu
  if (status === 'loading' || loading) {
    return (
      <FreelanceLayout title="Rotalarım">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </FreelanceLayout>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'active':
        return 'Aktif';
      case 'inactive':
        return 'Pasif';
      case 'planned':
        return 'Planlanıyor';
      default:
        return 'Bilinmiyor';
    }
  };

  const handleRouteClick = (route) => {
    setSelectedRoute(route);
    setShowMap(true);
  };
  
  const closeMap = () => {
    setShowMap(false);
    setSelectedRoute(null);
  };

  return (
    <FreelanceLayout title="Rotalarım">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        {/* Başlık ve Arama Filtreleri */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900">Rotalarım</h2>
          </div>
          
          <div className="border-t border-b border-gray-200 px-4 py-4 sm:px-6 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between">
              <div className="w-full md:w-auto flex flex-wrap mb-4 md:mb-0">
                <button
                  onClick={() => setFilter('all')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    filter === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    filter === 'active'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setFilter('planned')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    filter === 'planned'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Planlanıyor
                </button>
              </div>
              
              <div className="w-full md:w-auto relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rota Listesi */}
        {filteredRoutes.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center">
            <FaRoute className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Rota Bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Seçtiğiniz filtre kriterlerine uygun rota bulunmamaktadır.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoutes.map((route) => (
              <div key={route.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="flex flex-col h-full">
                  <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{route.title}</h3>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(route.status)}`}>
                          {getStatusText(route.status)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-green-600">{route.price}</div>
                  </div>
                  
                  <div className="border-t border-gray-200 px-4 py-5 sm:px-6 flex-grow">
                    <p className="text-sm text-gray-700 mb-4">{route.description}</p>
                    
                    <div className="mt-2 space-y-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <FaMapMarkerAlt className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {route.startLocation} → {route.endLocation}
                          </p>
                          <p className="text-sm text-gray-500">{route.distance}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <FaClock className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">Süre: {route.duration}</p>
                          <p className="text-sm text-gray-500">Frekans: {route.frequency}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <FaCalendarAlt className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">Günler:</p>
                          <p className="text-sm text-gray-500 flex flex-wrap">
                            {route.days.map((day, index) => (
                              <span key={index} className="mr-2">{day}</span>
                            ))}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <FaTruck className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {route.vehicleType} ({route.capacity})
                          </p>
                          <p className="text-sm text-gray-500">
                            Sonraki tarih: {formatDate(route.nextDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 px-4 py-4 sm:px-6 flex justify-between items-center">
                    <button
                      onClick={() => handleRouteClick(route)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md"
                    >
                      <FaDirections className="mr-1" />
                      Haritada Göster
                    </button>
                    
                    <div className="flex space-x-2">
                      <Link href={`/portal/freelance/routes/${route.id}/edit`}>
                        <span className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                          Düzenle
                        </span>
                      </Link>
                      {route.status !== 'active' ? (
                        <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                          Aktif Et
                        </button>
                      ) : (
                        <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                          Pasif Et
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Harita Gösterimi Modal */}
        {showMap && selectedRoute && (
          <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black opacity-50" onClick={closeMap}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 md:mx-auto">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">{selectedRoute.title} - Rota Detayı</h3>
                  <button
                    onClick={closeMap}
                    className="rounded-full h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-500"
                  >
                    <span className="sr-only">Kapat</span>
                    <FaTimes className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="px-4 py-4 sm:px-6">
                <div className="border border-gray-300 rounded-md h-96 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <FaMapMarkedAlt className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {selectedRoute.startLocation} → {selectedRoute.endLocation} rotası
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Mesafe: {selectedRoute.distance} | Süre: {selectedRoute.duration}
                    </p>
                    <p className="text-sm mt-6">
                      <span className="font-medium">Koordinatlar (Kalkış):</span>{' '}
                      {selectedRoute.startCoordinates.lat.toFixed(4)}, {selectedRoute.startCoordinates.lng.toFixed(4)}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Koordinatlar (Varış):</span>{' '}
                      {selectedRoute.endCoordinates.lat.toFixed(4)}, {selectedRoute.endCoordinates.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
                
                {selectedRoute.stops.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Mola Noktaları:</h4>
                    <ul className="space-y-2">
                      {selectedRoute.stops.map((stop, index) => (
                        <li key={index} className="text-sm flex items-start">
                          <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center">
                            <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                          </div>
                          <div className="ml-2">
                            <p className="font-medium text-gray-900">{stop.name}</p>
                            <p className="text-gray-500">
                              {stop.time} mola | Koordinatlar: {stop.coordinates.lat.toFixed(4)}, {stop.coordinates.lng.toFixed(4)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/${selectedRoute.startCoordinates.lat},${selectedRoute.startCoordinates.lng}/${selectedRoute.endCoordinates.lat},${selectedRoute.endCoordinates.lng}`, '_blank')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <FaDirections className="mr-2 -ml-1 h-4 w-4" />
                    Google Haritalar&apos;da Aç
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FreelanceLayout>
  );
} 