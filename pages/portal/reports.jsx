import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import PortalLayout from '../../components/portal/Layout';
import {
  FaChartBar, FaSearch, FaFilter, FaDownload, FaCalendarAlt,
  FaChartLine, FaChartPie, FaChartArea, FaTachometerAlt, FaTruck,
  FaWallet, FaRoute, FaMapMarkerAlt, FaClock
} from 'react-icons/fa';

export default function Reports() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Örnek raporlar verileri
  const [reports, setReports] = useState([
    {
      id: 'REP1001',
      name: 'Aylık Gelir Raporu',
      description: 'Mayıs 2024 dönemi için tüm gelir detayları',
      type: 'finance',
      createdAt: '2024-06-01T10:15:00',
      period: '2024-05-01 - 2024-05-31',
      fileType: 'pdf',
      fileSize: '1.2 MB'
    },
    {
      id: 'REP1002',
      name: 'Taşıma Performans Raporu',
      description: 'Mayıs 2024 taşıma performans ve tamamlanma oranları',
      type: 'performance',
      createdAt: '2024-06-01T11:30:00',
      period: '2024-05-01 - 2024-05-31',
      fileType: 'pdf',
      fileSize: '2.5 MB'
    },
    {
      id: 'REP1003',
      name: 'Yakıt Tüketim Analizi',
      description: 'Mayıs 2024 araç bazlı yakıt tüketimleri',
      type: 'vehicle',
      createdAt: '2024-06-01T14:45:00',
      period: '2024-05-01 - 2024-05-31',
      fileType: 'xlsx',
      fileSize: '980 KB'
    },
    {
      id: 'REP1004',
      name: 'Bölgesel Taşıma Dağılımı',
      description: 'Mayıs 2024 İstanbul içi bölgesel taşıma yoğunlukları',
      type: 'logistics',
      createdAt: '2024-06-02T09:20:00',
      period: '2024-05-01 - 2024-05-31',
      fileType: 'pdf',
      fileSize: '3.1 MB'
    },
    {
      id: 'REP1005',
      name: 'Sürücü Performans Raporu',
      description: 'Mayıs 2024 sürücü bazlı performans değerlendirmesi',
      type: 'driver',
      createdAt: '2024-06-02T11:10:00',
      period: '2024-05-01 - 2024-05-31',
      fileType: 'xlsx',
      fileSize: '1.5 MB'
    }
  ]);

  // Kullanıcı verilerini getir
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

        // Gerçek bir API entegrasyonu için buraya fetch eklenebilir
        // const response = await fetch('/api/portal/reports', {
        //   headers: {
        //     'Authorization': `Bearer ${session.accessToken}`
        //   }
        // });
        
        // if (response.ok) {
        //   const data = await response.json();
        //   setReports(data.reports);
        // }

      } catch (error) {
        console.error('Raporlar veri yükleme hatası:', error);
        setError('Raporlar verileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, status]);

  // Tarih aralığı belirleme
  useEffect(() => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate;

    switch (dateRange) {
      case 'week':
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        startDate = lastWeek.toISOString().split('T')[0];
        break;
      case 'month':
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        startDate = lastMonth.toISOString().split('T')[0];
        break;
      case 'quarter':
        const lastQuarter = new Date(today);
        lastQuarter.setMonth(today.getMonth() - 3);
        startDate = lastQuarter.toISOString().split('T')[0];
        break;
      case 'year':
        const lastYear = new Date(today);
        lastYear.setFullYear(today.getFullYear() - 1);
        startDate = lastYear.toISOString().split('T')[0];
        break;
      default:
        startDate = '';
    }

    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  }, [dateRange]);

  // Raporları filtreleme
  const getFilteredReports = () => {
    return reports.filter(report => {
      // Rapor tipi filtresi
      if (reportType !== 'all' && report.type !== reportType) {
        return false;
      }
      
      return true;
    });
  };

  // Rapor tipine göre ikon belirle
  const getReportTypeIcon = (type) => {
    switch (type) {
      case 'finance':
        return <FaWallet className="mr-2 h-5 w-5 text-green-500" />;
      case 'performance':
        return <FaChartLine className="mr-2 h-5 w-5 text-blue-500" />;
      case 'vehicle':
        return <FaTruck className="mr-2 h-5 w-5 text-orange-500" />;
      case 'logistics':
        return <FaRoute className="mr-2 h-5 w-5 text-purple-500" />;
      case 'driver':
        return <FaTachometerAlt className="mr-2 h-5 w-5 text-red-500" />;
      default:
        return <FaChartBar className="mr-2 h-5 w-5 text-gray-500" />;
    }
  };

  // Rapor tipine göre Türkçe ad belirle
  const getReportTypeName = (type) => {
    switch (type) {
      case 'finance':
        return 'Finansal Rapor';
      case 'performance':
        return 'Performans Raporu';
      case 'vehicle':
        return 'Araç Raporu';
      case 'logistics':
        return 'Lojistik Raporu';
      case 'driver':
        return 'Sürücü Raporu';
      default:
        return 'Diğer Rapor';
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

  // Rapor indirme işlemi
  const handleDownloadReport = (reportId) => {
    console.log(`Rapor indiriliyor: ${reportId}`);
    // Gerçek implementasyonda burada API'ye bir istek gönderilebilir
    alert(`${reportId} raporunu indirme işlemi başlatıldı`);
  };

  // Rapor oluşturma işlemi
  const handleGenerateReport = () => {
    console.log('Rapor oluşturuluyor...');
    console.log(`Rapor Tipi: ${reportType}`);
    console.log(`Tarih Aralığı: ${dateRange}`);
    console.log(`Özel Başlangıç: ${customStartDate}`);
    console.log(`Özel Bitiş: ${customEndDate}`);
    // Gerçek implementasyonda burada API'ye bir istek gönderilebilir
    alert('Rapor oluşturma işlemi başlatıldı. İşlem tamamlandığında bildirim alacaksınız.');
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <PortalLayout title="Raporlar">
        <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
      </PortalLayout>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <PortalLayout title="Raporlar">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      </PortalLayout>
    );
  }

  // Filtrelenmiş raporlar
  const filteredReports = getFilteredReports();

  return (
    <>
      <Head>
        <title>Raporlar - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı Raporlar" />
      </Head>
    <PortalLayout title="Raporlar">
      <div className="space-y-6 p-4">
        {/* Üst Bilgi Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="p-3 bg-blue-100 rounded-full">
                  <FaChartBar className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                Toplam
              </span>
            </div>
            <h3 className="text-gray-500 text-sm">Toplam Rapor</h3>
              <p className="text-2xl font-bold text-gray-800">{reports.length}</p>
              <p className="mt-2 text-xs text-blue-600">
              <FaChartLine className="inline mr-1" />
                <span>Tüm raporlar</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="p-3 bg-green-100 rounded-full">
                  <FaWallet className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-full">
                  Finansal
              </span>
            </div>
              <h3 className="text-gray-500 text-sm">Finansal Raporlar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {reports.filter(r => r.type === 'finance').length}
              </p>
            <p className="mt-2 text-xs text-green-600">
                <FaChartPie className="inline mr-1" />
                <span>Gelir ve gider analizleri</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
              <div className="p-3 bg-purple-100 rounded-full">
                  <FaRoute className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2 py-1 rounded-full">
                  Lojistik
              </span>
            </div>
              <h3 className="text-gray-500 text-sm">Lojistik Raporlar</h3>
              <p className="text-2xl font-bold text-gray-800">
                {reports.filter(r => r.type === 'logistics').length}
              </p>
              <p className="mt-2 text-xs text-purple-600">
                <FaMapMarkerAlt className="inline mr-1" />
                <span>Rota ve taşıma analizleri</span>
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-center mb-2">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FaChartLine className="h-5 w-5 text-blue-500" />
                </div>
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                  Performans
                </span>
              </div>
              <h3 className="text-gray-500 text-sm">Performans Raporları</h3>
              <p className="text-2xl font-bold text-gray-800">
                {reports.filter(r => r.type === 'performance').length}
              </p>
              <p className="mt-2 text-xs text-blue-600">
                <FaChartArea className="inline mr-1" />
                <span>Verimlilik analizleri</span>
              </p>
            </div>
          </div>

          {/* Rapor Oluştur */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Rapor Oluştur</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rapor Tipi
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">Tüm Raporlar</option>
                  <option value="finance">Finansal Rapor</option>
                  <option value="performance">Performans Raporu</option>
                  <option value="vehicle">Araç Raporu</option>
                  <option value="logistics">Lojistik Raporu</option>
                  <option value="driver">Sürücü Raporu</option>
                </select>
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarih Aralığı
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="week">Son 7 Gün</option>
                  <option value="month">Son 30 Gün</option>
                  <option value="quarter">Son 3 Ay</option>
                  <option value="year">Son 1 Yıl</option>
                  <option value="custom">Özel Aralık</option>
                </select>
              </div>
              {dateRange === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
            </div>
                  </>
                )}
              <div className={dateRange === 'custom' ? 'md:col-span-2 lg:col-span-4' : 'md:col-span-2'}>
                <button
                  onClick={handleGenerateReport}
                  className="mt-6 w-full md:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Rapor Oluştur
            </button>
            </div>
          </div>
        </div>

          {/* Raporlar Listesi */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Mevcut Raporlar</h3>
            
            {filteredReports.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Filtrelere uygun rapor bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredReports.map((report) => (
                  <div 
                    key={report.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start">
                      <div className="flex items-start">
                        {getReportTypeIcon(report.type)}
                        <div>
                          <h4 className="font-medium text-gray-900">{report.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                          <div className="flex items-center mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                              {getReportTypeName(report.type)}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 flex items-center">
                              <FaCalendarAlt className="mr-1 h-3 w-3" />
                              {report.period}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 flex items-center">
                              <FaClock className="mr-1 h-3 w-3" />
                              {formatDate(report.createdAt).split(' ')[0]}
                            </span>
                          </div>
                        </div>
                  </div>
                      <div className="mt-4 md:mt-0 flex items-center">
                        <span className="text-sm text-gray-500 mr-3">{report.fileType.toUpperCase()} - {report.fileSize}</span>
                        <button 
                          onClick={() => handleDownloadReport(report.id)}
                          className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center"
                        >
                          <FaDownload className="mr-1" />
                          İndir
                        </button>
              </div>
                    </div>
                    </div>
                  ))}
              </div>
            )}
        </div>
      </div>
    </PortalLayout>
    </>
  );
} 