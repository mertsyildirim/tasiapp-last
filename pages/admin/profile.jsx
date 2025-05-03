import React, { useState, useEffect } from 'react';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaLock, 
  FaSave, 
  FaShieldAlt, 
  FaUserCog, 
  FaIdCard,
  FaEye,
  FaEyeSlash,
  FaCamera,
  FaEdit,
  FaTimes,
  FaBuilding
} from 'react-icons/fa';
import AdminLayout from '../../components/admin/Layout';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';

export default function AdminProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    company: ''
  });
  const [passwordStatus, setPasswordStatus] = useState('idle');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Debug console log
  useEffect(() => {
    if (session) {
      console.log('Session Data:', session);
      console.log('User Data:', session.user);
    }
  }, [session]);

  // Oturum kontrolü
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.replace('/admin');
      return;
    }

    // NOT: Rol kontrolü kaldırıldı - sadece session kontrolü yapıyoruz
  }, [session, status, router]);

  // Kullanıcı verilerini yükle
  useEffect(() => {
    if (session) {
      console.log('Session Data:', session);
      console.log('User Data:', session.user);

    // Kullanıcı verilerini session'dan al
    setUser(session.user);
      
      // Ad soyad için farklı alanları kontrol et
      const fullName = session.user.name || 
                       (session.user.firstName && session.user.lastName) ? 
                       `${session.user.firstName} ${session.user.lastName}` : 
                       'Kullanıcı';
      
    setFormData({
        name: fullName,
      email: session.user.email || '',
      phone: session.user.phone || '',
        company: session.user.company || session.user.companyName || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    setLoading(false);
    }
  }, [session]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Profil güncellenirken bir hata oluştu');
      }

      setUser(data.user);
      setIsEditing(false);
      setError(null);
      toast.success('Profil başarıyla güncellendi');
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordStatus('submitting');
    
    // Şifre doğrulama
    if (!formData.oldPassword) {
      setPasswordError('Mevcut şifrenizi girmelisiniz');
      setPasswordStatus('error');
      return;
    }
    
    if (!formData.newPassword || formData.newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalıdır');
      setPasswordStatus('error');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor');
      setPasswordStatus('error');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: formData.oldPassword,
          newPassword: formData.newPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Şifre değiştirilirken bir hata oluştu');
      }
      
      setPasswordStatus('success');
      setPasswordSuccess('Şifreniz başarıyla değiştirildi');
      
      // Şifre alanlarını temizle
      setFormData(prev => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      // 3 saniye sonra başarı mesajını temizle
      setTimeout(() => {
        setPasswordSuccess('');
        setPasswordStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Şifre değiştirilirken hata:', error);
      setPasswordError(error.message || 'Şifre değiştirilirken bir hata oluştu');
      setPasswordStatus('error');
    }
  };

  // İsim baş harflerini alma
  const getInitials = (name) => {
    if (!name) return 'A';
    
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };
  
  // Kullanıcı rolünü formatla
  const formatUserRole = (role) => {
    switch(role) {
      case 'super_admin': return 'Süper Admin';
      case 'admin': return 'Admin';
      case 'editor': return 'Editör';
      case 'support': return 'Destek';
      default: return 'Kullanıcı';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Profil Yönetimi</h1>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {isEditing ? (
                  <>
                    <FaTimes className="mr-2" />
                    İptal
                  </>
                ) : (
                  <>
                    <FaEdit className="mr-2" />
                    Düzenle
                  </>
                )}
              </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad
                </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaUser className="text-gray-400" />
                      </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                        disabled={!isEditing}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                    </div>
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta
                </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaEnvelope className="text-gray-400" />
                      </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                        disabled={!isEditing}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                    </div>
              </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400" />
                      </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                        disabled={!isEditing}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Şirket
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaBuilding className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      />
                    </div>
              </div>
            </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaUserCog className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={user?.role || 'Kullanıcı'}
                        disabled
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kullanıcı ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaIdCard className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={user?.id || 'N/A'}
                        disabled
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Kaydediliyor...
                      </>
                    ) : (
                      <>
                        <FaSave className="mr-2" />
                        Kaydet
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>

            <div className="mt-8 pt-8 border-t">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Şifre Değiştir</h2>
              
              {passwordError && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                  {passwordError}
                </div>
              )}
              
              {passwordSuccess && (
                <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
                  {passwordSuccess}
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mevcut Şifre
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="oldPassword"
                      value={formData.oldPassword}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <FaEyeSlash className="text-gray-400" />
                      ) : (
                        <FaEye className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yeni Şifre
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yeni Şifre (Tekrar)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={passwordStatus === 'submitting'}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {passwordStatus === 'submitting' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Güncelleniyor...
                      </>
                    ) : (
                      <>
                        <FaShieldAlt className="mr-2" />
                        Şifreyi Güncelle
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 