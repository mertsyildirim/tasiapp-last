import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/Layout'
import { useSession } from 'next-auth/react'
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaClipboardList, FaPercent, FaCalendarAlt, FaToggleOn, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { useRouter } from 'next/router'

const CampaignsPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    userType: 'Müşteri',
    discountType: 'percentage',
    discountValue: 0,
    minOrderAmount: 0,
    startDate: '',
    endDate: '',
    isActive: true,
    usageLimit: 0,
    userUsageLimit: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCampaigns, setTotalCampaigns] = useState(0)

  // Oturum kontrolü
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.replace('/admin');
      return;
    }
    
    // NOT: Rol kontrolü kaldırıldı - sadece session kontrolü yapıyoruz
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      loadCampaigns()
    }
  }, [session])

  const loadCampaigns = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/campaigns', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setCampaigns(data.campaigns || []) // data.campaigns şeklinde alacak şekilde düzenlendi
      setTotalPages(data.totalPages || 1)
      setTotalCampaigns(data.totalCampaigns || 0)
      
      console.log('Kampanyalar yüklendi:', {
        campaigns: data.campaigns?.length || 0,
        totalCampaigns: data.totalCampaigns || 0,
        totalPages: data.totalPages || 1
      })
    } catch (error) {
      console.error('Kampanyalar yüklenirken hata:', error)
      alert('Kampanyalar yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClick = () => {
    setFormData({
      name: '',
      description: '',
      userType: 'Müşteri',
      discountType: 'percentage',
      discountValue: 0,
      minOrderAmount: 0,
      startDate: '',
      endDate: '',
      isActive: true,
      usageLimit: 0,
      userUsageLimit: 0
    })
    setShowAddModal(true)
  }

  const handleEditClick = (campaign) => {
    setSelectedCampaign(campaign)
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      userType: campaign.userType,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue,
      minOrderAmount: campaign.minOrderAmount,
      startDate: campaign.startDate.split('T')[0],
      endDate: campaign.endDate.split('T')[0],
      isActive: campaign.isActive,
      usageLimit: campaign.usageLimit || 0,
      userUsageLimit: campaign.userUsageLimit || 0
    })
    setShowEditModal(true)
  }

  const handleDeleteClick = async (campaignId) => {
    if (window.confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        loadCampaigns()
      } catch (error) {
        console.error('Kampanya silinirken hata:', error)
        alert('Kampanya silinirken bir hata oluştu.')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = showEditModal 
        ? `/api/admin/campaigns/${selectedCampaign._id}`
        : '/api/admin/campaigns'
      
      const method = showEditModal ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setShowAddModal(false)
      setShowEditModal(false)
      loadCampaigns()
    } catch (error) {
      console.error('Kampanya kaydedilirken hata:', error)
      alert('Kampanya kaydedilirken bir hata oluştu.')
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  const formatDiscount = (campaign) => {
    if (campaign.discountType === 'percentage') {
      return `%${campaign.discountValue}`
    }
    return `${campaign.discountValue} TL`
  }

  // Filtreleme işlevi
  const filteredCampaigns = campaigns.filter(campaign => {
    // Arama terimine göre filtreleme
    const searchFilter = searchTerm.toLowerCase() === '' || 
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.userType.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Sekmeye göre filtreleme
    let tabFilter = true;
    if (selectedTab === 'active') {
      tabFilter = campaign.isActive === true;
    } else if (selectedTab === 'inactive') {
      tabFilter = campaign.isActive === false;
    } else if (selectedTab === 'upcoming') {
      tabFilter = new Date(campaign.startDate) > new Date();
    } else if (selectedTab === 'expired') {
      tabFilter = new Date(campaign.endDate) < new Date();
    }
    
    return searchFilter && tabFilter;
  });

  return (
    <AdminLayout title="Kampanya Yönetimi" isBlurred={showAddModal || showEditModal}>
      <div className={showAddModal || showEditModal ? "blur-sm" : ""}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedTab === 'all' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tüm Kampanyalar
            </button>
            <button
              onClick={() => setSelectedTab('active')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedTab === 'active' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setSelectedTab('inactive')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedTab === 'inactive' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pasif
            </button>
            <button
              onClick={() => setSelectedTab('upcoming')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedTab === 'upcoming' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Gelecek
            </button>
            <button
              onClick={() => setSelectedTab('expired')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedTab === 'expired' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Süresi Dolmuş
            </button>
          </div>
          <div className="flex flex-col w-full md:flex-row md:w-auto gap-4">
            <div className="relative w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Kampanya ara..." 
                className="pl-10 pr-4 py-2 w-full md:min-w-[250px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <FaPlus className="mr-2" />
            Yeni Kampanya
          </button>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Kampanya</p>
                <p className="text-2xl font-semibold text-gray-900">{campaigns.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FaClipboardList className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Kampanyalar</p>
                <p className="text-2xl font-semibold text-green-600">
                  {campaigns.filter(c => c.isActive).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FaToggleOn className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gelecek Kampanyalar</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {campaigns.filter(c => new Date(c.startDate) > new Date()).length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <FaCalendarAlt className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Süresi Dolmuş</p>
                <p className="text-2xl font-semibold text-red-600">
                  {campaigns.filter(c => new Date(c.endDate) < new Date()).length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <FaPercent className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kampanya Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Tipi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İndirim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min. Sipariş</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih Aralığı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((campaign) => (
                    <tr key={campaign._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{campaign.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{campaign.userType}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {campaign.discountType === 'percentage' ? '%' : '₺'}{campaign.discountValue}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{campaign.minOrderAmount} TL</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {campaign.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(campaign)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                          <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(campaign._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                          <FaTrash />
                      </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      {searchTerm ? 'Arama kriterlerine uygun kampanya bulunamadı.' : 'Henüz kampanya bulunmuyor.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Toplam Kayıt Bilgisi ve Sayfalama */}
            <div className="bg-white px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Toplam <span className="font-medium text-gray-900">{filteredCampaigns.length}</span> kampanya bulundu
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
        )}
      </div>

        {/* Kampanya Ekleme/Düzenleme Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {showAddModal ? 'Yeni Kampanya' : 'Kampanyayı Düzenle'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kampanya Adı
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kullanıcı Tipi
                  </label>
                  <select
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="Müşteri">Müşteri</option>
                    <option value="Firma">Firma</option>
                    <option value="Sürücü">Sürücü</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Açıklama
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="2"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      İndirim Tipi
                    </label>
                    <select
                      name="discountType"
                      value={formData.discountType}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="percentage">Yüzde</option>
                      <option value="fixed">Sabit Tutar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      İndirim Değeri
                    </label>
                    <input
                      type="number"
                      name="discountValue"
                      value={formData.discountValue}
                      onChange={handleChange}
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Minimum Sipariş Tutarı
                  </label>
                  <input
                    type="number"
                    name="minOrderAmount"
                    value={formData.minOrderAmount}
                    onChange={handleChange}
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Toplam Kullanım Limiti
                    </label>
                    <input
                      type="number"
                      name="usageLimit"
                      value={formData.usageLimit}
                      onChange={handleChange}
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Kullanıcı Başına Limit
                    </label>
                    <input
                      type="number"
                      name="userUsageLimit"
                      value={formData.userUsageLimit}
                      onChange={handleChange}
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Kampanya Aktif
                  </label>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setShowEditModal(false)
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <FaTimes className="mr-2" />
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <FaCheck className="mr-2" />
                    {showAddModal ? 'Ekle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </AdminLayout>
  )
}

export default CampaignsPage 