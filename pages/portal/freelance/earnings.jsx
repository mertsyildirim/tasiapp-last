import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaMoneyBillWave, FaCalendarAlt, FaChartLine, FaFileInvoiceDollar, FaDownload, FaSearch, FaFilter, FaUser } from 'react-icons/fa';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';
import axios from 'axios';

export default function FreelanceEarnings() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: false,
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
    
    // Oturum yoksa login sayfasına yönlendir
    if (status !== 'authenticated') {
      console.log("Oturum doğrulanamadı, login sayfasına yönlendiriliyor");
      router.push('/portal/login');
      return;
    }

    // Kazanç verilerini API'den al
    const fetchEarnings = async () => {
      setLoading(true);
      try {
        console.log("API isteği gönderiliyor...");
        // Aktif dönem parametresini URL'e ekle
        const response = await axios.get('/api/portal/freelance-earnings', {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'x-user-id': session?.user?.id
          },
          params: {
            userId: session?.user?.id,
            period: period !== 'all' ? period : undefined
          }
        });
        
        console.log('API yanıtı:', response.data);
        
        if (response.data.success) {
          console.log('Kazançlar başarıyla alındı:', response.data);
          
          // API'den gelen verileri ata
          setEarnings(response.data.earnings || []);
          setFilteredEarnings(response.data.earnings || []);
          
          // Özet verilerini güncelle
          const summary = response.data.summary || {};
          setTotalEarnings(summary.totalEarnings || 0);
          setPendingEarnings(summary.pendingEarnings || 0);
          setCompletedEarnings(summary.completedEarnings || 0);
        } else {
          console.error('Kazanç verisi alınamadı:', response.data.message);
          // Hata durumunda boş veri göster
          initializeEmptyData();
        }
      } catch (error) {
        console.error('Kazanç verisi alınırken hata:', error);
        console.error('Hata detayları:', error.response?.data);
        
        // Hata durumunda boş veri göster
        initializeEmptyData();
      } finally {
        setLoading(false);
      }
    };
    
    // Boş kazanç verisi oluşturma fonksiyonu
    const initializeEmptyData = () => {
      setEarnings([]);
      setFilteredEarnings([]);
      setTotalEarnings(0);
      setPendingEarnings(0);
      setCompletedEarnings(0);
    };

    fetchEarnings();
  }, [status, router, session, period]);

  // Filtreleme
  useEffect(() => {
    if (!earnings.length) return;
    
    let result = [...earnings];
    
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
  }, [earnings, searchTerm]);

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
  
  // Oturum açılmamış
  if (status === 'unauthenticated') {
    return (
      <FreelanceLayout title="Kazançlarım">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="bg-white shadow-md rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <FaMoneyBillWave className="mx-auto h-12 w-12 text-orange-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Oturum Açmanız Gerekiyor</h3>
              <p className="mt-1 text-sm text-gray-500">
                Kazanç bilgilerinizi görüntülemek için lütfen giriş yapın.
              </p>
            </div>
            <div className="mt-5">
              <button
                onClick={() => router.push('/portal/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Giriş Yap
              </button>
            </div>
          </div>
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
                    Toplam Teslim Kazancı
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
                    Ödenmiş Teslimatlar
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
                    Bekleyen Teslim Ödemeleri
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
            <h2 className="text-xl font-semibold text-gray-900">Teslim Edilen Taşımalardan Kazançlar</h2>
            <span className="text-sm text-gray-500 mt-1">
              Sadece teslim edilmiş taşımalar gelir olarak gösterilmektedir
            </span>
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