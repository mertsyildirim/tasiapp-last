import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaInbox, FaCalendarAlt, FaMapMarkerAlt, FaClock, FaTruck, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaEye, FaTimes, FaMapMarked, FaDirections } from 'react-icons/fa';
import Link from 'next/link';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';
import axios from 'axios';

export default function FreelanceRequests() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [requestsData, setRequestsData] = useState({
    new: [],
    pending: [],
    accepted: [],
    missed: []
  });
  const [activeTab, setActiveTab] = useState('new');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Google Maps API key
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAKht3SqaVJpufUdq-vVQEfBEQKejT9Z8k";

  // Örnek veri
  useEffect(() => {
    if (status === 'loading') return;
    
    console.log("Freelance Requests - Session durumu:", status, "Session:", session);
    
    // Oturum yoksa login sayfasına yönlendir
    if (status !== 'authenticated') {
      console.log("Oturum doğrulanamadı, login sayfasına yönlendiriliyor");
      router.push('/portal/login');
      return;
    }

    // Talepleri API'den al
    const fetchRequests = async () => {
      setLoading(true);
      try {
        console.log("API isteği gönderiliyor...");
        const response = await axios.get('/api/portal/freelance-requests', {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'x-user-id': session?.user?.id
          },
          params: {
            userId: session?.user?.id
          }
        });
        
        console.log('API yanıtı:', response.data);
        
        if (response.data.success) {
          console.log('Talepler başarıyla alındı:', response.data.requests);
          setRequestsData(response.data.requests);
        } else {
          console.error('Talep verisi alınamadı:', response.data.message);
          // Hata durumunda boş veri göster
          initializeEmptyData();
        }
      } catch (error) {
        console.error('Talep verisi alınırken hata:', error);
        console.error('Hata detayları:', error.response?.data);
        
        // Hata durumunda boş veri göster
        initializeEmptyData();
      } finally {
        setLoading(false);
      }
    };
    
    // Boş talep verisi oluşturma fonksiyonu
    const initializeEmptyData = () => {
      setRequestsData({
        new: [],
        pending: [],
        accepted: [],
        missed: []
      });
    };

    fetchRequests();
  }, [status, router, session]);

  // Yükleme durumu
  if (status === 'loading' || loading) {
    return (
      <FreelanceLayout title="Talepler">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </FreelanceLayout>
    );
  }

  // Oturum açılmamış
  if (status === 'unauthenticated') {
    return (
      <FreelanceLayout title="Talepler">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="bg-white shadow-md rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <FaInbox className="mx-auto h-12 w-12 text-orange-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Oturum Açmanız Gerekiyor</h3>
              <p className="mt-1 text-sm text-gray-500">
                Taşıma taleplerini görüntülemek için lütfen giriş yapın.
              </p>
            </div>
            <div className="mt-5">
              <button
                onClick={() => router.push('/portal/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      </FreelanceLayout>
    );
  }

  const formatDate = (dateStr) => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateStr).toLocaleDateString('tr-TR', options);
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} gün önce`;
    } else if (diffHours > 0) {
      return `${diffHours} saat önce`;
    } else {
      return `${diffMinutes} dakika önce`;
    }
  };

  const handleAccept = async (id) => {
    try {
      // API isteği yap - axios kullanarak
      const response = await axios.post('/api/portal/accept-request', 
        {
          requestId: id
        },
        {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'x-user-id': session?.user?.id
          }
        }
      );

      if (response.data.success) {
        console.log(`Talep kabul edildi: ${id}`);
        
        // İlgili talebi new'den alıp accepted'a taşı
        const updatedData = { ...requestsData };
        const requestIndex = updatedData.new.findIndex(req => req.id === id);
        
        if (requestIndex !== -1) {
          const request = updatedData.new[requestIndex];
          request.status = 'accepted';
          
          // Listeden kaldır ve accepted'a ekle
          updatedData.new.splice(requestIndex, 1);
          updatedData.accepted.push(request);
          
          setRequestsData(updatedData);
        }
      } else {
        alert(`Talep kabul edilirken bir hata oluştu: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Talep kabul hatası:', error);
      console.error('Hata detayları:', error.response?.data);
      alert('Talep kabul edilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const handleReject = async (id) => {
    try {
      // API isteği yap - axios kullanarak
      const response = await axios.post('/api/portal/reject-request', 
        {
          requestId: id
        },
        {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'x-user-id': session?.user?.id
          }
        }
      );

      if (response.data.success) {
        console.log(`Talep reddedildi: ${id}`);
        
        // İlgili talebi listeden çıkar
        const updatedData = { ...requestsData };
        const requestIndex = updatedData.new.findIndex(req => req.id === id);
        
        if (requestIndex !== -1) {
          updatedData.new.splice(requestIndex, 1);
          setRequestsData(updatedData);
        }
      } else {
        alert(`Talep reddedilirken bir hata oluştu: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Talep reddetme hatası:', error);
      console.error('Hata detayları:', error.response?.data);
      alert('Talep reddedilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const handleOffer = (id) => {
    // Teklif verme sayfasına yönlendir
    router.push(`/portal/freelance/offer/${id}`);
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  return (
    <FreelanceLayout title="Talepler">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        {/* Başlık ve Sekmeler */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Taşıma Talepleri</h2>
          </div>
          
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap">
              <button
                onClick={() => setActiveTab('new')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'new'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Yeni Talepler ({requestsData.new.length})
              </button>
              
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Bekleyen Teklifler ({requestsData.pending.length})
              </button>
              
              <button
                onClick={() => setActiveTab('accepted')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'accepted'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Kabul Edilenler ({requestsData.accepted.length})
              </button>
              
              <button
                onClick={() => setActiveTab('missed')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'missed'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Kaçırılan Talepler ({requestsData.missed.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Talep Listesi */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {requestsData[activeTab].length === 0 ? (
            <div className="p-8 text-center">
              <FaInbox className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Talep Bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'new' 
                  ? 'Şu anda yeni taşıma talebi bulunmamaktadır.'
                  : activeTab === 'pending'
                  ? 'Bekleyen teklifiniz bulunmamaktadır.'
                  : activeTab === 'accepted'
                  ? 'Kabul edilmiş taşıma talebi bulunmamaktadır.'
                  : 'Kaçırılan taşıma talebi bulunmamaktadır.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {requestsData[activeTab].map((request) => (
                <li key={request.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="sm:flex sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center">
                        <FaTruck className="h-5 w-5 text-orange-500 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">{request.title}</h3>
                        <span className="ml-2 text-xs text-gray-500">{formatTimeAgo(request.createdAt)}</span>
                      </div>
                    </div>
                    
                    {activeTab === 'new' && (
                      <div className="mt-4 sm:mt-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Yeni Talep
                        </span>
                      </div>
                    )}
                    
                    {activeTab === 'pending' && (
                      <div className="mt-4 sm:mt-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Teklif Bekleniyor
                        </span>
                      </div>
                    )}
                    
                    {activeTab === 'accepted' && (
                      <div className="mt-4 sm:mt-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Kabul Edildi
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Nereden</p>
                        <p className="text-sm font-medium">{request.from}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Nereye</p>
                        <p className="text-sm font-medium">{request.to}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FaCalendarAlt className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Tarih</p>
                        <p className="text-sm font-medium">{formatDate(request.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FaClock className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Saat</p>
                        <p className="text-sm font-medium">{request.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FaTruck className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">Mesafe</p>
                        <p className="text-sm font-medium">{request.distance}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-green-600">{request.price}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleViewDetails(request)}
                      className="inline-flex items-center px-3 py-1.5 border border-orange-300 rounded-md text-sm font-medium text-orange-600 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      <FaEye className="mr-2 -ml-1 h-4 w-4" />
                      Detaylar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Detay Modalı */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={closeModal}
                >
                  <span className="sr-only">Kapat</span>
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                  <FaTruck className="h-6 w-6 text-orange-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {selectedRequest.title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Talep ID: {selectedRequest.id}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Harita Alanı */}
              <div className="my-6 border border-gray-300 rounded-lg overflow-hidden h-64">
                <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
                  <div className="absolute inset-0">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(selectedRequest.from)}&destination=${encodeURIComponent(selectedRequest.to)}&mode=driving`}
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <button
                      className="bg-white rounded-md shadow-md p-2 text-gray-700 hover:bg-gray-50 focus:outline-none"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(selectedRequest.from)}&destination=${encodeURIComponent(selectedRequest.to)}&travelmode=driving`, '_blank')}
                    >
                      <FaDirections className="h-5 w-5 text-orange-500" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 px-4 py-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Müşteri</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedRequest.customer}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Durum</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedRequest.status === 'new' 
                          ? 'bg-blue-100 text-blue-800' 
                          : selectedRequest.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : selectedRequest.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedRequest.status === 'new' 
                          ? 'Yeni Talep' 
                          : selectedRequest.status === 'pending' 
                          ? 'Bekliyor' 
                          : selectedRequest.status === 'accepted'
                          ? 'Kabul Edildi'
                          : 'Kaçırıldı'}
                      </span>
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Nereden</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedRequest.from}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Nereye</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedRequest.to}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Tarih</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedRequest.date)}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Saat</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedRequest.time}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Mesafe</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedRequest.distance}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Ücret</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">{selectedRequest.price}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Talep Zamanı</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatTimeAgo(selectedRequest.createdAt)}</dd>
                  </div>
                </dl>
              </div>
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                {selectedRequest.status === 'new' && (
                  <>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 sm:text-sm"
                      onClick={() => {
                        handleAccept(selectedRequest.id);
                        closeModal();
                      }}
                    >
                      <FaCheckCircle className="mr-2 h-5 w-5" />
                      Kabul Et
                    </button>
                  </>
                )}
                {selectedRequest.status !== 'new' && (
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:text-sm"
                    onClick={closeModal}
                  >
                    Kapat
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </FreelanceLayout>
  );
} 