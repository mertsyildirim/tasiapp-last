'use client'

import React, { useState, useEffect } from 'react'
import { 
  FaPlus, FaSearch, FaEdit, FaTrash, FaTruck, 
  FaCalendarAlt, FaGasPump, FaTachometerAlt, FaTimes,
  FaExclamationCircle, FaSpinner, FaEye, FaFileAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCheck
} from 'react-icons/fa'
import AdminLayout from '../../components/admin/Layout'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'

export default function VehiclesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [showVehicleDetailModal, setShowVehicleDetailModal] = useState(null)
  const [showVehicleDocumentsModal, setShowVehicleDocumentsModal] = useState(null)
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false)
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Örnek araç verileri
  const [vehicles, setVehicles] = useState([])
  const [allVehicles, setAllVehicles] = useState([])
  const [companies, setCompanies] = useState([])
  const [drivers, setDrivers] = useState([])

  // Filtrelenmiş sürücüler
  const [filteredDrivers, setFilteredDrivers] = useState([])

  // Yeni araç veri yapısı
  const [newVehicleData, setNewVehicleData] = useState({
    plate: '',
    brand: '',
    model: '',
    modelYear: '',
    chassisNumber: '',
    capacity: '',
    fuelType: '',
    status: 'Aktif',
    companyId: '',
    driverId: '',
    notes: ''
  })

  // Araç markaları ve modelleri
  const vehicleBrands = {
    'Motosiklet': {
      'Honda': ['CBR', 'CB', 'CRF', 'GL', 'NC', 'PCX', 'VFR', 'X-ADV'],
      'Yamaha': ['MT', 'R1', 'R6', 'TMAX', 'XMAX', 'WR', 'YZF'],
      'Kawasaki': ['Ninja', 'Z', 'Versys', 'KLR', 'W800', 'ZX'],
      'BMW': ['R', 'S', 'F', 'G', 'K'],
      'Ducati': ['Monster', 'Panigale', 'Multistrada', 'Streetfighter', 'Hypermotard'],
      'KTM': ['Duke', 'RC', 'Adventure', 'EXC', 'SX'],
      'Suzuki': ['GSX', 'V-Strom', 'Burgman', 'Bandit', 'Hayabusa'],
      'Triumph': ['Street', 'Speed', 'Tiger', 'Bonneville', 'Rocket']
    },
    'Otomobil': {
      'Toyota': ['Corolla', 'Yaris', 'RAV4', 'Camry', 'Hilux', 'Land Cruiser'],
      'Volkswagen': ['Golf', 'Passat', 'Polo', 'Tiguan', 'Arteon', 'T-Roc'],
      'Ford': ['Focus', 'Fiesta', 'Mustang', 'Explorer', 'Ranger', 'Transit'],
      'Renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Talisman', 'Master'],
      'Fiat': ['500', 'Punto', 'Ducato', 'Doblo', 'Panda', 'Tipo'],
      'BMW': ['3 Serisi', '5 Serisi', 'X3', 'X5', 'M3', 'M5'],
      'Mercedes-Benz': ['A Serisi', 'C Serisi', 'E Serisi', 'S Serisi', 'GLC', 'GLE'],
      'Audi': ['A3', 'A4', 'A6', 'Q3', 'Q5', 'RS']
    },
    'Kamyonet': {
      'Ford': ['Transit Custom', 'Transit Connect'],
      'Volkswagen': ['Transporter', 'Caddy'],
      'Mercedes-Benz': ['Sprinter', 'Vito'],
      'Renault': ['Master', 'Trafic'],
      'Fiat': ['Ducato', 'Doblo'],
      'Peugeot': ['Boxer', 'Partner'],
      'Citroen': ['Jumper', 'Berlingo'],
      'Iveco': ['Daily']
    },
    'Kamyon': {
      'Mercedes-Benz': ['Actros', 'Arocs', 'Atego'],
      'Volvo': ['FH', 'FM', 'FMX'],
      'Scania': ['R', 'G', 'S'],
      'MAN': ['TGX', 'TGS', 'TGM'],
      'DAF': ['XF', 'CF', 'LF'],
      'Iveco': ['Hi-Way', 'Hi-Land', 'Hi-Road'],
      'Renault': ['T', 'C', 'K'],
      'Isuzu': ['Forward', 'Giga', 'Elios']
    },
    'TIR': {
      'Mercedes-Benz': ['Actros', 'Arocs'],
      'Volvo': ['FH16', 'FH'],
      'Scania': ['R730', 'R450'],
      'MAN': ['TGX', 'TGS'],
      'DAF': ['XF', 'CF'],
      'Iveco': ['Hi-Way', 'Hi-Road'],
      'Renault': ['T', 'C'],
      'Isuzu': ['Giga']
    }
  }

  // Belge yükleme için state
  const [newDocument, setNewDocument] = useState({
    type: '',
    validUntil: '',
    file: null
  })

  // Belge tipleri
  const documentTypes = [
    { id: 'registration', name: 'Ruhsat' },
    { id: 'inspection', name: 'Muayene Belgesi' },
    { id: 'insurance', name: 'Sigorta Poliçesi' },
    { id: 'comprehensive', name: 'Kasko Poliçesi' }
  ]

  // Araç verilerini API'den çekme
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Filtreleme mantığı için parametre oluştur
        let params = {
          search: searchTerm,
          page: currentPage,
          limit: 10
        };
        
        // Sekme seçimine göre filtreleme parametrelerini ayarla
        switch(selectedTab) {
          case 'active':
            params.status = 'active';
            break;
          case 'maintenance':
            params.status = 'maintenance';
            break;
          case 'inactive':
            params.status = 'inactive';
            break;
          case 'expired':
            params.hasExpiredDocuments = true;
            break;
          case 'all':
          default:
            // Tüm araçlar için filtre uygulanmaz
            break;
        }
        
        const response = await axios.get('/api/admin/vehicles', {
          headers: {
            'Content-Type': 'application/json'
          },
          params: params
        });
        
        if (response.data && response.data.vehicles) {
          // Belge durumu bilgisini kontrol et ve ekle
          const vehiclesWithDocumentStatus = response.data.vehicles.map(vehicle => {
            // Eğer API'den hasExpiredDocuments gelmemişse, documents dizisini kontrol et
            if (vehicle.hasExpiredDocuments === undefined && vehicle.documents) {
              const today = new Date();
              const hasExpiredDocuments = vehicle.documents.some(doc => {
                const validUntil = new Date(doc.validUntil);
                return validUntil < today;
              });
              return { ...vehicle, hasExpiredDocuments };
            }
            return vehicle;
          });
          
          setVehicles(vehiclesWithDocumentStatus);
          
          // Tüm araçları ayrı bir state'te tut
          if (selectedTab === 'all') {
            setAllVehicles(vehiclesWithDocumentStatus);
          }
        }
      } catch (error) {
        console.error('Araçları getirme hatası:', error);
        setError('Araçlar getirilirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchVehicles();
    }
  }, [selectedTab, searchTerm, currentPage, session]);

  // Tüm araçları getir (filtreleme olmadan)
  useEffect(() => {
    const fetchAllVehicles = async () => {
      try {
        const response = await axios.get('/api/admin/vehicles', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && response.data.vehicles) {
          // Belge durumu bilgisini kontrol et ve ekle
          const vehiclesWithDocumentStatus = response.data.vehicles.map(vehicle => {
            // Eğer API'den hasExpiredDocuments gelmemişse, documents dizisini kontrol et
            if (vehicle.hasExpiredDocuments === undefined && vehicle.documents) {
              const today = new Date();
              const hasExpiredDocuments = vehicle.documents.some(doc => {
                const validUntil = new Date(doc.validUntil);
                return validUntil < today;
              });
              return { ...vehicle, hasExpiredDocuments };
            }
            return vehicle;
          });
          
          setAllVehicles(vehiclesWithDocumentStatus);
        }
      } catch (error) {
        console.error('Tüm araçları getirme hatası:', error);
      }
    };

    if (session) {
      fetchAllVehicles();
    }
  }, [session]);

  // Taşıyıcı firmaları ve sürücüleri getir
  useEffect(() => {
    const fetchCompaniesAndDrivers = async () => {
      try {
        // Taşıyıcı firmaları getir
        const companiesResponse = await axios.get('/api/admin/carriers', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (companiesResponse.data && companiesResponse.data.carriers) {
          setCompanies(companiesResponse.data.carriers);
        }
        
        // Sürücüleri getir
        const driversResponse = await axios.get('/api/admin/drivers', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (driversResponse.data && driversResponse.data.drivers) {
          setDrivers(driversResponse.data.drivers);
          setFilteredDrivers(driversResponse.data.drivers);
        }
      } catch (error) {
        console.error('Firma ve sürücü verileri yüklenirken hata:', error);
      }
    };
    
    if (session) {
      fetchCompaniesAndDrivers();
    }
  }, [session]);

  // Firma seçildiğinde sürücüleri filtrele
  useEffect(() => {
    if (newVehicleData.companyId) {
      const filtered = drivers.filter(driver => driver.companyId === newVehicleData.companyId);
      setFilteredDrivers(filtered);
      
      // Eğer seçili sürücü filtrelenmiş listede yoksa, sürücü seçimini temizle
      if (newVehicleData.driverId && !filtered.some(d => d._id === newVehicleData.driverId)) {
        setNewVehicleData({...newVehicleData, driverId: ''});
      }
    } else {
      setFilteredDrivers(drivers);
    }
  }, [newVehicleData.companyId, drivers]);

  // Araç seçildiğinde firmayı otomatik seç
  const handleDriverChange = (driverId) => {
    const selectedDriver = drivers.find(d => d._id === driverId);
    if (selectedDriver) {
      setNewVehicleData({
        ...newVehicleData, 
        driverId: driverId,
        companyId: selectedDriver.companyId
      });
    } else {
      setNewVehicleData({...newVehicleData, driverId: driverId});
    }
  };

  // Yeni araç ekleme fonksiyonu
  const handleAddVehicle = async () => {
    try {
      setLoading(true);
      
      // Zorunlu alanları kontrol et
      if (!newVehicleData.plate || !newVehicleData.brand || !newVehicleData.model || !newVehicleData.modelYear || !newVehicleData.capacity) {
        toast.error('Lütfen tüm zorunlu alanları doldurun');
        setLoading(false);
        return;
      }
      
      // API'ye gönderilecek veriyi hazırla
      const vehicleData = {
        plateNumber: newVehicleData.plate,
        brand: newVehicleData.brand === 'other' ? newVehicleData.customBrand : newVehicleData.brand,
        model: newVehicleData.model === 'other' ? newVehicleData.customModel : newVehicleData.model,
        year: newVehicleData.modelYear,
        capacity: newVehicleData.capacity,
        fuelType: newVehicleData.fuelType,
        status: newVehicleData.status || 'active',
        chassisNumber: newVehicleData.chassisNumber,
        companyId: newVehicleData.companyId,
        driverId: newVehicleData.driverId,
        notes: newVehicleData.notes
      };
      
      // API isteği gönder
      const response = await axios.post('/api/admin/vehicles', vehicleData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.vehicle) {
        toast.success('Araç başarıyla eklendi');
        
        // Formu sıfırla
        setNewVehicleData({
          plate: '',
          brand: '',
          model: '',
          modelYear: '',
          chassisNumber: '',
          capacity: '',
          fuelType: '',
          status: 'active',
          companyId: '',
          driverId: '',
          notes: ''
        });
        
        // Modalı kapat
        setShowAddVehicleModal(false);
        
        // Araç listesini güncelle
        fetchVehicles();
      }
    } catch (error) {
      console.error('Araç ekleme hatası:', error);
      toast.error('Araç eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'all', name: 'Tüm Araçlar' },
    { id: 'active', name: 'Aktif' },
    { id: 'maintenance', name: 'Bakımda' },
    { id: 'inactive', name: 'Pasif' },
    { id: 'expired', name: 'Süresi Dolmuş Belge' }
  ]

  // Durum renkleri
  const getStatusColor = (status) => {
    switch(status) {
      case 'Aktif':
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'Pasif':
      case 'inactive':
        return 'bg-red-100 text-red-800'
      case 'Bakımda':
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Belge yükleme fonksiyonu
  const handleDocumentUpload = async (vehicleId) => {
    if (!newDocument.type || !newDocument.validUntil || !newDocument.file) {
      // Hata mesajı göster
      alert('Lütfen tüm belge bilgilerini doldurun ve bir dosya seçin');
      return;
    }
    
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', newDocument.file);
      formData.append('documentType', newDocument.type);
      formData.append('validUntil', newDocument.validUntil);
      formData.append('vehicleId', vehicleId);

      const response = await axios.post('/api/admin/vehicles/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Mevcut belgeleri güncelleyerek yüklenilen belgeyi göster
        const updatedVehicleDocumentsModal = {
          ...showVehicleDocumentsModal,
          documents: [...(showVehicleDocumentsModal.documents || []), response.data.document]
        };
        
        setShowVehicleDocumentsModal(updatedVehicleDocumentsModal);
        
        // Form temizle
        setNewDocument({ type: '', validUntil: '', file: null });
        
        // Eğer detay modal açıksa, detay modal verisini de güncelle
        if (showVehicleDetailModal && showVehicleDetailModal._id === vehicleId) {
          setShowVehicleDetailModal({
            ...showVehicleDetailModal,
            documents: [...(showVehicleDetailModal.documents || []), response.data.document]
          });
        }
        
        // Başarı mesajı göster
        toast.success('Belge başarıyla yüklendi');
      } else {
        toast.error(response.data.message || 'Belge yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Belge yükleme hatası:', error);
      toast.error('Belge yüklenirken bir hata oluştu: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };
  
  // Dosya seçme işlemi
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewDocument({
        ...newDocument,
        file: e.target.files[0]
      });
    }
  };

  // Belge silme fonksiyonu
  const handleDocumentDelete = async (vehicleId, documentId) => {
    try {
      const response = await axios.delete(`/api/admin/vehicles/${vehicleId}/documents/${documentId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.data.success) {
        // Belge listesini güncelle
        const updatedVehicles = vehicles.map(vehicle => {
          if (vehicle.id === vehicleId) {
            return {
              ...vehicle,
              documents: vehicle.documents.filter(doc => doc.id !== documentId)
            }
          }
          return vehicle
        })
        setVehicles(updatedVehicles)
      }
    } catch (error) {
      console.error('Belge silme hatası:', error)
    }
  }

  const handleUpdateVehicle = async () => {
    try {
      console.log("Güncelleme isteği gönderiliyor:", showVehicleDetailModal);
      
      // API'ye gönderilecek veri formatını düzenle
      const updateData = {
        plateNumber: showVehicleDetailModal.plateNumber || showVehicleDetailModal.plate,
        brand: showVehicleDetailModal.brand,
        model: showVehicleDetailModal.model,
        chassisNumber: showVehicleDetailModal.chassisNumber,
        status: showVehicleDetailModal.status,
        fuelType: showVehicleDetailModal.fuelType,
        year: showVehicleDetailModal.year || showVehicleDetailModal.modelYear,
        capacity: showVehicleDetailModal.capacity,
        notes: showVehicleDetailModal.notes,
        companyId: showVehicleDetailModal.companyId,
        driverId: showVehicleDetailModal.driverId
      };
      
      const response = await fetch(`/api/admin/vehicles/${showVehicleDetailModal._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Araç güncellenirken bir hata oluştu');
      }

      const data = await response.json();
      console.log("Güncelleme yanıtı:", data);
      
      // Düzenleme modundan çıkıp detay moduna dön
      setIsEditing(false);

      // Güncellenen aracı göster
      if (data.vehicle) {
        // Firma ve sürücü bilgilerini güncellenmiş araçta tutmak için
        const companyInfo = companies.find(c => c._id === data.vehicle.companyId);
        const driverInfo = drivers.find(d => d._id === data.vehicle.driverId);
        
        setShowVehicleDetailModal({
          ...data.vehicle,
          // Ekranda göstermek için firma ve sürücü adlarını da ekleyelim
          companyName: companyInfo ? companyInfo.companyName : 'Bilinmiyor',
          driverName: driverInfo ? driverInfo.name : 'Bilinmiyor'
        });
      }
      
      // Araç listesini güncelle
      const fetchVehicles = async () => {
        try {
          setLoading(true);
          const response = await axios.get('/api/admin/vehicles', {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.data && response.data.vehicles) {
            const vehiclesWithDocumentStatus = response.data.vehicles.map(vehicle => {
              if (vehicle.hasExpiredDocuments === undefined && vehicle.documents) {
                const today = new Date();
                const hasExpiredDocuments = vehicle.documents.some(doc => {
                  const validUntil = new Date(doc.validUntil);
                  return validUntil < today;
                });
                return { ...vehicle, hasExpiredDocuments };
              }
              return vehicle;
            });
            
            setVehicles(vehiclesWithDocumentStatus);
            setAllVehicles(vehiclesWithDocumentStatus);
          }
        } catch (error) {
          console.error('Araçları getirme hatası:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchVehicles();
      toast.success('Araç başarıyla güncellendi');
    } catch (error) {
      console.error('Araç güncelleme hatası:', error);
      toast.error(error.message || 'Araç güncellenirken bir hata oluştu');
    }
  };

  // Araç detay modalı için firma seçildiğinde sürücüleri filtrele
  useEffect(() => {
    if (showVehicleDetailModal && showVehicleDetailModal.companyId) {
      const filtered = drivers.filter(driver => driver.companyId === showVehicleDetailModal.companyId || driver.company === showVehicleDetailModal.companyId);
      setFilteredDrivers(filtered);
      
      // Eğer seçili sürücü filtrelenmiş listede yoksa, sürücü seçimini temizle
      if (showVehicleDetailModal.driverId && !filtered.some(d => d._id === showVehicleDetailModal.driverId)) {
        setShowVehicleDetailModal({...showVehicleDetailModal, driverId: ''});
      }
    } else if (showVehicleDetailModal) {
      setFilteredDrivers(drivers);
    }
  }, [showVehicleDetailModal?.companyId, drivers, showVehicleDetailModal]);

  // Araç detay modalı için sürücü seçildiğinde firmayı otomatik seç
  const handleDetailDriverChange = (driverId) => {
    if (!showVehicleDetailModal) return;
    
    const selectedDriver = drivers.find(d => d._id === driverId);
    if (selectedDriver) {
      const driverCompanyId = selectedDriver.companyId || selectedDriver.company;
      setShowVehicleDetailModal({
        ...showVehicleDetailModal, 
        driverId: driverId,
        companyId: driverCompanyId
      });
    } else {
      setShowVehicleDetailModal({...showVehicleDetailModal, driverId: driverId});
    }
  };

  // Durum badge'i için renk ve metin döndüren fonksiyon
  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
      case 'Aktif':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Aktif</span>;
      case 'maintenance':
      case 'Bakımda':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Bakımda</span>;
      case 'inactive':
      case 'Pasif':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Pasif</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Bilinmiyor</span>;
    }
  };

  // Belge durumu badge'i için renk ve metin döndüren fonksiyon
  const getDocumentStatusBadge = (hasExpiredDocuments) => {
    if (hasExpiredDocuments) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Süresi Dolmuş</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Geçerli</span>;
    }
  };

  return (
    <AdminLayout title="Araç Yönetimi">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex space-x-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTab === tab.id 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } mb-2`}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <div className="flex flex-col w-full md:flex-row md:w-auto gap-4">
          <div className="relative w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Araç ara..." 
              className="pl-10 pr-4 py-2 w-full md:min-w-[250px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <button 
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-1"
            onClick={() => setShowAddVehicleModal(true)}
          >
            <FaPlus className="mr-2" />
            <span>Yeni Araç</span>
          </button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Toplam Araç */}
        <div 
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Araç</p>
              <p className="text-2xl font-semibold text-gray-900">{allVehicles.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <FaTruck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Aktif Araçlar */}
        <div 
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktif Araçlar</p>
              <p className="text-2xl font-semibold text-green-600">
                {allVehicles.filter(v => v.status === 'active' || v.status === 'Aktif').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <FaTruck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Bakımdaki Araçlar */}
        <div 
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bakımdaki Araçlar</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {allVehicles.filter(v => v.status === 'maintenance' || v.status === 'Bakımda').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <FaTruck className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Belgesi Eksik */}
        <div 
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Belgesi Eksik</p>
              <p className="text-2xl font-semibold text-red-600">
                {allVehicles.filter(v => v.hasExpiredDocuments).length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <FaFileAlt className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <FaExclamationCircle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Yükleniyor */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-8 mb-8 flex justify-center items-center">
          <FaSpinner className="text-orange-600 text-2xl animate-spin mr-3" />
          <p className="text-gray-700">Araçlar yükleniyor...</p>
        </div>
      )}

      {/* Araç Tablosu */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Araç Bilgileri</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teknik Bilgiler</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taşıma</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <FaTruck className="text-gray-600 w-6 h-6" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vehicle.plate}</div>
                          <div className="text-sm text-gray-500">{vehicle.brand} {vehicle.model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Model Yılı: {vehicle.modelYear}</div>
                      <div className="text-sm text-gray-500">Kapasite: {vehicle.capacity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(vehicle.status)}
                      {vehicle.hasExpiredDocuments && (
                        <div className="mt-1">
                          {getDocumentStatusBadge(vehicle.hasExpiredDocuments)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span>{vehicle.activeShipments || 0} Aktif</span>
                        <span className="text-gray-400">{vehicle.completedShipments || 0} Tamamlanan</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-900 transition-colors" 
                          onClick={() => setShowVehicleDetailModal(vehicle)}
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
          {vehicles.length === 0 && !loading && (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">Kriterlere uygun araç bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {/* Toplam Kayıt Bilgisi ve Sayfalama */}
      <div className="bg-white px-6 py-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Toplam <span className="font-medium text-gray-900">{vehicles.length}</span> araç bulundu
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
              <span className="font-medium">{currentPage}</span> / <span className="font-medium">{Math.ceil(vehicles.length / 10) || 1}</span>
            </span>
            
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(vehicles.length / 10) || 1, p + 1))}
              disabled={currentPage === (Math.ceil(vehicles.length / 10) || 1)}
              className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Yeni Araç Ekleme Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Yeni Araç Ekle</h3>
              <button 
                onClick={() => setShowAddVehicleModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Araç Bilgileri */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Araç Bilgileri</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plaka <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newVehicleData.plate}
                        onChange={(e) => setNewVehicleData({...newVehicleData, plate: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Araç Tipi <span className="text-red-500">*</span>
                      </label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newVehicleData.vehicleType}
                        onChange={(e) => setNewVehicleData({
                          ...newVehicleData, 
                          vehicleType: e.target.value,
                          brand: '',
                          model: ''
                        })}
                        required
                      >
                        <option value="">Seçiniz</option>
                        {Object.keys(vehicleBrands).map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marka <span className="text-red-500">*</span>
                      </label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newVehicleData.brand}
                        onChange={(e) => setNewVehicleData({
                          ...newVehicleData, 
                          brand: e.target.value,
                          model: ''
                        })}
                        required
                        disabled={!newVehicleData.vehicleType}
                      >
                        <option value="">Seçiniz</option>
                        {newVehicleData.vehicleType && Object.keys(vehicleBrands[newVehicleData.vehicleType]).map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                        <option value="other">Diğer</option>
                      </select>
                    </div>
                    {newVehicleData.brand === 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Marka Adı <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={newVehicleData.customBrand || ''}
                          onChange={(e) => setNewVehicleData({
                            ...newVehicleData, 
                            customBrand: e.target.value
                          })}
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model <span className="text-red-500">*</span>
                      </label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newVehicleData.model}
                        onChange={(e) => setNewVehicleData({...newVehicleData, model: e.target.value})}
                        required
                        disabled={!newVehicleData.brand || newVehicleData.brand === 'other'}
                      >
                        <option value="">Seçiniz</option>
                        {newVehicleData.brand && newVehicleData.brand !== 'other' && vehicleBrands[newVehicleData.vehicleType][newVehicleData.brand].map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                        <option value="other">Diğer</option>
                      </select>
                    </div>
                    {newVehicleData.model === 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Model Adı <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={newVehicleData.customModel || ''}
                          onChange={(e) => setNewVehicleData({
                            ...newVehicleData, 
                            customModel: e.target.value
                          })}
                          required
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model Yılı <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number" 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newVehicleData.modelYear}
                        onChange={(e) => setNewVehicleData({...newVehicleData, modelYear: e.target.value})}
                        required
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Teknik Bilgiler */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Teknik Bilgiler</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Şasi Numarası
                      </label>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newVehicleData.chassisNumber}
                        onChange={(e) => setNewVehicleData({...newVehicleData, chassisNumber: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kapasite <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newVehicleData.capacity}
                        onChange={(e) => setNewVehicleData({...newVehicleData, capacity: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Yakıt Tipi
                      </label>
                      <select
                        value={newVehicleData.fuelType}
                        onChange={(e) => setNewVehicleData({
                          ...newVehicleData,
                          fuelType: e.target.value
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Seçiniz</option>
                        <option value="Benzin">Benzin</option>
                        <option value="Dizel">Dizel</option>
                        <option value="LPG">LPG</option>
                        <option value="Elektrik">Elektrik</option>
                        <option value="Hibrit">Hibrit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Durum
                      </label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newVehicleData.status}
                        onChange={(e) => setNewVehicleData({...newVehicleData, status: e.target.value})}
                      >
                        <option value="active">Aktif</option>
                        <option value="maintenance">Bakımda</option>
                        <option value="inactive">Pasif</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notlar
                      </label>
                      <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newVehicleData.notes}
                        onChange={(e) => setNewVehicleData({...newVehicleData, notes: e.target.value})}
                        rows={3}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Taşıyıcı Firma ve Sürücü Bilgileri */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-700 mb-4">Taşıyıcı Firma ve Sürücü Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Taşıyıcı Firma
                    </label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={newVehicleData.companyId}
                      onChange={(e) => setNewVehicleData({...newVehicleData, companyId: e.target.value})}
                    >
                      <option value="">Seçiniz</option>
                      {companies.map(company => (
                        <option key={company._id} value={company._id}>
                          {company.companyName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sürücü
                    </label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={newVehicleData.driverId}
                      onChange={(e) => handleDriverChange(e.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {filteredDrivers.map(driver => (
                        <option key={driver._id} value={driver._id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="bg-orange-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-orange-800">
                    <strong>Not:</strong> Araç kaydı oluşturulduktan sonra aşağıdaki belgeleri yüklemeniz gerekmektedir:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-orange-800">
                    <li>Ruhsat *</li>
                    <li>Muayene Belgesi *</li>
                    <li>Sigorta Poliçesi *</li>
                    <li>Kasko Poliçesi</li>
                  </ul>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowAddVehicleModal(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={() => setShowVehicleDocumentsModal({ id: 'new', plate: newVehicleData.plate })}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
                  >
                    <FaFileAlt className="mr-2" /> Belgeler
                  </button>
                  <button 
                    className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded"
                    disabled={!newVehicleData.plate || !newVehicleData.brand || !newVehicleData.model || !newVehicleData.modelYear || !newVehicleData.capacity}
                    onClick={handleAddVehicle}
                  >
                    Araç Ekle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Belge Yönetimi Modal */}
      {showVehicleDocumentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Araç Belgeleri</h3>
              <button 
                onClick={() => setShowVehicleDocumentsModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Yeni Belge Yükleme */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Yeni Belge Yükle</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Belge Tipi <span className="text-red-500">*</span>
                      </label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDocument.type}
                        onChange={(e) => setNewDocument({...newDocument, type: e.target.value})}
                        required
                      >
                        <option value="">Seçiniz</option>
                        {documentTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Geçerlilik Tarihi <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="date" 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        value={newDocument.validUntil}
                        onChange={(e) => setNewDocument({...newDocument, validUntil: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Belge Dosyası <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="file" 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        onChange={handleFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png"
                        required
                      />
                    </div>
                    <button 
                      className={`w-full py-2 px-4 rounded flex items-center justify-center ${
                        !newDocument.type || !newDocument.validUntil || !newDocument.file || loading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                      onClick={() => handleDocumentUpload(showVehicleDocumentsModal._id || showVehicleDocumentsModal.id)}
                      disabled={!newDocument.type || !newDocument.validUntil || !newDocument.file || loading}
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          Yükleniyor...
                        </>
                      ) : (
                        'Belge Yükle'
                      )}
                    </button>
                  </div>
                </div>

                {/* Mevcut Belgeler */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Mevcut Belgeler</h4>
                  <div className="space-y-4">
                    {showVehicleDocumentsModal.documents && showVehicleDocumentsModal.documents.length > 0 ? (
                      showVehicleDocumentsModal.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{documentTypes.find(t => t.id === doc.type)?.name}</p>
                            <p className="text-sm text-gray-500">Geçerlilik: {new Date(doc.validUntil).toLocaleDateString('tr-TR')}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              <FaEye />
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDocumentDelete(showVehicleDocumentsModal.id, doc.id)}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Henüz belge yüklenmemiş.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Araç Detay Modalı */}
      {showVehicleDetailModal && (
        <div className="fixed inset-0 z-20 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle md:ml-40">
              {/* Modal Header */}
              <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-800">
                    {isEditing ? "Araç Düzenle" : "Araç Detayları"}
                  </h3>
                  <div className="flex items-center">
                    <span className="mr-2 text-sm text-gray-500">
                      {showVehicleDetailModal.plate || showVehicleDetailModal.plateNumber}
                    </span>
                    {getStatusBadge(showVehicleDetailModal.status)}
                    {showVehicleDetailModal.hasExpiredDocuments && (
                      <div className="ml-2">
                        {getDocumentStatusBadge(showVehicleDetailModal.hasExpiredDocuments)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Modal Body */}
              <div className="px-6 py-4">
                {/* İstatistik Kartları - Düzenleme modunda gösterilmez */}
                {!isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Marka/Model</p>
                          <p className="text-xl font-semibold text-gray-800">
                            {showVehicleDetailModal.brand} {showVehicleDetailModal.model}
                          </p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-full">
                          <FaTruck className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Model Yılı</p>
                          <p className="text-xl font-semibold text-gray-800">
                            {showVehicleDetailModal.year || showVehicleDetailModal.modelYear}
                          </p>
                        </div>
                        <div className="p-2 bg-green-100 rounded-full">
                          <FaCalendarAlt className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Kapasite</p>
                          <p className="text-xl font-semibold text-gray-800">
                            {showVehicleDetailModal.capacity}
                          </p>
                        </div>
                        <div className="p-2 bg-purple-100 rounded-full">
                          <FaTachometerAlt className="h-5 w-5 text-purple-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Plaka
                      </label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={showVehicleDetailModal.plateNumber || showVehicleDetailModal.plate || ''}
                          onChange={(e) => setShowVehicleDetailModal({...showVehicleDetailModal, plateNumber: e.target.value, plate: e.target.value})}
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                          {showVehicleDetailModal.plateNumber || showVehicleDetailModal.plate || "-"}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Marka
                      </label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={showVehicleDetailModal.brand || ''}
                          onChange={(e) => setShowVehicleDetailModal({...showVehicleDetailModal, brand: e.target.value})}
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                          {showVehicleDetailModal.brand || "-"}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Model
                      </label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={showVehicleDetailModal.model || ''}
                          onChange={(e) => setShowVehicleDetailModal({...showVehicleDetailModal, model: e.target.value})}
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                          {showVehicleDetailModal.model || "-"}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Şasi Numarası
                      </label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={showVehicleDetailModal.chassisNumber || ''}
                          onChange={(e) => setShowVehicleDetailModal({...showVehicleDetailModal, chassisNumber: e.target.value})}
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                          {showVehicleDetailModal.chassisNumber || "-"}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Taşıyıcı Firma
                      </label>
                      {isEditing ? (
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={showVehicleDetailModal.companyId || ''}
                          onChange={(e) => {
                            console.log("Taşıyıcı firma değişti:", e.target.value);
                            setShowVehicleDetailModal({...showVehicleDetailModal, companyId: e.target.value, driverId: ''});
                          }}
                        >
                          <option value="">Seçiniz</option>
                          {companies.map(company => (
                            <option key={company._id} value={company._id}>
                              {company.companyName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                          {companies.find(c => c._id === showVehicleDetailModal.companyId)?.companyName || "-"}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Sürücü
                      </label>
                      {isEditing ? (
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={showVehicleDetailModal.driverId || ''}
                          onChange={(e) => handleDetailDriverChange(e.target.value)}
                        >
                          <option value="">Seçiniz</option>
                          {filteredDrivers.map(driver => (
                            <option key={driver._id} value={driver._id}>
                              {driver.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                          {drivers.find(d => d._id === showVehicleDetailModal.driverId)?.name || "-"}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Yakıt Tipi
                      </label>
                      {isEditing ? (
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={showVehicleDetailModal.fuelType || ''}
                          onChange={(e) => setShowVehicleDetailModal({...showVehicleDetailModal, fuelType: e.target.value})}
                        >
                          <option value="">Seçiniz</option>
                          <option value="Benzin">Benzin</option>
                          <option value="Dizel">Dizel</option>
                          <option value="LPG">LPG</option>
                          <option value="Elektrik">Elektrik</option>
                          <option value="Hibrit">Hibrit</option>
                        </select>
                      ) : (
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-md border border-gray-100">
                          {showVehicleDetailModal.fuelType || "-"}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                        Durum
                      </label>
                      {isEditing ? (
                        <select 
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          value={showVehicleDetailModal.status || ''}
                          onChange={(e) => setShowVehicleDetailModal({...showVehicleDetailModal, status: e.target.value})}
                        >
                          <option value="active">Aktif</option>
                          <option value="maintenance">Bakımda</option>
                          <option value="inactive">Pasif</option>
                        </select>
                      ) : (
                        <div className={`text-sm font-medium bg-gray-50 p-2 rounded-md border border-gray-100 flex items-center ${
                          showVehicleDetailModal.status === 'active' || showVehicleDetailModal.status === 'Aktif' ? 'text-green-600' :
                          showVehicleDetailModal.status === 'maintenance' || showVehicleDetailModal.status === 'Bakımda' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {showVehicleDetailModal.status === 'active' || showVehicleDetailModal.status === 'Aktif' ? 'Aktif' :
                          showVehicleDetailModal.status === 'maintenance' || showVehicleDetailModal.status === 'Bakımda' ? 'Bakımda' :
                          'Pasif'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notlar */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                      Notlar
                    </label>
                    {isEditing ? (
                      <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        rows="3"
                        value={showVehicleDetailModal.notes || ''}
                        onChange={(e) => setShowVehicleDetailModal({...showVehicleDetailModal, notes: e.target.value})}
                      ></textarea>
                    ) : (
                      <div className="text-sm text-gray-800 bg-gray-50 p-2 rounded-md border border-gray-100 min-h-[60px]">
                        {showVehicleDetailModal.notes || "-"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                {isEditing ? (
                  <div className="flex justify-end space-x-3">
                    <button 
                      type="button"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      onClick={() => setIsEditing(false)}
                    >
                      <FaTimes className="mr-2" /> İptal
                    </button>
                    <button 
                      type="button"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-transparent bg-blue-600 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                      onClick={handleUpdateVehicle}
                    >
                      <FaCheck className="mr-2" /> Kaydet
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 sm:grid sm:grid-cols-4 sm:gap-3">
                    <button 
                      type="button"
                      className="inline-flex items-center justify-center w-full rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      <FaEdit className="mr-2" /> Düzenle
                    </button>
                    <button 
                      type="button"
                      className="inline-flex items-center justify-center w-full rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                      onClick={() => {
                        setShowDeleteConfirm(showVehicleDetailModal);
                        setShowVehicleDetailModal(null);
                      }}
                    >
                      <FaTrash className="mr-2" /> Sil
                    </button>
                    <button 
                      type="button"
                      className="inline-flex items-center justify-center w-full rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      onClick={() => setShowVehicleDocumentsModal(showVehicleDetailModal)}
                    >
                      <FaFileAlt className="mr-2" /> Belgeler
                    </button>
                    <button 
                      type="button"
                      className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                      onClick={() => setShowVehicleDetailModal(null)}
                    >
                      <FaTimes className="mr-2" /> Kapat
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
} 
