import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import PortalLayout from '../../components/portal/Layout';
import { 
  FaUserTie, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp, 
  FaEye, FaIdCard, FaPhone, FaEnvelope, FaCar, FaCalendarAlt,
  FaCheckCircle, FaTimesCircle, FaClock, FaPlus, FaMapMarkerAlt, FaTimes,
  FaBuilding
} from 'react-icons/fa';

export default function Drivers() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeDriver, setActiveDriver] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' veya 'edit'
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    email: '',
    licenseNumber: '',
    licenseType: 'B',
    licenseExpiry: '',
    status: 'active',
    vehicle: '',
    address: '',
    birthDate: '',
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Sürücüler state'ini boş dizi olarak başlat
  const [drivers, setDrivers] = useState([]);

  // Kullanıcı verilerini ve sürücüleri getir
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
          email: session.user.email,
          name: session.user.name,
          type: session.user.userType || session.user.type,
          role: session.user.role,
          status: session.user.status,
          company: session.user.company
        });

        // API'den sürücüleri getir
        console.log('Session bilgisi:', session);
        console.log('Sürücüleri getirme isteği gönderiliyor...');
        
        try {
          // API'de artık e-posta adresine göre şirket bulunacağı için companyId gerekmiyor
          const response = await fetch(`/api/portal/drivers`);
        console.log('API cevap durumu:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('API sonucu:', result);
          
          if (result.success) {
              if (result.drivers && Array.isArray(result.drivers)) {
                console.log('Gelen sürücü verileri:', result.drivers);
                setDrivers(result.drivers);
              } else {
                console.log('Sürücü verisi boş veya dizi değil:', result.drivers);
                setDrivers([]); // Veri yoksa boş dizi kullan
              }
          } else {
              console.error('API başarısız sonuç döndü:', result.error);
            setError(result.error || 'Sürücüler alınırken bir hata oluştu');
          }
        } else {
            // HTTP hatası durumunda hata yanıtını aldığından emin ol
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API yanıt kodu: ${response.status}`);
          }
        } catch (apiError) {
          console.error('API isteği hatası:', apiError);
          
          if (apiError.message.includes('Failed to fetch')) {
            setError('API sunucusuna bağlanılamadı. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.');
          } else {
            // API'den dönen hatayı göster veya default mesaj kullan
            setError(`Sürücüleri getirirken hata oluştu: ${apiError.message || 'Sunucu hatası'}`);
          }
          
          // API hatası durumunda boş dizi kullan
          setDrivers([]);
        }

      } catch (error) {
        console.error('Sürücü verileri işlenirken genel hata:', error);
        setError('Sürücüler verileri işlenirken bir hata oluştu.');
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, status]);

  // Sürücüleri filtreleme ve sıralama
  const getFilteredDrivers = () => {
    console.log('Filtreleme işlemi başladı, mevcut sürücü listesi:', drivers);
    return drivers
      .filter(driver => {
        // Durum filtresi
        if (statusFilter !== 'all' && driver.status !== statusFilter) {
          return false;
        }
        
        // Arama filtresi
        if (searchTerm && searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          return (
            (driver._id && driver._id.toString().toLowerCase().includes(term)) || 
            (driver.id && driver.id.toLowerCase().includes(term)) ||
            (driver.name && driver.name.toLowerCase().includes(term)) ||
            (driver.phone && driver.phone.toLowerCase().includes(term)) ||
            (driver.email && driver.email.toLowerCase().includes(term)) ||
            (driver.vehicle && driver.vehicle.toLowerCase().includes(term)) ||
            (driver.companyName && driver.companyName.toLowerCase().includes(term))
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sıralama
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        
        if (sortOrder === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
  };

  // Sürücü durumuna göre renk ve ikon belirle
  const getStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return {
          label: 'Aktif',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          icon: <FaCheckCircle className="mr-1 h-3 w-3" />
        };
      case 'inactive':
        return {
          label: 'Pasif',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          icon: <FaTimesCircle className="mr-1 h-3 w-3" />
        };
      case 'onleave':
        return {
          label: 'İzinli',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          icon: <FaClock className="mr-1 h-3 w-3" />
        };
      default:
        return {
          label: 'Bilinmiyor',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: <FaUserTie className="mr-1 h-3 w-3" />
        };
    }
  };

  // Tarih formatını düzenle
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Tarih ve saat formatını düzenle
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Aktif sürücü detaylarını göster/gizle
  const toggleDriverDetails = (driver) => {
    if (activeDriver && activeDriver._id === driver._id) {
      setActiveDriver(null);
    } else {
      setActiveDriver(driver);
    }
  };

  // Modal açma işlevi
  const openModal = (mode, driver = null) => {
    setModalMode(mode);
    if (mode === 'edit' && driver) {
      // Sürücü verilerini forma doldur
      setDriverForm({
        name: driver.name || '',
        phone: driver.phone || '',
        email: driver.email || '',
        licenseNumber: driver.licenseNumber || '',
        licenseType: driver.licenseType || 'B',
        licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : '',
        status: driver.status || 'active',
        vehicle: driver.vehicle || '',
        address: driver.address || '',
        birthDate: driver.birthDate ? new Date(driver.birthDate).toISOString().split('T')[0] : '',
      });
    } else {
      // Formu temizle
      setDriverForm({
        name: '',
        phone: '',
        email: '',
        licenseNumber: '',
        licenseType: 'B',
        licenseExpiry: '',
        status: 'active',
        vehicle: '',
        address: '',
        birthDate: '',
      });
    }
    setShowModal(true);
  };

  // Form input değişikliklerini yönet
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDriverForm({
      ...driverForm,
      [name]: value
    });
  };

  // Sürücü ekleme işlevi
  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Form verilerini hazırla
      const driverData = {
        ...driverForm,
        company: user.id, // company alanı için user.id kullan
        createdAt: new Date(),
        totalTrips: 0,
        rating: 0,
      };

      console.log('Yeni sürücü verisi:', driverData);

      // API'ye gönder
      const response = await fetch('/api/portal/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(driverData),
      });

      const result = await response.json();
      console.log('Sürücü ekleme sonucu:', result);

      if (result.success) {
        // Yeni sürücüyü listeye ekle
        setDrivers([result.data, ...drivers]);
        setShowModal(false);
        setSuccessMessage('Sürücü başarıyla eklendi');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(result.error || 'Sürücü eklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Sürücü ekleme hatası:', error);
      setError(error.message || 'Sürücü eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Sürücü güncelleme işlevi
  const handleUpdateDriver = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Form verilerini hazırla
      const driverData = {
        ...driverForm,
        updatedAt: new Date(),
      };

      console.log('Güncellenecek sürücü ID:', activeDriver._id);
      console.log('Güncellenecek veriler:', driverData);

      // API'ye gönder
      const response = await fetch(`/api/portal/drivers?id=${activeDriver._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(driverData),
      });

      const result = await response.json();
      console.log('Güncelleme sonucu:', result);

      if (result.success) {
        // Sürücü listesini güncelle
        setDrivers(drivers.map(driver => 
          driver._id === activeDriver._id ? result.data : driver
        ));
        setShowModal(false);
        setActiveDriver(result.data);
        setSuccessMessage('Sürücü başarıyla güncellendi');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(result.error || 'Sürücü güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Sürücü güncelleme hatası:', error);
      setError(error.message || 'Sürücü güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Sürücü silme işlevi
  const handleDeleteDriver = async (driverId) => {
    try {
      if (!confirm('Bu sürücüyü silmek istediğinizden emin misiniz?')) {
        return;
      }

      setLoading(true);
      setError(null);

      console.log('Silinecek sürücü ID:', driverId);

      // API'ye gönder
      const response = await fetch(`/api/portal/drivers?id=${driverId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      console.log('Silme sonucu:', result);

      if (result.success) {
        // Sürücü listesini güncelle
        setDrivers(drivers.filter(driver => driver._id !== driverId));
        if (activeDriver && activeDriver._id === driverId) {
          setActiveDriver(null);
        }
        setSuccessMessage('Sürücü başarıyla silindi');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(result.error || 'Sürücü silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Sürücü silme hatası:', error);
      setError(error.message || 'Sürücü silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Form gönderme işlevi
  const handleSubmit = (e) => {
    if (modalMode === 'add') {
      handleAddDriver(e);
    } else {
      handleUpdateDriver(e);
    }
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <PortalLayout title="Sürücüler">
        <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
      </PortalLayout>
    );
  }

  // Filtrelenmiş sürücüler
  const filteredDrivers = getFilteredDrivers();

  return (
    <>
      <Head>
        <title>Sürücüler - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı Sürücüler" />
      </Head>
      
    <PortalLayout title="Sürücüler">
      <div className="space-y-6 p-4">
          {/* Başarı Mesajı */}
          {successMessage && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded shadow">
              <p>{successMessage}</p>
            </div>
          )}

          {/* Hata Mesajı */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow">
              <p>{error}</p>
            </div>
          )}

        {/* Üst Bilgi Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FaUserTie className="h-5 w-5 text-blue-500" />
              </div>
                  <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                Toplam
              </span>
            </div>
                <h3 className="text-gray-500 text-sm">Toplam Sürücü</h3>
                <p className="text-2xl font-bold text-gray-800">{drivers.length}</p>
                <p className="mt-2 text-xs text-blue-600">
                  <FaCheckCircle className="inline mr-1" />
                  <span>Tüm sürücüler</span>
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
            <h3 className="text-gray-500 text-sm">Aktif Sürücüler</h3>
                <p className="text-2xl font-bold text-gray-800">
                  {drivers.filter(d => d.status === 'active').length}
                </p>
            <p className="mt-2 text-xs text-green-600">
                  <FaCheckCircle className="inline mr-1" />
                  <span>Çalışmaya hazır</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <FaClock className="h-5 w-5 text-yellow-500" />
              </div>
                  <span className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2 py-1 rounded-full">
                    İzinli
              </span>
            </div>
                <h3 className="text-gray-500 text-sm">İzinli Sürücüler</h3>
                <p className="text-2xl font-bold text-gray-800">
                  {drivers.filter(d => d.status === 'onleave').length}
                </p>
                <p className="mt-2 text-xs text-yellow-600">
                  <FaClock className="inline mr-1" />
                  <span>Geçici olarak müsait değil</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
                  <div className="p-3 bg-red-100 rounded-full">
                    <FaTimesCircle className="h-5 w-5 text-red-500" />
              </div>
                  <span className="text-xs text-red-700 font-semibold bg-red-50 px-2 py-1 rounded-full">
                    Pasif
              </span>
            </div>
                <h3 className="text-gray-500 text-sm">Pasif Sürücüler</h3>
                <p className="text-2xl font-bold text-gray-800">
                  {drivers.filter(d => d.status === 'inactive').length}
                </p>
                <p className="mt-2 text-xs text-red-600">
                  <FaTimesCircle className="inline mr-1" />
                  <span>Çalışmaya uygun değil</span>
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
                placeholder="Sürücü ara..."
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
                      <option value="all">Tüm Sürücüler</option>
                    <option value="active">Aktif</option>
                      <option value="onleave">İzinli</option>
                    <option value="inactive">Pasif</option>
                  </select>
                    <FaFilter className="absolute left-3 top-3 text-gray-400" />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                </div>
                </div>
                </div>
                <div className="flex gap-2">
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
                <button 
                    onClick={() => openModal('add')}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center"
                >
                    <FaPlus className="mr-2" />
                    Yeni Sürücü
                </button>
              </div>
            </div>
        </div>

            {/* Sürücüler Listesi */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sürücü Listesi</h3>
              
            {drivers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Şirkete ait sürücü bulunamadı.</p>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Filtrelere uygun sürücü bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredDrivers.map((driver) => {
                  console.log('Görüntülenen sürücü:', driver);
                  const statusInfo = getStatusInfo(driver.status);
                  const isActive = activeDriver && activeDriver._id === driver._id;
                  return (
                    <div 
                      key={driver._id} 
                      className={`border ${isActive ? 'border-orange-300' : 'border-gray-200'} rounded-lg p-4 hover:shadow-md transition-shadow ${isActive ? 'bg-orange-50' : ''}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start mb-3">
                  <div>
                          <div className="flex items-center">
                    <h4 className="font-medium text-gray-900">{driver.name || 'İsimsiz Sürücü'}</h4>
                            <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full flex items-center ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                  </span>
                </div>
                          <p className="text-sm text-gray-500 mt-1">#{driver._id ? driver._id.toString().substring(0, 10) : 'ID yok'}</p>
                          {driver.companyName && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <FaBuilding className="mr-1" />
                              <span>{driver.companyName}</span>
                  </div>
                          )}
                  </div>
                        <div className="mt-2 md:mt-0">
                  <button 
                            onClick={() => toggleDriverDetails(driver)}
                            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                  >
                            <FaEye className="mr-1" />
                            {isActive ? 'Gizle' : 'Detaylar'}
                  </button>
        </div>
      </div>

                      <div className="flex flex-col md:flex-row justify-between items-start my-2 text-sm">
                        <div className="flex items-start mb-2 md:mb-0">
                          <FaPhone className="text-gray-400 mt-1 mr-1" />
                          <p className="text-gray-700">{driver.phone || 'Telefon yok'}</p>
              </div>

                        <div className="flex items-start">
                          <div className="mr-6">
                            <p className="text-xs text-gray-500 mb-1">Araç</p>
                            <p className="text-gray-700">{driver.vehicle || 'Belirtilmemiş'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Son Aktif</p>
                            <p className="text-gray-700">{driver.lastActive ? formatDate(driver.lastActive) : 'Belirsiz'}</p>
                      </div>
                    </div>
                  </div>

                      {isActive && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                              <h5 className="font-medium text-gray-900 mb-2">Kişisel Bilgiler</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start mb-2">
                                  <FaEnvelope className="text-orange-500 mt-1 mr-2" />
                        <div>
                                    <p className="text-sm font-medium">E-posta</p>
                                    <p className="text-sm">{driver.email || 'E-posta yok'}</p>
                        </div>
                      </div>
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                        <div>
                                    <p className="text-sm font-medium">Doğum Tarihi</p>
                                    <p className="text-sm">{driver.birthDate ? formatDate(driver.birthDate) : 'Belirsiz'}</p>
                        </div>
                      </div>
                                <div className="flex items-start mb-2">
                                  <FaMapMarkerAlt className="text-orange-500 mt-1 mr-2" />
                        <div>
                                    <p className="text-sm font-medium">Adres</p>
                                    <p className="text-sm">{driver.address || 'Adres yok'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                              <h5 className="font-medium text-gray-900 mb-2">Sürücü Bilgileri</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start mb-2">
                                  <FaIdCard className="text-orange-500 mt-1 mr-2" />
                            <div>
                                    <p className="text-sm font-medium">Ehliyet Bilgileri</p>
                                    <p className="text-sm">{driver.licenseType || '-'} Sınıfı - {driver.licenseNumber || '-'}</p>
                                    <p className="text-xs text-gray-500">Geçerlilik: {driver.licenseExpiry ? formatDate(driver.licenseExpiry) : 'Belirsiz'}</p>
                            </div>
                            </div>
                                <div className="flex items-start mb-2">
                                  <FaCar className="text-orange-500 mt-1 mr-2" />
                  <div>
                                    <p className="text-sm font-medium">Toplam Sefer</p>
                                    <p className="text-sm">{driver.totalTrips || '0'} sefer</p>
                          </div>
                        </div>
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                        <div>
                                    <p className="text-sm font-medium">Katılım Tarihi</p>
                                    <p className="text-sm">{driver.joinDate ? formatDate(driver.joinDate) : (driver.createdAt ? formatDate(driver.createdAt) : 'Belirsiz')}</p>
                        </div>
                      </div>
                    </div>
                </div>
              </div>

                          <div className="mt-4 flex justify-end space-x-2">
                            <button
                              onClick={() => handleDeleteDriver(driver._id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                              Sürücüyü Sil
                            </button>
                  <button
                              onClick={() => openModal('edit', driver)}
                              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                            >
                              Sürücüyü Düzenle
                    </button>
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

      {/* Sürücü Ekleme/Düzenleme Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {modalMode === 'add' ? 'Yeni Sürücü Ekle' : 'Sürücü Düzenle'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FaTimes className="h-5 w-5" />
              </button>
        </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad*
                      </label>
                      <input
                        type="text"
                        name="name"
                    value={driverForm.name}
                        onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon*
                      </label>
                        <input
                          type="tel"
                          name="phone"
                    value={driverForm.phone}
                          onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          required
                        />
                      </div>
                
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-posta
                      </label>
                      <input
                        type="email"
                        name="email"
                    value={driverForm.email}
                        onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ehliyet Numarası*
                      </label>
                      <input
                    type="text"
                    name="licenseNumber"
                    value={driverForm.licenseNumber}
                        onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                  </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ehliyet Sınıfı*
                      </label>
                  <select
                    name="licenseType"
                    value={driverForm.licenseType}
                        onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                  >
                    <option value="B">B Sınıfı</option>
                    <option value="C">C Sınıfı</option>
                    <option value="D">D Sınıfı</option>
                    <option value="E">E Sınıfı</option>
                  </select>
                    </div>
                
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ehliyet Geçerlilik Tarihi*
                      </label>
                      <input
                        type="date"
                    name="licenseExpiry"
                    value={driverForm.licenseExpiry}
                        onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                  </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durum
                      </label>
                  <select
                    name="status"
                    value={driverForm.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="onleave">İzinli</option>
                  </select>
                          </div>
                
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                    Araç
                        </label>
                        <input
                    type="text"
                    name="vehicle"
                    value={driverForm.vehicle}
                          onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                  </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                    </label>
                    <textarea
                    name="address"
                    value={driverForm.address}
                      onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      rows="3"
                    ></textarea>
                  </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doğum Tarihi
                      </label>
                              <input
                    type="date"
                    name="birthDate"
                    value={driverForm.birthDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                          </div>
                        </div>
              
              <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mr-2"
                  >
                    İptal
                      </button>
                  <button
                    type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {modalMode === 'add' ? 'Ekle' : 'Güncelle'}
                      </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 