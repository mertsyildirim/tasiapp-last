'use client'

import React, { useState, useEffect } from 'react'
import { 
  FaPlus, FaSearch, FaEdit, FaTrash, FaIdCard, FaPhone, 
  FaEnvelope, FaTruck, FaFileAlt, FaEye, FaTimes, FaCheck,
  FaFilter, FaExclamationCircle, FaSpinner, FaChevronLeft, FaChevronRight, FaExclamationTriangle, FaCalendarAlt, FaUpload
} from 'react-icons/fa'
import AdminLayout from '../../components/admin/Layout'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useSession } from 'next-auth/react'

// Belgeler için sabitleri tanımla
const DRIVER_DOCUMENT_TYPES = [
  { id: 'dlFront', name: 'Ehliyet Görüntüsü (Ön)', required: true, hasExpiryDate: true },
  { id: 'dlBack', name: 'Ehliyet Görüntüsü (Arka)', required: true, hasExpiryDate: false },
  { id: 'src', name: 'SRC Belgesi', required: true, hasExpiryDate: true },
  { id: 'criminalRecord', name: 'Adli Sicil Kaydı', required: true, hasExpiryDate: true },
  { id: 'healthReport', name: 'Sağlık Raporu', required: true, hasExpiryDate: true },
  { id: 'psychotechnique', name: 'Psikoteknik Belgesi', required: true, hasExpiryDate: true },
];

