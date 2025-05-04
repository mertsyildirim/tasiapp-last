'use client'

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/Layout';
import axios from 'axios';
import { API_CONFIG } from '../../lib/config';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { TbReportMoney, TbCash, TbClock, TbAlertTriangle, TbX } from 'react-icons/tb';
import InvoiceAddModal from '../../components/admin/InvoiceAddModal';
import InvoiceEditModal from '../../components/admin/InvoiceEditModal';
import { FaSearch, FaEye, FaFileInvoice, FaMoneyBillWave, FaCreditCard, FaTruck, FaUser, FaPlus, FaCalendarAlt, FaExclamationTriangle, FaTimes, FaChevronLeft, FaChevronRight, FaBox, FaInfo, FaWeight, FaRuler, FaUpload, FaFilePdf, FaClock  } from 'react-icons/fa';
import { useSession } from 'next-auth/react';

const AdminInvoicesPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Tüm state'leri en üstte tanımla
  const [activeSection, setActiveSection] = useState('customer');
  const [selectedTab, setSelectedTab] = useState('all');
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // API verisi için state'ler
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    customer: {
      total: 0,
      paid: 0,
      pending: 0,
      canceled: 0,
      revenue: 0,
      pendingRevenue: 0
    },
    carrier: {
    total: 0,
    paid: 0,
    pending: 0,
      waitingDate: 0,
      canceled: 0,
      payment: 0,
      pendingPayment: 0
    }
  });

  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    orderId: '',
    amount: '',
    description: '',
    dueDate: '',
    status: 'pending'
  });
  const [customers, setCustomers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [shipments, setShipments] = useState([]);

  // Shipment modalı için state
  const [showShipmentDetailModal, setShowShipmentDetailModal] = useState(null);
  const [shipmentDetails, setShipmentDetails] = useState(null);
  const [loadingShipment, setLoadingShipment] = useState(false);

  // PDF yükleme için state'ler
  const [selectedInvoicePdf, setSelectedInvoicePdf] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef(null);

  // Oturum kontrolü
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.replace('/admin');
      return;
    }
  }, [session, status, router]);

  // ESC tuşu ile modalı kapatma
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setShowNewInvoiceModal(false);
      }
    };

    if (showNewInvoiceModal) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showNewInvoiceModal]);

  // Faturaları getir
  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Sorgu parametreleri
      const params = {
        type: activeSection, // 'customer' veya 'carrier'
        page: currentPage,
        limit: 10
      };
      
      // Tab seçimine göre durum filtresi ekle
      if (selectedTab === 'paid') {
        params.status = 'ödendi';
      } else if (selectedTab === 'pending') {
        params.status = 'beklemede';
      } else if (selectedTab === 'waitingDate') {
        params.status = 'tarih_bekliyor';
      } else if (selectedTab === 'canceled') {
        params.status = 'iptal';
      }
      
      console.log('Fatura isteği parametreleri:', params);
      
      const response = await axios.get('/api/admin/invoices', {
        headers: {
          'Content-Type': 'application/json'
        },
        params
      });
      
      console.log('Fatura yanıtı:', response.data);
      
      if (response.data.success) {
        setInvoices(response.data.invoices || []);
        setStats({
          customer: {
            total: response.data.stats?.customer?.total || 0,
            paid: response.data.stats?.customer?.paid || 0,
            pending: response.data.stats?.customer?.pending || 0,
            canceled: response.data.stats?.customer?.canceled || 0,
            revenue: response.data.stats?.customer?.revenue || 0,
            pendingRevenue: response.data.stats?.customer?.pendingRevenue || 0
          },
          carrier: {
            total: response.data.stats?.carrier?.total || 0,
            paid: response.data.stats?.carrier?.paid || 0,
            pending: response.data.stats?.carrier?.pending || 0,
            waitingDate: response.data.stats?.carrier?.waitingDate || 0,
            canceled: response.data.stats?.carrier?.canceled || 0,
            payment: response.data.stats?.carrier?.payment || 0,
            pendingPayment: response.data.stats?.carrier?.pendingPayment || 0
          }
        });
        setTotalPages(response.data.totalPages || 1);
      } else {
        throw new Error(response.data.message || 'Fatura verileri alınamadı');
      }
    } catch (err) {
      console.error('Fatura verileri getirme hatası:', err);
      setError(err.response?.data?.error || err.message || 'Fatura verileri yüklenirken bir hata oluştu');
      setInvoices([]);
      setStats({
        customer: {
          total: 0,
          paid: 0,
          pending: 0,
          canceled: 0,
          revenue: 0,
          pendingRevenue: 0
        },
        carrier: {
          total: 0,
          paid: 0,
          pending: 0,
          waitingDate: 0,
          canceled: 0,
          payment: 0,
          pendingPayment: 0
        }
      });
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sekme veya sayfa değiştiğinde verileri yeniden getir
  useEffect(() => {
    if (session) {
    fetchInvoices();
    }
  }, [activeSection, selectedTab, currentPage, session]);

  // Müşterileri getir
  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/admin/customers');
      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Müşteriler getirilirken hata:', error);
      toast.error('Müşteriler yüklenirken bir hata oluştu');
    }
  };

  // Müşteriye ait taşımaları getir
  const fetchCustomerShipments = async (customerId) => {
    if (!customerId) {
      setShipments([]);
      return;
    }
    
    try {
      const response = await axios.get(`/api/admin/shipments`, {
        params: { customerId }
      });
      
      if (response.data.success) {
        setShipments(response.data.shipments || []);
      } else {
        setShipments([]);
      }
    } catch (error) {
      console.error('Taşımalar getirilirken hata:', error);
      toast.error('Taşımalar yüklenirken bir hata oluştu');
      setShipments([]);
    }
  };

  // Yeni fatura modalı açıldığında müşterileri getir
  useEffect(() => {
    if (showNewInvoiceModal && session) {
      fetchCustomers();
    }
  }, [showNewInvoiceModal, session]);

  // Sevkiyat detaylarını getir
  const fetchShipmentDetails = async (shipmentId) => {
    if (!shipmentId) return;
    
    setLoadingShipment(true);
    
    try {
      const response = await axios.get(`/api/admin/shipments`, {
        params: { id: shipmentId }
      });
      
      if (response.data.success && response.data.data.shipments.length > 0) {
        setShipmentDetails(response.data.data.shipments[0]);
      } else {
        toast.error('Sevkiyat detayları bulunamadı');
      }
    } catch (error) {
      console.error('Sevkiyat detayları getirme hatası:', error);
      toast.error('Sevkiyat detayları yüklenirken bir hata oluştu');
    } finally {
      setLoadingShipment(false);
    }
  };
  
  // Sevkiyat detaylarını göster
  const handleViewShipment = async (invoice) => {
    if (invoice.shipment_id) {
      setShowShipmentDetailModal(invoice);
      await fetchShipmentDetails(invoice.shipment_id);
    } else {
      toast.error('Bu faturaya ait sevkiyat bilgisi bulunamadı');
    }
  };

  // Yükleme durumunda loading göster
  if (status === 'loading') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </AdminLayout>
    );
  }

  // Oturum yoksa boş sayfa göster
  if (!session) {
    return null;
  }

  // Müşteri fatura sekmeleri
  const customerTabs = [
    { id: 'all', name: 'Tüm Faturalar' },
    { id: 'paid', name: 'Ödendi' },
    { id: 'pending', name: 'Beklemede' },
    { id: 'canceled', name: 'İptal Edildi' },
  ];

  // Taşıyıcı fatura sekmeleri
  const carrierTabs = [
    { id: 'all', name: 'Tüm Faturalar' },
    { id: 'paid', name: 'Ödendi' },
    { id: 'pending', name: 'Beklemede' },
    { id: 'waitingDate', name: 'Tarih Bekliyor' },
    { id: 'canceled', name: 'İptal Edildi' },
  ];

  // Aktif olan sekmeleri belirleme
  const activeTabs = activeSection === 'customer' ? customerTabs : carrierTabs;

  // Fatura görüntüleme fonksiyonu
  const handleViewInvoice = (invoice) => {
    setShowInvoiceDetailModal(invoice);
  };

  // Sayfa değiştirme işlevi
  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Para birimini formatla
  const formatCurrency = (amount, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Tarih formatla
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (error) {
      return dateString;
    }
  };

  // Hata durumunda hata mesajı göster
  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-red-500 text-center">
            <p className="text-xl font-semibold">{error}</p>
            <button
              onClick={fetchInvoices}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  // Toggle değiştiğinde seçili sekmeyi sıfırla
  const handleToggleChange = (section) => {
    setActiveSection(section);
    setSelectedTab('all');
    setCurrentPage(1);
  };
  
  // Durum rengini belirle
  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch(status.toLowerCase()) {
      case 'ödendi':
      case 'tamamlandı':
        return 'bg-green-100 text-green-800';
      case 'beklemede':
      case 'bekleniyor':
        return 'bg-yellow-100 text-yellow-800';
      case 'tarih bekliyor':
      case 'tarih_bekliyor':
        return 'bg-blue-100 text-blue-800';
      case 'iptal':
      case 'iptal edildi':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Tablo içinde fatura listesi oluşturma
  const renderInvoiceRow = (invoice, index) => (
    <tr key={invoice._id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {invoice.invoice_number || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {invoice.customer_name || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(invoice.issue_date)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(invoice.due_date)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatCurrency(invoice.total_amount || invoice.amount || 0)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
          {invoice.status || 'Belirsiz'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          {/* Shipment görüntüleme butonu */}
          <button 
            onClick={() => handleViewShipment(invoice)} 
            className="text-orange-500 hover:text-orange-700 transition-colors"
            title="Sevkiyat Detayı"
          >
            <FaEye size={18} />
          </button>
          
          <button 
            onClick={() => handleViewInvoice(invoice)} 
            className="text-blue-500 hover:text-blue-700 transition-colors"
            title="Fatura Detayı"
          >
            <FaFileInvoice size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
  
  // PDF dosyası seçildiğinde
  const handlePdfFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedInvoicePdf(file);
    } else {
      toast.error('Lütfen geçerli bir PDF dosyası seçin');
      setSelectedInvoicePdf(null);
    }
  };

  // PDF dosyasını yükle
  const uploadInvoicePdf = async () => {
    if (!selectedInvoicePdf || !showInvoiceDetailModal?._id) {
      toast.error('Lütfen bir PDF dosyası seçin');
      return;
    }

    setUploadingPdf(true);
    
    try {
      const formData = new FormData();
      formData.append('pdf', selectedInvoicePdf);
      formData.append('invoiceId', showInvoiceDetailModal._id);
      formData.append('invoiceType', activeSection); // 'customer' veya 'carrier'
      
      const response = await axios.post('/api/admin/invoices/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        toast.success('Fatura PDF dosyası başarıyla yüklendi');
        setSelectedInvoicePdf(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Modal içinde pdf_url'i güncelle
        setShowInvoiceDetailModal(prev => ({
          ...prev,
          pdf_url: response.data.pdf_url
        }));
      } else {
        throw new Error(response.data.message || 'PDF yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('PDF yükleme hatası:', error);
      toast.error(error.response?.data?.message || error.message || 'PDF yüklenirken bir hata oluştu');
    } finally {
      setUploadingPdf(false);
    }
  };
  
  // Ödeme yöntemi ikonu
  const getMethodIcon = (method) => {
    if (!method) return null;
    
    switch(method.toLowerCase()) {
      case 'nakit':
        return <FaMoneyBillWave className="mr-2 text-green-500" />;
      case 'kredi kartı':
        return <FaCreditCard className="mr-2 text-blue-500" />;
      default:
        return null;
    }
  };
  
  return (
    <AdminLayout title="Faturalar">
      <Head>
        <title>Faturalar - Admin Panel</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        {/* Toggle Butonları */}
        <div className="flex space-x-4 mb-6">
            <button
            onClick={() => handleToggleChange('customer')}
            className={`px-6 py-2 rounded-lg ${
                activeSection === 'customer' 
                  ? 'bg-orange-500 text-white' 
                : 'bg-gray-200 text-gray-700'
              }`}
            >
            Müşteri Faturaları
            </button>
          <button
            onClick={() => handleToggleChange('carrier')}
            className={`px-6 py-2 rounded-lg ${
                activeSection === 'carrier' 
                  ? 'bg-orange-500 text-white' 
                : 'bg-gray-200 text-gray-700'
              }`}
            >
            Taşıyıcı Faturaları
          </button>
        </div>
        
        {/* Alt Sekmeler, Arama ve Yeni Fatura Ekle */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div className="flex flex-wrap space-x-2">
            {activeTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors mb-2 ${
                  selectedTab === tab.id 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.name}
              </button>
            ))}
              </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <input 
                type="text" 
                placeholder={activeSection === 'customer' ? "Fatura ID, müşteri veya sipariş ara..." : "Fatura ID, taşıyıcı veya sipariş ara..."} 
                className="pl-10 pr-4 py-2 w-full md:min-w-[320px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
          
        {/* İstatistik Kartları - Müşteri Faturaları */}
        {activeSection === 'customer' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 col-span-1">
              <div className="text-sm text-gray-500">Toplam Fatura</div>
              <div className="text-2xl font-bold mt-1">{stats.customer.total}</div>
              <div className="text-xs text-gray-500 mt-1">Son 30 gün</div>
          </div>
          
            <div className="bg-white rounded-lg shadow p-4 col-span-1">
              <div className="text-sm text-gray-500">Ödenen Tutar</div>
              <div className="text-2xl font-bold mt-1 text-green-600">
                {stats.customer.revenue.toLocaleString('tr-TR')} ₺
              </div>
              <div className="text-xs text-gray-500 mt-1">Tamamlanmış ödemeler</div>
          </div>
          
            <div className="bg-white rounded-lg shadow p-4 col-span-1">
              <div className="text-sm text-gray-500">Bekleyen Fatura</div>
              <div className="text-2xl font-bold mt-1 text-yellow-600">{stats.customer.pending}</div>
              <div className="text-xs text-gray-500 mt-1">
                Toplam: {stats.customer.pendingRevenue.toLocaleString('tr-TR')} ₺
            </div>
          </div>
          
            <div className="bg-white rounded-lg shadow p-4 col-span-1">
              <div className="text-sm text-gray-500">İptal Edilen</div>
              <div className="text-2xl font-bold mt-1 text-red-600">{stats.customer.canceled}</div>
              <div className="text-xs text-gray-500 mt-1">İptal edilen faturalar</div>
            </div>
          </div>
        )}

        {/* İstatistik Kartları - Taşıyıcı Faturaları */}
        {activeSection === 'carrier' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 col-span-1">
              <div className="text-sm text-gray-500">Toplam Fatura</div>
              <div className="text-2xl font-bold mt-1">{stats.carrier.total}</div>
              <div className="text-xs text-gray-500 mt-1">Son 30 gün</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 col-span-1">
              <div className="text-sm text-gray-500">Ödenen Tutar</div>
              <div className="text-2xl font-bold mt-1 text-green-600">
                {stats.carrier.payment.toLocaleString('tr-TR')} ₺
              </div>
              <div className="text-xs text-gray-500 mt-1">Tamamlanmış ödemeler</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 col-span-1">
              <div className="text-sm text-gray-500">Bekleyen Fatura</div>
              <div className="flex items-center mt-1">
                <div className="text-xl font-bold text-yellow-600 mr-2">{stats.carrier.pending}</div>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Beklemede</span>
              </div>
              <div className="flex items-center mt-1">
                <div className="text-xl font-bold text-blue-600 mr-2">{stats.carrier.waitingDate}</div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Tarih Bekliyor</span>
            </div>
              <div className="text-xs text-gray-500 mt-1">
                Toplam: {stats.carrier.pendingPayment.toLocaleString('tr-TR')} ₺
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 col-span-1">
              <div className="text-sm text-gray-500">İptal Edilen</div>
              <div className="text-2xl font-bold mt-1 text-red-600">{stats.carrier.canceled}</div>
              <div className="text-xs text-gray-500 mt-1">İptal edilen faturalar</div>
            </div>
        </div>
        )}

        {/* Fatura Listesi */}
        <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="p-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mb-2"></div>
              <p className="text-gray-500">Faturalar yükleniyor...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-lg text-gray-500 mb-2">Fatura bulunamadı</p>
              <p className="text-sm text-gray-400">Seçilen kriterlere uygun fatura kaydı bulunmuyor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fatura No
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeSection === 'customer' ? 'Müşteri' : 'Taşıyıcı'}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fatura Tarihi
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Son Ödeme Tarihi
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tutar
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice, index) => renderInvoiceRow(invoice, index))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Toplam Kayıt Bilgisi ve Sayfalama */}
          <div className="bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Toplam <span className="font-medium text-gray-900">{invoices.length}</span> fatura bulundu
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

      {/* Fatura Detay Modalı */}
      {showInvoiceDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowInvoiceDetailModal(null)}>
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">
                {activeSection === 'customer' ? 'Müşteri Faturası Detayı' : 'Taşıyıcı Faturası Detayı'}
              </h3>
              <button 
                onClick={() => setShowInvoiceDetailModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">Fatura ID</div>
                    <div className="font-medium">{showInvoiceDetailModal.id}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">
                      {activeSection === 'customer' ? 'Sipariş No' : 'Taşıma No'}
                    </div>
                    <div className="font-medium">
                      {activeSection === 'customer' ? showInvoiceDetailModal.orderId : showInvoiceDetailModal.shipmentId}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">
                      {activeSection === 'customer' ? 'Müşteri' : 'Taşıyıcı'}
                    </div>
                    <div className="font-medium">
                      {activeSection === 'customer' ? showInvoiceDetailModal.customerName : showInvoiceDetailModal.carrierName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {activeSection === 'customer' ? showInvoiceDetailModal.company : showInvoiceDetailModal.driverName}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">Fatura Durumu</div>
                    <div className="mt-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(showInvoiceDetailModal.status)}`}>
                        {showInvoiceDetailModal.status}
                      </span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">Tutar</div>
                    <div className="font-bold text-lg text-gray-800">{showInvoiceDetailModal.amount}</div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">Fatura Tarihi</div>
                    <div className="font-medium">
                      {showInvoiceDetailModal.status === 'Tarih Bekliyor' 
                        ? <span className="text-blue-500 flex items-center"><FaClock className="mr-1" /> Belirlenmedi</span>
                        : showInvoiceDetailModal.date
                      }
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">Ödeme Yöntemi</div>
                    <div className="font-medium flex items-center">
                      {getMethodIcon(showInvoiceDetailModal.method)}
                      {showInvoiceDetailModal.method}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fatura Detayları */}
              <div className="mt-6 border-t pt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Fatura Detayları</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ara Toplam</span>
                      <span className="font-medium">{showInvoiceDetailModal.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">KDV (%18)</span>
                      <span className="font-medium">{showInvoiceDetailModal.tax}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-gray-900 pt-2 border-t">
                      <span>Toplam</span>
                      <span>{showInvoiceDetailModal.amount}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Fatura PDF Yükleme Alanı */}
              <div className="mt-6 border-t pt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Fatura PDF Dosyası</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {showInvoiceDetailModal.pdf_url ? (
                    <div className="flex flex-col items-center">
                      <FaFilePdf className="text-orange-500 text-3xl mb-2" />
                      <p className="text-sm text-gray-700 mb-2">Bu fatura için yüklenmiş PDF dosyası mevcut</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(showInvoiceDetailModal.pdf_url, '_blank')}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600"
                        >
                          <span className="flex items-center">
                            <FaEye className="mr-1" />
                            Görüntüle
                          </span>
                        </button>
                        <button
                          onClick={() => window.open(`/api/admin/invoices/${showInvoiceDetailModal._id}/download`, '_blank')}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-500 border border-transparent rounded-md hover:bg-green-600"
                        >
                          <span className="flex items-center">
                            <FaFileInvoice className="mr-1" />
                            İndir
                          </span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-4">Farklı bir PDF yüklemek için:</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-2 text-center">Bu fatura için henüz PDF dosyası yüklenmemiş</p>
                  )}
                  
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 mt-2">
                    <FaFilePdf className="text-orange-500 text-3xl mb-2" />
                    <p className="text-sm text-gray-500 mb-2">
                      {selectedInvoicePdf 
                        ? `Seçilen dosya: ${selectedInvoicePdf.name}` 
                        : 'PDF dosyası eklemek için tıklayın veya sürükleyin'}
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="application/pdf"
                      onChange={handlePdfFileChange}
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        disabled={uploadingPdf}
                      >
                        Dosya Seç
                      </button>
                      {selectedInvoicePdf && (
                        <button
                          onClick={uploadInvoicePdf}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-orange-500 border border-transparent rounded-md hover:bg-orange-600 disabled:opacity-50"
                          disabled={uploadingPdf}
                        >
                          {uploadingPdf ? (
                            <span className="flex items-center">
                              <span className="animate-spin mr-1 h-3 w-3 border-t-2 border-r-2 border-white rounded-full"></span>
                              Yükleniyor...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <FaUpload className="mr-1" />
                              Yükle
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
              {/* Fatura İşlemleri */}
              <div className="p-4 flex justify-end space-x-3 border-t bg-gray-50">
                <button
                  onClick={() => setShowInvoiceDetailModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Kapat
                </button>
                {showInvoiceDetailModal.status === 'Ödendi' && (
                  <button
                    onClick={() => {
                      // Fatura indirme işlemi
                      window.open(`/api/admin/invoices/${showInvoiceDetailModal.id}/download`, '_blank');
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 border border-transparent rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <FaFileInvoice className="inline-block mr-2" />
                    Fatura İndir
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Sevkiyat Detay Modalı */}
      {showShipmentDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowShipmentDetailModal(null)}>
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full overflow-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-medium text-gray-900">Sevkiyat Detayları</h3>
              <button 
                onClick={() => setShowShipmentDetailModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>
            
            {loadingShipment ? (
              <div className="p-20 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mb-2"></div>
                <p className="text-gray-500">Sevkiyat detayları yükleniyor...</p>
              </div>
            ) : !shipmentDetails ? (
              <div className="p-10 text-center">
                <FaExclamationTriangle className="mx-auto text-yellow-500 text-3xl mb-3" />
                <p className="text-gray-700">Sevkiyat detayları bulunamadı</p>
              </div>
            ) : (
              <div className="p-6">
                {/* Sevkiyat numarası - tıklanabilir */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 flex items-center">
                    <FaTruck className="mr-2 text-orange-500" />
                    Sevkiyat Numarası
                  </h4>
                  <div className="mt-2">
                    <button 
                      onClick={() => window.open(`/admin/shipments?id=${shipmentDetails._id}`, '_blank')}
                      className="inline-flex items-center px-3 py-1.5 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors"
                    >
                      {shipmentDetails.shipment_number || shipmentDetails._id}
                      <FaInfo className="ml-2" size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Durum bilgisi */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700">Durum</h4>
                  <div className="mt-2">
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(shipmentDetails.status)}`}>
                      {shipmentDetails.status || 'Belirsiz'}
                    </span>
                  </div>
                </div>
                
                {/* Gönderici Bilgileri */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Gönderici Bilgileri</h4>
                  {shipmentDetails.sender_info ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Ad Soyad / Firma</p>
                        <p className="font-medium">{shipmentDetails.sender_info.name}</p>
                        {shipmentDetails.sender_info.company && (
                          <p className="text-sm">{shipmentDetails.sender_info.company}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">İletişim</p>
                        <p>{shipmentDetails.sender_info.phone}</p>
                        {shipmentDetails.sender_info.email && (
                          <p className="text-sm">{shipmentDetails.sender_info.email}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Adres</p>
                        <p>{shipmentDetails.sender_info.address}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Gönderici bilgisi bulunamadı</p>
                  )}
                </div>
                
                {/* Kargo Detayları */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Kargo Detayları</h4>
                  {shipmentDetails.cargo_details ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <FaBox className="text-orange-500 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Kargo Tipi</p>
                          <p className="font-medium">{shipmentDetails.cargo_details.type || 'Belirtilmemiş'}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <FaWeight className="text-orange-500 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Ağırlık</p>
                          <p className="font-medium">{shipmentDetails.cargo_details.weight || 'Belirtilmemiş'}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <FaRuler className="text-orange-500 mr-2" />
                        <div>
                          <p className="text-sm text-gray-500">Boyutlar</p>
                          <p className="font-medium">{shipmentDetails.cargo_details.dimensions || 'Belirtilmemiş'}</p>
                        </div>
                      </div>
                      {shipmentDetails.cargo_details.description && (
                        <div className="md:col-span-3">
                          <p className="text-sm text-gray-500">Açıklama</p>
                          <p>{shipmentDetails.cargo_details.description}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Kargo detayı bulunamadı</p>
                  )}
                </div>
                
                {/* Tarihler */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-gray-500">Alım Tarihi</p>
                    <p className="font-medium">
                      {shipmentDetails.pickup_date 
                        ? formatDate(shipmentDetails.pickup_date) 
                        : 'Belirtilmemiş'}
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-gray-500">Tahmini Teslimat</p>
                    <p className="font-medium">
                      {shipmentDetails.estimated_delivery 
                        ? formatDate(shipmentDetails.estimated_delivery) 
                        : 'Belirtilmemiş'}
                    </p>
                  </div>
                </div>
                
                {/* Modal alt kısmı - butonlar */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowShipmentDetailModal(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Kapat
                  </button>
                  <button
                    onClick={() => window.open(`/admin/shipments?id=${shipmentDetails._id}`, '_blank')}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 border border-transparent rounded-md hover:bg-orange-600"
                  >
                    <FaTruck className="inline-block mr-2" />
                    Sevkiyat Sayfasını Aç
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInvoicesPage; 