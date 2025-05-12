'use client'

import React, { useState, useEffect } from 'react'
import { FaPlus, FaSearch, FaEdit, FaTrash, FaUserShield, FaIdCard, FaTruck, FaTimes, FaCheck, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCalendarAlt, FaExclamationTriangle, FaBuilding, FaFileAlt, FaEye, FaExclamationCircle, FaTags, FaRegCalendarAlt, FaIndustry, FaIdBadge, FaUser, FaSpinner, FaUpload, FaChevronLeft, FaChevronRight, FaRegStar, FaCheckCircle } from 'react-icons/fa'
import AdminLayout from '../../components/admin/Layout'
import { useRouter } from 'next/router'
import axios from 'axios'
import Head from 'next/head'
import { useSession } from 'next-auth/react'

// Belge türleri sabiti
const DOCUMENT_TYPES = [
  { id: 'vergi', name: 'Vergi Levhası', required: true, hasExpiryDate: false },
  { id: 'sicil', name: 'Ticaret Sicil Gazetesi', required: true, hasExpiryDate: false },
  { id: 'imza', name: 'İmza Sirküleri', required: true, hasExpiryDate: false },
  { id: 'k1', name: 'K1 Belgesi', required: false, hasExpiryDate: true },
  { id: 'k2', name: 'K2 Belgesi', required: false, hasExpiryDate: true },
  { id: 'k3', name: 'K3 Belgesi', required: false, hasExpiryDate: true }
];

// Belge durumu kontrolü fonksiyonu
const checkDocumentStatus = (carrier) => {
  if (!carrier) return 'inactive';
  
  // Eğer carrier.documents yoksa veya boşsa
  if (!carrier.documents || Object.keys(carrier.documents).length === 0) {
    return 'belge_bekliyor';
  }

  let hasAllRequired = true;
  let hasExpired = false;

  // Her belge türü için kontrol
  DOCUMENT_TYPES.forEach(docType => {
    const carrierDoc = carrier.documents[docType.id];
    
    // Zorunlu belge kontrolü
    if (docType.required && (!carrierDoc || !carrierDoc.url)) {
      hasAllRequired = false;
    }
    
    // Son kullanma tarihi kontrolü
    if (docType.hasExpiryDate && carrierDoc && carrierDoc.expiryDate) {
      const expiryDate = new Date(carrierDoc.expiryDate);
      if (expiryDate < new Date()) {
        hasExpired = true;
      }
    }
  });

  // Durum belirleme
  if (!hasAllRequired) return 'belge_bekliyor';
  if (hasExpired) return 'suresi_gecmis_belge';
  return 'active';
};

// Durum badge'larının stil ve metinlerini belirleyen yardımcı fonksiyon
const getStatusBadgeInfo = (carrier) => {
  // Önce carrier.status'a bak
  if (carrier.status === 'WAITING_APPROVAL') {
    return {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
      text: 'Onay Bekliyor'
    };
  }
  
  if (carrier.status === 'pending') {
    return {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      text: 'Beklemede'
    };
  }
  
  if (carrier.status === 'inactive') {
    return {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      text: 'Pasif'
    };
  }
  
  if (carrier.status === 'WAITING_DOCUMENTS') {
    return {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      text: 'Belge Yükleme Bekleniyor'
    };
  }
  
  if (carrier.status === 'document_expired') {
    return {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      text: 'Süresi Geçmiş Belge'
    };
  }
  
  // carrier.status belirleyici değilse checkDocumentStatus'a bak
  const docStatus = checkDocumentStatus(carrier);
  
  if (docStatus === 'active') {
    return {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
      text: 'Aktif'
    };
  }
  
  if (docStatus === 'belge_bekliyor') {
    return {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      text: 'Belge Yükleme Bekleniyor'
    };
  }
  
  if (docStatus === 'suresi_gecmis_belge') {
    return {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      text: 'Süresi Geçmiş Belge'
    };
  }
  
  // Varsayılan durum
  return {
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200',
    text: 'Bilinmiyor'
  };
};