export default function DriversPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [showDriverDetailModal, setShowDriverDetailModal] = useState(null)
  const [showDriverDocumentsModal, setShowDriverDocumentsModal] = useState(null)
  const [showAddDriverModal, setShowAddDriverModal] = useState(false)
  const [showEditDriverModal, setShowEditDriverModal] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDrivers, setTotalDrivers] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  
  // ESC tuşu ile modal'ları kapatma
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Sadece en son açılan modal'ı kapat
        if (showDriverDocumentsModal) {
          setShowDriverDocumentsModal(null);
        } else if (showEditDriverModal) {
          setShowEditDriverModal(null);
        } else if (showAddDriverModal) {
          setShowAddDriverModal(false);
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(null);
        } else if (showDriverDetailModal) {
          setShowDriverDetailModal(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Modal açıkken body scroll'u engelle
    if (showDriverDetailModal || showDeleteConfirm || showDriverDocumentsModal || showAddDriverModal || showEditDriverModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [showDriverDetailModal, showDeleteConfirm, showDriverDocumentsModal, showAddDriverModal, showEditDriverModal]);

  // Örnek sürücü verileri
  const [drivers, setDrivers] = useState([])
  const [allDrivers, setAllDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [companies, setCompanies] = useState([]);
  
  // Yeni sürücü veri yapısı
  const [newDriverData, setNewDriverData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'active',
    licenseType: '',
    licenseExpiry: '',
    experience: '',
    notes: '',
    documents: [],
    activeShipments: 0,
    completedShipments: 0
  });

  // Belge yükleme için state
  const [newDocument, setNewDocument] = useState({
    type: '',
    validUntil: '',
    file: null
  });

  // Belge onay durumları için state ekliyoruz
  const [documentApprovals, setDocumentApprovals] = useState({});

  // Belge kontrolü için gerekli fonksiyonlar
  const checkDocumentStatus = (driver) => {
    const requiredDocuments = [
      { name: 'Ehliyet Görüntüsü (Ön)', type: 'Zorunlu' },
      { name: 'Ehliyet Görüntüsü (Arka)', type: 'Zorunlu' },
      { name: 'Adli Sicil Kaydı', type: 'Zorunlu' }
    ];

    // Ehliyet geçerlilik süresi kontrolü
    const hasExpiredLicense = driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date();
    
    // Zorunlu belgelerin kontrolü
    const hasAllRequiredDocs = requiredDocuments.every(doc => 
      driver.documents?.some(d => d.name === doc.name && d.status === 'Aktif')
    );

    return {
      hasExpiredDocuments: hasExpiredLicense || !hasAllRequiredDocs,
      missingDocuments: requiredDocuments.filter(doc => 
        !driver.documents?.some(d => d.name === doc.name && d.status === 'Aktif')
      )
    };
  };

  // Sürücü verilerini formatlama
  const formatDriverData = (driver) => {
    const documentStatus = checkDocumentStatus(driver);
    
    // Taşıyıcı (firma) adını bul
    let companyName = "";
    if (driver.company && !driver.isFreelance) {
      const selectedCompany = companies.find(c => c._id === driver.company);
      companyName = selectedCompany ? selectedCompany.companyName : driver.company;
    } else if (driver.isFreelance) {
      // Freelance kullanıcıları için şirket adı direkt olarak geliyor
      companyName = driver.company;
    }
    
    return {
      _id: driver._id || '',
      name: driver.name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      company: driver.company || '',
      companyName: companyName,
      status: driver.status || 'active',
      address: driver.address || '',
      joinDate: driver.createdAt ? new Date(driver.createdAt).toLocaleDateString('tr-TR') : '',
      licenseType: driver.licenseType || '',
      licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString('tr-TR') : '',
      experience: driver.experience || '',
      notes: driver.notes || '',
      documents: driver.documents || [],
      hasExpiredDocuments: documentStatus.hasExpiredDocuments,
      missingDocuments: documentStatus.missingDocuments,
      activeShipments: driver.activeShipments || 0,
      completedShipments: driver.completedShipments || 0,
      successRate: driver.successRate || 0,
      isFreelance: driver.isFreelance || false,
      originalId: driver.originalId || ''
    };
  };

  // Tüm sürücüleri API'den çekme
  useEffect(() => {
    const fetchAllDrivers = async () => {
      try {
        const response = await fetch(`/api/admin/drivers?status=&search=`);
        
        if (!response.ok) {
          throw new Error('Tüm sürücüleri getirme hatası');
        }
        
        const data = await response.json();
        
        if (data && data.drivers) {
          const formattedDrivers = data.drivers.map(formatDriverData);
          setAllDrivers(formattedDrivers);
        }
      } catch (error) {
        console.error('Tüm sürücüleri getirme hatası:', error);
      }
    };
    
    fetchAllDrivers();
  }, []);
  
  // Sürücüleri API'den çekme
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/drivers?page=${currentPage}&limit=10${searchTerm ? `&search=${searchTerm}` : ''}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sürücü verileri alınamadı');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDrivers(data.drivers.map(formatDriverData));
      setTotalPages(data.totalPages);
      setTotalDrivers(data.total);
      } else {
        throw new Error(data.error || 'Sürücü verileri alınamadı');
      }
    } catch (error) {
      console.error('Sürücüleri getirme hatası:', error);
      setError(error.message);
      setDrivers([]);
      setTotalPages(0);
      setTotalDrivers(0);
    } finally {
      setLoading(false);
    }
  };
  
  // Sayfa yüklendiğinde ve sayfa değiştiğinde sürücüleri getir
  useEffect(() => {
    fetchDrivers();
  }, [currentPage, searchTerm]);

  // Firma verilerini çekme
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/admin/carriers');
        
        if (!response.ok) {
          throw new Error('Firma verilerini getirme hatası');
        }
        
        const data = await response.json();
        
        if (data && data.carriers) {
          setCompanies(data.carriers);
        }
      } catch (error) {
        console.error('Firma verilerini getirme hatası:', error);
      }
    };
    
    fetchCompanies();
  }, []);

  const tabs = [
    { id: 'all', name: 'Tüm Sürücüler' },
    { id: 'active', name: 'Aktif' },
    { id: 'passive', name: 'Pasif' },
    { id: 'documents', name: 'Süresi Dolmuş Belge' },
  ]

  // Durum renkleri
  const getStatusColor = (status) => {
    switch(status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'passive':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Durum metni
  const getStatusText = (status) => {
    switch(status) {
      case 'active':
        return 'Aktif'
      case 'passive':
        return 'Pasif'
      default:
        return status
    }
  }

  // Sürücü silme
  const deleteDriver = async (id) => {
    try {
      setLoading(true)
      
      const response = await axios.delete(`/api/admin/drivers?id=${id}`)
      
      if (response.data && response.data.success) {
        setDrivers(prevDrivers => prevDrivers.filter(driver => driver._id !== id))
        setShowDeleteConfirm(null)
      }
    } catch (error) {
      console.error('Sürücü silme hatası:', error)
      setError('Sürücü silinirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Sürücü durumunu değiştirme
  const toggleDriverStatus = async (id, currentStatus) => {
    try {
      setLoading(true);
      
      const newStatus = currentStatus === 'active' ? 'passive' : 'active';
      
      const response = await axios.put(`/api/admin/drivers/${id}/status`, {
        status: newStatus
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setDrivers(prevDrivers => 
          prevDrivers.map(driver => 
            driver._id === id ? { ...driver, status: newStatus } : driver
          )
        );
      }
    } catch (error) {
      console.error('Sürücü durumu güncelleme hatası:', error);
      setError('Sürücü durumu güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Filtreleme ve arama
  const filteredDrivers = drivers.filter(driver => {
    // Tab filtresi
    const tabFilter = 
      selectedTab === 'all' ? true :
      selectedTab === 'active' ? driver.status === 'active' && !driver.hasExpiredDocuments :
      selectedTab === 'passive' ? driver.status === 'passive' :
      selectedTab === 'documents' ? driver.hasExpiredDocuments :
      true;
    
    // Arama filtresi
    const searchFilter = 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm);
    
    return tabFilter && searchFilter;
  });

  // Yeni sürücü ekleme
  const addNewDriver = async () => {
    try {
      setLoading(true)
      
      const response = await axios.post('/api/admin/drivers', newDriverData)
      
      if (response.data && response.data.driver) {
        setDrivers(prevDrivers => [...prevDrivers, response.data.driver])
        setShowAddDriverModal(false)
        setNewDriverData({
          name: '',
          email: '',
          phone: '',
          company: '',
          status: 'active',
          licenseType: '',
          licenseExpiry: '',
          experience: '',
          notes: '',
          documents: [],
          activeShipments: 0,
          completedShipments: 0
        })
      }
    } catch (error) {
      console.error('Sürücü ekleme hatası:', error)
      setError('Sürücü eklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Sürücü güncelleme
  const updateDriver = async (updatedDriver) => {
    try {
      setLoading(true)
      
      const response = await axios.put(`/api/admin/drivers?id=${updatedDriver._id}`, {
        name: updatedDriver.name,
        email: updatedDriver.email,
        phone: updatedDriver.phone,
        status: updatedDriver.status,
        company: updatedDriver.company,
        address: updatedDriver.address,
        licenseType: updatedDriver.licenseType,
        licenseExpiry: updatedDriver.licenseExpiry,
        experience: updatedDriver.experience,
        notes: updatedDriver.notes
      })
      
      if (response.data && response.data.driver) {
        // Güncel sürücü bilgilerini state'e kaydet
        setDrivers(prevDrivers => 
          prevDrivers.map(driver => 
            driver._id === updatedDriver._id ? formatDriverData(response.data.driver) : driver
          )
        )
        
        // Tüm sürücüler listesini de güncelle
        setAllDrivers(prevDrivers => 
          prevDrivers.map(driver => 
            driver._id === updatedDriver._id ? formatDriverData(response.data.driver) : driver
          )
        )
        
        setShowEditDriverModal(null)
        
        // Başarı mesajı göster ve 3 saniye sonra temizle
        setError(null)
        // Opsiyonel: Başarı mesajı eklenebilir
      }
    } catch (error) {
      console.error('Sürücü güncelleme hatası:', error)
      setError('Sürücü güncellenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Belge yükleme
  const handleDocumentUpload = async (e) => {
    e.preventDefault(); // Form varsayılan davranışını engelle
    
    if (!newDocument.type || !newDocument.validUntil || !newDocument.file) {
      setError('Lütfen tüm gerekli alanları doldurun ve bir dosya seçin');
      return;
    }
    
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', newDocument.file);
      formData.append('documentType', newDocument.type);
      formData.append('validUntil', newDocument.validUntil);
      formData.append('driverId', showDriverDocumentsModal._id);
      
      const response = await axios.post('/api/admin/drivers/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        // Belgeleri güncelleyerek mevcut belgelerin arasına yeni belgeyi ekle
        const updatedDocuments = [...(showDriverDocumentsModal.documents || []), response.data.document];
        
        // showDriverDocumentsModal state'ini güncelle
        setShowDriverDocumentsModal({
          ...showDriverDocumentsModal,
          documents: updatedDocuments
        });
        
        // Formu temizle
        setNewDocument({
          type: '',
          validUntil: '',
          file: null
        });
        
        // Tüm sürücü listesini de güncelle
        setDrivers(prevDrivers => 
          prevDrivers.map(driver => 
            driver._id === showDriverDocumentsModal._id 
              ? { ...driver, documents: updatedDocuments }
              : driver
          )
        );
        
        // Başarı mesajı göster
        setError(null);
      } else {
        throw new Error(response.data.message || 'Belge yüklenemedi');
      }
    } catch (error) {
      console.error('Belge yükleme hatası:', error);
      setError('Belge yüklenirken bir hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Dosya seçme işleyicisi
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewDocument({
        ...newDocument,
        file: e.target.files[0]
      });
    }
  };

  // Belge güncelleme
  const handleUpdateDocument = async (documentId) => {
    try {
      setLoading(true);
      
      const response = await axios.put(`/api/admin/drivers/documents/${documentId}`, {
        status: 'Aktif'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        // Belge durumunu güncelle
      }
    } catch (error) {
      console.error('Belge güncelleme hatası:', error);
      setError('Belge güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Belge silme
  const handleDeleteDocument = async (documentId) => {
    try {
      setLoading(true);
      
      const response = await axios.delete(`/api/admin/drivers/documents/${documentId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        // Belgeyi listeden kaldır
      }
    } catch (error) {
      console.error('Belge silme hatası:', error);
      setError('Belge silinirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Belge onaylama işlevi
  const approveDocument = async (document) => {
    try {
      setLoading(true);
      
      // API çağrısı burada yapılabilir
      // Örnek: await axios.put(`/api/admin/drivers/documents/${document.id}/approve`);
      
      // Geçici olarak state'de onay durumunu tutuyoruz
      setDocumentApprovals(prev => ({
        ...prev,
        [document.id]: true
      }));
      
      setLoading(false);
    } catch (error) {
      console.error('Belge onaylama hatası:', error);
      setError('Belge onaylanırken bir hata oluştu.');
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Sürücüler">
      <div className="container mx-auto px-4 py-6">
        <div className={showDriverDetailModal || showDriverDocumentsModal || showAddDriverModal || showEditDriverModal || showDeleteConfirm ? "blur-sm" : ""}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="w-full">
              <div className="flex space-x-2 flex-wrap">
                <button
                  onClick={() => setSelectedTab('all')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedTab === 'all' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } mb-2`}
                >
                  Tüm Sürücüler
                </button>
                <button
                  onClick={() => setSelectedTab('active')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedTab === 'active' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } mb-2`}
                >
                  Çevrimiçi
                </button>
                <button
                  onClick={() => setSelectedTab('on_delivery')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedTab === 'on_delivery' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } mb-2`}
                >
                  Taşımada
                </button>
                <button
                  onClick={() => setSelectedTab('offline')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedTab === 'offline' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  } mb-2`}
                >
                  Çevrimdışı
                </button>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); fetchDrivers(); }} className="flex flex-col md:flex-row gap-2">
              <div className="relative w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Sürücü ara... (İsim, email, telefon, şirket)"
                  className="pl-10 pr-4 py-2 w-full md:min-w-[350px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <FaSearch className="absolute left-3 top-[30%] transform -translate-y-1/2 text-gray-400 text-lg" />
              </div>
              <button
                type="button"
                onClick={() => setShowAddDriverModal(true)}
                className="bg-orange-600 text-white px-4 py-2.5 rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm font-medium whitespace-nowrap"
              >
                <FaPlus className="text-sm" />
                <span>Yeni Sürücü</span>
              </button>
            </form>
          </div>

          {/* İstatistik Kutuları */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-500 text-sm">Tüm Sürücüler</h3>
                  <p className="text-2xl font-semibold text-gray-900">{totalDrivers}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <FaTruck className="text-orange-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-500 text-sm">Aktif Sürücüler</h3>
                  <p className="text-2xl font-semibold text-gray-900">
                    {drivers.filter(driver => driver.status === 'active').length}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <FaCheck className="text-green-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-500 text-sm">Taşımada</h3>
                  <p className="text-2xl font-semibold text-gray-900">
                    {drivers.filter(driver => driver.status === 'on_delivery').length}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <FaTruck className="text-blue-600 text-xl" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-500 text-sm">Belge Bekleyen</h3>
                  <p className="text-2xl font-semibold text-gray-900">
                    {drivers.filter(driver => driver.hasExpiredDocuments).length}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <FaFileAlt className="text-yellow-600 text-xl" />
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-orange-600 rounded-full" role="status" aria-label="loading">
                <span className="sr-only">Yükleniyor...</span>
              </div>
              <p className="mt-4 text-gray-600">Sürücü verileri yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <FaExclamationCircle className="text-red-600 text-4xl mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">Hata Oluştu</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button 
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                onClick={fetchDrivers}
              >
                Tekrar Dene
              </button>
            </div>
          ) : drivers.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <FaTruck className="text-gray-400 text-4xl mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">Sürücü bulunamadı</p>
              <p className="text-gray-600 mb-6">Aradığınız kriterlere uygun sürücü bulunamadı.</p>
              <button
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center gap-2 mx-auto"
                onClick={() => setShowAddDriverModal(true)}
              >
                <FaPlus />
                <span>Yeni Sürücü Ekle</span>
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sürücü</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şirket</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Belgeler</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {drivers.map(driver => (
                        <tr key={driver._id} className={`hover:bg-gray-50 ${driver.isFreelance ? 'bg-orange-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                  <span className="text-orange-600 font-medium">
                                    {driver.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {driver.name}
                                  {driver.isFreelance && (
                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
                                      Freelance
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {driver.licenseType || 'Lisans bilgisi yok'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{driver.phone}</div>
                            <div className="text-sm text-gray-500">{driver.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{driver.companyName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(driver.status)}`}>
                              {getStatusText(driver.status)}
                            </span>
                            {driver.hasExpiredDocuments && (
                              <div className="mt-1">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  Süresi Dolmuş Belge
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex flex-col">
                              <span>{driver.activeShipments || 0} Aktif</span>
                              <span className="text-gray-400">{driver.completedShipments || 0} Tamamlanan</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button 
                                className="text-orange-600 hover:text-orange-900 transition-colors" 
                                onClick={() => setShowDriverDetailModal(driver)}
                                title="Detaylar"
                              >
                                <FaEye className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredDrivers.length === 0 && !loading && (
                  <div className="px-6 py-8 text-center">
                    <p className="text-gray-500">Kriterlere uygun sürücü bulunamadı.</p>
                  </div>
                )}
                <div className="bg-white px-6 py-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      Toplam <span className="font-medium text-gray-900">{filteredDrivers.length}</span> sürücü bulundu
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
            </>
          )}
        </div>
      </div>

      {/* Sürücü Detay Modalı */}
      {showDriverDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4 overflow-y-auto" onClick={(e) => {
          if (e.target === e.currentTarget && !showDriverDocumentsModal) setShowDriverDetailModal(null);
        }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Sürücü Detayları</h3>
              <button 
                onClick={() => setShowDriverDetailModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Sol Bölüm - Kişisel Bilgiler */}
                <div className="md:w-1/2 space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-3">Sürücü Bilgileri</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0 h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-2xl">
                          {showDriverDetailModal.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <h5 className="text-xl font-medium text-gray-900">{showDriverDetailModal.name}</h5>
                          <p className="text-gray-600">{showDriverDetailModal.companyName}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">ID:</div>
                          <div className="font-medium">
                            {showDriverDetailModal._id ? `SD${showDriverDetailModal._id.toString().slice(-4)}` : '-'}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Firma:</div>
                          <div className="font-medium">
                            {isEditing ? (
                              <select
                                value={showDriverDetailModal.company}
                                onChange={(e) => setShowDriverDetailModal({...showDriverDetailModal, company: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              >
                                <option value="">Firma Seçin</option>
                                {companies.map((company) => (
                                  <option key={company._id} value={company._id}>
                                    {company.companyName}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              showDriverDetailModal.company || '-'
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Telefon:</div>
                          <div className="font-medium">
                            {isEditing ? (
                              <input
                                type="text"
                                value={showDriverDetailModal.phone}
                                onChange={(e) => setShowDriverDetailModal({...showDriverDetailModal, phone: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            ) : (
                              showDriverDetailModal.phone
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">E-posta:</div>
                          <div className="font-medium">
                            {isEditing ? (
                              <input
                                type="email"
                                value={showDriverDetailModal.email}
                                onChange={(e) => setShowDriverDetailModal({...showDriverDetailModal, email: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            ) : (
                              showDriverDetailModal.email
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Adres:</div>
                          <div className="font-medium">
                            {isEditing ? (
                              <textarea
                                value={showDriverDetailModal.address}
                                onChange={(e) => setShowDriverDetailModal({...showDriverDetailModal, address: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                rows={3}
                              />
                            ) : (
                              showDriverDetailModal.address || '-'
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Katılım Tarihi:</div>
                          <div className="font-medium">{showDriverDetailModal.joinDate}</div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Durum:</div>
                          <div>
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(showDriverDetailModal.status)}`}>
                              {getStatusText(showDriverDetailModal.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-3">Ek Bilgiler</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Ehliyet Sınıfı:</div>
                          <div className="font-medium">
                            {isEditing ? (
                              <select
                                value={showDriverDetailModal.licenseType}
                                onChange={(e) => setShowDriverDetailModal({...showDriverDetailModal, licenseType: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                              >
                                <option value="">Seçiniz</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                              </select>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {showDriverDetailModal.licenseType || '-'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Son Geçerlilik:</div>
                          <div className="font-medium">
                            {isEditing ? (
                              <input
                                type="text"
                                value={showDriverDetailModal.licenseExpiry}
                                onChange={(e) => setShowDriverDetailModal({...showDriverDetailModal, licenseExpiry: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="gg.aa.yyyy"
                              />
                            ) : (
                              showDriverDetailModal.licenseExpiry || '-'
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Deneyim:</div>
                          <div className="font-medium">
                            {isEditing ? (
                              <input
                                type="text"
                                value={showDriverDetailModal.experience}
                                onChange={(e) => setShowDriverDetailModal({...showDriverDetailModal, experience: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Örn: 5 yıl"
                              />
                            ) : (
                              showDriverDetailModal.experience || '-'
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Notlar:</div>
                          <div className="font-medium">
                            {isEditing ? (
                              <textarea
                                value={showDriverDetailModal.notes}
                                onChange={(e) => setShowDriverDetailModal({...showDriverDetailModal, notes: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                rows={3}
                              />
                            ) : (
                              showDriverDetailModal.notes || '-'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sağ Bölüm - Performans ve Belgeler */}
                <div className="md:w-1/2 space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-3">Performans</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-600">Başarı Oranı</span>
                          <span className={`font-bold ${
                            showDriverDetailModal.successRate >= 90 ? 'text-green-600' : 
                            showDriverDetailModal.successRate >= 75 ? 'text-orange-600' : 
                            'text-red-600'
                          }`}>{showDriverDetailModal.successRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${
                            showDriverDetailModal.successRate >= 90 ? 'bg-green-600' : 
                            showDriverDetailModal.successRate >= 75 ? 'bg-orange-600' : 
                            'bg-red-600'
                          }`} style={{width: `${showDriverDetailModal.successRate}%`}}></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-gray-500 text-sm mb-1">Aktif Taşıma</div>
                          <div className="text-xl font-bold text-blue-600">{showDriverDetailModal.activeShipments}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="text-gray-500 text-sm mb-1">Tamamlanan</div>
                          <div className="text-xl font-bold text-green-600">{showDriverDetailModal.completedShipments}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-3">Belgeler</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Belge</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Tarih</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {showDriverDetailModal.documents.map((document) => (
                            <tr key={document.id}>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  <FaFileAlt className="text-gray-400 mr-2" />
                                  <div className="text-sm font-medium text-gray-900">
                                    {document.name}
                                    {document.type === 'Zorunlu' && <span className="text-red-500"> *</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  document.status === 'Aktif' 
                                    ? documentApprovals[document.id] || document.approved
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-blue-100 text-blue-800'
                                    : document.status === 'Süresi Dolmuş' 
                                      ? 'bg-red-100 text-red-800' 
                                      : document.status === 'Beklemede' || (!document.approved && !documentApprovals[document.id])
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {document.status === 'Aktif'
                                    ? documentApprovals[document.id] || document.approved
                                      ? 'Onaylandı'
                                      : 'Onay Bekliyor'
                                    : document.status === 'Süresi Dolmuş'
                                      ? 'Süresi Dolmuş'
                                      : document.status === 'Beklemede' || (!document.approved && !documentApprovals[document.id])
                                        ? 'Onay Bekliyor'
                                        : document.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {document.validUntil || "Süresiz"}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex space-x-2">
                                  <button 
                                    className="text-blue-600 hover:text-blue-900"
                                    onClick={() => window.open(document.fileUrl, '_blank')}
                                    title="Görüntüle"
                                  >
                                    <FaEye className="w-5 h-5" />
                                  </button>
                                  
                                  {/* Belge onay bekliyor ve süresi dolmamışsa Onayla butonu göster */}
                                  {document.status === 'Aktif' && 
                                    !document.approved && 
                                    !documentApprovals[document.id] && (
                                    <button 
                                      className="text-green-600 hover:text-green-900"
                                      onClick={() => approveDocument(document)}
                                      title="Onayla"
                                    >
                                      <FaCheck className="w-5 h-5" />
                                    </button>
                                  )}
                                  
                                  <button 
                                    className="text-orange-600 hover:text-orange-900"
                                    onClick={() => handleUpdateDocument(document.id)}
                                    title="Güncelle"
                                  >
                                    <FaEdit className="w-5 h-5" />
                                  </button>
                                  <button 
                                    className="text-red-600 hover:text-red-900"
                                    onClick={() => handleDeleteDocument(document.id)}
                                    title="Sil"
                                  >
                                    <FaTrash className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {showDriverDetailModal.missingDocuments?.length > 0 && (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg">
                          <h5 className="text-sm font-medium text-red-800 mb-2">Eksik Belgeler:</h5>
                          <ul className="list-disc list-inside text-sm text-red-700">
                            {showDriverDetailModal.missingDocuments.map((doc, index) => (
                              <li key={index}>{doc.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <button 
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
                          onClick={() => setShowDriverDocumentsModal(showDriverDetailModal)}
                        >
                          <FaFileAlt className="mr-2" /> Belgeleri Yönet
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4 flex justify-end">
                {isEditing ? (
                  <>
                    <button 
                      className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded mr-2"
                      onClick={() => {
                        updateDriver(showDriverDetailModal);
                        setIsEditing(false);
                      }}
                    >
                      <FaCheck className="mr-2 inline-block" /> Kaydet
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded mr-2"
                    >
                      İptal
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded mr-2"
                      onClick={() => setIsEditing(true)}
                    >
                      <FaEdit className="mr-2 inline-block" /> Düzenle
                    </button>
                    <button 
                      onClick={() => {
                        const newStatus = showDriverDetailModal.status === 'active' ? 'passive' : 'active';
                        updateDriver({
                          ...showDriverDetailModal,
                          status: newStatus
                        });
                        setShowDriverDetailModal(null);
                      }}
                      className={`font-medium py-2 px-4 rounded mr-2 ${
                        showDriverDetailModal.status === 'active' 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {showDriverDetailModal.status === 'active' ? 'Pasif Yap' : 'Aktif Yap'}
                    </button>
                  </>
                )}
                <button 
                  onClick={() => {
                    setShowDriverDetailModal(null);
                    setIsEditing(false);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Belge Yönetimi Modal */}
      {showDriverDocumentsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle md:ml-40">
              {/* Modal Header */}
              <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-800">
                    Sürücü Belgeleri
                  </h3>
                  <div className="flex items-center">
                    <span className="mr-2 text-sm text-gray-500">
                      {showDriverDocumentsModal.name || "Sürücü"} 
                    </span>
                    {showDriverDocumentsModal._id && (
                      <span className="text-sm text-gray-500">
                        ID: {showDriverDocumentsModal._id.toString().slice(-4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Modal Body */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {/* Mevcut Belgeler */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DRIVER_DOCUMENT_TYPES.map(docType => {
                    const document = showDriverDocumentsModal.documents?.find(doc => doc.name === docType.name);
                    const hasDocument = document && document.fileUrl;
                    const isExpired = docType.hasExpiryDate && document?.validUntil && 
                                    new Date(document.validUntil) < new Date();
                    const isApproved = documentApprovals[document?.id] || (document && document.approved);
                    
                    return (
                      <div key={docType.id} className="border rounded-lg overflow-hidden">
                        <div className={`px-4 py-3 font-medium flex justify-between items-center ${
                          hasDocument 
                            ? isExpired 
                              ? 'bg-red-50 text-red-800 border-b border-red-100' 
                              : isApproved
                                ? 'bg-green-50 text-green-800 border-b border-green-100'
                                : 'bg-blue-50 text-blue-800 border-b border-blue-100'
                          : docType.required
                            ? 'bg-yellow-50 text-yellow-800 border-b border-yellow-100'
                            : 'bg-gray-50 text-gray-800 border-b border-gray-100'
                        }`}>
                          <span className="truncate">{docType.name}</span>
                          <span className="text-xs px-2 py-1 rounded-full border flex items-center gap-1 whitespace-nowrap ml-2">
                            {hasDocument 
                              ? isExpired 
                                ? <><FaExclamationTriangle className="text-red-600" /> Süresi Geçmiş</>
                                : isApproved
                                  ? <><FaCheck className="text-green-600" /> Onaylı</>
                                  : <><FaFileAlt className="text-blue-600" /> Yüklendi</>
                              : docType.required
                                ? <><FaExclamationCircle className="text-yellow-600" /> Gerekli</>
                                : <><FaFileAlt className="text-gray-400" /> İsteğe Bağlı</>
                            }
                          </span>
                        </div>
                        
                        <div className="p-4 bg-white">
                          {hasDocument ? (
                            <div className="space-y-3">
                              {document.validUntil && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <FaCalendarAlt className="text-gray-400" />
                                  <span>Geçerlilik: {new Date(document.validUntil).toLocaleDateString('tr-TR')}</span>
                                  {isExpired && (
                                    <span className="text-red-600 font-medium">(Süresi Geçmiş)</span>
                                  )}
                                </div>
                              )}
                              
                              {/* Belge işlem butonları */}
                              <div className="flex items-center gap-2">
                                {/* Onaylı belge için onay simgesi ve görüntüleme butonu */}
                                {isApproved && (
                                  <div className="flex items-center gap-2 w-full">
                                    <div className="flex-1 text-green-700 font-medium text-sm flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-md">
                                      <FaCheck className="text-green-600" /> Onaylanmış Belge
                                    </div>
                                    <a 
                                      href={document.fileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm"
                                    >
                                      <FaEye className="mr-2" /> Görüntüle
                                    </a>
                                  </div>
                                )}
                                
                                {/* Henüz onaylanmamış belge butonları */}
                                {!isExpired && !isApproved && hasDocument && (
                                  <>
                                    <a 
                                      href={document.fileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm"
                                    >
                                      <FaEye className="mr-2" /> Görüntüle
                                    </a>
                                    <button 
                                      type="button" 
                                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm"
                                      onClick={() => approveDocument(document)}
                                    >
                                      <FaCheck className="mr-2" /> Onayla
                                    </button>
                                    <button 
                                      type="button" 
                                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-sm"
                                      onClick={() => handleDeleteDocument(document.id)}
                                    >
                                      <FaTimes className="mr-2" /> Reddet
                                    </button>
                                  </>
                                )}
                                
                                {/* Süresi geçmiş belge için sadece görüntüleme */}
                                {isExpired && hasDocument && (
                                  <div className="flex items-center gap-2 w-full">
                                    <div className="flex-1 text-red-700 font-medium text-sm flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-md">
                                      <FaExclamationTriangle className="text-red-600" /> Süresi Dolmuş
                                    </div>
                                    <a 
                                      href={document.fileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm"
                                    >
                                      <FaEye className="mr-2" /> Görüntüle
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              {docType.required
                                ? "Bu belge henüz yüklenmemiş (Zorunlu)"
                                : "Bu belge henüz yüklenmemiş (İsteğe bağlı)"
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Belge yoksa bilgi mesajı */}
                  {(!showDriverDocumentsModal.documents || showDriverDocumentsModal.documents.length === 0) && (
                    <div className="col-span-2 text-center py-8">
                      <FaFileAlt className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">Bu sürücü için henüz belge yüklenmemiş</p>
                    </div>
                  )}
                </div>
                
                {/* Belge Yükleme Formu */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-4">Yeni Belge Yükle</h4>
                  
                  {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4">
                      {error}
                    </div>
                  )}
                  
                  <form onSubmit={handleDocumentUpload}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="document-type" className="block text-sm font-medium text-gray-700 mb-1">
                          Belge Türü *
                        </label>
                        <select
                          id="document-type"
                          value={newDocument.type}
                          onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value })}
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          required
                          disabled={loading}
                        >
                          <option value="">Belge Türünü Seçin</option>
                          {DRIVER_DOCUMENT_TYPES.map(docType => (
                            <option key={docType.id} value={docType.id}>
                              {docType.name} {docType.required ? '(Zorunlu)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="document-expiry" className="block text-sm font-medium text-gray-700 mb-1">
                          Geçerlilik Tarihi *
                        </label>
                        <input
                          type="date"
                          id="document-expiry"
                          value={newDocument.validUntil}
                          onChange={(e) => setNewDocument({ ...newDocument, validUntil: e.target.value })}
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          required
                          disabled={loading}
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="document-file" className="block text-sm font-medium text-gray-700 mb-1">
                          Belge Dosyası *
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id="document-file"
                            onChange={handleFileSelect}
                            className="flex-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 focus:outline-none"
                            accept=".pdf,.jpg,.jpeg,.png"
                            required
                            disabled={loading}
                          />
                          <button
                            type="submit"
                            disabled={loading || !newDocument.file || !newDocument.type || !newDocument.validUntil}
                            className={`inline-flex items-center justify-center px-3 py-2 rounded-md border border-transparent ${
                              loading || !newDocument.file || !newDocument.type || !newDocument.validUntil
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-orange-600 text-white hover:bg-orange-700'
                            } transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                          >
                            {loading ? (
                              <>
                                <FaSpinner className="animate-spin mr-2" />
                                Yükleniyor...
                              </>
                            ) : (
                              <>
                                <FaUpload className="mr-2" />
                                Yükle
                              </>
                            )}
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          JPG, JPEG, PNG veya PDF formatında belgeler yükleyebilirsiniz.
                        </p>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-end">
                  <button 
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                    onClick={() => setShowDriverDocumentsModal(null)}
                  >
                    <FaTimes className="mr-2" /> Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={(e) => {
          if (e.target === e.currentTarget) setShowDeleteConfirm(null);
        }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">Sürücü Silme Onayı</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                <b>{showDeleteConfirm.name}</b> isimli sürücüyü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
                >
                  İptal
                </button>
                <button 
                  onClick={() => deleteDriver(showDeleteConfirm.id)}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
                >
                  Sürücüyü Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Sürücü Ekleme Modal */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30 p-4 overflow-y-auto" onClick={(e) => {
          if (e.target === e.currentTarget) setShowAddDriverModal(false);
        }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Yeni Sürücü Ekle</h3>
              <button 
                onClick={() => setShowAddDriverModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kişisel Bilgiler */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Kişisel Bilgiler</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adı Soyadı <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDriverData.name}
                        onChange={(e) => setNewDriverData({...newDriverData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefon <span className="text-red-500">*</span></label>
                      <input 
                        type="tel" 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDriverData.phone}
                        onChange={(e) => setNewDriverData({...newDriverData, phone: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                      <input 
                        type="email" 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDriverData.email}
                        onChange={(e) => setNewDriverData({...newDriverData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                      <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDriverData.address}
                        onChange={(e) => setNewDriverData({...newDriverData, address: e.target.value})}
                        rows={3}
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                {/* Sürücü Bilgileri */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Sürücü Bilgileri</h4>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                        Firma
                      </label>
                      <select
                        id="company"
                        name="company"
                        value={newDriverData.company}
                        onChange={(e) => setNewDriverData({...newDriverData, company: e.target.value})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900"
                      >
                        <option value="">Firma Seçin</option>
                        {companies.map((company) => (
                          <option key={company._id} value={company._id}>
                            {company.companyName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ehliyet Sınıfı <span className="text-red-500">*</span></label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDriverData.licenseType}
                        onChange={(e) => setNewDriverData({...newDriverData, licenseType: e.target.value})}
                        required
                      >
                        <option value="">Seçiniz</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ehliyet Son Geçerlilik Tarihi</label>
                      <input 
                        type="text" 
                        placeholder="gg.aa.yyyy"
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDriverData.licenseExpiry}
                        onChange={(e) => setNewDriverData({...newDriverData, licenseExpiry: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deneyim</label>
                      <input 
                        type="text" 
                        placeholder="Örn: 5 yıl"
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDriverData.experience}
                        onChange={(e) => setNewDriverData({...newDriverData, experience: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                      <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDriverData.notes}
                        onChange={(e) => setNewDriverData({...newDriverData, notes: e.target.value})}
                        rows={3}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="bg-orange-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-orange-800">
                    <strong>Not:</strong> Sürücü kaydı oluşturulduktan sonra aşağıdaki belgeleri yüklemeniz gerekmektedir:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-orange-800">
                    <li>Sürücü Belgesi *</li>
                    <li>SRC Belgesi *</li>
                    <li>Sağlık Raporu *</li>
                    <li>Psikoteknik Belgesi *</li>
                  </ul>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowAddDriverModal(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={() => setShowDriverDocumentsModal({ id: 'new', name: 'Yeni Sürücü Belgeleri' })}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
                  >
                    <FaFileAlt className="mr-2" /> Belgeler
                  </button>
                  <button 
                    onClick={addNewDriver}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded"
                    disabled={!newDriverData.name || !newDriverData.phone || !newDriverData.licenseType || !newDriverData.company}
                  >
                    Sürücü Ekle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 