'use client'

import React, { useState, useEffect } from 'react'
import { FaPlus, FaSearch, FaEye, FaTrash, FaUser, FaShippingFast, FaCalendarAlt, FaTimes, FaCheck, FaIdCard, FaPhone, FaEnvelope, FaBuilding, FaMapMarkerAlt, FaEdit, FaTruck, FaMap, FaMapMarked, FaSpinner, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import AdminLayout from '../../components/admin/Layout'
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'

// Google Maps API anahtarı
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAKht3SqaVJpufUdq-vVQEfBEQKejT9Z8k";

export default function CustomersPage() {
  const { data: session, status } = useSession();
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(null)
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(null)
  const [showShipmentsModal, setShowShipmentsModal] = useState(null)
  const [showShipmentMapModal, setShowShipmentMapModal] = useState(null)
  const [directions, setDirections] = useState(null)
  const [map, setMap] = useState(null)
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
  })
  const [editCustomerData, setEditCustomerData] = useState({
    id: null,
    name: '',
    company: '',
    phone: '',
    email: '',
    status: '',
    address: '',
    taxNumber: '',
    notes: '',
    companyName: '',
  })
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)

  // Google Maps yükleme
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  })

  // Map container style
  const containerStyle = {
    width: '100%',
    height: '350px'
  }

  // Harita merkezi - İstanbul
  const center = {
    lat: 41.0082,
    lng: 28.9784
  }

  // Map load callback
  const onLoad = React.useCallback(function callback(map) {
    setMap(map)
  }, [])

  // Map unmount callback
  const onUnmount = React.useCallback(function callback() {
    setMap(null)
  }, [])

  // Rota çizimi için örnek koordinatlar
  const getRoute = (from, to) => {
    if (!isLoaded || !map) return;

    const fromCoords = getCoordinatesForCity(from);
    const toCoords = getCoordinatesForCity(to);

    const directionsService = new window.google.maps.DirectionsService()

    directionsService.route(
      {
        origin: fromCoords,
        destination: toCoords,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result)
        } else {
          console.error(`Rota bulunamadı: ${status}`)
        }
      }
    )
  }

  // Şehirler için örnek koordinatlar
  const getCoordinatesForCity = (city) => {
    const cities = {
      'İstanbul': { lat: 41.0082, lng: 28.9784 },
      'Ankara': { lat: 39.9334, lng: 32.8597 },
      'İzmir': { lat: 38.4237, lng: 27.1428 },
      'Bursa': { lat: 40.1885, lng: 29.0610 },
      'Antalya': { lat: 36.8841, lng: 30.7056 },
      'Konya': { lat: 37.8715, lng: 32.4941 },
    };
    
    return cities[city] || cities['İstanbul']; // Varsayılan olarak İstanbul
  }

  // API'den müşteri verilerini getirme
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Müşteriler sayfası yükleniyor...');
        
        const response = await fetch('/api/admin/customers', {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('API yanıtı alındı:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Müşteriler alınırken bir hata oluştu');
        }
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`${data.customers ? data.customers.length : 0} müşteri verisi alındı`);
          console.log('Alınan müşteri verileri:', data.customers);
          setCustomers(data.customers || []);
          setTotalCustomers(data.totalCustomers || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          console.error('API başarısız yanıt döndü:', data);
          setError(data.message || 'Müşteriler alınırken bir hata oluştu');
        }
      } catch (error) {
        console.error('Müşteri verilerini alma hatası:', error);
        
        // Hata detaylarını kaydet
        let errorMessage = 'Müşteri verileri alınırken bir sorun oluştu.';
        
        if (error.response) {
          // Sunucudan yanıt geldi ancak 2XX aralığında bir durum kodu değil
          console.error('Hata yanıtı:', error.response.status, error.response.data);
          
          if (error.response.status === 401) {
            errorMessage = 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.';
          } else if (error.response.status === 403) {
            errorMessage = 'Bu sayfaya erişim izniniz yok.';
          } else if (error.response.status === 404) {
            errorMessage = 'API endpoint bulunamadı. Lütfen sistem yöneticinize başvurun.';
          } else if (error.response.status === 500) {
            errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
          }
          
          errorMessage += ' Detay: ' + (error.response.data?.message || error.message);
        } else if (error.request) {
          // İstek yapıldı ancak yanıt alınamadı
          console.error('İstek gönderildi ancak yanıt alınamadı');
          errorMessage = 'Sunucu yanıt vermiyor. Lütfen internet bağlantınızı kontrol edin.';
        } else {
          // İstek oluşturulurken bir şeyler yanlış gitti
          console.error('İstek oluşturma hatası:', error.message);
          errorMessage = 'Bir hata oluştu: ' + error.message;
        }
        
        // Hata mesajını state'e kaydet
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    // Router hazır olduğunda verileri getir
    if (router.isReady) {
      console.log('Router hazır, verileri getirme başlatılıyor');
      fetchCustomers();
    }
  }, [router.isReady]);

  // Taşıma detaylarını görüntüleme ve harita modalını açma
  const viewShipmentDetails = (shipment) => {
    setShowShipmentMapModal(shipment);
    getRoute(shipment.from, shipment.to);
  };

  // Yeni müşteri ekleme
  const addNewCustomer = async () => {
    if (!session) {
      router.replace('/admin');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCustomerData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/admin');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Müşteri eklenirken bir hata oluştu');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const newCustomer = data.customer;
        setCustomers(prevCustomers => [...prevCustomers, {
          id: newCustomer.id,
          name: newCustomer.name,
          company: newCustomer.company,
          phone: newCustomer.phone,
          email: newCustomer.email,
          status: newCustomer.status || 'Aktif',
          joinDate: new Date().toLocaleDateString('tr-TR'),
          orders: 0,
          lastOrder: '-',
          address: newCustomer.address || '',
          taxNumber: newCustomer.taxNumber || '',
          notes: newCustomer.notes || ''
        }]);
        
        // Form alanlarını temizle
        setNewCustomerData({
          name: '',
          company: '',
          phone: '',
          email: ''
        });
        
        // Modal'ı kapat
        setShowAddCustomerModal(false);
      } else {
        alert(data.message || 'Müşteri eklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Müşteri ekleme hatası:', error);
      alert('Müşteri eklenirken bir sorun oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setSubmitting(false);
    }
  };

  // Müşteri silme
  const deleteCustomer = async (id) => {
    if (!session) {
      router.replace('/admin');
      return;
    }

    try {
      const response = await fetch(`/api/admin/customers?id=${id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/admin');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Müşteri silinirken bir hata oluştu');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCustomers(prevCustomers => prevCustomers.filter(customer => customer.id !== id));
        setShowDeleteConfirm(null);
      } else {
        alert(data.message || 'Müşteri silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Müşteri silme hatası:', error);
      alert('Müşteri silinirken bir sorun oluştu: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  // Müşteri düzenleme
  const editCustomer = async () => {
    if (!session) {
      router.replace('/admin');
      return;
    }

    try {
      const response = await fetch(`/api/admin/customers?id=${editCustomerData.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editCustomerData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/admin');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Müşteri güncellenirken bir hata oluştu');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCustomers(prevCustomers => 
          prevCustomers.map(customer => 
            customer.id === editCustomerData.id 
              ? {...customer, ...editCustomerData} 
              : customer
          )
        );
        setShowEditCustomerModal(false);
      } else {
        alert(data.message || 'Müşteri güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Müşteri güncelleme hatası:', error);
      alert('Müşteri güncellenirken bir sorun oluştu: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const tabs = [
    { id: 'all', name: 'Tüm Müşteriler' },
    { id: 'active', name: 'Aktif' },
    { id: 'passive', name: 'Pasif' },
  ]

  // Durum renkleri
  const getStatusColor = (status) => {
    switch(status) {
      case 'Aktif':
        return 'bg-green-100 text-green-800'
      case 'Pasif':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Müşteri arama ve filtreleme
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedTab === 'all' || 
                         (selectedTab === 'active' && customer.status === 'ACTIVE') ||
                         (selectedTab === 'passive' && customer.status !== 'ACTIVE');
    return matchesSearch && matchesStatus;
  });

  // Sayfalama için müşterileri böl
  const indexOfLastCustomer = currentPage * 10;
  const indexOfFirstCustomer = indexOfLastCustomer - 10;
  const currentCustomers = filteredCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer);

  // ESC tuşu ile modal'ları kapatma
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Sadece en son açılan modal'ı kapat
        if (showDeleteConfirm) {
          setShowDeleteConfirm(null);
        } else if (showAddCustomerModal) {
          setShowAddCustomerModal(false);
        } else if (showShipmentMapModal) {
          setShowShipmentMapModal(null);
        } else if (showShipmentsModal) {
          setShowShipmentsModal(null);
        } else if (showCustomerDetailModal) {
          setShowCustomerDetailModal(null);
        } else if (showEditCustomerModal) {
          setShowEditCustomerModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Modal açıkken body scroll'u engelle
    if (showCustomerDetailModal || showDeleteConfirm || showAddCustomerModal || showEditCustomerModal || showShipmentsModal || showShipmentMapModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [showCustomerDetailModal, showDeleteConfirm, showAddCustomerModal, showEditCustomerModal, showShipmentsModal, showShipmentMapModal]);

  return (
    <AdminLayout title="Müşteri Yönetimi" isBlurred={showAddCustomerModal || showDeleteConfirm || showCustomerDetailModal || showEditCustomerModal || showShipmentsModal || showShipmentMapModal}>
      <div className={showAddCustomerModal || showDeleteConfirm || showCustomerDetailModal || showEditCustomerModal || showShipmentsModal || showShipmentMapModal ? "blur-sm" : ""}>
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
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Müşteri ara..." 
                className="pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <button 
              className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              onClick={() => setShowAddCustomerModal(true)}
            >
              <FaPlus className="mr-2" /> Yeni Müşteri
            </button>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="flex flex-row gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <FaUser className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm">Toplam Müşteri</h3>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <FaCheck className="text-green-600" />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm">Aktif Müşteriler</h3>
                <p className="text-2xl font-bold">{customers.filter(c => c.status === 'ACTIVE').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 flex-1">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full mr-4">
                <FaBuilding className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-gray-500 text-sm">Kurumsal Müşteriler</h3>
                <p className="text-2xl font-bold">{customers.filter(c => c.accountType === 'corporate').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Müşteri Tablosu */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <FaSpinner className="animate-spin text-orange-500 text-4xl" />
                <span className="ml-3 text-lg">Müşteriler yükleniyor...</span>
              </div>
            ) : error ? (
              <div className="text-center p-12 text-red-500">
                <p>{error}</p>
                <button 
                  onClick={() => router.reload()} 
                  className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Yeniden Dene
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taşıma Bilgisi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        Müşteri bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    currentCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-gray-500 font-medium text-lg">
                                {customer.name ? customer.name.charAt(0).toUpperCase() : 'M'}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.companyName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.phone}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span 
                              className="text-gray-900 cursor-pointer hover:text-orange-600 transition-colors"
                              onClick={() => {
                                setShowCustomerDetailModal(customer);
                                setTimeout(() => setShowShipmentsModal(customer), 100);
                              }}
                            >
                              {customer.orders || 0} Taşıma
                            </span>
                            <span className="text-gray-500 text-xs">Son taşıma: {customer.lastOrder || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {customer.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.joinDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setShowCustomerDetailModal(customer)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Önizleme"
                          >
                            <FaEye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Toplam <span className="font-medium text-gray-900">{filteredCustomers.length}</span> müşteri bulundu
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
                  <span className="font-medium">{currentPage}</span> / <span className="font-medium">{Math.ceil(filteredCustomers.length / 10) || 1}</span>
                </span>
                
                <button 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredCustomers.length / 10) || 1, p + 1))}
                  disabled={currentPage === (Math.ceil(filteredCustomers.length / 10) || 1)}
                  className="inline-flex items-center justify-center w-8 h-8 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Yeni Müşteri Ekleme Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={(e) => {
          if (e.target === e.currentTarget) setShowAddCustomerModal(false);
        }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Yeni Müşteri Ekle</h3>
              <button 
                onClick={() => setShowAddCustomerModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adı Soyadı <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şirket</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newCustomerData.company}
                    onChange={(e) => setNewCustomerData({...newCustomerData, company: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta <span className="text-red-500">*</span></label>
                  <input 
                    type="email" 
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowAddCustomerModal(false)}
                >
                  İptal
                </button>
                <button 
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center"
                  onClick={addNewCustomer}
                  disabled={submitting || !newCustomerData.name || !newCustomerData.phone || !newCustomerData.email}
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Ekleniyor...
                    </>
                  ) : (
                    'Müşteri Ekle'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setShowDeleteConfirm(null);
        }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">Müşteri Silme Onayı</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                <b>{showDeleteConfirm.name}</b> isimli müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
                >
                  İptal
                </button>
                <button 
                  onClick={() => deleteCustomer(showDeleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
                >
                  Müşteriyi Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Detay Modalı */}
      {showCustomerDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={(e) => {
          if (e.target === e.currentTarget) setShowCustomerDetailModal(null);
        }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Müşteri Detayları</h3>
              <button 
                onClick={() => setShowCustomerDetailModal(null)}
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
                    <h4 className="text-lg font-medium text-gray-800 mb-3">Müşteri Bilgileri</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0 h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-2xl">
                          {showCustomerDetailModal.name?.charAt(0) || '?'}
                        </div>
                        <div className="ml-4">
                          <h5 className="text-xl font-medium text-gray-900">{showCustomerDetailModal.name}</h5>
                          <p className="text-gray-600">{showCustomerDetailModal.company}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Müşteri Tipi:</div>
                          <div className="font-medium">
                            {showCustomerDetailModal.accountType === 'corporate' ? 'Kurumsal' : 'Bireysel'}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Ad Soyad:</div>
                          <div className="font-medium">
                            {showCustomerDetailModal.firstName} {showCustomerDetailModal.lastName}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Telefon:</div>
                          <div className="font-medium">{showCustomerDetailModal.phone}</div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">E-posta:</div>
                          <div className="font-medium">{showCustomerDetailModal.email}</div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-28 text-gray-500">Durum:</div>
                          <div>
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              showCustomerDetailModal.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {showCustomerDetailModal.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                        </div>
                        {showCustomerDetailModal.accountType === 'corporate' && (
                          <>
                            <div className="flex items-start">
                              <div className="w-28 text-gray-500">Firma Adı:</div>
                              <div className="font-medium">{showCustomerDetailModal.companyName}</div>
                      </div>
                            <div className="flex items-start">
                              <div className="w-28 text-gray-500">Vergi No:</div>
                              <div className="font-medium">{showCustomerDetailModal.taxNumber}</div>
                    </div>
                            <div className="flex items-start">
                              <div className="w-28 text-gray-500">Vergi Dairesi:</div>
                              <div className="font-medium">{showCustomerDetailModal.taxOffice}</div>
                            </div>
                            <div className="flex items-start">
                              <div className="w-28 text-gray-500">Firma Adresi:</div>
                              <div className="font-medium">{showCustomerDetailModal.companyAddress}</div>
                            </div>
                            <div className="flex items-start">
                              <div className="w-28 text-gray-500">İlçe:</div>
                              <div className="font-medium">{showCustomerDetailModal.companyDistrict}</div>
                            </div>
                            <div className="flex items-start">
                              <div className="w-28 text-gray-500">İl:</div>
                              <div className="font-medium">{showCustomerDetailModal.companyCity}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sağ Bölüm - Taşıma ve İstatistikler */}
                <div className="md:w-1/2 space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-3">Taşıma İstatistikleri</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div 
                          className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:bg-orange-50 transition-colors"
                          onClick={() => setShowShipmentsModal(showCustomerDetailModal)}
                        >
                          <div className="text-gray-500 text-sm mb-1">Toplam Taşıma</div>
                          <div className="text-xl font-bold text-orange-600">{showCustomerDetailModal.orders || 0}</div>
                        </div>
                        <div 
                          className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:bg-orange-50 transition-colors"
                          onClick={() => setShowShipmentsModal(showCustomerDetailModal)}
                        >
                          <div className="text-gray-500 text-sm mb-1">Son Taşıma</div>
                          <div className="text-lg font-medium text-gray-800">{showCustomerDetailModal.lastOrder || '-'}</div>
                        </div>
                      </div>
                      
                      <div 
                        className="bg-white rounded-lg p-3 shadow-sm mt-4 cursor-pointer hover:bg-orange-50 transition-colors"
                        onClick={() => setShowShipmentsModal(showCustomerDetailModal)}
                      >
                        <p className="text-gray-700 text-sm flex items-center justify-between">
                          <span>Bu müşteri için taşıma geçmişi ve detaylı analiz bilgileri görüntülemek için tıklayın</span>
                          <FaShippingFast className="text-orange-500 ml-2" />
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-3">Ek Bilgiler</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 mb-2 text-sm">
                        <strong>Adres:</strong> {showCustomerDetailModal.address || "Belirtilmemiş"}
                      </p>
                      <p className="text-gray-700 mb-2 text-sm">
                        <strong>Vergi No:</strong> {showCustomerDetailModal.taxNumber || "Belirtilmemiş"}
                      </p>
                      <p className="text-gray-700 text-sm">
                        <strong>Notlar:</strong> {showCustomerDetailModal.notes || "Bu müşteri için henüz not eklenmemiş."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-6 flex justify-end">
                <button 
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded mr-2"
                  onClick={() => {
                    setEditCustomerData({
                      id: showCustomerDetailModal.id,
                      name: showCustomerDetailModal.name,
                      company: showCustomerDetailModal.company,
                      phone: showCustomerDetailModal.phone,
                      email: showCustomerDetailModal.email,
                      status: showCustomerDetailModal.status,
                      address: showCustomerDetailModal.address || '',
                      taxNumber: showCustomerDetailModal.taxNumber || '',
                      notes: showCustomerDetailModal.notes || '',
                      accountType: showCustomerDetailModal.accountType || 'individual',
                      companyName: showCustomerDetailModal.companyName || '',
                      taxOffice: showCustomerDetailModal.taxOffice || '',
                      companyAddress: showCustomerDetailModal.companyAddress || '',
                      companyDistrict: showCustomerDetailModal.companyDistrict || '',
                      companyCity: showCustomerDetailModal.companyCity || ''
                    });
                    setShowCustomerDetailModal(null);
                    setShowEditCustomerModal(true);
                  }}
                >
                  <FaEdit className="mr-2 inline-block" /> Düzenle
                </button>
                <button 
                  onClick={() => {
                    setShowCustomerDetailModal(null);
                    setShowDeleteConfirm(showCustomerDetailModal);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded mr-2"
                >
                  <FaTrash className="mr-2 inline-block" /> Sil
                </button>
                <button 
                  onClick={() => setShowCustomerDetailModal(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Düzenleme Modalı */}
      {showEditCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={(e) => {
          if (e.target === e.currentTarget) setShowEditCustomerModal(false);
        }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Müşteri Düzenle</h3>
              <button 
                onClick={() => setShowEditCustomerModal(false)}
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
                    <h4 className="text-lg font-medium text-gray-800 mb-3">Müşteri Bilgileri</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0 h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-2xl">
                          {editCustomerData.name?.charAt(0) || '?'}
                        </div>
                        <div className="ml-4">
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
                            value={editCustomerData.name}
                            onChange={(e) => setEditCustomerData({...editCustomerData, name: e.target.value})}
                            placeholder="Müşteri Adı"
                          />
                          <input 
                            type="text" 
                            className="w-full mt-2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={editCustomerData.companyName}
                            onChange={(e) => setEditCustomerData({...editCustomerData, companyName: e.target.value})}
                            placeholder="Firma Adı"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center">
                          <div className="w-28 text-gray-500">ID:</div>
                          <div className="font-medium">#{editCustomerData.id}</div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-28 text-gray-500">Müşteri Tipi:</div>
                          <select 
                            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={editCustomerData.type || 'Bireysel'}
                            onChange={(e) => setEditCustomerData({...editCustomerData, type: e.target.value})}
                          >
                            <option value="Bireysel">Bireysel</option>
                            <option value="Kurumsal">Kurumsal</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <div className="w-28 text-gray-500">Telefon:</div>
                          <input 
                            type="tel" 
                            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={editCustomerData.phone}
                            onChange={(e) => setEditCustomerData({...editCustomerData, phone: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center">
                          <div className="w-28 text-gray-500">E-posta:</div>
                          <input 
                            type="email" 
                            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={editCustomerData.email}
                            onChange={(e) => setEditCustomerData({...editCustomerData, email: e.target.value})}
                          />
                        </div>
                        <div className="flex items-center">
                          <div className="w-28 text-gray-500">Durum:</div>
                          <select 
                            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={editCustomerData.status}
                            onChange={(e) => setEditCustomerData({...editCustomerData, status: e.target.value})}
                          >
                            <option value="Aktif">Aktif</option>
                            <option value="Pasif">Pasif</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sağ Bölüm - Ek Bilgiler */}
                <div className="md:w-1/2 space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 mb-3">Ek Bilgiler</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            rows="3"
                            value={editCustomerData.address}
                            onChange={(e) => setEditCustomerData({...editCustomerData, address: e.target.value})}
                            placeholder="Adres bilgileri"
                          ></textarea>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vergi No</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={editCustomerData.taxNumber}
                            onChange={(e) => setEditCustomerData({...editCustomerData, taxNumber: e.target.value})}
                            placeholder="Vergi numarası"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            rows="3"
                            value={editCustomerData.notes}
                            onChange={(e) => setEditCustomerData({...editCustomerData, notes: e.target.value})}
                            placeholder="Müşteri ile ilgili notlar"
                          ></textarea>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adresi</label>
                          <textarea 
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            rows="3"
                            value={editCustomerData.companyAddress}
                            onChange={(e) => setEditCustomerData({...editCustomerData, companyAddress: e.target.value})}
                            placeholder="Firma adresi"
                          ></textarea>
                      </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={editCustomerData.companyDistrict}
                            onChange={(e) => setEditCustomerData({...editCustomerData, companyDistrict: e.target.value})}
                            placeholder="İlçe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={editCustomerData.companyCity}
                            onChange={(e) => setEditCustomerData({...editCustomerData, companyCity: e.target.value})}
                            placeholder="İl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-6 flex justify-end">
                <button 
                  onClick={() => setShowEditCustomerModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded mr-2"
                >
                  İptal
                </button>
                <button 
                  onClick={editCustomer}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Taşıma Listesi Modalı */}
      {showShipmentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 overflow-y-auto" onClick={(e) => {
          if (e.target === e.currentTarget) setShowShipmentsModal(null);
        }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">{showShipmentsModal.name} - Taşıma Listesi</h3>
              <button 
                onClick={() => setShowShipmentsModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              {/* Taşıma Filtreleme Seçenekleri */}
              <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative w-full md:w-64">
                  <input 
                    type="text" 
                    placeholder="Taşıma ara..." 
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <div className="flex gap-2">
                  <select className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Tüm Durumlar</option>
                    <option value="yolda">Yolda</option>
                    <option value="tamamlandi">Tamamlandı</option>
                    <option value="iptal">İptal</option>
                  </select>
                  <select className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Son 30 Gün</option>
                    <option value="son-90-gun">Son 90 Gün</option>
                    <option value="tum-zamanlar">Tüm Zamanlar</option>
                  </select>
                </div>
              </div>
              
              {/* Taşıma Tablosu */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taşıma ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nereden</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nereye</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taşıyıcı</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Örnek taşıma verileri */}
                      {[...Array(Math.min(showShipmentsModal.orders, 10))].map((_, index) => {
                        const date = new Date();
                        date.setDate(date.getDate() - index * 5);
                        const formattedDate = date.toLocaleDateString('tr-TR');
                        
                        const status = index % 3 === 0 ? 'Tamamlandı' : (index % 3 === 1 ? 'Yolda' : 'İptal');
                        const statusColor = 
                          status === 'Tamamlandı' ? 'bg-green-100 text-green-800' :
                          status === 'Yolda' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800';
                        
                        // Taşıma verilerini oluştur
                        const shipment = {
                          id: `${showShipmentsModal.id}00${index + 1}`,
                          date: formattedDate,
                          from: 'İstanbul',
                          to: ['Ankara', 'İzmir', 'Bursa', 'Antalya', 'Konya'][index % 5],
                          carrier: ['Ahmet Nakliyat', 'Express Taşıma', 'Hızlı Kargo', 'Yıldız Lojistik', 'Profesyonel Taşıma'][index % 5],
                          amount: `${(Math.floor(Math.random() * 10) + 1) * 1000} ₺`,
                          status: status,
                          distance: `${Math.floor(Math.random() * 500) + 100} km`,
                          duration: `${Math.floor(Math.random() * 8) + 1} saat ${Math.floor(Math.random() * 60)} dakika`,
                          customer: showShipmentsModal.name,
                          cargoType: ['Ev Eşyası', 'Ofis Malzemeleri', 'Elektronik', 'Gıda', 'İnşaat Malzemeleri'][index % 5],
                          pieces: Math.floor(Math.random() * 10) + 1,
                          notes: 'Lütfen dikkatli taşıyınız, kırılabilir eşyalar mevcut.'
                        };
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <span 
                                className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline" 
                                onClick={() => viewShipmentDetails(shipment)}
                              >
                                #{shipment.id}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formattedDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              İstanbul
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {shipment.to}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {shipment.carrier}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {shipment.amount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {showShipmentsModal.orders === 0 && (
                  <div className="py-8 text-center text-gray-600">
                    Bu müşteriye ait taşıma kaydı bulunamadı.
                  </div>
                )}
                {showShipmentsModal.orders > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Toplam <span className="font-medium">{showShipmentsModal.orders}</span> taşıma
                    </div>
                    <div className="flex space-x-1">
                      <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                        Önceki
                      </button>
                      <button className="px-3 py-1 border border-gray-300 bg-orange-50 text-orange-600 rounded-md text-sm">
                        1
                      </button>
                      {showShipmentsModal.orders > 10 && (
                        <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                          2
                        </button>
                      )}
                      {showShipmentsModal.orders > 10 && (
                        <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                          Sonraki
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowShipmentsModal(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Taşıma Harita Modal */}
      {showShipmentMapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 overflow-y-auto" onClick={(e) => {
          if (e.target === e.currentTarget) setShowShipmentMapModal(null);
        }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Taşıma #{showShipmentMapModal.id} - Rota Bilgileri</h3>
              <button 
                onClick={() => setShowShipmentMapModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-lg mb-3">Taşıma Detayları</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Müşteri</p>
                        <p className="font-medium">{showShipmentMapModal.customer}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tarih</p>
                        <p className="font-medium">{showShipmentMapModal.date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Nereden</p>
                        <p className="font-medium">{showShipmentMapModal.from}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Nereye</p>
                        <p className="font-medium">{showShipmentMapModal.to}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Taşıyıcı</p>
                        <p className="font-medium">{showShipmentMapModal.carrier}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tutar</p>
                        <p className="font-medium">{showShipmentMapModal.amount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Durum</p>
                        <p className="font-medium">
                          <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
                            showShipmentMapModal.status === 'Tamamlandı' ? 'bg-green-100 text-green-800' :
                            showShipmentMapModal.status === 'Yolda' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {showShipmentMapModal.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Yük Tipi</p>
                          <p className="font-medium">{showShipmentMapModal.cargoType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Parça Sayısı</p>
                          <p className="font-medium">{showShipmentMapModal.pieces} Parça</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm text-gray-500">Notlar</p>
                        <p className="text-sm">{showShipmentMapModal.notes}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-lg mb-3">Rota Bilgileri</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <FaMapMarked className="text-orange-500 mr-2" />
                          <span className="font-medium">Mesafe ve Süre</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500">Toplam Mesafe</p>
                          <p className="font-bold text-lg text-orange-600">{showShipmentMapModal.distance}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500">Tahmini Süre</p>
                          <p className="font-bold text-lg text-orange-600">{showShipmentMapModal.duration}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-center mb-2">
                        <FaTruck className="text-orange-500 mr-2" />
                        <span className="font-medium">Taşıma Durumu</span>
                      </div>
                      <div className="relative pt-1">
                        <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-gray-200">
                          <div style={{ width: showShipmentMapModal.status === 'Tamamlandı' ? '100%' : showShipmentMapModal.status === 'Yolda' ? '60%' : '20%' }} 
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500">
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Hazırlık</span>
                          <span>Taşınıyor</span>
                          <span>Teslim Edildi</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium text-lg mb-3">Rota Haritası</h4>
                <div className="border rounded-lg overflow-hidden">
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={containerStyle}
                      center={center}
                      zoom={7}
                      onLoad={onLoad}
                      onUnmount={onUnmount}
                    >
                      {directions ? (
                        <DirectionsRenderer directions={directions} />
                      ) : (
                        <>
                          <Marker position={getCoordinatesForCity(showShipmentMapModal.from)} />
                          <Marker position={getCoordinatesForCity(showShipmentMapModal.to)} />
                        </>
                      )}
                    </GoogleMap>
                  ) : (
                    <div className="bg-gray-200 h-[350px] flex items-center justify-center">
                      <div className="text-center">
                        <FaSpinner className="mx-auto animate-spin text-orange-500 text-2xl mb-2" />
                        <p className="text-gray-600">Harita yükleniyor...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowShipmentMapModal(null)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
} 