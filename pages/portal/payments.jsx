import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import PortalLayout from '../../components/portal/Layout';
import { 
  FaMoneyBillWave, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp, 
  FaEye, FaCreditCard, FaFileInvoice, FaCalendarAlt, FaCheckCircle, 
  FaClock, FaExclamationTriangle, FaDownload, FaTimesCircle
} from 'react-icons/fa';

export default function Payments() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activePayment, setActivePayment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [statsInfo, setStatsInfo] = useState({
    completed: 0,
    pending: 0,
    processing: 0,
    rejected: 0
  });

  // Kullanıcı verilerini ve ödemeleri getir
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

        // API'den ödemeleri getir
        try {
          const params = { 
            status: statusFilter !== 'all' ? statusFilter : undefined,
            search: searchTerm && searchTerm.trim() !== '' ? searchTerm : undefined,
            page: paginationInfo.page,
            limit: paginationInfo.limit
          };

          console.log('Payments API çağrılıyor...', params);
          const response = await axios.get('/api/portal/payments', {
            params,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log('API yanıtı:', response.data);
          if (response.data.success) {
            setPayments(response.data.data.payments || []);
            setPaginationInfo(response.data.data.pagination || {
              total: 0,
              page: 1,
              limit: 10,
              totalPages: 0
            });
            
            // Duruma göre istatistikleri hesapla
            const payments = response.data.data.payments || [];
            const stats = {
              completed: payments.filter(p => p.status === 'completed').length,
              pending: payments.filter(p => p.status === 'pending').length,
              processing: payments.filter(p => p.status === 'processing').length,
              rejected: payments.filter(p => p.status === 'rejected').length
            };
            setStatsInfo(stats);
          } else {
            throw new Error(response.data.message || 'Ödeme verileri alınamadı');
          }
        } catch (apiError) {
          console.error('API hatası:', apiError);
          if (apiError.response) {
            console.error('API yanıt detayları:', apiError.response.data);
          }
          setError('Ödeme verileri alınamadı. Lütfen daha sonra tekrar deneyin.');
        }

      } catch (error) {
        console.error('Ödemeler veri yükleme hatası:', error);
        setError('Ödemeler verileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, status, statusFilter, searchTerm, paginationInfo.page, paginationInfo.limit]);

  // Sayfa değiştirme işlevi
  const changePage = (page) => {
    setPaginationInfo(prev => ({
      ...prev,
      page
    }));
  };

  // Ödemeleri filtreleme ve sıralama
  const getFilteredPayments = () => {
    // API zaten filtreleme yapıyor, sadece sıralama yapalım
    return [...payments].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      
      if (sortOrder === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  };

  // Ödeme durumuna göre renk ve ikon belirle
  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Tamamlandı',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          icon: <FaCheckCircle className="mr-1 h-3 w-3" />
        };
      case 'pending':
        return {
          label: 'Bekliyor',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          icon: <FaClock className="mr-1 h-3 w-3" />
        };
      case 'processing':
        return {
          label: 'İşleniyor',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          icon: <FaClock className="mr-1 h-3 w-3" />
        };
      case 'rejected':
        return {
          label: 'Reddedildi',
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
          icon: <FaMoneyBillWave className="mr-1 h-3 w-3" />
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Aktif ödeme detaylarını göster/gizle
  const togglePaymentDetails = (payment) => {
    if (activePayment && activePayment.id === payment.id) {
      setActivePayment(null);
    } else {
      setActivePayment(payment);
    }
  };

  // Para biçimlendirme
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <PortalLayout title="Ödemeler">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </PortalLayout>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <PortalLayout title="Ödemeler">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      </PortalLayout>
    );
  }

  // Filtrelenmiş ödemeler
  const filteredPayments = getFilteredPayments();

  return (
    <>
      <Head>
        <title>Ödemeler - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı Ödemeler" />
      </Head>
      <PortalLayout title="Ödemeler">
        <div className="space-y-6 p-4">
          {/* Üst Bilgi Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaMoneyBillWave className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  Toplam
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Toplam Ödeme</h3>
              <p className="text-2xl font-bold text-gray-800">
                {payments.length}
              </p>
              <p className="mt-2 text-xs text-blue-600">
                <FaCheckCircle className="inline mr-1" />
                <span>Tüm ödemeler</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-green-100 rounded-full">
                  <FaCheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                  Tamamlanan
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Tamamlanan Ödemeler</h3>
              <p className="text-2xl font-bold text-gray-800">
                {statsInfo.completed}
              </p>
              <p className="mt-2 text-xs text-green-600">
                <FaCheckCircle className="inline mr-1" />
                <span>
                  {formatCurrency(
                    payments
                      .filter(p => p.status === 'completed')
                      .reduce((sum, p) => sum + p.amount, 0),
                    'TRY'
                  )}
                </span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <FaClock className="h-5 w-5 text-yellow-500" />
                </div>
                <span className="text-xs text-yellow-700 font-semibold bg-yellow-50 px-2 py-1 rounded-full">
                  Bekleyen
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Bekleyen Ödemeler</h3>
              <p className="text-2xl font-bold text-gray-800">
                {statsInfo.pending + statsInfo.processing}
              </p>
              <p className="mt-2 text-xs text-yellow-600">
                <FaClock className="inline mr-1" />
                <span>
                  {formatCurrency(
                    payments
                      .filter(p => p.status === 'pending' || p.status === 'processing')
                      .reduce((sum, p) => sum + p.amount, 0),
                    'TRY'
                  )}
                </span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-red-100 rounded-full">
                  <FaTimesCircle className="h-5 w-5 text-red-500" />
                </div>
                <span className="text-xs text-red-700 font-semibold bg-red-50 px-2 py-1 rounded-full">
                  Reddedilen
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Reddedilen Ödemeler</h3>
              <p className="text-2xl font-bold text-gray-800">
                {statsInfo.rejected}
              </p>
              <p className="mt-2 text-xs text-red-600">
                <FaExclamationTriangle className="inline mr-1" />
                <span>
                  {formatCurrency(
                    payments
                      .filter(p => p.status === 'rejected')
                      .reduce((sum, p) => sum + p.amount, 0),
                    'TRY'
                  )}
                </span>
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
                    placeholder="Ödeme ara..."
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
                    <option value="all">Tüm Ödemeler</option>
                    <option value="completed">Tamamlanan</option>
                    <option value="pending">Bekleyen</option>
                    <option value="processing">İşleniyor</option>
                    <option value="rejected">Reddedilen</option>
                  </select>
                  <FaFilter className="absolute left-3 top-3 text-gray-400" />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
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
              </div>
            </div>
          </div>

          {/* Ödemeler Listesi */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ödeme İşlemleri</h3>
            
            {filteredPayments.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Filtrelere uygun ödeme bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredPayments.map((payment) => {
                  const statusInfo = getStatusInfo(payment.status);
                  const isActive = activePayment && activePayment.id === payment.id;
                  return (
                    <div 
                      key={payment.id} 
                      className={`border ${isActive ? 'border-orange-300' : 'border-gray-200'} rounded-lg p-4 hover:shadow-md transition-shadow ${isActive ? 'bg-orange-50' : ''}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium text-gray-900">{payment.id}</h4>
                            <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full flex items-center ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{payment.shipmentDetails}</p>
                        </div>
                        <div className="mt-2 md:mt-0 flex">
                          <span className="text-lg font-bold text-orange-500">{formatCurrency(payment.amount, payment.currency)}</span>
                          <button 
                            onClick={() => togglePaymentDetails(payment)}
                            className="ml-4 text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <FaEye className="mr-1" />
                            {isActive ? 'Gizle' : 'Detaylar'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-start my-2 text-sm">
                        <div className="flex items-start mb-2 md:mb-0">
                          <FaFileInvoice className="text-gray-400 mt-1 mr-1" />
                          <div>
                            <p className="text-xs text-gray-500">Taşıma Referansı</p>
                            <p className="text-gray-700">{payment.shipmentId}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="mr-6">
                            <p className="text-xs text-gray-500 mb-1">Ödeme Yöntemi</p>
                            <p className="text-gray-700">{payment.method}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Oluşturulma</p>
                            <p className="text-gray-700">{formatDate(payment.createdAt).split(" ")[0]}</p>
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Ödeme Bilgileri</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Son Ödeme Tarihi</p>
                                    <p className="text-sm">{formatDate(payment.dueDate)}</p>
                                  </div>
                                </div>
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Ödeme Tarihi</p>
                                    <p className="text-sm">{formatDate(payment.paymentDate)}</p>
                                  </div>
                                </div>
                                {payment.bankDetails && (
                                  <div className="flex items-start mb-2">
                                    <FaCreditCard className="text-orange-500 mt-1 mr-2" />
                                    <div>
                                      <p className="text-sm font-medium">Banka Bilgileri</p>
                                      <p className="text-sm">{payment.bankDetails}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Ek Bilgiler</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start mb-2">
                                  <FaFileInvoice className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Notlar</p>
                                    <p className="text-sm">{payment.notes || "Not eklenmemiş"}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {payment.status === 'completed' && (
                                <div className="mt-4">
                                  <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center">
                                    <FaDownload className="mr-2" />
                                    Fatura İndir
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Sayfalama */}
            {paginationInfo.totalPages > 1 && (
              <div className="flex justify-center items-center mt-6">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => changePage(paginationInfo.page - 1)}
                    disabled={paginationInfo.page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      paginationInfo.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Önceki</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {[...Array(paginationInfo.totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    const isCurrentPage = pageNumber === paginationInfo.page;
                    
                    // Sadece mevcut sayfa, önceki sayfa, sonraki sayfa ve ilk/son sayfaları göster
                    if (
                      pageNumber === 1 || 
                      pageNumber === paginationInfo.totalPages ||
                      Math.abs(pageNumber - paginationInfo.page) <= 1
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => changePage(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            isCurrentPage
                              ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } 
                    
                    // Üç nokta göster (ellipsis)
                    if (
                      (pageNumber === 2 && paginationInfo.page > 3) ||
                      (pageNumber === paginationInfo.totalPages - 1 && paginationInfo.page < paginationInfo.totalPages - 2)
                    ) {
                      return (
                        <span
                          key={pageNumber}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                        >
                          ...
                        </span>
                      );
                    }
                    
                    return null;
                  })}
                  
                  <button
                    onClick={() => changePage(paginationInfo.page + 1)}
                    disabled={paginationInfo.page === paginationInfo.totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      paginationInfo.page === paginationInfo.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Sonraki</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </PortalLayout>
    </>
  );
}