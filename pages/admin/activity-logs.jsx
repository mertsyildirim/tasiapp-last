import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import AdminLayout from '/components/admin/Layout';
import { FaSearch, FaFilter, FaDownload } from 'react-icons/fa';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ActivityLogs() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    userEmail: '',
    ip: '',
    city: '',
    district: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    loadLogs();
  }, [pagination.page, pagination.limit, filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      // 1. Adım: Temel log verilerini al
      const response = await fetch(`/api/admin/activity-logs?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Loglar yüklenirken bir hata oluştu');
      }

      console.log('API\'den gelen log verileri:', data.logs);
      
      // 2. Adım: Her log kaydı için IP bilgisini kullanarak konum bilgisi al
      const logsWithLocation = await Promise.all(
        data.logs.map(async (log) => {
          // Eğer IP adresi varsa ve daha önce konum bilgisi alınmadıysa
          if (log.ip) {
            try {
              console.log(`IP bilgisi alınıyor: ${log.ip}`);
              
              // IP adresinden konum bilgisi al
              const ipInfoResponse = await fetch(`/api/utils/ip-info?ip=${encodeURIComponent(log.ip)}`);
              
              // API yanıtını kontrol et
              if (!ipInfoResponse.ok) {
                console.error('IP bilgisi alınamadı, HTTP hata kodu:', ipInfoResponse.status);
                return log;
              }
              
              const ipInfo = await ipInfoResponse.json();
              console.log('IP bilgisinden alınan konum:', ipInfo);
              
              // API yanıtı başarılı değilse, mevcut log verisini değiştirmeden döndür
              if (!ipInfo.success) {
                console.error('IP bilgisi başarısız:', ipInfo.message || 'Bilinmeyen hata');
                return log;
              }
              
              // Konum bilgisini ekle
              return {
                ...log,
                location: {
                  city: ipInfo.city || '-',
                  district: ipInfo.district || ipInfo.region || '-',
                  country: ipInfo.country || '-'
                }
              };
            } catch (error) {
              console.error('IP bilgisinden konum alınamadı:', error.message);
              // Hata durumunda orijinal log verisini değiştirmeden döndür
              return log;
            }
          }
          
          // IP adresi yoksa orijinal log verisini döndür
          return log;
        })
      );

      console.log('Konum bilgisi eklenmiş loglar:', logsWithLocation);
      
      // 3. Adım: İşlenmiş log verilerini state'e kaydet
      setLogs(logsWithLocation);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (err) {
      console.error('Log yükleme hatası:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (status === 'loading') {
    return <div>Yükleniyor...</div>;
  }

  if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
    return <div>Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return (
    <AdminLayout title="Aktivite Logları">
      <div className="p-6">
        {/* Filtreler */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <form onSubmit={(e) => { e.preventDefault(); loadLogs(); }} className="flex gap-2">
              <input
                type="text"
                placeholder="Log ara..."
                value={filters.userEmail}
                onChange={(e) => setFilters(prev => ({ ...prev, userEmail: e.target.value }))}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <FaSearch className="inline-block mr-2" />
                Ara
              </button>
            </form>
          </div>
        </div>

        {/* Filtreler - Accordion Panel */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold flex items-center">
              <FaFilter className="mr-2" />
              Filtreler
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">İşlem</label>
                <select
                  name="action"
                  value={filters.action}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                >
                  <option value="">Tümü</option>
                  <option value="create">Oluşturma</option>
                  <option value="update">Güncelleme</option>
                  <option value="delete">Silme</option>
                  <option value="login">Giriş</option>
                  <option value="logout">Çıkış</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kullanıcı E-posta</label>
                <input
                  type="text"
                  name="userEmail"
                  value={filters.userEmail}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Adresi</label>
                <input
                  type="text"
                  name="ip"
                  value={filters.ip}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">İl</label>
                <select
                  name="city"
                  value={filters.city}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                >
                  <option value="">Tüm İller</option>
                  <option value="istanbul">İstanbul</option>
                  <option value="ankara">Ankara</option>
                  <option value="izmir">İzmir</option>
                  <option value="bursa">Bursa</option>
                  <option value="antalya">Antalya</option>
                  <option value="adana">Adana</option>
                  <option value="konya">Konya</option>
                  <option value="gaziantep">Gaziantep</option>
                  <option value="mersin">Mersin</option>
                  <option value="kayseri">Kayseri</option>
                  {/* Diğer iller eklenebilir */}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">İlçe</label>
                <select
                  name="district"
                  value={filters.district}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                >
                  <option value="">Tüm İlçeler</option>
                  {filters.city === 'istanbul' && (
                    <>
                      <option value="kadikoy">Kadıköy</option>
                      <option value="besiktas">Beşiktaş</option>
                      <option value="uskudar">Üsküdar</option>
                      <option value="beyoglu">Beyoğlu</option>
                      <option value="sisli">Şişli</option>
                      <option value="fatih">Fatih</option>
                      <option value="maltepe">Maltepe</option>
                      <option value="bakirkoy">Bakırköy</option>
                      {/* Diğer ilçeler eklenebilir */}
                    </>
                  )}
                  {filters.city === 'ankara' && (
                    <>
                      <option value="cankaya">Çankaya</option>
                      <option value="kecioren">Keçiören</option>
                      <option value="yenimahalle">Yenimahalle</option>
                      <option value="etimesgut">Etimesgut</option>
                      <option value="mamak">Mamak</option>
                      <option value="sincan">Sincan</option>
                      {/* Diğer ilçeler eklenebilir */}
                    </>
                  )}
                  {/* Diğer illerin ilçeleri eklenebilir */}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={loadLogs}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Filtreleri Uygula
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Log Tablosu */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İl</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İlçe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Erişilen Sayfa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detay</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.timestamp ? format(new Date(log.timestamp), 'dd MMMM yyyy HH:mm', { locale: tr }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.userInfo?.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.action === 'create' ? 'bg-green-100 text-green-800' :
                          log.action === 'update' ? 'bg-orange-100 text-orange-800' :
                          log.action === 'delete' ? 'bg-red-100 text-red-800' :
                          log.action === 'login' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.location?.city || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.location?.district || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(() => {
                          // Önce önceden işlenmiş pageUrl alanını kontrol et
                          if (log.pageUrl) {
                            let pageUrl = log.pageUrl;
                            
                            // URL'yi daha okunaklı hale getir
                            // URL'den hostname kısmını temizle
                            pageUrl = pageUrl.replace(/https?:\/\/[^\/]+/, '');
                            
                            // Çok uzunsa kısalt
                            if (pageUrl.length > 30) {
                              pageUrl = pageUrl.substring(0, 30) + '...';
                            }
                            
                            return pageUrl;
                          }
                          
                          // API'den pageUrl gelmiyorsa diğer alanlara bakalım
                          let pageUrl = null;
                          
                          try {
                            // Olası URL alanlarını kontrol et
                            if (log.url) {
                              pageUrl = log.url;
                            } else if (log.route) {
                              pageUrl = log.route;
                            } else if (log.page) {
                              pageUrl = log.page;
                            } else if (log.path) {
                              pageUrl = log.path;
                            }
                            // details objesi içinde kontrol et
                            else if (log.details) {
                              if (typeof log.details === 'object') {
                                pageUrl = log.details.url || log.details.route || log.details.page || log.details.path;
                              } 
                              // details bir string ise ve / içeriyorsa, bir URL olabilir
                              else if (typeof log.details === 'string' && log.details.includes('/')) {
                                pageUrl = log.details;
                              }
                            }
                            
                            // pageUrl değeri hala null ise actionData'ya bakabiliriz
                            if (!pageUrl && log.actionData) {
                              if (typeof log.actionData === 'object') {
                                pageUrl = log.actionData.url || log.actionData.route || log.actionData.page;
                              }
                            }
                            
                            // useragent bilgisi varsa agent tipini göster (mobil/desktop/tablet)
                            if (!pageUrl && log.userAgent) {
                              const ua = log.userAgent.toLowerCase();
                              if (ua.includes('mobile')) {
                                return 'Mobil Cihaz Erişimi';
                              } else if (ua.includes('tablet')) {
                                return 'Tablet Erişimi';
                              } else if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari')) {
                                return 'Masaüstü Tarayıcı Erişimi';
                              }
                            }
                            
                            // URL'yi daha okunaklı hale getir
                            if (pageUrl) {
                              // URL'den hostname kısmını temizle
                              pageUrl = pageUrl.replace(/https?:\/\/[^\/]+/, '');
                              
                              // Çok uzunsa kısalt
                              if (pageUrl.length > 30) {
                                pageUrl = pageUrl.substring(0, 30) + '...';
                              }
                            }
                          } catch (error) {
                            console.error('Sayfa URL bilgisi alınırken hata:', error);
                          }
                          
                          return pageUrl || '-';
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : (log.details || '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ip || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sayfalama */}
            {Math.ceil(pagination.total / pagination.limit) > 1 && (
              <div className="mt-6 flex justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.page === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Önceki
                  </button>
                  
                  {(() => {
                    const totalPages = Math.ceil(pagination.total / pagination.limit);
                    const currentPage = pagination.page;
                    let pageButtons = [];
                    
                    // İlk sayfa her zaman gösterilecek
                    if (currentPage > 3) {
                      pageButtons.push(
                        <button
                          key={1}
                          onClick={() => handlePageChange(1)}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                          1
                        </button>
                      );
                      
                      // Eğer mevcut sayfa 4'ten büyükse, ilk sayfa ile arada "..." göster
                      if (currentPage > 4) {
                        pageButtons.push(
                          <span key="dots1" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        );
                      }
                    }
                    
                    // Mevcut sayfanın etrafındaki sayfa numaralarını göster
                    const startPage = Math.max(1, currentPage - 1);
                    const endPage = Math.min(totalPages, currentPage + 1);
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pageButtons.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === i
                              ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    // Son sayfaya yakın değilse ve son sayfadan uzaksa "..." göster
                    if (currentPage < totalPages - 2) {
                      if (currentPage < totalPages - 3) {
                        pageButtons.push(
                          <span key="dots2" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        );
                      }
                      
                      // Son sayfa her zaman gösterilecek
                      pageButtons.push(
                        <button
                          key={totalPages}
                          onClick={() => handlePageChange(totalPages)}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      );
                    }
                    
                    return pageButtons;
                  })()}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === Math.ceil(pagination.total / pagination.limit)}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.page === Math.ceil(pagination.total / pagination.limit)
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Sonraki
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
} 