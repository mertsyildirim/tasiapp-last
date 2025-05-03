import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/Layout';
import { FaSearch, FaFilter, FaUser, FaCheck, FaTimes, FaEye, FaPlus, FaEdit, FaSave } from 'react-icons/fa';
import { useSession } from 'next-auth/react';

export default function Users() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(null);

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
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users?page=${page}&search=${search}`);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Kullanıcılar alınamadı');
      }

      setUsers(data.users);
      setTotalPages(data.pagination?.totalPages || 1);
      setError(null);
    } catch (error) {
      console.error('Kullanıcıları getirme hatası:', error);
      setError(error.message || 'Kullanıcılar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (page && session) {
      fetchUsers();
    }
  }, [page, search, session]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleEditClick = () => {
    setEditedUser({ ...selectedUser });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/admin/users?id=${editedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedUser)
      });

      const data = await response.json();

      if (data.success) {
        setSelectedUser(editedUser);
        setIsEditing(false);
        fetchUsers(); // Listeyi güncelle
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      setError(error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <AdminLayout title="Kullanıcı Yönetimi">
      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Kullanıcı ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          <div className="flex justify-end">
            <button
              onClick={() => router.push('/admin/users/new')}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center"
            >
              <FaPlus className="inline-block mr-2" />
              Yeni Admin
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      E-posta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <FaUser className="h-6 w-6 text-orange-500" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.roles?.includes('admin') ? 'Admin' : user.role}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.status === 'active' ? (
                          <div className="flex items-center">
                            <span className="px-3 py-1 inline-flex items-center text-sm font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                              <FaCheck className="w-4 h-4 mr-2 text-green-500" />
                              Aktif
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className="px-3 py-1 inline-flex items-center text-sm font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                              <FaTimes className="w-4 h-4 mr-2 text-red-500" />
                              Pasif
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-orange-500 hover:text-orange-600"
                        >
                          <FaEye className="inline-block mr-1" />
                          Görüntüle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      page === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Önceki
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === i + 1
                          ? 'z-10 bg-orange-50 border-orange-500 text-orange-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      page === totalPages
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

        {/* Kullanıcı Detay/Düzenleme Modalı */}
        {isModalOpen && (
          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex items-center justify-center min-h-screen">
              <div className="fixed inset-0 bg-black opacity-30" onClick={closeModal}></div>
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
                >
                  <FaTimes />
                </button>

                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {isEditing ? 'Kullanıcıyı Düzenle' : 'Kullanıcı Detayları'}
                </h3>

                {isEditing ? (
            <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700">İsim</label>
                          <input
                            type="text"
                            name="name"
                            value={editedUser.name}
                            onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">E-posta</label>
                          <input
                            type="email"
                            name="email"
                            value={editedUser.email}
                            onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefon</label>
                          <input
                        type="text"
                            name="phone"
                        value={editedUser.phone}
                            onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          />
                    </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Rol</label>
                          <select
                        name="role"
                        value={editedUser.role}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          >
                        <option value="user">Kullanıcı</option>
                            <option value="admin">Admin</option>
                        <option value="super_admin">Süper Admin</option>
                          </select>
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Durum</label>
                          <select
                            name="status"
                            value={editedUser.status}
                            onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="active">Aktif</option>
                            <option value="inactive">Pasif</option>
                          </select>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-orange-500 text-white rounded-md shadow-sm text-sm font-medium hover:bg-orange-600 flex items-center"
                      >
                        <FaSave className="mr-2" />
                        Kaydet
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="flex justify-center mb-4">
                        <div className="h-20 w-20 rounded-full bg-orange-100 flex items-center justify-center">
                          <FaUser className="h-10 w-10 text-orange-500" />
                        </div>
                      </div>
                      <div className="text-center">
                        <h4 className="text-lg font-bold">{selectedUser?.name}</h4>
                        <p className="text-gray-600">{selectedUser?.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Telefon</div>
                        <div className="font-medium">{selectedUser?.phone || '-'}</div>
                  </div>
                    <div>
                        <div className="text-sm text-gray-500">Rol</div>
                        <div className="font-medium">
                          {selectedUser?.roles?.includes('admin')
                            ? 'Admin'
                            : selectedUser?.role}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Durum</div>
                        <div className="font-medium">
                          {selectedUser?.status === 'active' ? 'Aktif' : 'Pasif'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Kayıt Tarihi</div>
                        <div className="font-medium">
                          {selectedUser?.createdAt
                            ? new Date(selectedUser.createdAt).toLocaleDateString('tr-TR')
                            : '-'}
                </div>
              </div>
            </div>

                    <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={closeModal}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                        Kapat
                </button>
                <button
                  onClick={handleEditClick}
                        className="px-4 py-2 bg-orange-500 text-white rounded-md shadow-sm text-sm font-medium hover:bg-orange-600 flex items-center"
                >
                  <FaEdit className="mr-2" />
                  Düzenle
            </button>
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
} 