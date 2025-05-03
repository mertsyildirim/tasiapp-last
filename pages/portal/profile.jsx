import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import PortalLayout from '../../components/portal/Layout';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaMapMarkerAlt, FaEdit, FaSave, FaTimes, FaFileAlt, FaUpload, FaDownload, FaExclamationTriangle, FaCheckCircle, FaTruck, FaMotorcycle, FaBox, FaPallet, FaWarehouse, FaShippingFast, FaMapMarkedAlt, FaCheck, FaTimes as FaClose, FaLock, FaEye, FaEyeSlash, FaSpinner, FaDatabase } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import { LoadScript } from '@react-google-maps/api';
import axios from 'axios';
import Head from 'next/head';
import { useSession } from 'next-auth/react';

// Harita bileşenini dinamik olarak yükle (SSR sorunlarını önlemek için)
const Map = dynamic(() => import('../../components/Map'), { ssr: false });

export default function Profile() {
  const router = useRouter();
  const session = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingServiceAreas, setIsEditingServiceAreas] = useState(false);
  const [isEditingTransportTypes, setIsEditingTransportTypes] = useState(false);
  const [activeTab, setActiveTab] = useState('company'); // 'company', 'documents', 'transport', 'serviceAreas'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    taxNumber: '',
    taxOffice: '',
    address: '',
    district: '',
    city: '',
    description: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // İlçe arama için state'ler
  const [districtSearch, setDistrictSearch] = useState('');
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [selectedDistrictIndex, setSelectedDistrictIndex] = useState(-1);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  
  // İl arama için state'ler
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCityIndex, setSelectedCityIndex] = useState(-1);
  const [filteredCities, setFilteredCities] = useState([]);
  
  // Hizmet bölgeleri için state'ler
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [selectedCityDelivery, setSelectedCityDelivery] = useState('');
  const [selectedDistrictsDelivery, setSelectedDistrictsDelivery] = useState([]);

  // Taşıma tipleri
  const [transportTypes, setTransportTypes] = useState([]);
  const [loadingTransportTypes, setLoadingTransportTypes] = useState(false);

  // Seçili taşıma tipleri (örnek olarak)
  const [selectedTransportTypes, setSelectedTransportTypes] = useState([]);

  // Hizmet bölgeleri için state
  const [serviceAreas, setServiceAreas] = useState({
    pickup: [], // Alınacak adresler
    delivery: [] // Teslim edilecek adresler
  });
  
  // Belge verileri artık API'den gelecek, bu statik veriyi kaldırıyoruz
  const [documents, setDocuments] = useState([]);

  // İl ve ilçe verileri için state'ler (API'den çekilecek)
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState({});
  const [loadingCities, setLoadingCities] = useState(false);

  // Kullanıcı profil bilgilerini getir
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Sadece session kontrolü yap
      if (session.status !== 'authenticated') {
        console.log("Oturum doğrulanamadı, login sayfasına yönlendiriliyor");
        router.push('/portal/login');
        return;
      }

      console.log("Session bilgileri:", session);
      console.log("User ID:", session.data?.user.id);
      console.log("Access Token:", session.data?.accessToken ? "Var" : "Yok");

      try {
        // Kullanıcı bilgilerini session'dan al
        setUser({
          id: session.data.user.id,
          email: session.data.user.email,
          name: session.data.user.name,
          type: session.data.user.type,
          role: session.data.user.role,
          status: session.data.user.status
        });

        console.log("API isteği gönderiliyor...");
      const response = await axios.get('/api/portal/profile', {
        headers: {
            'Authorization': `Bearer ${session.data.accessToken}`,
            'x-user-id': session.data.user.id
          },
          params: {
            userId: session.data.user.id
        }
      });
        console.log("API yanıtı:", response.data);

      if (response.data.success) {
          console.log("API'den gelen kullanıcı verileri:", response.data.user);
        setUser(response.data.user);
        
        // Form verilerini doldur
        setFormData({
          name: response.data.user.name || '',
          email: response.data.user.email || '',
          phone: response.data.user.phone || '',
          company: response.data.user.company || '',
          taxNumber: response.data.user.taxNumber || '',
          taxOffice: response.data.user.taxOffice || '',
          address: response.data.user.address || '',
          district: response.data.user.district || '',
          city: response.data.user.city || '',
          description: response.data.user.description || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Taşıma tiplerini doldur
        if (response.data.user.transportTypes && response.data.user.transportTypes.length > 0) {
          setSelectedTransportTypes(response.data.user.transportTypes);
        }
        
        // Hizmet bölgelerini doldur
        if (response.data.user.serviceAreas) {
          // API'den gelen serviceAreas'ın pickup ve delivery alanlarını kontrol et
          // Eğer undefined ise boş dizi olarak ayarla
          const safeServiceAreas = {
            pickup: Array.isArray(response.data.user.serviceAreas.pickup) 
              ? response.data.user.serviceAreas.pickup 
              : [],
            delivery: Array.isArray(response.data.user.serviceAreas.delivery) 
              ? response.data.user.serviceAreas.delivery 
              : []
          };
          console.log("API'den gelen hizmet bölgeleri:", response.data.user.serviceAreas);
          console.log("Düzenlenmiş hizmet bölgeleri:", safeServiceAreas);
          setServiceAreas(safeServiceAreas);
        }

        // Belge verilerini ayarla - Burayı güncelliyoruz
        if (response.data.user.documents) {
          // Belgeler dizi ise doğrudan kullan, değilse dizi haline dönüştür
          const docs = Array.isArray(response.data.user.documents) 
            ? response.data.user.documents 
            : formatDocumentsForDisplay(response.data.user.documents);
          
          setDocuments(docs);
        } else {
          setDocuments([]);
        }
      } else {
          console.error('Profil verileri alınamadı:', response.data);
        setError('Profil bilgileri yüklenirken bir hata oluştu');
          // Boş değerler ile devam et
          initializeEmptyData();
        }
      } catch (apiError) {
        console.error('API hatası:', apiError);
        console.error('Hata detayları:', apiError.response?.data);
        
        if (apiError.response?.status === 401) {
          console.log('401 hatası, boş veriler kullanılıyor');
          // Boş değerler ile devam et
          initializeEmptyData();
        } else {
          setError('Profil bilgileri çekilirken bir hata oluştu');
          // Boş değerler ile devam et
          initializeEmptyData();
        }
      }
    } catch (error) {
      console.error('Genel hata:', error);
      setError('Profil bilgileri çekilirken bir hata oluştu');
      // Boş değerler ile devam et
      initializeEmptyData();
    } finally {
      setLoading(false);
    }
  };

  // Obje formatındaki belgeleri görüntüleme için dizi formatına dönüştür
  const formatDocumentsForDisplay = (documentsObj) => {
    if (!documentsObj || typeof documentsObj !== 'object') return [];
    
    const documentsList = [];
    
    // Vergi levhası
    if (documentsObj.vergi) {
      documentsList.push({
        id: '1',
        name: 'Vergi Levhası',
        required: true,
        hasExpiry: false,
        status: documentsObj.vergi.approved ? 'approved' : 'pending',
        expiryDate: documentsObj.vergi.expiryDate ? new Date(documentsObj.vergi.expiryDate).toLocaleDateString('tr-TR') : null,
        uploadDate: documentsObj.vergi.uploadDate ? new Date(documentsObj.vergi.uploadDate).toLocaleDateString('tr-TR') : null,
        fileUrl: documentsObj.vergi.url || null
      });
    } else {
      documentsList.push({
        id: '1',
        name: 'Vergi Levhası',
        required: true,
        hasExpiry: false,
        status: 'pending',
        expiryDate: null,
        uploadDate: null,
        fileUrl: null
      });
    }
    
    // Ticaret sicil
    if (documentsObj.sicil) {
      documentsList.push({
        id: '2',
        name: 'Ticaret Sicil Gazetesi',
        required: true,
        hasExpiry: false,
        status: documentsObj.sicil.approved ? 'approved' : 'pending',
        expiryDate: documentsObj.sicil.expiryDate ? new Date(documentsObj.sicil.expiryDate).toLocaleDateString('tr-TR') : null,
        uploadDate: documentsObj.sicil.uploadDate ? new Date(documentsObj.sicil.uploadDate).toLocaleDateString('tr-TR') : null,
        fileUrl: documentsObj.sicil.url || null
      });
    } else {
      documentsList.push({
        id: '2',
        name: 'Ticaret Sicil Gazetesi',
        required: true,
        hasExpiry: false,
        status: 'pending',
        expiryDate: null,
        uploadDate: null,
        fileUrl: null
      });
    }
    
    // İmza sirküleri
    if (documentsObj.imza) {
      documentsList.push({
        id: '3',
        name: 'İmza Sirküleri',
        required: true,
        hasExpiry: false,
        status: documentsObj.imza.approved ? 'approved' : 'pending',
        expiryDate: documentsObj.imza.expiryDate ? new Date(documentsObj.imza.expiryDate).toLocaleDateString('tr-TR') : null,
        uploadDate: documentsObj.imza.uploadDate ? new Date(documentsObj.imza.uploadDate).toLocaleDateString('tr-TR') : null,
        fileUrl: documentsObj.imza.url || null
      });
    } else {
      documentsList.push({
        id: '3',
        name: 'İmza Sirküleri',
        required: true,
        hasExpiry: false,
        status: 'pending',
        expiryDate: null,
        uploadDate: null,
        fileUrl: null
      });
    }
    
    // K1 belgesi
    if (documentsObj.k1) {
      documentsList.push({
        id: '4',
        name: 'K1 Belgesi',
        required: false,
        hasExpiry: true,
        status: documentsObj.k1.approved ? 'approved' : 'pending',
        expiryDate: documentsObj.k1.expiryDate ? new Date(documentsObj.k1.expiryDate).toLocaleDateString('tr-TR') : null,
        uploadDate: documentsObj.k1.uploadDate ? new Date(documentsObj.k1.uploadDate).toLocaleDateString('tr-TR') : null,
        fileUrl: documentsObj.k1.url || null
      });
    } else {
      documentsList.push({
        id: '4',
        name: 'K1 Belgesi',
        required: false,
        hasExpiry: true,
        status: 'pending',
        expiryDate: null,
        uploadDate: null,
        fileUrl: null
      });
    }
    
    // K2 belgesi
    if (documentsObj.k2) {
      documentsList.push({
        id: '5',
        name: 'K2 Belgesi',
        required: false,
        hasExpiry: true,
        status: documentsObj.k2.approved ? 'approved' : 'pending',
        expiryDate: documentsObj.k2.expiryDate ? new Date(documentsObj.k2.expiryDate).toLocaleDateString('tr-TR') : null,
        uploadDate: documentsObj.k2.uploadDate ? new Date(documentsObj.k2.uploadDate).toLocaleDateString('tr-TR') : null,
        fileUrl: documentsObj.k2.url || null
      });
    } else {
      documentsList.push({
        id: '5',
        name: 'K2 Belgesi',
        required: false,
        hasExpiry: true,
        status: 'pending',
        expiryDate: null,
        uploadDate: null,
        fileUrl: null
      });
    }
    
    // K3 belgesi
    if (documentsObj.k3) {
      documentsList.push({
        id: '6',
        name: 'K3 Belgesi',
        required: false,
        hasExpiry: true,
        status: documentsObj.k3.approved ? 'approved' : 'pending',
        expiryDate: documentsObj.k3.expiryDate ? new Date(documentsObj.k3.expiryDate).toLocaleDateString('tr-TR') : null,
        uploadDate: documentsObj.k3.uploadDate ? new Date(documentsObj.k3.uploadDate).toLocaleDateString('tr-TR') : null,
        fileUrl: documentsObj.k3.url || null
      });
    } else {
      documentsList.push({
        id: '6',
        name: 'K3 Belgesi',
        required: false,
        hasExpiry: true,
        status: 'pending',
        expiryDate: null,
        uploadDate: null,
        fileUrl: null
      });
    }
    
    return documentsList;
  };
  
  // Boş değerlerle başlatma
  const initializeEmptyData = () => {
    setUser({
      id: session.data?.user.id || '',
      name: '',
      email: '',
      phone: '',
      company: '',
      taxNumber: '',
      taxOffice: '',
      address: '',
      district: '',
      city: '',
      description: '',
      transportTypes: [],
      serviceAreas: {
        pickup: [],
        delivery: []
      },
      documents: []
    });
    
    // Form verilerini boş değerlerle doldur
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      taxNumber: '',
      taxOffice: '',
      address: '',
      district: '',
      city: '',
      description: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    // Taşıma tiplerini boşalt
    setSelectedTransportTypes([]);
    
    // Hizmet bölgelerini boşalt
    setServiceAreas({
      pickup: [],
      delivery: []
    });
  };

  // Profil verilerini yükleme
  useEffect(() => {
    fetchProfileData();
    loadTransportTypes();
    fetchCitiesAndDistricts(); // İl ve ilçe verilerini yükle
  }, [session]);

  // İl ve ilçeleri API'den yükle
  const fetchCitiesAndDistricts = async () => {
    try {
      setLoadingCities(true);
      // Basitleştirilmiş API isteği - sadece session kontrolü
      const response = await axios.get('/api/portal/cities-districts');
      
      if (response.data.success) {
        // Routes koleksiyonundan gelen verileri kullan
        console.log("API'den gelen şehir ve ilçe verileri:", response.data);
        setCities(response.data.cities);
        setDistricts(response.data.districts);
      } else {
        console.error('Şehir ve ilçe verileri alınamadı:', response.data);
        // Hata durumunda örnek veriler yükle
        setCities([
          { id: 'istanbul', name: 'İstanbul' },
          { id: 'ankara', name: 'Ankara' },
          { id: 'izmir', name: 'İzmir' }
        ]);
        
        setDistricts({
          'istanbul': [
            { id: 'kadikoy', name: 'Kadıköy' },
            { id: 'besiktas', name: 'Beşiktaş' },
            { id: 'sisli', name: 'Şişli' }
          ],
          'ankara': [
            { id: 'cankaya', name: 'Çankaya' },
            { id: 'kecioren', name: 'Keçiören' },
            { id: 'mamak', name: 'Mamak' }
          ],
          'izmir': [
            { id: 'konak', name: 'Konak' },
            { id: 'karsiyaka', name: 'Karşıyaka' },
            { id: 'bornova', name: 'Bornova' }
          ]
        });
      }
    } catch (error) {
      console.error('Şehir ve ilçe verileri yüklenirken hata:', error);
      console.error('Hata detayları:', error.response?.data);
      // Hata durumunda örnek veriler yükle
      setCities([
        { id: 'istanbul', name: 'İstanbul' },
        { id: 'ankara', name: 'Ankara' },
        { id: 'izmir', name: 'İzmir' }
      ]);
      
      setDistricts({
        'istanbul': [
          { id: 'kadikoy', name: 'Kadıköy' },
          { id: 'besiktas', name: 'Beşiktaş' },
          { id: 'sisli', name: 'Şişli' }
        ],
        'ankara': [
          { id: 'cankaya', name: 'Çankaya' },
          { id: 'kecioren', name: 'Keçiören' },
          { id: 'mamak', name: 'Mamak' }
        ],
        'izmir': [
          { id: 'konak', name: 'Konak' },
          { id: 'karsiyaka', name: 'Karşıyaka' },
          { id: 'bornova', name: 'Bornova' }
        ]
      });
    } finally {
      setLoadingCities(false);
    }
  };

  // serviceAreas'ın doğru initialize edilmesini sağla
  useEffect(() => {
    // serviceAreas undefined veya null ise varsayılan değeri ata
    if (!serviceAreas) {
      setServiceAreas({
        pickup: [],
        delivery: []
      });
    }
    // pickup veya delivery alanları yoksa onları da ekle
    else if (!serviceAreas.pickup || !serviceAreas.delivery) {
      setServiceAreas(prev => ({
        pickup: Array.isArray(prev.pickup) ? prev.pickup : [],
        delivery: Array.isArray(prev.delivery) ? prev.delivery : []
      }));
    }
  }, [serviceAreas]);

  // Servislerden taşıma tipleri bilgilerini yükle
  const loadTransportTypes = async () => {
    try {
      setLoadingTransportTypes(true);
      const response = await fetch('/api/admin/services');
      const data = await response.json();
      
      // API'den gelen tüm servisleri taşıma tiplerine dönüştür (aktif olsun veya olmasın)
      if (Array.isArray(data)) {
        setTransportTypes(data.map(service => ({
          id: service._id,
          name: service.name,
          description: service.description,
          icon: service.icon || '/icons/default.png',
          vehicleType: service.vehicleType || '',
          isActive: service.isActive
        })));
      } else {
        console.error('API yanıtında hizmet verisi bulunmuyor', data);
        setTransportTypes([]); // Boş dizi ata
      }
    } catch (error) {
      console.error('Taşıma tipleri yüklenirken hata:', error);
      setTransportTypes([]); // Boş dizi ata
    } finally {
      setLoadingTransportTypes(false);
    }
  };

  // Taşıma tipi ikonunu getir 
  const getTransportTypeIcon = (iconPath) => {
    // Eğer özel bir icon varsa
    if (iconPath && iconPath.startsWith('/')) {
      return <img src={iconPath} alt="Taşıma tipi" className="w-8 h-8 mr-3" />;
    }
    
    // Varsayılan icon
    return <FaTruck className="w-6 h-6 mr-3" />;
  };

  // Profil bilgilerini güncelleme
  const updateProfile = async () => {
    try {
      setLoading(true);
      
      // API'ye istek gönder - sadece temel yetkilendirme kullan
      const response = await axios.put('/api/portal/profile', formData, {
        headers: {
          // Sadece session bilgisi yeterli
          'x-user-id': session.data?.user.id
        }
      });
      
      if (response.data.success) {
        setSuccess('Profil bilgileriniz başarıyla güncellendi');
        setIsEditing(false);
        
        // Başarı mesajını 3 saniye sonra kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(response.data.message || 'Profil güncellenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Profil güncellenirken hata:', err);
      setError('Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  // Taşıma tiplerini güncelleme
  const updateTransportTypes = async () => {
    try {
      setLoading(true);
      
      console.log("Kaydedilecek taşıma tipleri:", selectedTransportTypes);
      
      // API'ye istek gönder - session kontrolü yapan endpoint
      const response = await axios.put('/api/portal/transport-types', {
        transportTypes: selectedTransportTypes
      });
      
      if (response.data.success) {
        console.log("Taşıma tipleri başarıyla kaydedildi:", response.data);
        setSuccess('Taşıma tipleriniz başarıyla güncellendi');
        setIsEditingTransportTypes(false);
        
        // Başarı mesajını 3 saniye sonra kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        console.error("Taşıma tipleri güncellenirken API hatası:", response.data);
        setError(response.data.message || 'Taşıma tipleri güncellenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Taşıma tipleri güncellenirken hata:', err);
      console.error('Taşıma tipleri güncellenirken hata detayları:', err.response?.data);
      setError('Taşıma tipleri güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  // Hizmet bölgelerini güncelleme
  const updateServiceAreas = async () => {
    try {
      setLoading(true);
      
      console.log("Kaydedilecek hizmet bölgeleri:", serviceAreas);
      
      // API'ye istek gönder - sadece session kontrolü yapan endpoint
      const response = await axios.put('/api/portal/service-areas', {
        serviceAreas: serviceAreas
      });
      
      if (response.data.success) {
        console.log("Hizmet bölgeleri başarıyla kaydedildi:", response.data);
        setSuccess('Hizmet bölgeleriniz başarıyla güncellendi');
        setIsEditingServiceAreas(false);
        
        // Başarı mesajını 3 saniye sonra kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        console.error("Hizmet bölgeleri güncellenirken API hatası:", response.data);
        setError(response.data.message || 'Hizmet bölgeleri güncellenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Hizmet bölgeleri güncellenirken hata:', err);
      console.error('Hizmet bölgeleri güncellenirken hata detayları:', err.response?.data);
      setError('Hizmet bölgeleri güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Taşıma tipi seçimini değiştirme fonksiyonu
  const toggleTransportType = (typeId) => {
    setSelectedTransportTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  // Taşıma tiplerini kaydetme fonksiyonu
  const saveTransportTypes = () => {
    // API'ye kaydetme işlemini çağır
    updateTransportTypes();
  };

  // Belge yükleme
  const uploadDocument = async (documentId, file) => {
    try {
      // Form data oluştur
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentId', documentId);
      
      // API'ye istek gönder - sadece temel yetkilendirme kullan
      const response = await axios.post('/api/portal/upload-document', formData, {
        headers: {
          // Sadece session bilgisi ve form veri tipi yeterli
          'x-user-id': session.data?.user.id,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setSuccess('Belge başarıyla yüklendi');
        
        // Profil verilerini yeniden yükle
        fetchProfileData();
        
        // Başarı mesajını 3 saniye sonra kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(response.data.message || 'Belge yüklenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Belge yüklenirken hata:', err);
      console.error('Hata detayları:', err.response?.data);
      setError('Belge yüklenirken bir hata oluştu');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile();
  };

  const handleUploadDocument = (documentId) => {
    // Dosya input elementini programatik olarak tıkla
    const fileInput = document.getElementById(`document-${documentId}`);
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleFileChange = (e, documentId) => {
    const file = e.target.files[0];
    if (file) {
      uploadDocument(documentId, file);
    }
  };

  const handleDownloadDocument = (fileUrl) => {
    window.open(fileUrl, '_blank');
  };

  // Belgenin süresinin dolup dolmadığını kontrol et
  const isDocumentExpired = (document) => {
    if (!document.expiryDate) return false;
    
    // Tarih string ise Date nesnesine çevir
    const expiryDate = typeof document.expiryDate === 'string' 
      ? new Date(document.expiryDate) 
      : document.expiryDate;
      
    const today = new Date();
    return today > expiryDate;
  };

  const getDocumentStatusIcon = (status, isExpired = false) => {
    // Önce süresi dolmuş mu kontrol et
    if (isExpired) {
      return <FaExclamationTriangle className="text-orange-500 h-5 w-5" />;
    }
    
    // Sonra duruma göre ikon göster
    switch (status) {
      case 'approved':
        return <FaCheckCircle className="text-green-500 h-5 w-5" />;
      case 'rejected':
        return <FaTimes className="text-red-500 h-5 w-5" />;
      case 'pending':
        return <FaSpinner className="text-orange-500 h-5 w-5 animate-spin" />;
      case 'uploaded':
        return <FaFileAlt className="text-blue-500 h-5 w-5" />;
      default:
        return <FaUpload className="text-gray-500 h-5 w-5" />;
    }
  };

  const getDocumentStatusText = (status, isExpired = false) => {
    // Önce süresi dolmuş mu kontrol et
    if (isExpired) {
      return 'Geçerlilik Süresi Doldu';
    }
    
    // Sonra duruma göre metin göster
    switch (status) {
      case 'approved':
        return 'Onaylı';
      case 'rejected':
        return 'Onaylanmadı';
      case 'pending':
        return 'İnceleniyor';
      case 'uploaded':
        return 'Yüklendi';
      default:
        return 'Yüklenmedi';
    }
  };

  // İlçe seçimi için yardımcı fonksiyonlar
  const handleDistrictKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedDistrictIndex(prev => 
        prev < filteredDistricts.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedDistrictIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedDistrictIndex >= 0 && selectedDistrictIndex < filteredDistricts.length) {
        handleDistrictSelect(filteredDistricts[selectedDistrictIndex], selectedDistrictIndex);
      }
    }
  };

  const handleDistrictSelect = (district, index) => {
    setSelectedDistrictIndex(index);
    setDistrictSearch(district.name);
    setShowDistrictDropdown(false);
    setFormData(prev => ({
      ...prev,
      district: district.id
    }));
  };

  const handleCityKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedCityIndex(prev => 
        prev < filteredCities.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedCityIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedCityIndex >= 0 && selectedCityIndex < filteredCities.length) {
        const city = filteredCities[selectedCityIndex];
        setSelectedCity(city.id);
        setCitySearch(city.name);
        setShowCityDropdown(false);
        setFormData(prev => ({
          ...prev,
          city: city.id
        }));
      }
    }
  };

  const handleCityChange = (e) => {
    const cityId = e.target.value;
    setSelectedCity(cityId);
    setFormData(prev => ({
      ...prev,
      city: cityId
    }));
  };

  // Teslimat için şehir değişikliği
  const handleCityDeliveryChange = (e) => {
    const cityId = e.target.value;
    setSelectedCityDelivery(cityId);
    // Şehir değiştiğinde ilçe seçimlerini sıfırla
    setSelectedDistrictsDelivery([]);
  };

  const toggleDistrict = (districtId) => {
    setSelectedDistricts(prev => {
      if (prev.includes(districtId)) {
        return prev.filter(id => id !== districtId);
      } else {
        return [...prev, districtId];
      }
    });
  };

  // Teslimat için ilçe seçimi
  const toggleDistrictDelivery = (districtId) => {
    setSelectedDistrictsDelivery(prev => {
      if (prev.includes(districtId)) {
        return prev.filter(id => id !== districtId);
      } else {
        return [...prev, districtId];
      }
    });
  };

  const toggleAllDistricts = () => {
    if (selectedDistricts.length === districts[selectedCity].length) {
      setSelectedDistricts([]);
    } else {
      setSelectedDistricts(districts[selectedCity].map(d => d.id));
    }
  };

  // Teslimat için tüm ilçeleri seç/kaldır
  const toggleAllDistrictsDelivery = () => {
    if (selectedDistrictsDelivery.length === districts[selectedCityDelivery].length) {
      setSelectedDistrictsDelivery([]);
    } else {
      setSelectedDistrictsDelivery(districts[selectedCityDelivery].map(d => d.id));
    }
  };

  const removeServiceArea = (type, areaId) => {
    setServiceAreas(prev => ({
      ...prev,
      [type]: prev[type].filter(area => area.id !== areaId)
    }));
  };

  const addServiceArea = (type) => {
    // İlçelerin ID'lerini al
    const districtIds = type === 'pickup' ? selectedDistricts : selectedDistrictsDelivery;
    const cityId = type === 'pickup' ? selectedCity : selectedCityDelivery;
    
    // İlçe ID'lerini isimlere dönüştür
    const districtNames = districtIds.map(districtId => {
      const district = districts[cityId].find(d => d.id === districtId);
      return district ? district.name : districtId;
    });
    
    // Şehir adını bul
    const cityName = cities.find(c => c.id === cityId)?.name || cityId;
    
    const newArea = {
      id: Date.now(),
      city: cityName,
      districts: districtNames
    };

    setServiceAreas(prev => ({
      ...prev,
      [type]: [...prev[type], newArea]
    }));

    if (type === 'pickup') {
      setSelectedCity('');
      setSelectedDistricts([]);
    } else {
      setSelectedCityDelivery('');
      setSelectedDistrictsDelivery([]);
    }
  };

  // Veritabanındaki routes verilerini kontrol et
  const checkRoutesData = async () => {
    try {
      // Basitleştirilmiş API isteği - sadece session kontrolü
      const response = await axios.get('/api/portal/routes-check');
      
      if (response.data.success) {
        console.log("Routes koleksiyonu durumu:", response.data);
        setSuccess(`Routes koleksiyonu durumu: ${response.data.message}. ${response.data.dataExists ? `Şehir sayısı: ${response.data.cityCount}, İlçe grubu sayısı: ${response.data.districtCount}` : 'Veri bulunamadı'}`);
        
        // Başarı mesajını 5 saniye sonra kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 5000);
      } else {
        console.error('Routes koleksiyonu kontrol edilemedi:', response.data);
        setError('Routes koleksiyonu kontrol edilemedi');
      }
    } catch (error) {
      console.error('Routes kontrolü sırasında hata:', error);
      console.error('Hata detayları:', error.response?.data);
      setError('Routes verisi kontrol edilirken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <PortalLayout title="Profil">
      <div className="max-w-7xl mx-auto">
        {/* Tab Menüsü */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('company')}
              className={`${
                activeTab === 'company'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaBuilding className="mr-2" />
              Firma Bilgileri
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`${
                activeTab === 'documents'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaFileAlt className="mr-2" />
              Belgeler
            </button>
            <button
              onClick={() => setActiveTab('transport')}
              className={`${
                activeTab === 'transport'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaTruck className="mr-2" />
              Taşıma Tipleri
            </button>
            <button
              onClick={() => setActiveTab('serviceAreas')}
              className={`${
                activeTab === 'serviceAreas'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaMapMarkedAlt className="mr-2" />
              Hizmet Bölgeleri
            </button>
          </nav>
        </div>

        {activeTab === 'company' ? (
          /* Firma Bilgileri */
          <div className="bg-white shadow rounded-lg">
            {/* Profil Başlığı */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Firma Bilgileri</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isEditing
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  {isEditing ? (
                    <>
                      <FaTimes />
                      <span>İptal</span>
                    </>
                  ) : (
                    <>
                      <FaEdit />
                      <span>Düzenle</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Profil Formu */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {success && (
                <div className="rounded-md bg-orange-50 p-4">
                  <div className="text-sm text-orange-700">{success}</div>
                </div>
              )}

              {/* Firma Adı */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firma Adı
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaBuilding className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Adres */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adres
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaMapMarkerAlt className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* İlçe ve İl */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İlçe
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={districtSearch}
                      onChange={(e) => {
                        setDistrictSearch(e.target.value);
                        setShowDistrictDropdown(true);
                        setSelectedDistrictIndex(-1);
                      }}
                      onFocus={() => setShowDistrictDropdown(true)}
                      onKeyDown={handleDistrictKeyDown}
                      placeholder="İlçe Ara..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                      disabled={!isEditing || !formData.city}
                    />
                    {showDistrictDropdown && isEditing && formData.city && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredDistricts.map((district, index) => (
                          <div
                            key={district.id}
                            className={`px-3 py-2 cursor-pointer ${
                              index === selectedDistrictIndex 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'hover:bg-gray-100'
                            }`}
                            onClick={() => handleDistrictSelect(district, index)}
                          >
                            {district.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İl
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setShowCityDropdown(true);
                        setSelectedCityIndex(-1);
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      onKeyDown={handleCityKeyDown}
                      placeholder="İl Ara..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                      disabled={!isEditing}
                    />
                    {showCityDropdown && isEditing && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCities.map((city, index) => (
                          <div
                            key={city.id}
                            className={`px-3 py-2 cursor-pointer ${
                              index === selectedCityIndex 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              handleInputChange({ target: { name: 'city', value: city.id } });
                              setCitySearch(city.name);
                              setShowCityDropdown(false);
                              setSelectedCityIndex(-1);
                              setDistrictSearch('');
                            }}
                          >
                            {city.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vergi Dairesi ve Vergi Numarası */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vergi Dairesi
                  </label>
                  <input
                    type="text"
                    name="taxOffice"
                    value={formData.taxOffice}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vergi Numarası
                  </label>
                  <input
                    type="text"
                    name="taxNumber"
                    value={formData.taxNumber}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Yetkili Kişi ve Cep Telefon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yetkili Kişi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cep Telefon
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaPhone className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="absolute inset-y-0 left-5 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">+90</span>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="5XX XXX XX XX"
                      maxLength="10"
                      className="block w-full pl-16 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* E-posta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>

              {/* Firma Açıklaması */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firma Açıklaması
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows="4"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>

              {/* Kaydet Butonu */}
              {isEditing && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <FaSave />
                    <span>Kaydet</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        ) : activeTab === 'documents' ? (
          /* Belgeler */
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Taşıyıcı Belgeleri</h2>
              <p className="mt-1 text-sm text-gray-500">
                Taşıyıcı olarak çalışabilmek için gerekli belgeleri yükleyin veya güncelleyin.
              </p>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-300">
                        Belge Adı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-300">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-300">
                        Yükleme Tarihi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-300">
                        Geçerlilik Tarihi
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-300">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-300">
                    {documents.map((document) => {
                      const expired = isDocumentExpired(document);
                      const hasDocument = document.fileUrl || document.status === 'uploaded' || document.status === 'approved' || document.status === 'rejected' || document.status === 'pending';
                      
                      return (
                        <tr key={document.id} className={`${expired ? 'bg-yellow-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FaFileAlt className="h-5 w-5 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{document.name}</div>
                                {document.required && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    Zorunlu
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getDocumentStatusIcon(document.status, expired)}
                              <span className={`ml-2 text-sm ${
                                expired 
                                  ? 'text-orange-600'
                                  : document.status === 'approved' 
                                    ? 'text-green-700' 
                                    : document.status === 'rejected' 
                                      ? 'text-red-700' 
                                      : document.status === 'pending' 
                                        ? 'text-orange-600'
                                        : 'text-gray-700'
                              }`}>{getDocumentStatusText(document.status, expired)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {document.uploadDate || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {document.hasExpiry ? document.expiryDate || '-' : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              {document.status === 'uploaded' && (
                                <button
                                  onClick={() => handleDownloadDocument(document.fileUrl)}
                                  className="text-orange-600 hover:text-orange-900"
                                >
                                  <FaDownload className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleUploadDocument(document.id)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                <FaUpload className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'transport' ? (
          /* Taşıma Tipleri */
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Taşıma Tipleri</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Firma olarak sunduğunuz taşıma hizmet tipleri. Taşıma hizmet tiplerine göre talepler alacaksınız.
                  </p>
                </div>
                {isEditingTransportTypes ? (
                  <button
                    onClick={saveTransportTypes}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <FaSave />
                    <span>Kaydet</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingTransportTypes(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                  >
                    <FaEdit />
                    <span>Düzenle</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {loadingTransportTypes ? (
                <div className="flex justify-center items-center py-10">
                  <FaSpinner className="animate-spin h-8 w-8 text-orange-500" />
                  <p className="ml-2 text-gray-600">Taşıma tipleri yükleniyor...</p>
                </div>
              ) : transportTypes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <FaExclamationTriangle className="h-10 w-10 mb-2" />
                  <p>Herhangi bir taşıma tipi bulunamadı</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {transportTypes.map((type) => {
                    const isSelected = selectedTransportTypes.includes(type.id);
                    
                    return (
                      <div 
                        key={type.id} 
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50 hover:bg-orange-100' 
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        } ${!isEditingTransportTypes && 'cursor-default'}`}
                        onClick={() => isEditingTransportTypes && toggleTransportType(type.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-full ${
                              isSelected 
                                ? 'bg-orange-100 text-orange-600' 
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {getTransportTypeIcon(type.icon)}
                            </div>
                            <h3 className={`ml-3 text-sm font-medium ${
                              isSelected 
                                ? 'text-orange-700' 
                                : 'text-gray-500'
                            }`}>
                              {type.name}
                            </h3>
                          </div>
                          
                          {!type.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Yakında
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {type.description}
                        </p>
                        {isSelected && (
                          <div className="mt-2 flex items-center text-xs text-orange-600">
                            <FaCheckCircle className="h-3 w-3 mr-1" />
                            <span>Bu hizmeti sunuyorsunuz</span>
                          </div>
                        )}
                        {isSelected && !type.isActive && (
                          <div className="mt-1 text-xs text-blue-600">
                            <span>(Hizmet aktif olduğunda otomatik başlayacak)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Hizmet Bölgeleri */
          <div className="bg-white shadow rounded-lg">
            {/* Bölge Başlığı */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Hizmet Bölgeleri</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Hizmet verdiğiniz alınacak ve teslim edilecek adres bölgelerini belirleyin.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={checkRoutesData}
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FaDatabase />
                    <span>Veritabanını Kontrol Et</span>
                  </button>
                  {isEditingServiceAreas ? (
                    <button
                      onClick={updateServiceAreas}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      <FaSave />
                      <span>Kaydet</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingServiceAreas(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                    >
                      <FaEdit />
                      <span>Düzenle</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Harita Görünümü */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Hizmet Bölgeleri Haritası</h3>
                <div className="h-96 border border-gray-300 rounded-lg overflow-hidden">
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

              {/* Alınacak Adresler */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Alabileceğiniz Adresler</h3>
                
                {/* Seçili alınacak adresler */}
                {serviceAreas && serviceAreas.pickup && serviceAreas.pickup.length > 0 ? (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {serviceAreas.pickup.map(area => (
                        <div key={area.id} className="flex items-center bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                          <span>{area.city} - {Array.isArray(area.districts) ? area.districts.join(', ') : area.districts}</span>
                          {isEditingServiceAreas && (
                            <button 
                              onClick={() => removeServiceArea('pickup', area.id)}
                              className="ml-2 text-orange-600 hover:text-orange-800"
                            >
                              <FaClose className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-gray-500 text-sm">
                    <p>Henüz alabileceğiniz adres bölgesi eklenmemiş.</p>
                  </div>
                )}
                
                {/* Alınacak adres seçimi */}
                {isEditingServiceAreas && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Yeni Alınacak Adres Ekle</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          İl
                        </label>
                        <select
                          value={selectedCity}
                          onChange={handleCityChange}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">İl Seçin</option>
                          {cities.map(city => (
                            <option key={city.id} value={city.id}>{city.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedCity && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            İlçeler
                          </label>
                          <div className="flex items-center mb-2">
                            <button
                              onClick={toggleAllDistricts}
                              className="text-xs text-orange-600 hover:text-orange-800"
                            >
                              {selectedDistricts.length === districts[selectedCity].length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                            </button>
                          </div>
                          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                            {districts[selectedCity].map(district => (
                              <div key={district.id} className="flex items-center mb-1">
                                <input
                                  type="checkbox"
                                  id={`district-${district.id}`}
                                  checked={selectedDistricts.includes(district.id)}
                                  onChange={() => toggleDistrict(district.id)}
                                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`district-${district.id}`} className="ml-2 block text-sm text-gray-700">
                                  {district.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => addServiceArea('pickup')}
                        disabled={!selectedCity || selectedDistricts.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                          !selectedCity || selectedDistricts.length === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        <FaCheck />
                        <span>Ekle</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Teslim Edilecek Adresler */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Teslim Edebileceğiniz Adresler</h3>
                
                {/* Seçili teslim edilecek adresler */}
                {serviceAreas && serviceAreas.delivery && serviceAreas.delivery.length > 0 ? (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {serviceAreas.delivery.map(area => (
                        <div key={area.id} className="flex items-center bg-orange-200 text-orange-800 px-3 py-1 rounded-full text-sm">
                          <span>{area.city} - {Array.isArray(area.districts) ? area.districts.join(', ') : area.districts}</span>
                          {isEditingServiceAreas && (
                            <button 
                              onClick={() => removeServiceArea('delivery', area.id)}
                              className="ml-2 text-orange-600 hover:text-orange-800"
                            >
                              <FaClose className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 text-gray-500 text-sm">
                    <p>Henüz teslim edebileceğiniz adres bölgesi eklenmemiş.</p>
                  </div>
                )}
                
                {/* Teslim edilecek adres seçimi */}
                {isEditingServiceAreas && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Yeni Teslim Edilecek Adres Ekle</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          İl
                        </label>
                        <select
                          value={selectedCityDelivery}
                          onChange={handleCityDeliveryChange}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                        >
                          <option value="">İl Seçin</option>
                          {cities.map(city => (
                            <option key={city.id} value={city.id}>{city.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedCityDelivery && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            İlçeler
                          </label>
                          <div className="flex items-center mb-2">
                            <button
                              onClick={toggleAllDistrictsDelivery}
                              className="text-xs text-orange-600 hover:text-orange-800"
                            >
                              {selectedDistrictsDelivery.length === districts[selectedCityDelivery].length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                            </button>
                          </div>
                          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                            {districts[selectedCityDelivery].map(district => (
                              <div key={district.id} className="flex items-center mb-1">
                                <input
                                  type="checkbox"
                                  id={`district-delivery-${district.id}`}
                                  checked={selectedDistrictsDelivery.includes(district.id)}
                                  onChange={() => toggleDistrictDelivery(district.id)}
                                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                />
                                <label htmlFor={`district-delivery-${district.id}`} className="ml-2 block text-sm text-gray-700">
                                  {district.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => addServiceArea('delivery')}
                        disabled={!selectedCityDelivery || selectedDistrictsDelivery.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                          !selectedCityDelivery || selectedDistrictsDelivery.length === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        <FaCheck />
                        <span>Ekle</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
                            