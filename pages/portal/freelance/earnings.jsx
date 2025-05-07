import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaMoneyBillWave, FaCalendarAlt, FaChartLine, FaFileInvoiceDollar, FaDownload, FaSearch, FaFilter } from 'react-icons/fa';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';

export default function FreelanceEarnings() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace('/portal/login');
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState([]);
  const [filteredEarnings, setFilteredEarnings] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [completedEarnings, setCompletedEarnings] = useState(0);
  const [period, setPeriod] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Örnek veri
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) return;

    // Örnek kazanç verileri - gerçek uygulamada API'den alınacak
    const demoEarnings = [
      {
        id: 'TRN2024001',
        title: 'İstanbul - Ankara Taşıması',
        taskId: 'TSK2024001',
        amount: 4500,
        currency: '₺',
        status: 'completed',
        paymentMethod: 'Banka Transferi',
        paymentDate: '2024-05-10T14:30:00',
        invoiceNumber: 'FTR2024001',
        notes: 'KDV dahil ödeme',
        createdAt: '2024-05-05T10:30:00'
      },
      {
        id: 'TRN2024002',
        title: 'İstanbul - İzmir Taşıması',
        taskId: 'TSK2024002',
        amount: 4000,
        currency: '₺',
        status: 'completed',
        paymentMethod: 'Banka Transferi',
        paymentDate: '2024-05-07T11:15:00',
        invoiceNumber: 'FTR2024002',
        notes: 'KDV dahil ödeme',
        createdAt: '2024-05-02T09:45:00'
      },
      {
        id: 'TRN2024003',
        title: 'İstanbul - Bursa Taşıması',
        taskId: 'TSK2024003',
        amount: 1500,
        currency: '₺',
        status: 'pending',
        paymentMethod: 'Banka Transferi',
        paymentDate: null,
        invoiceNumber: 'FTR2024003',
        notes: 'Ödeme onay bekliyor',
        createdAt: '2024-05-18T15:20:00'
      },
      {
        id: 'TRN2024004',
        title: 'Ankara - Konya Taşıması',
        taskId: 'TSK2024004',
        amount: 2800,
        currency: '₺',
        status: 'pending',
        paymentMethod: 'Banka Transferi',
        paymentDate: null,
        invoiceNumber: 'FTR2024004',
        notes: 'Ödeme onay bekliyor',
        createdAt: '2024-05-17T16:50:00'
      }
    ];
    
    setEarnings(demoEarnings);
    setFilteredEarnings(demoEarnings);
    
    // Toplam kazançları hesapla
    const total = demoEarnings.reduce((sum, item) => sum + item.amount, 0);
    setTotalEarnings(total);
    
    // Bekleyen ödemeleri hesapla
    const pending = demoEarnings
      .filter(item => item.status === 'pending')
      .reduce((sum, item) => sum + item.amount, 0);
    setPendingEarnings(pending);
    
    // Tamamlanan ödemeleri hesapla
    const completed = demoEarnings
      .filter(item => item.status === 'completed')
      .reduce((sum, item) => sum + item.amount, 0);
    setCompletedEarnings(completed);
    
    setLoading(false);
  }, [status, router, session]);

  // Filtreleme
  useEffect(() => {
    if (!earnings.length) return;
    
    let result = [...earnings];
    
    // Dönem filtresi
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch(period) {
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          result = result.filter(item => {
            const date = new Date(item.createdAt);
            return date >= startDate && date <= endDate;
          });
          break;
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }
      
      if (startDate && period !== 'lastMonth') {
        result = result.filter(item => new Date(item.createdAt) >= startDate);
      }
    }
    
    // Arama filtresi
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(term) ||
        item.taskId.toLowerCase().includes(term) ||
        item.invoiceNumber.toLowerCase().includes(term)
      );
    }
    
    setFilteredEarnings(result);
  }, [earnings, period, searchTerm]);

  // Yükleme durumu
  if (status === 'loading' || loading) {
    return (
      <FreelanceLayout title="Kazançlarım">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </FreelanceLayout>
    );
  }

  const formatCurrency = (amount, currency) => {
    return `${amount.toLocaleString('tr-TR')} ${currency}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed':
        return 'Tamamlandı';
      case 'pending':
        return 'Bekliyor';
      default:
        return 'Bilinmiyor';
    }
  };

  return (
    <FreelanceLayout title="Kazançlarım">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        {/* Özet kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                  <FaMoneyBillWave className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Toplam Kazanç
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(totalEarnings, '₺')}
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <FaMoneyBillWave className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Tamamlanan Ödemeler
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(completedEarnings, '₺')}
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                  <FaMoneyBillWave className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Bekleyen Ödemeler
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(pendingEarnings, '₺')}
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Başlık ve Arama Filtreleri */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900">Ödeme Geçmişi</h2>
          </div>
          
          <div className="border-t border-b border-gray-200 px-4 py-4 sm:px-6 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between">
              <div className="w-full md:w-auto flex flex-wrap mb-4 md:mb-0">
                <button
                  onClick={() => setPeriod('all')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    period === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tümü
                </button>
                <button
                  onClick={() => setPeriod('thisMonth')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    period === 'thisMonth'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Bu Ay
                </button>
                <button
                  onClick={() => setPeriod('lastMonth')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    period === 'lastMonth'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Geçen Ay
                </button>
                <button
                  onClick={() => setPeriod('thisYear')}
                  className={`mr-2 mb-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                    period === 'thisYear'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Bu Yıl
                </button>
              </div>
              
              <div className="w-full md:w-auto relative">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kazanç Listesi */}
        {filteredEarnings.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-8 text-center">
            <FaMoneyBillWave className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Kazanç Kaydı Bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              Seçtiğiniz filtre kriterlerine uygun kazanç kaydı bulunmamaktadır.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlem ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlık / Taşıma Kodu
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tutar
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ödeme Tarihi
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fatura No
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEarnings.map((earning) => (
                    <tr key={earning.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {earning.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{earning.title}</div>
                        <div className="text-sm text-gray-500">{earning.taskId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(earning.amount, earning.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(earning.status)}`}>
                          {getStatusText(earning.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(earning.paymentDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {earning.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-orange-600 hover:text-orange-900 mr-4">
                          <FaFileInvoiceDollar className="inline-block h-4 w-4 mr-1" />
                          Fatura
                        </button>
                        <button className="text-orange-600 hover:text-orange-900">
                          <FaDownload className="inline-block h-4 w-4 mr-1" />
                          İndir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FreelanceLayout>
  );
} 