import React, { useState, useEffect } from 'react'
import AdminLayout from '../../components/admin/Layout'
import { useSession } from 'next-auth/react'
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaNewspaper, FaEye, FaCalendarAlt, FaImage, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'
import { useRouter } from 'next/router'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

const BlogPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [blogPosts, setBlogPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '',
    slug: '',
    featuredImage: '',
    isPublished: true,
    publishDate: '',
    excerpt: '',
    categories: []
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalPosts, setTotalPosts] = useState(0)

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
      loadBlogPosts()
    }
  }, [session])

  const loadBlogPosts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/blog', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setBlogPosts(data.blogs || [])
      setTotalPosts(data.totalPosts || 0)
      setTotalPages(data.totalPages || 1)
      
      console.log('Blog yazıları yüklendi:', {
        blogs: data.blogs?.length || 0,
        totalPosts: data.totalPosts || 0,
        totalPages: data.totalPages || 1
      })
    } catch (error) {
      console.error('Blog yazıları yüklenirken hata:', error)
      alert('Blog yazıları yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClick = () => {
    setFormData({
      title: '',
      content: '',
      author: session?.user?.name || '',
      slug: '',
      featuredImage: '',
      isPublished: true,
      publishDate: new Date().toISOString().split('T')[0],
      excerpt: '',
      categories: []
    })
    setShowAddModal(true)
  }

  const handleEditClick = (post) => {
    setSelectedPost(post)
    setFormData({
      title: post.title,
      content: post.content,
      author: post.author,
      slug: post.slug,
      featuredImage: post.featuredImage || '',
      isPublished: post.isPublished,
      publishDate: post.publishDate ? post.publishDate.split('T')[0] : new Date().toISOString().split('T')[0],
      excerpt: post.excerpt || '',
      categories: post.categories || []
    })
    setShowEditModal(true)
  }

  const handleDeleteClick = async (postId) => {
    if (window.confirm('Bu blog yazısını silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/admin/blog/${postId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        loadBlogPosts()
      } catch (error) {
        console.error('Blog yazısı silinirken hata:', error)
        alert('Blog yazısı silinirken bir hata oluştu.')
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      console.log('Seçili post:', selectedPost);
      console.log('Form verisi:', formData);
      
      const url = showEditModal 
        ? `/api/admin/blog/${selectedPost._id}`
        : '/api/admin/blog'
      
      const method = showEditModal ? 'PUT' : 'POST'
      
      // Slug oluşturma (boşsa)
      if (!formData.slug) {
        formData.slug = formData.title
          .toLowerCase()
          .replace(/[^\w ]+/g, '')
          .replace(/ +/g, '-')
      }
      
      console.log('İstek URL:', url);
      console.log('İstek metodu:', method);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API yanıt hatası:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Bilinmeyen hata'}`);
      }

      const result = await response.json();
      console.log('API yanıtı:', result);

      setShowAddModal(false)
      setShowEditModal(false)
      loadBlogPosts()
    } catch (error) {
      console.error('Blog yazısı kaydedilirken hata:', error)
      alert('Blog yazısı kaydedilirken bir hata oluştu: ' + error.message)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'isPublished' ? value === 'true' : (type === 'checkbox' ? checked : value)
    }))
  }

  const handleContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      content
    }))
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  const truncateContent = (content, maxLength = 100) => {
    if (!content) return '';
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...' 
      : content;
  }

  // Filtreleme işlevi
  const filteredPosts = blogPosts.filter(post => {
    // Arama terimine göre filtreleme
    const searchFilter = searchTerm.toLowerCase() === '' || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.categories?.some(category => category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Sekmeye göre filtreleme
    let tabFilter = true;
    if (selectedTab === 'published') {
      tabFilter = post.isPublished === true;
    } else if (selectedTab === 'drafts') {
      tabFilter = post.isPublished === false;
    } else if (selectedTab === 'recent') {
      // Son 7 gün içinde oluşturulan yazılar
      tabFilter = post.createdAt && new Date(post.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return searchFilter && tabFilter;
  });

  return (
    <AdminLayout title="Blog Yönetimi" isBlurred={showAddModal || showEditModal}>
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
              Tüm Yazılar
            </button>
            <button
              onClick={() => setSelectedTab('published')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedTab === 'published' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Yayında
            </button>
            <button
              onClick={() => setSelectedTab('drafts')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedTab === 'drafts' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Taslaklar
            </button>
            <button
              onClick={() => setSelectedTab('recent')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedTab === 'recent' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Son Eklenenler
            </button>
          </div>
          <div className="flex flex-col w-full md:flex-row md:w-auto gap-4">
            <div className="relative w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Blog yazısı ara..." 
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
              Yeni Blog Yazısı
          </button>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Yazı</p>
                <p className="text-2xl font-semibold text-gray-900">{blogPosts.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FaNewspaper className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Yayında</p>
                <p className="text-2xl font-semibold text-green-600">
                  {blogPosts.filter(p => p.isPublished).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <FaEye className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taslaklar</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {blogPosts.filter(p => !p.isPublished).length}
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
                <p className="text-sm font-medium text-gray-600">Görsel İçeren</p>
                <p className="text-2xl font-semibold text-purple-600">
                  {blogPosts.filter(p => p.featuredImage && p.featuredImage.length > 0).length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FaImage className="h-6 w-6 text-purple-600" />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Başlık</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yazar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İçerik Özeti</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yayın Tarihi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => (
                    <tr key={post._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {post.featuredImage ? (
                            <img 
                              src={post.featuredImage} 
                              alt={post.title} 
                              className="h-10 w-10 rounded-full mr-3 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                              <FaNewspaper className="text-gray-500" />
                            </div>
                          )}
                      <div className="text-sm font-medium text-gray-900">{post.title}</div>
                        </div>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">{post.author}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {truncateContent(post.excerpt || post.content, 80)}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {post.publishDate ? formatDate(post.publishDate) : '-'}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          post.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                          {post.isPublished ? 'Yayında' : 'Taslak'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(post)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(post._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      {searchTerm ? 'Arama kriterlerine uygun blog yazısı bulunamadı.' : 'Henüz blog yazısı bulunmuyor.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Toplam Kayıt Bilgisi ve Sayfalama */}
            <div className="bg-white px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Toplam <span className="font-medium text-gray-900">{filteredPosts.length}</span> blog yazısı bulundu
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

      {/* Modal bileşenleri */}
        {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="relative inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Modal içeriği */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {showAddModal ? 'Yeni Blog Yazısı' : 'Blog Yazısını Düzenle'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Başlık
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    İçerik
                  </label>
                  <div className="mt-1">
                    <ReactQuill
                      value={formData.content}
                      onChange={handleContentChange}
                      className="h-64 mb-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                    Yayın Tarihi
                  </label>
                  <input
                    type="date"
                    name="publishDate"
                    value={formData.publishDate}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                    Yayın Durumu
                    </label>
                    <select
                    name="isPublished"
                    value={formData.isPublished}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    >
                    <option value="true">Yayında</option>
                    <option value="false">Taslak</option>
                    </select>
                  </div>
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
            </div>
          </div>
        )}
    </AdminLayout>
  )
}

export default BlogPage 