export default function CarriersPage() {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState('all')
  const [showCarrierDetailModal, setShowCarrierDetailModal] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDriversModal, setShowDriversModal] = useState(false)
  const [showVehiclesModal, setShowVehiclesModal] = useState(false)
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)
  const [showDriverDocumentsModal, setShowDriverDocumentsModal] = useState(null)
  const [showAddCarrierModal, setShowAddCarrierModal] = useState(false)
  const [showEditCarrierModal, setShowEditCarrierModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [carriers, setCarriers] = useState([])
  const [newCarrierData, setNewCarrierData] = useState({
    name: '',
    contactPerson: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    taxOffice: '',
    taxNumber: '',
    companyType: '',
    registrationNumber: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCarriers, setTotalCarriers] = useState(0)
  const [carrierStatus, setCarrierStatus] = useState('')
  // İstatistik sayıları için yeni state'ler
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    documentRequired: 0,
    waitingApproval: 0,
    inactive: 0
  })
  // Sürücüler ve Araçlar için yeni state'ler
  const [showCarrierDriversModal, setShowCarrierDriversModal] = useState(false);
  const [showCarrierVehiclesModal, setShowCarrierVehiclesModal] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  // Belge onay durumu için yeni state
  const [documentApprovals, setDocumentApprovals] = useState({});
  // Belge yükleme için state'ler
  const [documentUploading, setDocumentUploading] = useState(false)
  const [documentUploadError, setDocumentUploadError] = useState(null)
  const [selectedDocumentType, setSelectedDocumentType] = useState('')
  const [documentExpiryDate, setDocumentExpiryDate] = useState('')
  const [documentFile, setDocumentFile] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCarrierData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ESC tuşu ile modal'ları kapatma
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Açık olan modallar arasında en üstte olanı kapat
        if (showDocumentsModal) {
          setShowDocumentsModal(false);
          return;
        }
        
        // Doküman modalı açık değilse, diğer modalları kontrol et
        if (showDriverDocumentsModal) {
          setShowDriverDocumentsModal(null);
        } else if (showEditCarrierModal) {
          setShowEditCarrierModal(null);
        } else if (showAddCarrierModal) {
          setShowAddCarrierModal(false);
        } else if (showVehiclesModal) {
          setShowVehiclesModal(false);
        } else if (showDriversModal) {
          setShowDriversModal(false);
        } else if (showDeleteConfirm) {
          setShowDeleteConfirm(null);
        } else if (showCarrierDetailModal) {
          setShowCarrierDetailModal(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Modal açıkken body scroll'u engelle
    if (showCarrierDetailModal || showDeleteConfirm || showDriversModal || showVehiclesModal || showDocumentsModal || showDriverDocumentsModal || showAddCarrierModal || showEditCarrierModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [showCarrierDetailModal, showDeleteConfirm, showDriversModal, showVehiclesModal, showDocumentsModal, showDriverDocumentsModal, showAddCarrierModal, showEditCarrierModal]);

  // Taşıyıcıları API'den çekme
  useEffect(() => {
    const fetchCarriers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Seçilen sekmeye göre status parametresini belirle
        let statusFilter = '';
        switch(selectedTab) {
          case 'active':
            statusFilter = 'active';
            break;
          case 'pending':
            statusFilter = 'pending';
            break;
          case 'document_required':
            // Bu durum API'de değil, frontend'de hesaplanıyor
            statusFilter = '';
            break;
          case 'waiting_approval':
            statusFilter = 'WAITING_APPROVAL';
            break;
          case 'inactive':
            statusFilter = 'inactive';
            break;
          default:
            statusFilter = '';
        }
        
        // URL'de query parametrelerini gönderiyoruz, params değil
        // Tüm taşıyıcıları çekmek için sekmeyi dikkate almadan önce istatistikleri hesaplayalım
        const statsResponse = await fetch(`/api/admin/carriers?limit=1000`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!statsResponse.ok) {
          const errorData = await statsResponse.json();
          throw new Error(errorData.error || 'Taşıyıcı verileri alınamadı');
        }

        const statsData = await statsResponse.json();
          
        // İstatistikleri hesapla (filtreye bağlı olmadan)
        if (statsData.success) {
          const allCarriers = statsData.carriers;
          
          // İstatistikleri talep edilen şekilde hesaplayalım
          const totalCount = allCarriers.length;
          const activeCount = allCarriers.filter(c => checkDocumentStatus(c) === 'active').length;
          const pendingCount = allCarriers.filter(c => 
            c.status === 'pending' || c.status === 'WAITING_APPROVAL'
          ).length;
          const documentRequiredCount = allCarriers.filter(c => {
            // Öncelikle pending veya WAITING_APPROVAL durumundaysa belge bekleyen olarak sayma
            if (c.status === 'pending' || c.status === 'WAITING_APPROVAL') {
              return false;
            }
            
            const status = checkDocumentStatus(c);
            return status === 'belge_bekliyor' || 
                  status === 'suresi_gecmis_belge' || 
                  c.status === 'WAITING_DOCUMENTS' || 
                  c.status === 'document_expired';
          }).length;

          setStats({
            total: totalCount,
            active: activeCount,
            pending: pendingCount,
            documentRequired: documentRequiredCount,
            waitingApproval: allCarriers.filter(c => c.status === 'WAITING_APPROVAL').length,
            inactive: allCarriers.filter(c => c.status === 'inactive').length
          });
        }
        
        // Filtrelenmiş taşıyıcıları çek
        const response = await fetch(`/api/admin/carriers?page=${currentPage}&limit=10${statusFilter ? `&status=${statusFilter}` : ''}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Taşıyıcı verileri alınamadı');
        }

        const data = await response.json();
        
        if (data.success) {
          // Seçilen sekmeye göre filtreleme
          if (selectedTab === 'document_required') {
            // 'WAITING_APPROVAL' durumunda olan taşıyıcıları hariç tut
            const filteredCarriers = data.carriers.filter(carrier => {
              // Eğer taşıyıcı onay bekliyorsa belge bekleyen listesinde gösterme
              if (carrier.status === 'WAITING_APPROVAL') {
                return false;
              }
              
              const status = checkDocumentStatus(carrier);
              // belge_bekliyor, suresi_gecmis_belge, WAITING_DOCUMENTS, document_expired durumlarını kontrol et
              return (
                status === 'belge_bekliyor' || 
                status === 'suresi_gecmis_belge' || 
                carrier.status === 'WAITING_DOCUMENTS' || 
                carrier.status === 'document_expired'
              );
            });
            setCarriers(filteredCarriers);
          } else if (selectedTab === 'waiting_approval') {
            // Sadece WAITING_APPROVAL durumundaki taşıyıcıları göster
            setCarriers(data.carriers);
          } else {
            setCarriers(data.carriers);
          }
          
          setTotalPages(data.pagination.pages || 1);
          setTotalCarriers(data.pagination.total || 0);
        } else {
          throw new Error(data.error || 'Taşıyıcı verileri alınamadı');
        }
      } catch (error) {
        console.error('Taşıyıcılar yüklenirken hata:', error);
        setError('Taşıyıcı verileri yüklenemedi. Lütfen daha sonra tekrar deneyin.');
        
        // Hata durumunda boş veriler
        setCarriers([]);
        setTotalPages(1);
        setTotalCarriers(0);
        setStats({
          total: 0,
          active: 0,
          pending: 0,
          documentRequired: 0,
          waitingApproval: 0,
          inactive: 0
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCarriers();
  }, [currentPage, selectedTab]);

  // Yeni taşıyıcı ekleme
  const addNewCarrier = async () => {
    try {
      setLoading(true);
      
      // Payload verilerini oluştur
      const payload = {
        name: newCarrierData.name,
        contactPerson: newCarrierData.contactPerson,
        phone: newCarrierData.phone,
        email: newCarrierData.email,
        company: newCarrierData.companyName,
        address: newCarrierData.address,
        taxOffice: newCarrierData.taxOffice,
        taxNumber: newCarrierData.taxNumber,
        city: newCarrierData.city || '',
        district: newCarrierData.district || '',
        status: 'pending',
        isActive: false,
        pendingDocuments: true,
      };

      // API çağrısı yaparak taşıyıcıyı ekle
      const response = await axios.post('/api/admin/carriers', payload);
      
      if (response.data && response.data.success) {
        // Listeyi güncelle
        const updatedResponse = await axios.get('/api/admin/carriers', {
          params: {
            search: searchTerm,
            status: carrierStatus,
            page: currentPage,
            limit: 10
          }
        });

        if (updatedResponse.data && updatedResponse.data.carriers) {
          setCarriers(updatedResponse.data.carriers);
          setTotalPages(updatedResponse.data.pagination.pages || 1);
          setTotalCarriers(updatedResponse.data.pagination.total || 0);
        }
      }

        setShowAddCarrierModal(false);
    setNewCarrierData({
      name: '',
          contactPerson: '',
        companyName: '',
      phone: '',
      email: '',
      address: '',
      taxOffice: '',
      taxNumber: '',
      companyType: '',
      registrationNumber: '',
    });

    } catch (error) {
      console.error('Taşıyıcı eklenirken hata:', error);
      setError('Taşıyıcı eklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewClick = (carrier) => {
    setShowCarrierDetailModal(carrier);
  };

  // Belge onaylama işlevi
  const handleDocumentApproval = (docTypeId) => {
    setDocumentApprovals(prev => ({
      ...prev,
      [docTypeId]: true
    }));
    
    // Gerçek uygulamada burada API çağrısı yapılmalı
    console.log(`Belge onaylandı: ${docTypeId}`);
  };

  // Dosya seçme işlevi
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setDocumentUploadError('Lütfen PDF dosyası seçin');
        return;
      }
      
      setDocumentFile(file);
      setDocumentUploadError(null);
    }
  };

  // Belge yükleme işlevi
  const handleDocumentUpload = async () => {
    if (!documentFile || !selectedDocumentType) {
      setDocumentUploadError('Lütfen belge türü seçin ve dosya yükleyin');
      return;
    }

    // Belge türüne göre son kullanma tarihi gerekli mi kontrol et
    const selectedDocType = DOCUMENT_TYPES.find(dt => dt.id === selectedDocumentType);
    
    if (selectedDocType?.hasExpiryDate && !documentExpiryDate) {
      setDocumentUploadError('Lütfen belge için geçerlilik tarihi girin');
      return;
    }

    try {
      setDocumentUploading(true);
      setDocumentUploadError(null);

      // FormData oluştur
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('carrierId', showDocumentsModal._id);
      formData.append('documentType', selectedDocumentType);
      
      if (documentExpiryDate) {
        formData.append('expiryDate', documentExpiryDate);
      }

      // API'ye gönder
      const response = await fetch('/api/admin/carriers/upload-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Belge yüklenirken bir hata oluştu');
      }

      // Başarılı yüklemeden sonra taşıyıcı verilerini güncelle
      const updatedCarrier = { ...showDocumentsModal };
      
      if (!updatedCarrier.documents) {
        updatedCarrier.documents = {};
      }
      
      updatedCarrier.documents[selectedDocumentType] = {
        url: data.document_url,
        uploadDate: new Date(),
        expiryDate: documentExpiryDate ? new Date(documentExpiryDate) : null,
        approved: false
      };

      // Modal'daki taşıyıcı verilerini güncelle
      setShowDocumentsModal(updatedCarrier);
      
      // Formu temizle
      setSelectedDocumentType('');
      setDocumentExpiryDate('');
      setDocumentFile(null);
      
      // Dosya giriş alanını temizle (bu bir hack)
      const fileInput = document.getElementById('document-file-input');
      if (fileInput) fileInput.value = "";
      
    } catch (error) {
      console.error('Belge yükleme hatası:', error);
      setDocumentUploadError(error.message || 'Belge yüklenirken bir hata oluştu');
    } finally {
      setDocumentUploading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Taşıyıcılar - TaşıApp Admin</title>
      </Head>
      <AdminLayout title="Taşıyıcı Yönetimi">
        <div className={showCarrierDetailModal || showDeleteConfirm || showDriversModal || showVehiclesModal || showDocumentsModal || showDriverDocumentsModal || showAddCarrierModal || showEditCarrierModal ? "blur-sm" : ""}>
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
                Tüm Taşıyıcılar
              </button>
              <button
                onClick={() => setSelectedTab('active')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'active' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } mb-2`}
              >
                Aktif
              </button>
              <button
                onClick={() => setSelectedTab('pending')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'pending' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } mb-2`}
              >
                Bekleyen
              </button>
              <button
                onClick={() => setSelectedTab('document_required')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'document_required' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } mb-2`}
              >
                Belge Bekleyen
              </button>
              <button
                onClick={() => setSelectedTab('waiting_approval')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'waiting_approval' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } mb-2`}
              >
                Onay Bekleyen
              </button>
              <button
                onClick={() => setSelectedTab('inactive')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'inactive' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } mb-2`}
              >
                Pasif
              </button>
            </div>
            <div className="flex flex-col w-full md:flex-row md:w-auto gap-4">
              <div className="relative w-full md:w-auto">
                <input 
                  type="text" 
                    placeholder="Taşıyıcı Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full md:min-w-[250px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button 
                onClick={() => setShowAddCarrierModal(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center"
              >
                <FaPlus className="mr-2" /> Yeni Taşıyıcı
              </button>
            </div>
          </div>

          {/* İstatistik Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:shadow-lg hover:bg-gray-50 cursor-default">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Taşıyıcı</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <FaTruck className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:shadow-lg hover:bg-gray-50 cursor-default">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktif Taşıyıcı</p>
                  <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FaCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:shadow-lg hover:bg-gray-50 cursor-default">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bekleyen Taşıyıcı</p>
                  <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <FaExclamationCircle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:shadow-lg hover:bg-gray-50 cursor-default">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Belge Bekleyen</p>
                  <p className="text-2xl font-semibold text-red-600">{stats.documentRequired}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <FaFileAlt className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

          {/* Taşıyıcı Listesi */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Taşıyıcı Listesi</h2>
                </div>
                
            {loading ? (
              <div className="p-8 text-center">
                <FaSpinner className="animate-spin h-8 w-8 text-orange-600 mx-auto" />
                <p className="mt-4 text-gray-500">Yükleniyor...</p>
                        </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <FaExclamationCircle className="h-6 w-6 text-red-600" />
                        </div>
                <p className="mt-4 text-red-600">{error}</p>
                        </div>
            ) : carriers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Henüz taşıyıcı bulunmuyor.</p>
                        </div>
            ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firma</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim Kişisi</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                    {carriers.map((carrier) => (
                      <tr key={carrier._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{carrier.companyName}</div>
                              <div className="text-sm text-gray-500">TF{carrier._id.toString().slice(-4)}</div>
                                </div>
                              </div>
                            </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{carrier.contactPerson}</div>
                            </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{carrier.phoneNumber || carrier.phone || "-"}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{carrier.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusBadgeInfo(carrier).bgColor
                          } ${getStatusBadgeInfo(carrier).textColor} border ${getStatusBadgeInfo(carrier).borderColor}`}>
                            {getStatusBadgeInfo(carrier).text}
                          </span>
                              </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button 
                            onClick={() => handlePreviewClick(carrier)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Önizle"
                          >
                            <FaEye className="inline-block h-5 w-5" />
                                </button>
                              </td>
                            </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
            )}

            {/* Sayfalama */}
            <div className="bg-white px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Toplam <span className="font-medium text-gray-900">{carriers.length}</span> taşıyıcı bulundu
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
                </div>
      </AdminLayout>

      {/* Detay Modalı */}
      {showCarrierDetailModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle">
              {/* Modal Header */}
              <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-800">
                    Taşıyıcı Detayları
                  </h3>
                  <div className="flex items-center">
                    <span className="mr-2 text-sm text-gray-500">ID: TF{showCarrierDetailModal._id.toString().slice(-4)}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getStatusBadgeInfo(showCarrierDetailModal).bgColor
                    } ${getStatusBadgeInfo(showCarrierDetailModal).textColor} border ${getStatusBadgeInfo(showCarrierDetailModal).borderColor}`}>
                      {getStatusBadgeInfo(showCarrierDetailModal).text}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Modal Body */}
              <div className="px-6 py-4">
                {/* İlave İstatistik Kartları - İlk Satır */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Firma Puanı</p>
                        <p className="text-xl font-semibold text-orange-600">{showCarrierDetailModal.rating || "4.5"}/5</p>
                      </div>
                      <div className="p-2 bg-orange-100 rounded-full">
                        <FaRegStar className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                  </div>
                  <div 
                    className={`bg-white rounded-lg shadow p-4 border border-gray-100 ${
                      (showCarrierDetailModal.driversCount && showCarrierDetailModal.driversCount > 0) ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''
                    }`}
                    onClick={() => {
                      if (showCarrierDetailModal.driversCount && showCarrierDetailModal.driversCount > 0) {
                        setLoadingDrivers(true);
                        // API'den sürücü verilerini getir
                        fetch(`/api/admin/carriers/${showCarrierDetailModal._id}/drivers`)
                          .then(response => response.json())
                          .then(data => {
                            if (data.success) {
                              setDrivers(data.drivers);
                            }
                            setLoadingDrivers(false);
                            setShowCarrierDriversModal(true);
                          })
                          .catch(error => {
                            console.error('Sürücü verileri alınırken hata:', error);
                            setLoadingDrivers(false);
                          });
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Sürücü Sayısı</p>
                        <p className="text-xl font-semibold text-blue-600">
                          {showCarrierDetailModal.driversCount || "0"}
                          {(showCarrierDetailModal.driversCount && showCarrierDetailModal.driversCount > 0) && 
                            <FaEye className="ml-2 inline-block h-4 w-4 text-blue-400" />
                          }
                        </p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <FaIdCard className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <div 
                    className={`bg-white rounded-lg shadow p-4 border border-gray-100 ${
                      (showCarrierDetailModal.vehiclesCount && showCarrierDetailModal.vehiclesCount > 0) ? 'cursor-pointer hover:bg-green-50 transition-colors' : ''
                    }`}
                    onClick={() => {
                      if (showCarrierDetailModal.vehiclesCount && showCarrierDetailModal.vehiclesCount > 0) {
                        setLoadingVehicles(true);
                        // API'den araç verilerini getir
                        fetch(`/api/admin/carriers/${showCarrierDetailModal._id}/vehicles`)
                          .then(response => response.json())
                          .then(data => {
                            if (data.success) {
                              setVehicles(data.vehicles);
                            }
                            setLoadingVehicles(false);
                            setShowCarrierVehiclesModal(true);
                          })
                          .catch(error => {
                            console.error('Araç verileri alınırken hata:', error);
                            setLoadingVehicles(false);
                          });
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Araç Sayısı</p>
                        <p className="text-xl font-semibold text-green-600">
                          {showCarrierDetailModal.vehiclesCount || "0"}
                          {(showCarrierDetailModal.vehiclesCount && showCarrierDetailModal.vehiclesCount > 0) && 
                            <FaEye className="ml-2 inline-block h-4 w-4 text-green-400" />
                          }
                        </p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-full">
                        <FaTruck className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Firma Adı
                      </label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                        {showCarrierDetailModal.companyName || "-"}
                      </div>
                    </div>
                    
                      <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        İletişim Kişisi
                      </label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                        {showCarrierDetailModal.contactPerson || "-"}
                      </div>
                    </div>
                    
                      <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        E-posta
                      </label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100 flex items-center">
                        <FaEnvelope className="text-gray-400 mr-2" />
                        {showCarrierDetailModal.email || "-"}
                      </div>
                    </div>
                    
                  <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Telefon
                      </label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100 flex items-center">
                        <FaPhone className="text-gray-400 mr-2" />
                        {showCarrierDetailModal.phoneNumber || showCarrierDetailModal.phone || "-"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Vergi Numarası
                      </label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                        {showCarrierDetailModal.taxNumber || "-"}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Vergi Dairesi
                      </label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                        {showCarrierDetailModal.taxOffice || "-"}
                        </div>
                    </div>
                    
                        <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Adres
                      </label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100 flex items-start">
                        <FaMapMarkerAlt className="text-gray-400 mr-2 mt-0.5" />
                        <span className="line-clamp-2">{showCarrierDetailModal.address || "-"}</span>
                        </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Kayıt Tarihi
                      </label>
                      <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100 flex items-center">
                        <FaCalendarAlt className="text-gray-400 mr-2" />
                        {showCarrierDetailModal.createdAt ? new Date(showCarrierDetailModal.createdAt).toLocaleDateString('tr-TR') : "-"}
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex flex-wrap gap-2 sm:grid sm:grid-cols-4 sm:gap-3">
                    <button 
                  type="button"
                    className="inline-flex items-center justify-center w-full rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                  onClick={() => {
                    setShowEditCarrierModal(showCarrierDetailModal);
                    setShowCarrierDetailModal(null);
                  }}
                >
                  <FaEdit className="mr-2" /> Düzenle
                    </button>
                    <button 
                  type="button"
                    className="inline-flex items-center justify-center w-full rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  onClick={() => {
                    setShowDeleteConfirm(showCarrierDetailModal);
                    setShowCarrierDetailModal(null);
                  }}
                >
                  <FaTrash className="mr-2" /> Sil
                    </button>
                <button 
                  type="button"
                    className="inline-flex items-center justify-center w-full rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  onClick={() => {
                    setShowDocumentsModal(showCarrierDetailModal);
                  }}
                >
                  <FaFileAlt className="mr-2" /> Belgeler
                </button>
                    <button 
                  type="button"
                    className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                  onClick={() => setShowCarrierDetailModal(null)}
                >
                    <FaTimes className="mr-2" /> Kapat
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Belgeler Modalı */}
      {showDocumentsModal && (
        <div className="fixed inset-0 z-20 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle md:ml-40">
              {/* Modal Header */}
              <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-800">
                    Taşıyıcı Belgeleri
                  </h3>
                  <div className="flex items-center">
                    <span className="mr-2 text-sm text-gray-500">
                      {showDocumentsModal.companyName || "Taşıyıcı"} 
                    </span>
                    <span className="text-sm text-gray-500">
                      ID: TF{showDocumentsModal._id.toString().slice(-4)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Modal Body */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DOCUMENT_TYPES.map(docType => {
                    const document = showDocumentsModal.documents && showDocumentsModal.documents[docType.id];
                    const hasDocument = document && document.url;
                    const isExpired = docType.hasExpiryDate && document && document.expiryDate && 
                                    new Date(document.expiryDate) < new Date();
                    
                    return (
                      <div key={docType.id} className="border rounded-lg overflow-hidden">
                        <div className={`px-4 py-3 font-medium flex justify-between items-center ${
                          hasDocument 
                            ? isExpired 
                              ? 'bg-red-50 text-red-800 border-b border-red-100' 
                              : documentApprovals[docType.id] || (document && document.approved)
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
                                : (documentApprovals[docType.id] || (document && document.approved))
                                  ? <><FaCheckCircle className="text-green-600" /> Onaylı</>
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
                              {document.expiryDate && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <FaCalendarAlt className="text-gray-400" />
                                  <span>Geçerlilik: {new Date(document.expiryDate).toLocaleDateString('tr-TR')}</span>
                                  {isExpired && (
                                    <span className="text-red-600 font-medium">(Süresi Geçmiş)</span>
                                  )}
                                </div>
                              )}
                              
                              {/* Belge işlem butonları */}
                              <div className="flex items-center gap-2">
                                {/* Onaylı belge için onay simgesi ve görüntüleme butonu */}
                                {hasDocument && (documentApprovals[docType.id] || (document && document.approved)) && (
                                  <div className="flex items-center gap-2 w-full">
                                    <div className="flex-1 text-green-700 font-medium text-sm flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-md">
                                      <FaCheckCircle className="text-green-600" /> Onaylanmış Belge
                                    </div>
                                    <a 
                                      href={document.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm"
                                    >
                                      <FaEye className="mr-2" /> Görüntüle
                                    </a>
                                  </div>
                                )}
                                
                                {/* Henüz onaylanmamış belge butonları */}
                                {hasDocument && !isExpired && !(documentApprovals[docType.id] || (document && document.approved)) && (
                                  <>
                                    <a 
                                      href={document.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-sm"
                                    >
                                      <FaEye className="mr-2" /> Görüntüle
                                    </a>
                                    <button 
                                      type="button" 
                                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm"
                                      onClick={() => handleDocumentApproval(docType.id)}
                                    >
                                      <FaCheckCircle className="mr-2" /> Onayla
                                    </button>
                                    <button 
                                      type="button" 
                                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-sm"
                                      onClick={() => {
                                        // Gerçek uygulamada burada reddetme API çağrısı yapılmalı
                                        console.log(`Belge reddedildi: ${docType.id}`);
                                      }}
                                    >
                                      <FaTimes className="mr-2" /> Reddet
                                    </button>
                                  </>
                                )}
                                
                                {/* Süresi geçmiş belge için sadece görüntüleme */}
                                {hasDocument && isExpired && (
                                  <div className="flex items-center gap-2 w-full">
                                    <div className="flex-1 text-red-700 font-medium text-sm flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-md">
                                      <FaExclamationTriangle className="text-red-600" /> Süresi Dolmuş
                                    </div>
                                    <a 
                                      href={document.url} 
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
                  {(!showDocumentsModal.documents || Object.keys(showDocumentsModal.documents).length === 0) && (
                    <div className="col-span-2 text-center py-8">
                      <FaFileAlt className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">Bu taşıyıcı için henüz belge yüklenmemiş</p>
                    </div>
                  )}
                </div>
                
                {/* Belge Yükleme Formu */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-4">Yeni Belge Yükle</h4>
                  
                  {documentUploadError && (
                    <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4">
                      {documentUploadError}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="document-type" className="block text-sm font-medium text-gray-700 mb-1">
                        Belge Türü *
                      </label>
                      <select
                        id="document-type"
                        value={selectedDocumentType}
                        onChange={(e) => setSelectedDocumentType(e.target.value)}
                        className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        disabled={documentUploading}
                      >
                        <option value="">Belge Türünü Seçin</option>
                        {DOCUMENT_TYPES.map(docType => (
                          <option key={docType.id} value={docType.id}>
                            {docType.name} {docType.required ? '(Zorunlu)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {selectedDocumentType && DOCUMENT_TYPES.find(dt => dt.id === selectedDocumentType)?.hasExpiryDate && (
                      <div>
                        <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700 mb-1">
                          Geçerlilik Tarihi *
                        </label>
                        <input
                          type="date"
                          id="expiry-date"
                          value={documentExpiryDate}
                          onChange={(e) => setDocumentExpiryDate(e.target.value)}
                          className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          disabled={documentUploading}
                        />
                      </div>
                    )}
                    
                    <div className="md:col-span-2">
                      <label htmlFor="document-file-input" className="block text-sm font-medium text-gray-700 mb-1">
                        Belge Dosyası (PDF) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="document-file-input"
                          accept="application/pdf"
                          onChange={handleFileSelect}
                          className="flex-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 focus:outline-none"
                          disabled={documentUploading}
                        />
                        <button
                          type="button"
                          onClick={handleDocumentUpload}
                          disabled={documentUploading || !documentFile || !selectedDocumentType}
                          className={`inline-flex items-center px-4 py-2 rounded-md ${
                            documentUploading || !documentFile || !selectedDocumentType
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-orange-600 text-white hover:bg-orange-700'
                          } transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                        >
                          {documentUploading ? (
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
                        Yalnızca PDF formatında belgeler yükleyebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-end">
                  <button 
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                    onClick={() => setShowDocumentsModal(false)}
                  >
                    <FaTimes className="mr-2" /> Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sürücüler Modal */}
      {showCarrierDriversModal && (
        <div className="fixed inset-0 z-30 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
              <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-800">
                    Taşıyıcı Sürücüleri
                  </h3>
                  <div className="flex items-center">
                    <span className="mr-2 text-sm text-gray-500">
                      {showCarrierDetailModal?.companyName || "Taşıyıcı"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {loadingDrivers ? (
                  <div className="text-center py-8">
                    <FaSpinner className="animate-spin h-8 w-8 text-orange-600 mx-auto" />
                    <p className="mt-2 text-gray-500">Sürücüler yükleniyor...</p>
                  </div>
                ) : drivers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Taşıyıcı için sürücü bulunamadı.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sürücü Adı</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ehliyet</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {drivers.map((driver) => (
                          <tr key={driver.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{driver.phone}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{driver.license}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                driver.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {driver.status === 'active' ? 'Aktif' : 'Pasif'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-end">
                  <button 
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                    onClick={() => setShowCarrierDriversModal(false)}
                  >
                    <FaTimes className="mr-2" /> Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Araçlar Modal */}
      {showCarrierVehiclesModal && (
        <div className="fixed inset-0 z-30 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
              <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-800">
                    Taşıyıcı Araçları
                  </h3>
                  <div className="flex items-center">
                    <span className="mr-2 text-sm text-gray-500">
                      {showCarrierDetailModal?.companyName || "Taşıyıcı"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {loadingVehicles ? (
                  <div className="text-center py-8">
                    <FaSpinner className="animate-spin h-8 w-8 text-orange-600 mx-auto" />
                    <p className="mt-2 text-gray-500">Araçlar yükleniyor...</p>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Taşıyıcı için araç bulunamadı.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plaka</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marka/Model</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yıl</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vehicles.map((vehicle) => (
                          <tr key={vehicle.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{vehicle.plate}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{vehicle.type}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{vehicle.brand} {vehicle.model}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{vehicle.year}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                vehicle.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' : 
                                vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                                'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {vehicle.status === 'active' ? 'Aktif' : 
                                 vehicle.status === 'maintenance' ? 'Bakımda' : 'Pasif'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-end">
                  <button 
                    type="button"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                    onClick={() => setShowCarrierVehiclesModal(false)}
                  >
                    <FaTimes className="mr-2" /> Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 
