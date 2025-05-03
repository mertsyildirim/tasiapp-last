import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PortalLayout from '../../components/portal/Layout';
import { FaTruck, FaSearch, FaPlus, FaFilter, FaCar, FaTachometerAlt, FaGasPump, FaTools, FaCalendarAlt, FaUser, FaMapMarkerAlt, FaCheckCircle, FaExclamationCircle, FaTimes, FaEdit, FaTrash, FaFile, FaDownload, FaMotorcycle, FaSortAmountDown, FaSortAmountUp, FaEye, FaIdCard, FaWrench, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import Head from 'next/head';
import { useSession } from 'next-auth/react';

export default function Vehicles() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sortField, setSortField] = useState('plate');
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeVehicle, setActiveVehicle] = useState(null);

  const [vehicleForm, setVehicleForm] = useState({
    plate: '',
    type: 'truck',
    brand: '',
    model: '',
    year: '',
    capacity: '',
    driver: '',
    status: 'active',
    lastMaintenance: '',
    nextMaintenance: '',
    documents: []
  });

  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showDocumentsUploadModal, setShowDocumentsUploadModal] = useState(false);
  const [showDriverChangeWarning, setShowDriverChangeWarning] = useState(false);
  const [selectedDriverForChange, setSelectedDriverForChange] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [drivers, setDrivers] = useState([]);

  const vehicleTypes = [
    'Kamyon',
    'Kamyonet',
    'Tır',
    'Minibüs',
    'Otobüs',
    'Panel Van',
    'Pickup',
    'Diğer'
  ];

  const bodyTypes = [
    'Tenteli',
    'Kapalı Kasa',
    'Açık Kasa',
    'Frigorifik',
    'Damperli',
    'Platform',
    'Diğer'
  ];

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
          type: session.user.type,
          role: session.user.role,
          status: session.user.status
        });

        // Araçları API'den çek
        await fetchVehicles();

      } catch (error) {
        console.error('Araçlar veri yükleme hatası:', error);
        setError('Araçlar verileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, status]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/portal/vehicles');
      console.log('API cevap durumu:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API sonucu:', result);
        
        if (result.success) {
          if (result.vehicles && Array.isArray(result.vehicles)) {
            console.log('Gelen araç verileri:', result.vehicles);
            setVehicles(result.vehicles);
          } else {
            console.log('Araç verisi boş veya dizi değil:', result.vehicles);
            setVehicles([]); // Veri yoksa boş dizi kullan
          }
        } else {
          console.error('API başarısız sonuç döndü:', result.error);
          setError(result.error || 'Araçlar alınırken bir hata oluştu');
        }
      } else {
        // HTTP hatası durumunda hata yanıtını aldığından emin ol
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API yanıt kodu: ${response.status}`);
      }
    } catch (err) {
      console.error('API isteği hatası:', err);
      setError(err.message || 'Araçlar alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    filterVehicles(vehicles, e.target.value, statusFilter, typeFilter);
  };

  const filterVehicles = (vehicleList, searchText, status, type) => {
    let filtered = vehicleList;
    
    if (searchText) {
      filtered = filtered.filter(vehicle => 
        vehicle.plate.toLowerCase().includes(searchText.toLowerCase()) ||
        vehicle.brand.toLowerCase().includes(searchText.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchText.toLowerCase()) ||
        vehicle.driver.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    if (status !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.status === status);
    }
    
    if (type !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.type === type);
    }
    
    filtered = filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'plate') {
        comparison = a.plate.localeCompare(b.plate);
      } else if (sortField === 'brand') {
        comparison = a.brand.localeCompare(b.brand);
      } else if (sortField === 'driver') {
        comparison = a.driver.localeCompare(b.driver);
      } else if (sortField === 'year') {
        comparison = parseInt(a.year) - parseInt(b.year);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setVehicles(filtered);
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Araç verisini hazırla
      const vehicleData = {
        plate: vehicleForm.plate,
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        year: vehicleForm.year,
        type: vehicleForm.type,
        capacity: vehicleForm.capacity,
        status: vehicleForm.status,
        driverId: vehicleForm.driver, // Seçilen sürücü ID'si
        lastMaintenance: vehicleForm.lastMaintenance,
        nextMaintenance: vehicleForm.nextMaintenance,
        notes: vehicleForm.notes
      };

      // API'ye istek gönder
      const response = await fetch('/api/portal/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vehicleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Araç eklenirken bir hata oluştu');
      }

      const result = await response.json();
      
      // İşlem başarılıysa
      if (result.success) {
        // Formu temizle
        setVehicleForm({
          plate: '',
          type: 'truck',
          brand: '',
          model: '',
          year: '',
          capacity: '',
          driver: '',
          status: 'active',
          lastMaintenance: '',
          nextMaintenance: '',
          documents: []
        });
        
        // Modalı kapat ve başarı mesajı göster
        setShowModal(false);
        setSuccess('Araç başarıyla eklendi');
        
        // Araç listesini güncelle
        fetchVehicles();
        
        // 3 saniye sonra başarı mesajını kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        throw new Error(result.error || 'Araç eklenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Araç ekleme hatası:', err);
      setError(err.message || 'Araç eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleEditVehicle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Araç verisini hazırla
      const vehicleData = {
        plate: vehicleForm.plate,
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        year: vehicleForm.year,
        type: vehicleForm.type,
        capacity: vehicleForm.capacity,
        status: vehicleForm.status,
        driverId: vehicleForm.driver, // Seçilen sürücü ID'si
        lastMaintenance: vehicleForm.lastMaintenance,
        nextMaintenance: vehicleForm.nextMaintenance,
        notes: vehicleForm.notes
      };

      // API'ye istek gönder
      const response = await fetch(`/api/portal/vehicles?id=${selectedVehicle._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vehicleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Araç güncellenirken bir hata oluştu');
      }

      const result = await response.json();
      
      // İşlem başarılıysa
      if (result.success) {
        // Modalı kapat ve başarı mesajı göster
        setShowModal(false);
        setSuccess('Araç başarıyla güncellendi');
        
        // Araç listesini güncelle
        fetchVehicles();
        
        // 3 saniye sonra başarı mesajını kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        throw new Error(result.error || 'Araç güncellenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Araç güncelleme hatası:', err);
      setError(err.message || 'Araç güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!confirm('Bu aracı silmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // API'ye istek gönder
      const response = await fetch(`/api/portal/vehicles?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Araç silinirken bir hata oluştu');
      }

      const result = await response.json();
      
      // İşlem başarılıysa
      if (result.success) {
        // Başarı mesajı göster
        setSuccess('Araç başarıyla silindi');
        
        // Araç listesini güncelle
        fetchVehicles();
        
        // 3 saniye sonra başarı mesajını kaldır
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        throw new Error(result.error || 'Araç silinirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Araç silme hatası:', err);
      setError(err.message || 'Araç silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    filterVehicles(vehicles, searchTerm, value, typeFilter);
  };

  const handleTypeFilterChange = (e) => {
    const value = e.target.value;
    setTypeFilter(value);
    filterVehicles(vehicles, searchTerm, statusFilter, value);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    
    filterVehicles(vehicles, searchTerm, statusFilter, typeFilter);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVehicleForm({
      ...vehicleForm,
      [name]: value
    });
  };

  const openModal = (mode, vehicle = null) => {
    setModalMode(mode);
    
    if (mode === 'edit' && vehicle) {
      setSelectedVehicle(vehicle);
      // Form verilerini araç verisiyle doldur
      setVehicleForm({
        plate: vehicle.plate || vehicle.plateNumber || '',
        type: vehicle.type || 'truck',
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        capacity: vehicle.capacity || '',
        driver: vehicle.driverId || '',
        status: vehicle.status || 'active',
        lastMaintenance: vehicle.lastMaintenance ? new Date(vehicle.lastMaintenance).toISOString().split('T')[0] : '',
        nextMaintenance: vehicle.nextMaintenance ? new Date(vehicle.nextMaintenance).toISOString().split('T')[0] : '',
        notes: vehicle.notes || ''
      });
    } else {
      // Yeni araç için formu temizle
      setVehicleForm({
        plate: '',
        type: 'truck',
        brand: '',
        model: '',
        year: '',
        capacity: '',
        driver: '',
        status: 'active',
        lastMaintenance: '',
        nextMaintenance: '',
        notes: ''
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    if (hasChanges) {
      if (confirm('Değişiklikleriniz kaydedilmedi. Devam etmek istiyor musunuz?')) {
        setShowModal(false);
        setHasChanges(false);
      }
    } else {
      setShowModal(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modalMode === 'add') {
      handleAddVehicle(e);
    } else {
      handleEditVehicle(e);
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'truck':
        return <FaTruck className="h-5 w-5 text-blue-600" />;
      case 'van':
        return <FaCar className="h-5 w-5 text-green-600" />;
      case 'motorcycle':
        return <FaMotorcycle className="h-5 w-5 text-purple-600" />;
      default:
        return <FaTruck className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Aktif</span>;
      case 'maintenance':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Bakımda</span>;
      case 'inactive':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Pasif</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Bilinmiyor</span>;
    }
  };

  const getVehicleTypeName = (type) => {
    switch (type) {
      case 'truck':
        return 'Kamyon';
      case 'van':
        return 'Kamyonet/Van';
      case 'motorcycle':
        return 'Motosiklet';
      default:
        return 'Diğer';
    }
  };

  const getFilteredVehicles = () => {
    return vehicles
      .filter(vehicle => {
        // Durum filtresi
        if (statusFilter !== 'all' && vehicle.status !== statusFilter) {
          return false;
        }
        
        // Arama filtresi
        if (searchTerm && searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          return (
            vehicle.id.toLowerCase().includes(term) ||
            vehicle.plate.toLowerCase().includes(term) ||
            vehicle.brand.toLowerCase().includes(term) ||
            vehicle.model.toLowerCase().includes(term) ||
            vehicle.driver.toLowerCase().includes(term)
          );
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sıralama
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        
        if (sortOrder === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
  };

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
      case 'maintenance':
        return {
          label: 'Bakımda',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          icon: <FaWrench className="mr-1 h-3 w-3" />
        };
      case 'inactive':
        return {
          label: 'Pasif',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          icon: <FaTimesCircle className="mr-1 h-3 w-3" />
        };
      default:
        return {
          label: 'Bilinmiyor',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: <FaTruck className="mr-1 h-3 w-3" />
        };
    }
  };

  const getVehicleTypeInTurkish = (type) => {
    const types = {
      'panel_van': 'Panel Van',
      'small_van': 'Küçük Van',
      'truck': 'Kamyon',
      'minibus': 'Minibüs',
      'pickup': 'Pikap'
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const toggleVehicleDetails = (vehicle) => {
    if (activeVehicle && activeVehicle.id === vehicle.id) {
      setActiveVehicle(null);
    } else {
      setActiveVehicle(vehicle);
    }
  };

  const getInspectionClass = (dateString) => {
    if (!dateString) return 'text-gray-500';
    
    const today = new Date();
    const inspectionDate = new Date(dateString);
    const diffTime = inspectionDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'text-red-500 font-bold';
    } else if (diffDays < 30) {
      return 'text-yellow-500 font-bold';
    } else {
      return 'text-green-500';
    }
  };

  // Tüm sürücüleri getir
  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/portal/drivers');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.drivers)) {
          setDrivers(result.drivers);
          console.log('Sürücüler yüklendi:', result.drivers);
        } else {
          console.error('Sürücü verisi yüklenirken hata oluştu:', result.error);
        }
      } else {
        throw new Error('Sürücüler alınamadı');
      }
    } catch (err) {
      console.error('Sürücü verileri yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde sürücüleri de çek
  useEffect(() => {
    if (session) {
      fetchDrivers();
    }
  }, [session]);

  // Modal form içeriği
  const renderModalContent = () => {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plaka <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="plate"
              value={vehicleForm.plate}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Araç Tipi <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              value={vehicleForm.type}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              {vehicleTypes.map(type => (
                <option key={type} value={type.toLowerCase()}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marka <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="brand"
              value={vehicleForm.brand}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="model"
              value={vehicleForm.model}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model Yılı
            </label>
            <input
              type="number"
              name="year"
              value={vehicleForm.year}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              min="1900"
              max={new Date().getFullYear() + 1}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kapasite
            </label>
            <input
              type="text"
              name="capacity"
              value={vehicleForm.capacity}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="ör. 10 ton, 20 m³"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sürücü
            </label>
            <select
              name="driver"
              value={vehicleForm.driver}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">-- Sürücü Seçiniz --</option>
              {drivers.map(driver => (
                <option key={driver._id} value={driver._id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durum
            </label>
            <select
              name="status"
              value={vehicleForm.status}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="active">Aktif</option>
              <option value="maintenance">Bakımda</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Son Bakım Tarihi
            </label>
            <input
              type="date"
              name="lastMaintenance"
              value={vehicleForm.lastMaintenance}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sonraki Bakım Tarihi
            </label>
            <input
              type="date"
              name="nextMaintenance"
              value={vehicleForm.nextMaintenance}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <textarea
            name="notes"
            value={vehicleForm.notes}
            onChange={handleInputChange}
            rows="3"
            className="w-full p-2 border border-gray-300 rounded-md"
            placeholder="Araçla ilgili ek bilgileri buraya girebilirsiniz"
          ></textarea>
        </div>
        
        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4 mt-4">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            İptal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <FaSpinner className="animate-spin mr-2" />
                İşleniyor...
              </span>
            ) : modalMode === 'add' ? (
              'Araç Ekle'
            ) : (
              'Güncelle'
            )}
          </button>
        </div>
      </form>
    );
  };

  if (loading) {
    return (
      <PortalLayout title="Araçlar">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout title="Araçlar">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      </PortalLayout>
    );
  }

  const filteredVehicles = getFilteredVehicles();

  return (
    <>
      <Head>
        <title>Araçlar - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı Araçlar" />
      </Head>
      <PortalLayout title="Araçlar">
        <div className="space-y-6 p-4">
          {/* Üst Bilgi Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaTruck className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  Toplam
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Toplam Araç</h3>
              <p className="text-2xl font-bold text-gray-800">{vehicles.length}</p>
              <p className="mt-2 text-xs text-blue-600">
                <FaCheckCircle className="inline mr-1" />
                <span>Tüm araçlar</span>
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
              <h3 className="text-gray-500 text-sm">Aktif Araçlar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {vehicles.filter(v => v.status === 'active').length}
              </p>
              <p className="mt-2 text-xs text-green-600">
                <FaCheckCircle className="inline mr-1" />
                <span>Kullanımda</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <FaWrench className="h-5 w-5 text-yellow-500" />
                </div>
                <span className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2 py-1 rounded-full">
                  Bakımda
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Bakımdaki Araçlar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {vehicles.filter(v => v.status === 'maintenance').length}
              </p>
              <p className="mt-2 text-xs text-yellow-600">
                <FaWrench className="inline mr-1" />
                <span>Bakım/onarımda</span>
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
              <h3 className="text-gray-500 text-sm">Pasif Araçlar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {vehicles.filter(v => v.status === 'inactive').length}
              </p>
              <p className="mt-2 text-xs text-red-600">
                <FaTimesCircle className="inline mr-1" />
                <span>Kullanım dışı</span>
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
                    placeholder="Araç ara..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
                  >
                    <option value="all">Tüm Araçlar</option>
                    <option value="active">Aktif</option>
                    <option value="maintenance">Bakımda</option>
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
                  onClick={() => router.push('/portal/vehicles/add')}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center"
                >
                  <FaPlus className="mr-2" />
                  Yeni Araç
                </button>
              </div>
            </div>
          </div>

          {/* Araçlar Listesi */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Araçlar</h3>
            
            {vehicles.length === 0 ? (
              <div className="text-center py-8">
                <FaTruck className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 mb-2">Araç bulunamadı</p>
                <p className="text-gray-400 text-sm mb-6">Şirketinize ait araç kaydı bulunmuyor.</p>
                <button 
                  onClick={() => openModal('add')} 
                  className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-300 flex items-center mx-auto"
                >
                  <FaPlus className="mr-2" />
                  Yeni Araç Ekle
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                      <th className="py-3 px-6 text-left">Araç</th>
                      <th className="py-3 px-6 text-left">Teknik Bilgiler</th>
                      <th className="py-3 px-6 text-left">Durum</th>
                      <th className="py-3 px-6 text-left">Sürücü</th>
                      <th className="py-3 px-6 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm">
                    {getFilteredVehicles().map(vehicle => (
                      <tr key={vehicle._id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-6">
                          <div className="flex items-center">
                            {getVehicleIcon(vehicle.type)}
                            <div className="ml-3">
                              <p className="font-medium">{vehicle.plate}</p>
                              <p className="text-gray-500 text-xs">{vehicle.brand} {vehicle.model}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <p className="text-xs">
                            <span className="font-medium">Tip:</span> {getVehicleTypeInTurkish(vehicle.type)}
                          </p>
                          <p className="text-xs">
                            <span className="font-medium">Yıl:</span> {vehicle.year}
                          </p>
                          <p className="text-xs">
                            <span className="font-medium">Kapasite:</span> {vehicle.capacity}
                          </p>
                        </td>
                        <td className="py-3 px-6">
                          {getStatusBadge(vehicle.status)}
                        </td>
                        <td className="py-3 px-6">
                          {vehicle.driverName ? (
                            <span className="text-xs">{vehicle.driverName}</span>
                          ) : (
                            <span className="text-xs text-gray-400">Sürücü atanmamış</span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <div className="flex item-center justify-center space-x-3">
                            <button 
                              onClick={() => toggleVehicleDetails(vehicle)} 
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="Detaylar"
                            >
                              <FaEye size={16} />
                            </button>
                            <button 
                              onClick={() => openModal('edit', vehicle)} 
                              className="text-orange-500 hover:text-orange-700 transition-colors"
                              title="Düzenle"
                            >
                              <FaEdit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteVehicle(vehicle._id)} 
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Sil"
                            >
                              <FaTrash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Araç Ekleme/Düzenleme Modalı */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl">
              <div className="flex justify-between items-center border-b border-gray-200 p-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {modalMode === 'add' ? 'Yeni Araç Ekle' : 'Araç Düzenle'}
                </h2>
                <button 
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="p-6">
                {/* Hata Mesajı */}
                {error && (
                  <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                    <p className="font-medium">Hata</p>
                    <p>{error}</p>
                  </div>
                )}
                
                {/* Modal içeriği */}
                {renderModalContent()}
              </div>
            </div>
          </div>
        )}

        {/* Sürücü Değişikliği Uyarı Modalı */}
        {showDriverChangeWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <FaExclamationCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Dikkat!</h3>
                <p className="text-gray-500 text-center mb-4">
                  Bu sürücünün zaten bir aracı var. Yine de atamak istiyor musunuz?
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => {
                      setShowDriverChangeWarning(false);
                      setSelectedDriverForChange(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => {
                      if (selectedDriverForChange) {
                        setSelectedVehicle({
                          ...selectedVehicle,
                          driver: selectedDriverForChange.id
                        });
                        setHasChanges(true);
                      }
                      setShowDriverChangeWarning(false);
                      setSelectedDriverForChange(null);
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    Evet, Ata
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Araç Detay Modal */}
        {activeVehicle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{activeVehicle.brand} {activeVehicle.model}</h3>
                <button 
                  onClick={() => {
                    setActiveVehicle(null);
                    setHasChanges(false);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Araç Bilgileri</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                          <FaTruck className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Plaka</p>
                          <p className="text-lg font-semibold text-gray-900">{activeVehicle.plate}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <FaCar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Model</p>
                          <p className="text-lg font-semibold text-gray-900">{activeVehicle.year} {activeVehicle.brand} {activeVehicle.model}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <FaGasPump className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Yakıt Tipi</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {activeVehicle.fuelType === 'diesel' ? 'Dizel' : 
                             activeVehicle.fuelType === 'gasoline' ? 'Benzin' : 
                             activeVehicle.fuelType === 'lpg' ? 'LPG' : 
                             'Elektrik'}
                          </p>
                        </div>
                      </div>
                      
                        <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <FaTachometerAlt className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Kilometre</p>
                          <p className="text-lg font-semibold text-gray-900">{activeVehicle.mileage}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Araç Detayları</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                          <FaTruck className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Araç Tipi</p>
                          <p className="text-lg font-semibold text-gray-900">{activeVehicle.type}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <FaTruck className="h-5 w-5 text-blue-600" />
                          </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Kasa Tipi</p>
                          <p className="text-lg font-semibold text-gray-900">{activeVehicle.bodyType}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <FaTruck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Kapasite</p>
                          <p className="text-lg font-semibold text-gray-900">{activeVehicle.capacity}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                          <FaMapMarkerAlt className="h-5 w-5 text-purple-600" />
                          </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Konum</p>
                          <p className="text-lg font-semibold text-gray-900">{activeVehicle.location}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Araç Durumu</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <FaTruck className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Durum</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {activeVehicle.status === 'active' ? 'Aktif' : 
                           activeVehicle.status === 'maintenance' ? 'Bakımda' : 
                           'Pasif'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Sürücü</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <select
                      value={activeVehicle.driver || ''}
                      onChange={(e) => {
                        const selectedDriver = e.target.value;
                        if (selectedDriver) {
                          const driver = drivers.find(d => d.id === selectedDriver);
                          if (driver && driver.vehicle) {
                            setSelectedDriverForChange(driver);
                            setShowDriverChangeWarning(true);
                          } else {
                            setActiveVehicle({...activeVehicle, driver: selectedDriver});
                            setHasChanges(true);
                          }
                        } else {
                          setActiveVehicle({...activeVehicle, driver: ''});
                          setHasChanges(true);
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Sürücü Seçin</option>
                      {drivers.map(driver => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} {driver.vehicle ? '(Mevcut Araç: ' + driver.vehicle + ')' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                <button
                  onClick={() => setShowDocumentsModal(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Belgeler
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveVehicle(null);
                      setHasChanges(false);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Kapat
                  </button>
                  {hasChanges && (
                    <button
                      onClick={() => {
                        // Kaydetme işlemi
                        setActiveVehicle(null);
                        setHasChanges(false);
                      }}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                      Kaydet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Belgeler Modal */}
        {showDocumentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Belgeler</h3>
                <button 
                  onClick={() => setShowDocumentsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {activeVehicle.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FaFile className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-gray-900">{doc}</span>
                      </div>
                      <button className="text-orange-600 hover:text-orange-700">
                        <FaDownload className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </PortalLayout>
    </>
  );
} 