import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import PortalLayout from '../../components/portal/Layout';
import { 
  FaFileInvoiceDollar, FaSearch, FaFilter, FaSortAmountDown, FaSortAmountUp, 
  FaEye, FaDownload, FaCalendarAlt, FaMoneyBillWave, FaCheckCircle, 
  FaClock, FaExclamationTriangle, FaTimesCircle
} from 'react-icons/fa';

export default function Invoices() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [invoiceType] = useState('carrier');

  // Örnek faturalar verileri
  const [invoices, setInvoices] = useState([]);

  // Kullanıcı verilerini ve faturaları getir
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

        // API'den faturaları çek
        try {
          const response = await fetch(`/api/portal/invoices?type=${invoiceType}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.invoices)) {
              setInvoices(data.invoices);
              console.log('Faturalar yüklendi:', data.invoices);
            } else {
              console.log('Fatura verisi yok veya dizi değil:', data);
              setInvoices([]);
            }
          } else {
            console.error('Fatura API yanıt hatası:', response.status);
            throw new Error('Faturalar alınamadı');
          }
        } catch (error) {
          console.error('Fatura yükleme hatası:', error);
          setInvoices([]);
          setError('Faturalar yüklenirken bir hata oluştu. Henüz API entegrasyonu tamamlanmamış olabilir.');
        }

      } catch (error) {
        console.error('Faturalar veri yükleme hatası:', error);
        setError('Faturalar verileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, status, invoiceType]);

  // Faturaları filtreleme ve sıralama
  const getFilteredInvoices = () => {
    return invoices
      .filter(invoice => {
        // Durum filtresi
        if (statusFilter !== 'all' && invoice.status !== statusFilter) {
          return false;
        }
        
        // Arama filtresi
        if (searchTerm && searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          return (
            invoice.id.toLowerCase().includes(term) ||
            invoice.number.toLowerCase().includes(term) ||
            invoice.shipmentId.toLowerCase().includes(term) ||
            invoice.shipmentDetails.toLowerCase().includes(term)
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

  // Fatura durumuna göre renk ve ikon belirle
  const getStatusInfo = (status) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Ödendi',
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
      case 'overdue':
        return {
          label: 'Gecikmiş',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          icon: <FaExclamationTriangle className="mr-1 h-3 w-3" />
        };
      case 'cancelled':
        return {
          label: 'İptal Edildi',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: <FaTimesCircle className="mr-1 h-3 w-3" />
        };
      default:
        return {
          label: 'Bilinmiyor',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: <FaFileInvoiceDollar className="mr-1 h-3 w-3" />
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

  // Para biçimlendirme
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Aktif fatura detaylarını göster/gizle
  const toggleInvoiceDetails = (invoice) => {
    if (activeInvoice && activeInvoice.id === invoice.id) {
      setActiveInvoice(null);
    } else {
      setActiveInvoice(invoice);
    }
  };

  // Fatura indirme işlemi
  const handleDownloadInvoice = (invoiceId) => {
    console.log(`Fatura indiriliyor: ${invoiceId}`);
    // Gerçek implementasyonda burada API'ye bir istek gönderilebilir
    alert(`${invoiceId} faturasını indirme işlemi başlatıldı`);
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <PortalLayout title="Faturalar">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </PortalLayout>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <PortalLayout title="Faturalar">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      </PortalLayout>
    );
  }

  // Filtrelenmiş faturalar
  const filteredInvoices = getFilteredInvoices();

  return (
    <>
      <Head>
        <title>Faturalar - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı Faturalar" />
      </Head>
      <PortalLayout title="Faturalar">
        <div className="space-y-6 p-4">
          {/* Üst Bilgi Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaFileInvoiceDollar className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  Toplam
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Toplam Fatura</h3>
              <p className="text-2xl font-bold text-gray-800">{invoices.length}</p>
              <p className="mt-2 text-xs text-blue-600">
                <FaFileInvoiceDollar className="inline mr-1" />
                Taşıyıcı Faturaları
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-green-100 rounded-full">
                  <FaCheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                  Ödenen
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Ödenen Faturalar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {invoices.filter(i => i.status === 'paid').length}
              </p>
              <p className="mt-2 text-xs text-green-600">
                <FaMoneyBillWave className="inline mr-1" />
                <span>
                  {formatCurrency(
                    invoices
                      .filter(i => i.status === 'paid')
                      .reduce((sum, i) => sum + i.amount, 0),
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
              <h3 className="text-gray-500 text-sm">Bekleyen Faturalar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {invoices.filter(i => i.status === 'pending').length}
              </p>
              <p className="mt-2 text-xs text-yellow-600">
                <FaMoneyBillWave className="inline mr-1" />
                <span>
                  {formatCurrency(
                    invoices
                      .filter(i => i.status === 'pending')
                      .reduce((sum, i) => sum + i.amount, 0),
                    'TRY'
                  )}
                </span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-red-100 rounded-full">
                  <FaExclamationTriangle className="h-5 w-5 text-red-500" />
                </div>
                <span className="text-xs text-red-700 font-semibold bg-red-50 px-2 py-1 rounded-full">
                  Gecikmiş
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Gecikmiş Faturalar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {invoices.filter(i => i.status === 'overdue').length}
              </p>
              <p className="mt-2 text-xs text-red-600">
                <FaMoneyBillWave className="inline mr-1" />
                <span>
                  {formatCurrency(
                    invoices
                      .filter(i => i.status === 'overdue')
                      .reduce((sum, i) => sum + i.amount, 0),
                    'TRY'
                  )}
                </span>
              </p>
            </div>
          </div>

          {/* Filtreler ve Tip Seçici */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Mevcut arama ve filtreler */}
              <div className="flex flex-wrap md:flex-nowrap gap-2 w-full">
                <div className="relative flex-grow">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Fatura ara..."
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
                      <option value="all">Tüm Faturalar</option>
                      <option value="paid">Ödenen</option>
                      <option value="pending">Bekleyen</option>
                      <option value="overdue">Gecikmiş</option>
                      <option value="cancelled">İptal Edilenler</option>
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
          </div>

          {/* Faturalar Listesi */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fatura Listesi</h3>
            
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Filtrelere uygun fatura bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredInvoices.map((invoice) => {
                  const statusInfo = getStatusInfo(invoice.status);
                  const isActive = activeInvoice && activeInvoice.id === invoice.id;
                  return (
                    <div 
                      key={invoice.id} 
                      className={`border ${isActive ? 'border-orange-300' : 'border-gray-200'} rounded-lg p-4 hover:shadow-md transition-shadow ${isActive ? 'bg-orange-50' : ''}`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium text-gray-900">Fatura {invoice.number}</h4>
                            <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full flex items-center ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                              {statusInfo.icon}
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{invoice.shipmentDetails}</p>
                        </div>
                        <div className="mt-2 md:mt-0 flex">
                          <span className="text-lg font-bold text-orange-500">{formatCurrency(invoice.amount, invoice.currency)}</span>
                          <button 
                            onClick={() => toggleInvoiceDetails(invoice)}
                            className="ml-4 text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <FaEye className="mr-1" />
                            {isActive ? 'Gizle' : 'Detaylar'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-start my-2 text-sm">
                        <div className="flex items-start mb-2 md:mb-0">
                          <FaFileInvoiceDollar className="text-gray-400 mt-1 mr-1" />
                          <div>
                            <p className="text-xs text-gray-500">Taşıma Referansı</p>
                            <p className="text-gray-700">{invoice.shipmentId}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="mr-6">
                            <p className="text-xs text-gray-500 mb-1">Düzenleme Tarihi</p>
                            <p className="text-gray-700">{formatDate(invoice.issueDate).split(' ')[0]}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Son Ödeme Tarihi</p>
                            <p className="text-gray-700">{formatDate(invoice.dueDate).split(' ')[0]}</p>
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Fatura Bilgileri</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start mb-2">
                                  <FaFileInvoiceDollar className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Fatura Numarası</p>
                                    <p className="text-sm">{invoice.number}</p>
                                    <p className="text-xs text-gray-500">Referans: {invoice.id}</p>
                                  </div>
                                </div>
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Düzenleme Tarihi</p>
                                    <p className="text-sm">{formatDate(invoice.issueDate)}</p>
                                  </div>
                                </div>
                                <div className="flex items-start mb-2">
                                  <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Son Ödeme Tarihi</p>
                                    <p className="text-sm">{formatDate(invoice.dueDate)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Ödeme Bilgileri</h5>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-start mb-2">
                                  <FaMoneyBillWave className="text-orange-500 mt-1 mr-2" />
                                  <div>
                                    <p className="text-sm font-medium">Tutar</p>
                                    <p className="text-sm">{formatCurrency(invoice.amount, invoice.currency)}</p>
                                    <p className="text-xs text-gray-500">{invoice.notes}</p>
                                  </div>
                                </div>
                                {invoice.paymentMethod && (
                                  <div className="flex items-start mb-2">
                                    <FaMoneyBillWave className="text-orange-500 mt-1 mr-2" />
                                    <div>
                                      <p className="text-sm font-medium">Ödeme Yöntemi</p>
                                      <p className="text-sm">{invoice.paymentMethod}</p>
                                    </div>
                                  </div>
                                )}
                                {invoice.paymentDate && (
                                  <div className="flex items-start mb-2">
                                    <FaCalendarAlt className="text-orange-500 mt-1 mr-2" />
                                    <div>
                                      <p className="text-sm font-medium">Ödeme Tarihi</p>
                                      <p className="text-sm">{formatDate(invoice.paymentDate)}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {invoice.status !== 'cancelled' && (
                                <div className="mt-4">
                                  <button 
                                    onClick={() => handleDownloadInvoice(invoice.id)}
                                    className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center"
                                  >
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
          </div>
        </div>
      </PortalLayout>
    </>
  );
} 