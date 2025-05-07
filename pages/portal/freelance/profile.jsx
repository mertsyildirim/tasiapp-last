import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaMapMarkerAlt, FaTruck, FaSave, FaPencilAlt, FaCamera, FaBuilding, FaCreditCard, FaRegAddressCard, FaCity, FaGlobe, FaMapMarkedAlt, FaTimes, FaEdit, FaCheck, FaPlus, FaInfo } from 'react-icons/fa';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';

export default function FreelanceProfile() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      // Bu fonksiyon artık çalışmayacak çünkü required: false
      // Sayfa içinde yönlendirmeyi kendimiz yöneteceğiz
      //router.replace('/portal/login');
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  
  const [showRoutesModal, setShowRoutesModal] = useState(false);
  const [showVehiclesModal, setShowVehiclesModal] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState([
    { id: 1, from: 'İstanbul', to: 'Ankara', distance: '450 km' },
    { id: 2, from: 'İstanbul', to: 'İzmir', distance: '480 km' },
    { id: 3, from: 'İstanbul', to: 'Bursa', distance: '150 km' },
    { id: 4, from: 'İstanbul', to: 'Antalya', distance: '670 km' },
    { id: 5, from: 'Ankara', to: 'İzmir', distance: '580 km' },
    { id: 6, from: 'Ankara', to: 'Antalya', distance: '450 km' },
    { id: 7, from: 'İzmir', to: 'Antalya', distance: '320 km' },
  ]);
  
  const [availableVehicles, setAvailableVehicles] = useState([
    { id: 1, type: 'Tır', capacity: '20+ ton', image: '/vehicles/truck.png' },
    { id: 2, type: 'Kamyon', capacity: '10-20 ton', image: '/vehicles/truck.png' },
    { id: 3, type: 'Kamyonet', capacity: '3-10 ton', image: '/vehicles/van.png' },
    { id: 4, type: 'Panelvan', capacity: '1-3 ton', image: '/vehicles/van.png' },
    { id: 5, type: 'Pickup', capacity: '0.5-1 ton', image: '/vehicles/pickup.png' },
  ]);
  
  const [selectedRoutesIds, setSelectedRoutesIds] = useState([]);
  const [selectedVehiclesIds, setSelectedVehiclesIds] = useState([]);

  // API'den profil verilerini al
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      console.log('Profil verisi yükleniyor...');
      
      // DEV MODE: Geliştirme ortamında test verisi kullan
      const isDevelopment = false; // Geliştirme modu kapatıldı, gerçek API kullanılacak
      if (isDevelopment) {
        console.log('DEV MODE: Test verileri yükleniyor.');
        // Test verileri
        const testProfile = {
          id: 'dev-test-id',
          name: 'Test Kullanıcı',
          email: 'test@tasiapp.com',
          phone: '+90 555 123 45 67',
          taxId: '12345678901',
          company: 'Test Nakliyat Ltd. Şti.',
          address: 'Test Mah. Test Cad. No:1',
          district: 'Test İlçe',
          city: 'Test Şehir',
          registrationDate: new Date().toISOString(),
          isFreelance: true,
          activeStatus: true,
          verificationStatus: 'verified',
          rating: 4.5,
          completedTasks: 42,
          preferredRoutes: ['İstanbul-Ankara', 'İstanbul-İzmir'],
          vehicleTypes: ['Tır', 'Kamyon'],
          avatar: null,
          notes: 'Test kullanıcı notları',
          bankInfo: {
            bankName: 'Test Bank',
            accountHolder: 'Test Kullanıcı',
            iban: 'TR12 3456 7890 1234 5678 90',
            accountNumber: '1234567890'
          }
        };
        
        // Test verisi kullanıp loading durumunu kapat
        setTimeout(() => {
          setProfile(testProfile);
          setFormData(testProfile);
          setLoading(false);
          console.log('Test verileri yüklendi');
        }, 500); // Kısa bir gecikme ekle
        return;
      }
      
      if (!session || !session.user) {
        console.error('Oturum bilgisi yok, profil verisi alınamıyor');
        setLoading(false);
        return;
      }
      
      // API'yi çağırırken session bilgilerini doğru şekilde ileteceğiz
      console.log('API isteği gönderiliyor...');
      const response = await fetch('/api/portal/profile', {
        method: 'GET',
        credentials: 'include', // Cookie'leri gönder (oturum bilgisi için önemli)
        headers: {
          'Content-Type': 'application/json',
          // Session ID veya token varsa ekleyelim
          ...(session?.user?.id && { 'X-User-ID': session.user.id }),
          ...(session?.user?.email && { 'X-User-Email': session.user.email }),
          // NextAuth tarafından oluşturulan token veya JWT varsa
          ...(session?.accessToken && { 'Authorization': `Bearer ${session.accessToken}` })
        }
      });
      
      // Response durumunu kontrol edelim
      console.log('API yanıtı alındı, durum kodu:', response.status);
      if (response.status === 401) {
        console.error('Yetkilendirme hatası (401). Oturum geçersiz olabilir.');
        // Oturum sorununu gösterecek bir hata mesajı
        setProfile(null);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('API verisi alındı:', data.success ? 'Başarılı' : 'Başarısız');
      
      if (data.success && data.user) {
        // Veritabanından gelen verileri uygun formata dönüştür
        const profileData = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
          taxId: data.user.taxNumber,
          company: data.user.company,
          address: data.user.address,
          district: data.user.district || '',
          city: data.user.city,
          registrationDate: new Date().toISOString(), // Şimdiki zamanı kullan
          isFreelance: true,
          activeStatus: true,
          verificationStatus: data.user.status || 'verified',
          rating: data.user.rating || 0,
          completedTasks: data.user.completedTasks || 0,
          preferredRoutes: data.user.serviceAreas?.preferredRoutes || [],
          vehicleTypes: data.user.transportTypes || [],
          avatar: data.user.avatar || null,
          notes: data.user.description || '',
          bankInfo: data.user.bankInfo || {
            bankName: '',
            accountHolder: '',
            iban: '',
            accountNumber: ''
          }
        };
        
        console.log('Profil verisi ayarlanıyor');
        setProfile(profileData);
        setFormData(profileData);
      } else {
        console.log('API verisi boş veya başarısız, boş profil oluşturuluyor');
        // API'den veri gelmezse boş veri kullan
        const emptyProfile = {
          id: '',
          name: '',
          email: '',
          phone: '',
          taxId: '',
          company: '',
          address: '',
          district: '',
          city: '',
          registrationDate: new Date().toISOString(),
          isFreelance: true,
          activeStatus: true,
          verificationStatus: 'pending',
          rating: 0,
          completedTasks: 0,
          preferredRoutes: [],
          vehicleTypes: [],
          avatar: null,
          notes: '',
          bankInfo: {
            bankName: '',
            accountHolder: '',
            iban: '',
            accountNumber: ''
          }
        };
        
        setProfile(emptyProfile);
        setFormData(emptyProfile);
      }
    } catch (error) {
      console.error('Profil verileri alınırken hata:', error);
      // Hata durumunda boş veriyi kullan
      const emptyProfile = {
        id: '',
        name: '',
        email: '',
        phone: '',
        taxId: '',
        company: '',
        address: '',
        district: '',
        city: '',
        registrationDate: new Date().toISOString(),
        isFreelance: true,
        activeStatus: true,
        verificationStatus: 'pending',
        rating: 0,
        completedTasks: 0,
        preferredRoutes: [],
        vehicleTypes: [],
        avatar: null,
        notes: '',
        bankInfo: {
          bankName: '',
          accountHolder: '',
          iban: '',
          accountNumber: ''
        }
      };
      
      setProfile(emptyProfile);
      setFormData(emptyProfile);
    } finally {
      console.log('Yükleme durumu kapatılıyor');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) return;

    fetchProfileData();
  }, [status, session]);

  useEffect(() => {
    if (profile && profile.preferredRoutes) {
      const routeIds = availableRoutes
        .filter(route => profile.preferredRoutes.includes(`${route.from}-${route.to}`))
        .map(route => route.id);
      setSelectedRoutesIds(routeIds);
    }
    
    if (profile && profile.vehicleTypes) {
      const vehicleIds = availableVehicles
        .filter(vehicle => profile.vehicleTypes.includes(vehicle.type))
        .map(vehicle => vehicle.id);
      setSelectedVehiclesIds(vehicleIds);
    }
  }, [profile, availableRoutes, availableVehicles]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      bankInfo: {
        ...prev.bankInfo,
        [name]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Kullanıcı verilerini hazırla
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        taxNumber: formData.taxId,
        taxOffice: "", // Şimdilik boş bırakıyoruz
        address: formData.address,
        district: formData.district || "", // İlçe bilgisini ekliyoruz
        city: formData.city,
        description: formData.notes,
        // Banka bilgilerini ekleyelim
        bankInfo: {
          bankName: formData.bankInfo.bankName,
          accountHolder: formData.bankInfo.accountHolder,
          iban: formData.bankInfo.iban,
          accountNumber: formData.bankInfo.accountNumber
        }
      };

      // API'ye gönder
      const response = await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success) {
        // Profil verilerini güncelle
        setProfile(formData);
        setIsEditing(false);
      } else {
        alert('Profil güncellenirken bir hata oluştu: ' + data.message);
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      alert('Profil güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const toggleRouteSelection = (routeId) => {
    setSelectedRoutesIds(prev => 
      prev.includes(routeId) 
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const toggleVehicleSelection = (vehicleId) => {
    setSelectedVehiclesIds(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const saveRoutes = async () => {
    try {
      const selectedRoutes = availableRoutes
        .filter(route => selectedRoutesIds.includes(route.id))
        .map(route => `${route.from}-${route.to}`);
      
      // Profil verilerini güncelle
      setFormData(prev => ({
        ...prev,
        preferredRoutes: selectedRoutes
      }));
      
      // API'ye gönder
      const response = await fetch('/api/portal/service-areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferredRoutes: selectedRoutes,
          // tasiapp.com/portal/profile formatına uygun olması için
          serviceAreas: {
            preferredRoutes: selectedRoutes
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProfile(prev => ({
          ...prev,
          preferredRoutes: selectedRoutes
        }));
        setShowRoutesModal(false);
      } else {
        alert('Tercih edilen rotalar güncellenirken bir hata oluştu: ' + data.message);
      }
    } catch (error) {
      console.error('Rotalar kaydetme hatası:', error);
      alert('Rotalar güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  const saveVehicles = async () => {
    try {
      const selectedVehicles = availableVehicles
        .filter(vehicle => selectedVehiclesIds.includes(vehicle.id))
        .map(vehicle => vehicle.type);
      
      // Profil verilerini güncelle
      setFormData(prev => ({
        ...prev,
        vehicleTypes: selectedVehicles
      }));
      
      // API'ye gönder
      const response = await fetch('/api/portal/transport-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transportTypes: selectedVehiclesIds, // API'ye ID'leri gönderiyoruz
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProfile(prev => ({
          ...prev,
          vehicleTypes: selectedVehicles
        }));
        setShowVehiclesModal(false);
      } else {
        alert('Araç tipleri güncellenirken bir hata oluştu: ' + data.message);
      }
    } catch (error) {
      console.error('Araç tipleri kaydetme hatası:', error);
      alert('Araç tipleri güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  // Yükleme durumu
  if (status === 'loading' || loading) {
    return (
      <FreelanceLayout title="Profilim">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </FreelanceLayout>
    );
  }

  // Oturum yoksa
  if (!session) {
    return (
      <FreelanceLayout title="Profilim">
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Oturum açılmamış</h2>
            <p className="text-gray-600 mb-6">Profil bilgilerinizi görüntülemek için lütfen giriş yapın.</p>
            <button
              onClick={() => router.push('/portal/login')}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </FreelanceLayout>
    );
  }

  // Profil verisi yoksa
  if (!profile || !profile.id) {
    return (
      <FreelanceLayout title="Profilim">
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Profil bulunamadı</h2>
            <p className="text-gray-600 mb-6">
              Profil bilgileriniz bulunamadı veya henüz oluşturulmamış. Lütfen sistem yöneticinizle iletişime geçin.
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => router.push('/portal/freelance/dashboard')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
              >
                Ana Sayfaya Dön
              </button>
              <button
                onClick={() => fetchProfileData()}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition"
              >
                Yeniden Dene
              </button>
            </div>
          </div>
        </div>
      </FreelanceLayout>
    );
  }

  return (
    <FreelanceLayout title="Profilim">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Profil Bilgilerim</h2>
            <div className="flex space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${profile.activeStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {profile.activeStatus ? 'Aktif' : 'Pasif'}
              </span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                {isEditing ? (
                  <>
                    <FaSave className="mr-2 -ml-1 h-4 w-4" />
                    {isEditing ? 'Kaydet' : 'Vazgeç'}
                  </>
                ) : (
                  <>
                    <FaPencilAlt className="mr-2 -ml-1 h-4 w-4" />
                    Düzenle
                  </>
                )}
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-5 sm:p-6">
              {/* Profil Kartı */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-md p-6 mb-8">
                <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-8">
                  <div className="flex-shrink-0 mb-4 md:mb-0">
                    <div className="h-32 w-32 bg-white rounded-full flex items-center justify-center border-4 border-white relative">
                      {profile.avatar ? (
                        <img
                          src={profile.avatar}
                          alt="Profil Resmi"
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <FaUser className="h-16 w-16 text-orange-300" />
                      )}
                      
                      {isEditing && (
                        <div className="absolute -bottom-2 -right-2">
                          <button
                            type="button"
                            className="h-10 w-10 rounded-full bg-white text-orange-600 flex items-center justify-center hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                          >
                            <FaCamera className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center md:text-left text-white">
                    <h3 className="text-2xl font-bold">{profile.name}</h3>
                    <p className="text-orange-100">{profile.company}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="bg-white bg-opacity-20 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                        Freelance Taşıyıcı
                      </span>
                      <span className="bg-white bg-opacity-20 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                        ID: {profile.id}
                      </span>
                      <span className="bg-white bg-opacity-20 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                        <span className="flex items-center mr-1">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`h-3 w-3 ${
                                i < Math.floor(profile.rating) ? 'text-yellow-300' : 'text-white text-opacity-30'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </span>
                        {profile.rating}
                      </span>
                    </div>
                    <p className="text-sm mt-2 text-orange-100">
                      {profile.completedTasks} Tamamlanan Taşıma • Üyelik: {new Date(profile.registrationDate).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Bilgi Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kişisel Bilgiler */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">Kişisel Bilgiler</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaUser className="h-4 w-4 text-orange-500 mr-2" />
                          {profile.name}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      {isEditing ? (
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaEnvelope className="h-4 w-4 text-orange-500 mr-2" />
                          {profile.email}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefon</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaPhone className="h-4 w-4 text-orange-500 mr-2" />
                          {profile.phone}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vergi No / TC Kimlik No</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="taxId"
                          value={formData.taxId}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaIdCard className="h-4 w-4 text-orange-500 mr-2" />
                          {profile.taxId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Firma Bilgileri */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">Firma Bilgileri</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Firma Adı</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaBuilding className="h-4 w-4 text-orange-500 mr-2" />
                          {profile.company}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-gray-700">Tercih Edilen Rotalar</label>
                        <button
                          onClick={(e) => {
                            e.preventDefault(); // Formun submit olmasını engelle
                            setShowRoutesModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-800 text-sm inline-flex items-center"
                        >
                          <FaEdit className="h-3.5 w-3.5 mr-1" />
                          Düzenle
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profile.preferredRoutes.length > 0 ? (
                          profile.preferredRoutes.map((route, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <FaMapMarkedAlt className="mr-1 h-3 w-3" />
                              {route}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Rota belirtilmemiş</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-medium text-gray-700">Araç Tipleri</label>
                        <button
                          onClick={(e) => {
                            e.preventDefault(); // Formun submit olmasını engelle
                            setShowVehiclesModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-800 text-sm inline-flex items-center"
                        >
                          <FaEdit className="h-3.5 w-3.5 mr-1" />
                          Düzenle
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profile.vehicleTypes.length > 0 ? (
                          profile.vehicleTypes.map((type, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <FaTruck className="mr-1 h-3 w-3" />
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Araç tipi belirtilmemiş</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notlar</label>
                      {isEditing ? (
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows="2"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">
                          {profile.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Adres Bilgileri */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">Adres Bilgileri</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Adres</label>
                      {isEditing ? (
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          rows="2"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-start">
                          <FaMapMarkerAlt className="h-4 w-4 text-orange-500 mr-2 mt-0.5" />
                          {profile.address}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">İlçe</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="district"
                            value={formData.district || ''}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-gray-900 flex items-center">
                            <FaMapMarkerAlt className="h-4 w-4 text-orange-500 mr-2" />
                            {profile.district || 'Belirtilmemiş'}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Şehir</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                          />
                        ) : (
                          <p className="mt-1 text-sm text-gray-900 flex items-center">
                            <FaCity className="h-4 w-4 text-orange-500 mr-2" />
                            {profile.city}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Banka Bilgileri */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900">Banka Bilgileri</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Banka Adı</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="bankName"
                          value={formData.bankInfo.bankName}
                          onChange={handleBankInfoChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaBuilding className="h-4 w-4 text-orange-500 mr-2" />
                          {profile.bankInfo.bankName}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hesap Sahibi</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="accountHolder"
                          value={formData.bankInfo.accountHolder}
                          onChange={handleBankInfoChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaUser className="h-4 w-4 text-orange-500 mr-2" />
                          {profile.bankInfo.accountHolder}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">IBAN</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="iban"
                          value={formData.bankInfo.iban}
                          onChange={handleBankInfoChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaCreditCard className="h-4 w-4 text-orange-500 mr-2" />
                          {profile.bankInfo.iban}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hesap Numarası</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="accountNumber"
                          value={formData.bankInfo.accountNumber}
                          onChange={handleBankInfoChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaCreditCard className="h-4 w-4 text-orange-500 mr-2" />
                          {profile.bankInfo.accountNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {isEditing && (
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t border-gray-200">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <FaSave className="mr-2 -ml-1 h-4 w-4" />
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(profile);
                    setIsEditing(false);
                  }}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Vazgeç
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
      
      {/* Hizmet Bölgeleri Modal */}
      {showRoutesModal && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => setShowRoutesModal(false)}
                >
                  <span className="sr-only">Kapat</span>
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
              
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-xl leading-6 font-semibold text-gray-900">
                    Hizmet Bölgeleri
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Hizmet verdiğiniz alınacak ve teslim edilecek adres bölgelerini belirleyin.
                  </p>
                </div>
              </div>
              
              <div className="mt-5">
                {/* Harita Görünümü */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Hizmet Bölgeleri Haritası</h4>
                  <div className="h-64 border border-gray-300 rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center p-8">
                        <p className="text-gray-500 mb-2">Hizmet bölgeleri görüntülenemiyor</p>
                        <p className="text-sm text-gray-400">Aşağıda tanımladığınız bölgeler geçerlidir</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-center space-x-6">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-700">Alabileceğiniz Adresler</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-orange-700 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-700">Teslim Edebileceğiniz Adresler</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex space-x-2 items-center text-sm">
                    <FaInfo className="text-orange-500" />
                    <span>Seçtiğiniz rotalar için taşıma talebi aldığınızda öncelikli bildirim alacaksınız.</span>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Alınacak Adresler */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Alabileceğiniz Adresler</h4>
                    
                    {/* Seçili adresler */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedRoutesIds.map((routeId) => {
                          const route = availableRoutes.find(r => r.id === routeId);
                          return (
                            <div key={routeId} className="flex items-center bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                              <span>{route ? `${route.from} - ${route.to}` : 'Bilinmeyen Rota'}</span>
                              <button 
                                onClick={() => toggleRouteSelection(routeId)}
                                className="ml-2 text-orange-600 hover:text-orange-800"
                              >
                                <FaTimes className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                        {selectedRoutesIds.length === 0 && (
                          <div className="text-gray-500 text-sm">
                            <p>Henüz alabileceğiniz adres bölgesi eklenmemiş.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Adres seçimi */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            İl
                          </label>
                          <select
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="">İl Seçin</option>
                            <option value="1">İstanbul</option>
                            <option value="2">Ankara</option>
                            <option value="3">İzmir</option>
                            <option value="4">Bursa</option>
                            <option value="5">Antalya</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            İlçeler
                          </label>
                          <div className="flex items-center mb-2">
                            <button
                              className="text-xs text-orange-600 hover:text-orange-800"
                            >
                              Tümünü Seç
                            </button>
                          </div>
                          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                            <div className="flex items-center mb-1">
                              <input
                                type="checkbox"
                                id="district-1"
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <label htmlFor="district-1" className="ml-2 block text-sm text-gray-700">
                                Kadıköy
                              </label>
                            </div>
                            <div className="flex items-center mb-1">
                              <input
                                type="checkbox"
                                id="district-2"
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <label htmlFor="district-2" className="ml-2 block text-sm text-gray-700">
                                Üsküdar
                              </label>
                            </div>
                            <div className="flex items-center mb-1">
                              <input
                                type="checkbox"
                                id="district-3"
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <label htmlFor="district-3" className="ml-2 block text-sm text-gray-700">
                                Beşiktaş
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                        >
                          <FaCheck />
                          <span>Ekle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Teslim Edilecek Adresler */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Teslim Edebileceğiniz Adresler</h4>
                    
                    {/* Seçili adresler */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedRoutesIds.map((routeId) => {
                          const route = availableRoutes.find(r => r.id === routeId);
                          return (
                            <div key={`delivery-${routeId}`} className="flex items-center bg-orange-200 text-orange-800 px-3 py-1 rounded-full text-sm">
                              <span>{route ? `${route.to} - ${route.from}` : 'Bilinmeyen Rota'}</span>
                              <button 
                                onClick={() => toggleRouteSelection(routeId)}
                                className="ml-2 text-orange-600 hover:text-orange-800"
                              >
                                <FaTimes className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                        {selectedRoutesIds.length === 0 && (
                          <div className="text-gray-500 text-sm">
                            <p>Henüz teslim edebileceğiniz adres bölgesi eklenmemiş.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Adres seçimi */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            İl
                          </label>
                          <select
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="">İl Seçin</option>
                            <option value="1">İstanbul</option>
                            <option value="2">Ankara</option>
                            <option value="3">İzmir</option>
                            <option value="4">Bursa</option>
                            <option value="5">Antalya</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            İlçeler
                          </label>
                          <div className="flex items-center mb-2">
                            <button
                              className="text-xs text-orange-600 hover:text-orange-800"
                            >
                              Tümünü Seç
                            </button>
                          </div>
                          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                            <div className="flex items-center mb-1">
                              <input
                                type="checkbox"
                                id="district-delivery-1"
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <label htmlFor="district-delivery-1" className="ml-2 block text-sm text-gray-700">
                                Kadıköy
                              </label>
                            </div>
                            <div className="flex items-center mb-1">
                              <input
                                type="checkbox"
                                id="district-delivery-2"
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <label htmlFor="district-delivery-2" className="ml-2 block text-sm text-gray-700">
                                Üsküdar
                              </label>
                            </div>
                            <div className="flex items-center mb-1">
                              <input
                                type="checkbox"
                                id="district-delivery-3"
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <label htmlFor="district-delivery-3" className="ml-2 block text-sm text-gray-700">
                                Beşiktaş
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                        >
                          <FaCheck />
                          <span>Ekle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={saveRoutes}
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setShowRoutesModal(false)}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Taşıma Tipleri Modal */}
      {showVehiclesModal && (
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
                  onClick={() => setShowVehiclesModal(false)}
                >
                  <span className="sr-only">Kapat</span>
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
              
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Taşıma Tiplerinizi Seçin
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Sahip olduğunuz araç tiplerini seçerek uygun taşıma taleplerini alabilirsiniz.
                  </p>
                </div>
              </div>
              
              <div className="mt-5">
                <div className="mb-4">
                  <div className="flex space-x-2 items-center text-sm">
                    <FaInfo className="text-orange-500" />
                    <span>Seçtiğiniz araç tiplerine uygun taşıma taleplerine ulaşabilirsiniz.</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableVehicles.map((vehicle) => (
                    <div 
                      key={vehicle.id}
                      onClick={() => toggleVehicleSelection(vehicle.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors duration-200 ${
                        selectedVehiclesIds.includes(vehicle.id) 
                          ? 'border-orange-500 bg-orange-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="bg-gray-100 p-2 rounded-full mr-3">
                            <FaTruck className="h-5 w-5 text-orange-500" />
                          </div>
                          <div>
                            <div className="font-medium">{vehicle.type}</div>
                            <div className="text-sm text-gray-500">Kapasite: {vehicle.capacity}</div>
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          selectedVehiclesIds.includes(vehicle.id)
                            ? 'bg-orange-500 text-white'
                            : 'border border-gray-300'
                        }`}>
                          {selectedVehiclesIds.includes(vehicle.id) && <FaCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={saveVehicles}
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={() => setShowVehiclesModal(false)}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FreelanceLayout>
  );
}