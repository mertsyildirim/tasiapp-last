import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaInbox, FaCalendarAlt, FaMapMarkerAlt, FaClock, FaTruck, FaCheckCircle, FaTimesCircle, FaInfoCircle } from 'react-icons/fa';
import Link from 'next/link';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';

export default function FreelanceRequests() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace('/portal/login');
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [requestsData, setRequestsData] = useState({
    new: [],
    pending: [],
    accepted: []
  });
  const [activeTab, setActiveTab] = useState('new');

  // Örnek veri
  useEffect(() => {
    if (status === 'loading') return;
    
    console.log("Freelance Requests - Session durumu:", status, "Session:", session);
    
    if (!session) return;

    // Örnek veri - gerçek uygulamada API'den alınacak
    setRequestsData({
      new: [
        {
          id: 'REQ2024001',
          title: 'Ev Eşyası Taşıma',
          customer: 'Ahmet Yılmaz',
          from: 'Kadıköy, İstanbul',
          to: 'Üsküdar, İstanbul',
          date: '2024-05-20',
          time: '09:00 - 12:00',
          distance: '8 km',
          price: '1500 ₺',
          status: 'new',
          createdAt: '2024-05-18T14:30:00'
        },
        {
          id: 'REQ2024002',
          title: 'Ofis Taşıma',
          customer: 'MNO Teknoloji Ltd.',
          from: 'Levent, İstanbul',
          to: 'Maslak, İstanbul',
          date: '2024-05-22',
          time: '14:00 - 18:00',
          distance: '5 km',
          price: '3200 ₺',
          status: 'new',
          createdAt: '2024-05-18T10:15:00'
        }
      ],
      pending: [
        {
          id: 'REQ2024003',
          title: 'Mobilya Taşıma',
          customer: 'Zeynep Kaya',
          from: 'Bakırköy, İstanbul',
          to: 'Beylikdüzü, İstanbul',
          date: '2024-05-25',
          time: '10:00 - 14:00',
          distance: '25 km',
          price: '2800 ₺',
          status: 'pending',
          createdAt: '2024-05-17T09:45:00'
        }
      ],
      accepted: [
        {
          id: 'REQ2024004',
          title: 'Paket Teslimatı',
          customer: 'Ali Demir',
          from: 'Beyoğlu, İstanbul',
          to: 'Şişli, İstanbul',
          date: '2024-05-19',
          time: '15:00 - 16:00',
          distance: '4 km',
          price: '750 ₺',
          status: 'accepted',
          createdAt: '2024-05-16T16:20:00'
        }
      ]
    });
    
    setLoading(false);
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

  const handleAccept = (id) => {
    // API isteği yapılacak - şimdi sadece state güncelleme yapıyoruz
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
  };

  const handleReject = (id) => {
    // API isteği yapılacak - şimdi sadece state güncelleme yapıyoruz
    console.log(`Talep reddedildi: ${id}`);
    
    // İlgili talebi listeden çıkar
    const updatedData = { ...requestsData };
    const requestIndex = updatedData.new.findIndex(req => req.id === id);
    
    if (requestIndex !== -1) {
      updatedData.new.splice(requestIndex, 1);
      setRequestsData(updatedData);
    }
  };

  const handleOffer = (id) => {
    // Teklif verme sayfasına yönlendir
    router.push(`/portal/freelance/offer/${id}`);
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
            <nav className="flex">
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
                  : 'Kabul edilmiş taşıma talebi bulunmamaktadır.'}
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
                      <p className="mt-1 text-sm text-gray-600">Müşteri: {request.customer}</p>
                    </div>
                    
                    {activeTab === 'new' && (
                      <div className="mt-4 sm:mt-0 sm:flex sm:space-x-3">
                        <button
                          onClick={() => handleAccept(request.id)}
                          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <FaCheckCircle className="mr-2 -ml-1 h-4 w-4" />
                          Kabul Et
                        </button>
                        <button
                          onClick={() => handleOffer(request.id)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          <FaInfoCircle className="mr-2 -ml-1 h-4 w-4 text-orange-500" />
                          Teklif Ver
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <FaTimesCircle className="mr-2 -ml-1 h-4 w-4 text-red-500" />
                          Reddet
                        </button>
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
                      <span className="text-lg font-bold text-green-600">{request.price}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </FreelanceLayout>
  );
} 