import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import PortalLayout from '../../components/portal/Layout';
import { FaEnvelope, FaSearch, FaPlus, FaFilter, FaUser, FaTruck, FaMapMarkedAlt, FaClock, FaCheckCircle, FaExclamationCircle, FaTimes, FaEdit, FaTrash, FaCalendarAlt, FaUserTie, FaPaperPlane, FaInbox, FaArchive, FaStar, FaReply, FaPaperclip, FaMap, FaBell, FaTimesCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Script from 'next/script';

export default function Messages() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showTransportSummaryModal, setShowTransportSummaryModal] = useState(false);
  const [selectedTransportId, setSelectedTransportId] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [newMessage, setNewMessage] = useState({
    subject: '',
    content: '',
    recipient: '',
    priority: 'medium',
    category: 'general',
    attachments: []
  });
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [selectedTransportCode, setSelectedTransportCode] = useState('');
  const [selectedPickupAddress, setSelectedPickupAddress] = useState('');
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState('');
  const [transportStatus, setTransportStatus] = useState('');
  const [systemMessages, setSystemMessages] = useState([]);
  const [systemMessagesPagination, setSystemMessagesPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0
  });

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
          type: session.user.userType,
          role: session.user.role,
          status: session.user.status
        });

        // Bildirimleri al
        try {
          const notificationsResponse = await axios.get('/api/portal/notifications', {
            params: {
              page: systemMessagesPagination.page,
              limit: systemMessagesPagination.limit
            }
          });
          
          if (notificationsResponse.data.success) {
            const notificationsData = notificationsResponse.data.data;
            setSystemMessages(notificationsData.notifications || []);
            setSystemMessagesPagination({
              page: notificationsData.pagination.page,
              limit: notificationsData.pagination.limit,
              totalPages: notificationsData.pagination.totalPages,
              total: notificationsData.pagination.total
            });
          }
        } catch (apiError) {
          console.error('Bildirim getirme hatası:', apiError);
          setError('Bildirimler yüklenirken bir hata oluştu');
        }

      } catch (error) {
        console.error('Mesajlar yükleme hatası:', error);
        setError('Mesajlar yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, status, systemMessagesPagination.page, systemMessagesPagination.limit]);

  // Bildirim sayfasını değiştir
  const changeNotificationsPage = (page) => {
    setSystemMessagesPagination(prev => ({
      ...prev,
      page
    }));
  };

  // Bildirimi okundu olarak işaretle
  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/portal/notifications?id=${notificationId}`, {
        read: true
      });
      
      // Bildirimleri güncelle
      setSystemMessages(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('Bildirim güncelleme hatası:', error);
    }
  };

  // Örnek mesaj verileri
  const [messages] = useState([
    {
      id: 'MSG001',
      subject: 'Yeni Taşıma Talebi',
      content: 'ABC Lojistik için yeni bir taşıma talebi oluşturuldu. Detaylar ekte bulunmaktadır.',
      sender: 'Ahmet Yılmaz',
      recipient: 'Mehmet Demir',
      date: '2024-02-20',
      time: '10:30',
      priority: 'high',
      category: 'transport',
      status: 'unread',
      attachments: ['taşıma_talebi.pdf']
    },
    {
      id: 'MSG002',
      subject: 'Depo Raporu',
      content: 'XYZ Depo için aylık envanter raporu hazırlandı. İncelemeniz için gönderiyorum.',
      sender: 'Ayşe Kaya',
      recipient: 'Ali Yıldız',
      date: '2024-02-19',
      time: '14:15',
      priority: 'medium',
      category: 'inventory',
      status: 'read',
      attachments: ['envanter_raporu.xlsx']
    },
    {
      id: 'MSG003',
      subject: 'Araç Bakım Hatırlatması',
      content: '34 ABC 123 plakalı aracın periyodik bakım tarihi yaklaşıyor. Planlama yapılması gerekiyor.',
      sender: 'Sistem',
      recipient: 'Bakım Ekibi',
      date: '2024-02-18',
      time: '09:45',
      priority: 'low',
      category: 'maintenance',
      status: 'read',
      attachments: []
    },
    {
      id: 'MSG004',
      subject: 'Müşteri Toplantısı Daveti',
      content: 'DEF Lojistik ile yeni sözleşme görüşmesi için toplantı daveti. Katılımınızı bekliyoruz.',
      sender: 'Yönetim',
      recipient: 'Tüm Ekip',
      date: '2024-02-17',
      time: '16:20',
      priority: 'high',
      category: 'meeting',
      status: 'unread',
      attachments: ['toplantı_agendası.docx']
    }
  ]);

  const customerMessages = messages.filter(message => message.sender !== 'Sistem');

  const filteredMessages = messages.filter(message => {
    if (statusFilter !== 'all' && message.status !== statusFilter) return false;
    if (searchTerm && !message.subject.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !message.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleSubmitMessage = (e) => {
    e.preventDefault();
    // Yeni mesaj gönderme işlemi burada yapılacak
    setShowNewMessageModal(false);
    setNewMessage({
      subject: '',
      content: '',
      recipient: '',
      priority: 'medium',
      category: 'general',
      attachments: []
    });
  };

  // Taşıma özeti modalını aç
  const handleOpenTransportSummary = (transportId) => {
    setSelectedTransportId(transportId);
    setShowTransportSummaryModal(true);
  };

  // Google Maps yüklendiğinde çağrılacak fonksiyon
  const handleGoogleMapsLoaded = () => {
    setMapLoaded(true);
  };

  // Haritayı başlat
  useEffect(() => {
    if (mapLoaded && showTransportSummaryModal) {
      // Harita başlatma işlemi
      const initMap = () => {
        // Örnek koordinatlar (İstanbul ve Ankara)
        const pickupLocation = { lat: 40.9909, lng: 29.0307 }; // Kadıköy
        const deliveryLocation = { lat: 39.9208, lng: 32.8541 }; // Çankaya
        
        // Harita merkezi (iki nokta arası)
        const center = {
          lat: (pickupLocation.lat + deliveryLocation.lat) / 2,
          lng: (pickupLocation.lng + deliveryLocation.lng) / 2
        };
        
        // Harita oluştur
        const map = new window.google.maps.Map(document.getElementById('transport-map'), {
          zoom: 6,
          center: center,
          mapTypeId: 'roadmap',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Alınacak adres marker'ı
        const pickupMarker = new window.google.maps.Marker({
          position: pickupLocation,
          map: map,
          title: 'Alınacak Adres',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            scaledSize: new window.google.maps.Size(40, 40)
          }
        });
        
        // Teslim edilecek adres marker'ı
        const deliveryMarker = new window.google.maps.Marker({
          position: deliveryLocation,
          map: map,
          title: 'Teslim Edilecek Adres',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(40, 40)
          }
        });
        
        // Araç konumu (örnek olarak)
        const vehicleLocation = {
          lat: pickupLocation.lat + (deliveryLocation.lat - pickupLocation.lat) * 0.3,
          lng: pickupLocation.lng + (deliveryLocation.lng - pickupLocation.lng) * 0.3
        };
        
        // Araç marker'ı
        const vehicleMarker = new window.google.maps.Marker({
          position: vehicleLocation,
          map: map,
          title: 'Araç Konumu',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new window.google.maps.Size(40, 40)
          }
        });
        
        // Rota çizgisi
        const routePath = new window.google.maps.Polyline({
          path: [pickupLocation, vehicleLocation, deliveryLocation],
          geodesic: true,
          strokeColor: '#FF9800',
          strokeOpacity: 0.8,
          strokeWeight: 3
        });
        
        routePath.setMap(map);
        
        // Bilgi pencereleri
        const pickupInfo = new window.google.maps.InfoWindow({
          content: '<div class="p-2"><strong>Alınacak Adres</strong><br>İstanbul, Kadıköy</div>'
        });
        
        const deliveryInfo = new window.google.maps.InfoWindow({
          content: '<div class="p-2"><strong>Teslim Edilecek Adres</strong><br>Ankara, Çankaya</div>'
        });
        
        const vehicleInfo = new window.google.maps.InfoWindow({
          content: '<div class="p-2"><strong>Araç Konumu</strong><br>Taşıma No: ' + selectedTransportId + '</div>'
        });
        
        // Marker'lara tıklama olayları
        pickupMarker.addListener('click', () => {
          pickupInfo.open(map, pickupMarker);
        });
        
        deliveryMarker.addListener('click', () => {
          deliveryInfo.open(map, deliveryMarker);
        });
        
        vehicleMarker.addListener('click', () => {
          vehicleInfo.open(map, vehicleMarker);
        });
      };
      
      // Haritayı başlat
      initMap();
    }
  }, [mapLoaded, showTransportSummaryModal, selectedTransportId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <PortalLayout title="Mesajlar">
      {/* Google Maps API Script */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=handleGoogleMapsLoaded`}
        onLoad={handleGoogleMapsLoaded}
      />
      
      <div className="space-y-6 p-4">
        {/* Üst Bilgi Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="p-3 bg-blue-100 rounded-full">
                <FaEnvelope className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                Toplam
              </span>
            </div>
            <h3 className="text-gray-500 text-sm">Toplam Mesaj</h3>
            <p className="text-2xl font-bold text-gray-800">4</p>
            <p className="mt-2 text-xs text-green-600">
              <FaCheckCircle className="inline mr-1" />
              <span>%100 verimli</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="p-3 bg-green-100 rounded-full">
                <FaInbox className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                Okunmamış
              </span>
            </div>
            <h3 className="text-gray-500 text-sm">Okunmamış Mesajlar</h3>
            <p className="text-2xl font-bold text-gray-800">2</p>
            <p className="mt-2 text-xs text-green-600">
              <FaCheckCircle className="inline mr-1" />
              <span>%50 okunmamış oranı</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaArchive className="h-5 w-5 text-yellow-500" />
              </div>
              <span className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2 py-1 rounded-full">
                Okunmuş
              </span>
            </div>
            <h3 className="text-gray-500 text-sm">Okunmuş Mesajlar</h3>
            <p className="text-2xl font-bold text-gray-800">2</p>
            <p className="mt-2 text-xs text-yellow-600">
              <FaArchive className="inline mr-1" />
              <span>%50 okunmuş oranı</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="p-3 bg-red-100 rounded-full">
                <FaStar className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-xs text-red-700 font-semibold bg-red-50 px-2 py-1 rounded-full">
                Önemli
              </span>
            </div>
            <h3 className="text-gray-500 text-sm">Önemli Mesajlar</h3>
            <p className="text-2xl font-bold text-gray-800">2</p>
            <p className="mt-2 text-xs text-red-600">
              <FaStar className="inline mr-1" />
              <span>%50 önemli oranı</span>
            </p>
          </div>
        </div>

        {/* Arama ve Filtreler */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
            <input
              type="text"
              placeholder="Mesaj ara..."
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
                  <option value="all">Tüm Mesajlar</option>
                  <option value="unread">Okunmamış</option>
                  <option value="read">Okunmuş</option>
                </select>
                <FaFilter className="absolute left-3 top-3 text-gray-400" />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sistem Mesajları ve Müşteri Mesajları */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sol Taraf - Sistem Mesajları */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sistem Mesajları</h3>
            <div className="space-y-4">
              {systemMessages.length > 0 ? (
                <>
                  {systemMessages.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        !notification.read ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className={`font-medium ${!notification.read ? 'text-orange-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-500 line-clamp-2">{notification.message}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          notification.type === 'success' ? 'bg-green-100 text-green-800' : 
                          notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                          notification.type === 'error' ? 'bg-red-100 text-red-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {notification.type === 'success' ? 'Başarılı' : 
                           notification.type === 'warning' ? 'Uyarı' : 
                           notification.type === 'error' ? 'Hata' : 
                           'Bilgi'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <FaUser className="mr-1" />
                          <span>Gönderen: Sistem</span>
                        </div>
                        <div className="flex items-center">
                          <FaCalendarAlt className="mr-1" />
                          <span>Tarih: {notification.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Sayfalama */}
                  {systemMessagesPagination.totalPages > 1 && (
                    <div className="flex justify-center mt-4">
                      <nav className="inline-flex rounded-md shadow">
                        <button
                          onClick={() => changeNotificationsPage(systemMessagesPagination.page - 1)}
                          disabled={systemMessagesPagination.page === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                            systemMessagesPagination.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Önceki</span>
                          <FaChevronLeft className="h-5 w-5" />
                        </button>
                        
                        {[...Array(systemMessagesPagination.totalPages)].map((_, i) => {
                          const pageNumber = i + 1;
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => changeNotificationsPage(pageNumber)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNumber === systemMessagesPagination.page
                                  ? 'bg-orange-50 border-orange-500 text-orange-600 z-10'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => changeNotificationsPage(systemMessagesPagination.page + 1)}
                          disabled={systemMessagesPagination.page === systemMessagesPagination.totalPages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                            systemMessagesPagination.page === systemMessagesPagination.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Sonraki</span>
                          <FaChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FaBell className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-lg">Henüz sistem mesajınız bulunmuyor</p>
                  <p className="text-sm mt-1">Bildirimler burada görüntülenecek</p>
                </div>
              )}
            </div>
          </div>

          {/* Sağ Taraf - Müşteri Mesajları */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Müşteri Mesajları</h3>
            <div className="space-y-4">
              {customerMessages.map(message => (
                <div 
                  key={message.id} 
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    message.status === 'unread' ? 'border-orange-200 bg-orange-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className={`font-medium ${message.status === 'unread' ? 'text-orange-700' : 'text-gray-900'}`}>
                        {message.subject}
                      </h4>
                      <p className="text-sm text-gray-500 line-clamp-2">{message.content}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      message.priority === 'high' ? 'bg-red-100 text-red-800' : 
                      message.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {message.priority === 'high' ? 'Yüksek' : 
                       message.priority === 'medium' ? 'Orta' : 
                       'Düşük'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <FaTruck className="mr-1" />
                      <span>Taşıma No: {message.id}</span>
                    </div>
                    <div className="flex items-center">
                      <FaUserTie className="mr-1" />
                      <span>Alıcı: {message.recipient}</span>
                    </div>
                    <div className="flex items-center">
                      <FaCalendarAlt className="mr-1" />
                      <span>{message.date}{message.time}</span>
                    </div>
                    <div className="flex items-center">
                      <FaEnvelope className="mr-1" />
                      <span>{message.category === 'transport' ? 'Taşıma' : 
                             message.category === 'inventory' ? 'Envanter' : 
                             message.category === 'maintenance' ? 'Bakım' : 
                             'Toplantı'}</span>
                    </div>
                  </div>

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center text-sm text-gray-500">
                        <FaPaperclip className="mr-1" />
                        <span>Ekler: {message.attachments.join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Yeni Mesaj Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Yeni Müşteri Mesajı</h3>
            <button
                onClick={() => setShowNewMessageModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FaTimes className="h-5 w-5" />
            </button>
        </div>

            <form onSubmit={handleSubmitMessage}className="p-6">
        <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taşıma Kodu
                  </label>
                  <select
                    value={selectedTransportCode}
                    onChange={(e) => setSelectedTransportCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="TR001">TR001</option>
                    <option value="TR002">TR002</option>
                    <option value="TR003">TR003</option>
                  </select>
                </div>
                
                {selectedTransportCode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alınacak Adres
                    </label>
                    <p className="text-lg font-semibold text-gray-900">Adres 1</p>
                  </div>
                )}
                
                {selectedTransportCode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teslim Edilecek Adres
                    </label>
                    <p className="text-lg font-semibold text-gray-900">Adres 2</p>
                  </div>
                )}
                
                {selectedTransportCode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Taşıma Durumu
                    </label>
                    <p className="text-lg font-semibold text-gray-900">Taşıma Durumu: {transportStatus}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mesaj İçeriği
                  </label>
                  <textarea
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    rows="5"
                    required
                  ></textarea>
                </div>
                
                      <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Görsel Ekle
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      <FaPaperclip className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500"
                        >
                          <span>Dosya Yükle</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                        </label>
                        <p className="pl-1">veya sürükleyip bırakın</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, XLS, JPG, PNG
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mr-2"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center"
                >
                  <FaPaperPlane className="mr-2" />
                  Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mesaj Detay Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{selectedMessage.subject}</h3>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Mesaj Bilgileri</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <FaTruck className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Taşıma No</p>
                        <button 
                          onClick={() => handleOpenTransportSummary(selectedMessage.id)}
                          className="text-lg font-semibold text-orange-600 hover:text-orange-800 hover:underline"
                        >
                          {selectedMessage.id}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <FaUserTie className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Alıcı</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedMessage.recipient}</p>
                          </div>
                        </div>
                    
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <FaCalendarAlt className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Tarih</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedMessage.date}{selectedMessage.time}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <FaEnvelope className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Kategori</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {selectedMessage.category === 'transport' ? 'Taşıma' : 
                           selectedMessage.category === 'inventory' ? 'Envanter' : 
                           selectedMessage.category === 'maintenance' ? 'Bakım' : 
                           'Toplantı'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Mesaj İçeriği</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-line">{selectedMessage.content}</p>
                  </div>
                  
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Ekler</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ul className="space-y-2">
                          {selectedMessage.attachments.map((attachment, index) => (
                            <li key={index}className="flex items-center text-blue-600 hover:text-blue-800">
                              <FaPaperclip className="mr-2" />
                              <span>{attachment}</span>
                            </li>
                          ))}
                        </ul>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mr-2"
              >
                Kapat
              </button>
              {selectedMessage.sender !== 'Sistem' && (
                <button
                  onClick={() => setShowReplyInput(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                >
                  <FaReply className="mr-2" />
                  Yanıtla
                </button>
              )}
                    </div>

            {showReplyInput && (
              <div className="px-6 py-4 border-t border-gray-200">
                <textarea
                          placeholder="Yanıtınızı yazın..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows="4"
                ></textarea>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowReplyInput(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mr-2"
                  >
                    İptal
                  </button>
                  <button
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center"
                  >
                    <FaPaperPlane className="mr-2" />
                    Gönder
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Taşıma Özeti Modal */}
      {showTransportSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Taşıma Özeti - {selectedTransportId}</h3>
                        <button
                onClick={() => setShowTransportSummaryModal(false)}
                className="text-gray-400 hover:text-gray-500"
                        >
                <FaTimes className="h-5 w-5" />
                        </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Taşıma Bilgileri</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <FaTruck className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Taşıma No</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedTransportId}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <FaMapMarkedAlt className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Alınacak Adres</p>
                        <p className="text-lg font-semibold text-gray-900">İstanbul, Kadıköy</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <FaMapMarkedAlt className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Teslim Edilecek Adres</p>
                        <p className="text-lg font-semibold text-gray-900">Ankara, Çankaya</p>
                      </div>
                    </div>

                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                        <FaUserTie className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Sürücü</p>
                        <p className="text-lg font-semibold text-gray-900">Ahmet Yılmaz</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <FaClock className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Durum</p>
                        <p className="text-lg font-semibold text-green-600">Yolda</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Harita</h4>
                  <div className="bg-gray-50 p-4 rounded-lg h-80">
                    <div id="transport-map" className="w-full h-full rounded-lg"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowTransportSummaryModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Kapat
              </button>
            </div>
        </div>
      </div>
      )}
    </PortalLayout>
  );
} 

