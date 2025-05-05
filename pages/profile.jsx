'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaLock, FaBell, FaLanguage, FaHistory, FaFileInvoice, FaEdit, FaCamera, FaSignOutAlt, FaTruck, FaHome, FaDownload, FaEye, FaFilePdf } from 'react-icons/fa';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import MainLayout from '../components/layout/MainLayout';
import axios from 'axios';
import { useSession, signOut } from 'next-auth/react';
import UpgradeToCorporateModal from '../components/UpgradeToCorporateModal';
import { toast } from 'react-hot-toast';

// DefaultAvatar bileşeni
const DefaultAvatar = ({ name = '', size = 96, className = '' }) => {
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'TM';
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 0) return 'TM';
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  };

  return (
    <div 
      className={`rounded-full flex items-center justify-center ${className}`}
      style={{ 
        width: size, 
        height: size,
        backgroundColor: '#FF6B00',
      }}
    >
      <span 
        className="text-white font-bold select-none"
        style={{ fontSize: Math.floor(size * 0.4) + 'px' }}
      >
        {getInitials(name)}
      </span>
    </div>
  );
};

export default function Profile() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [shipmentHistory, setShipmentHistory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    district: '',
    city: '',
    accountType: 'INDIVIDUAL',
    status: 'ACTIVE',
    notifications: true,
    language: 'tr',
    taxNumber: '',
    billingAddress: '',
    companyName: '',
    taxOffice: '',
    companyAddress: '',
    isFreelance: false,
    companyDistrict: '',
    companyCity: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    district: '',
    city: '',
    companyName: '',
    taxOffice: '',
    taxNumber: '',
    companyAddress: '',
    companyDistrict: '',
    companyCity: '',
    accountType: 'individual',
    notifications: true,
    language: 'tr'
  });
  const [isSaving, setIsSaving] = useState(false);

  // API çağrıları için referans stabilliği sağlayacak şekilde fetchShipmentHistory tanımlandı
  const fetchShipmentHistory = useCallback(async () => {
    try {
      const response = await axios.get('/api/shipments/user');
      if (response.data.shipments) {
        setShipmentHistory(response.data.shipments);
      }
    } catch (err) {
      console.error('Taşıma geçmişi çekilirken hata:', err);
      setShipmentHistory([]);
    }
  }, []);

  // Fatura bilgilerini getir
  const fetchInvoices = useCallback(async () => {
    try {
      // Müşteriye özel faturaları getir
      const response = await axios.get('/api/invoices/customer');
      if (response.data.success) {
        // Fatura verilerini doğru formata getir
        const customerInvoices = response.data.invoices || [];
        console.log('Müşteri faturaları:', customerInvoices);
        setInvoices(customerInvoices);
      } else {
        console.error('Fatura bilgileri alınamadı:', response.data.message);
        setInvoices([]);
      }
    } catch (err) {
      console.error('Fatura bilgileri çekilirken hata:', err);
      setInvoices([]);
    }
  }, []);

  // Kullanıcı bilgilerini getir
  useEffect(() => {
    console.log('Profile sayfası - Auth Status:', status);
    
    // Loading state'de iken hiçbir şey yapma
    if (status === 'loading') {
      console.log('Profile sayfası - Oturum durumu yükleniyor...');
      return;
    }
    
    // Session yoksa ve authentication tamamlandıysa login sayfasına yönlendir
    if (status === 'unauthenticated') {
      console.log('Profil sayfası - Kullanıcı girişi yok, yönlendiriliyor');
      router.push('/login?callbackUrl=' + encodeURIComponent('/profile'));
      return;
    }
    
    // Session varsa kullanıcı bilgilerini getir
    if (status === 'authenticated' && session?.user?.id) {
      setIsLoading(true);
      console.log('Profil sayfası - Session bilgileri:', {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        expires: session.expires
      });
      
      fetch('/api/users/profile', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Cookie'leri gönder
      })
        .then(response => {
          console.log('Profil API yanıt status:', response.status);
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Oturum bilgisi bulunamadı, yeniden giriş yapmalısınız');
            } else {
              throw new Error(`API yanıt hatası: ${response.status}`);
            }
          }
          return response.json();
        })
        .then(data => {
          console.log('Profil bilgileri başarıyla alındı');
          setUserData(data);
          setLoading(false); // Global loading state'i kapat
          
          // Form alanlarını doldur
          setUserInfo({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            address: data.address || '',
            district: data.district || '',
            city: data.city || '',
            companyName: data.companyName || '',
            taxOffice: data.taxOffice || '',
            taxNumber: data.taxNumber || '',
            companyAddress: data.companyAddress || '',
            companyDistrict: data.companyDistrict || '',
            companyCity: data.companyCity || '',
            accountType: data.accountType || 'individual',
            notifications: data.notifications || true,
            language: data.language || 'tr'
          });
          
          // Form verilerini de güncelle
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || session.user.email || '',
            phone: data.phone || session.user.phone || '',
            address: data.address || '',
            district: data.district || '',
            city: data.city || '',
            accountType: data.accountType || 'individual',
            status: data.status || 'ACTIVE',
            notifications: data.notifications || true,
            language: data.language || 'tr',
            taxNumber: data.taxNumber || '',
            billingAddress: data.billingAddress || '',
            companyName: data.companyName || '',
            taxOffice: data.taxOffice || '',
            companyAddress: data.companyAddress || '',
            companyDistrict: data.companyDistrict || '',
            companyCity: data.companyCity || ''
          });
          
          setIsLoading(false);
          setError(null);
        })
        .catch(error => {
          console.error('Profil bilgileri alınırken hata oluştu:', error);
          toast.error(error.message || 'Profil bilgileri alınamadı');
          setError(error.message || 'Profil bilgileri alınamadı');
          setLoading(false); // Global loading state'i kapat
          setIsLoading(false);
          
          // Kimlik doğrulama hatası varsa yeniden giriş yapmaya yönlendir
          if (error.message.includes('Oturum bilgisi bulunamadı')) {
            signOut({ redirect: false }).then(() => {
              router.push('/login?callbackUrl=' + encodeURIComponent('/profile') + '&error=session_expired');
            });
          }
        });
    }
  }, [status, session, router]); // session.user.id yerine sadece session ve status'e bağlı

  // Profil bilgilerini güncelle
  const updateProfile = async (e) => {
    e.preventDefault();
    console.log('Profil güncelleme başlatılıyor:', userInfo);
    
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInfo),
      });
      
      console.log('Profil güncelleme yanıt status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API yanıt hatası: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Profil güncelleme sonucu:', result);
      
      if (result.success) {
        toast.success(result.message || 'Profil başarıyla güncellendi');
        // Form verilerini de güncelle
        setFormData(prev => ({
          ...prev,
          ...userInfo
        }));
        // Düzenleme modunu kapat
        setIsEditing(false);
      } else {
        toast.error(result.message || 'Profil güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      toast.error('Profil güncellenirken bir hata oluştu: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Form değişikliklerini izleme
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Çıkış işlemi
  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const handleUpgradeSuccess = async (updatedUser) => {
    // Form verilerini güncelle
    setUserInfo(prev => ({
      ...prev,
      ...updatedUser
    }));
    
    // Kullanıcı verilerini yeniden yükle
    const userResponse = await axios.get('/api/users/profile');
    if (userResponse.data) {
      setUserInfo(prev => ({
        ...prev,
        ...userResponse.data
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Head>
          <title>Profil Yükleniyor | Taşı.app</title>
        </Head>
        <div className="flex-grow flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Head>
          <title>Hata | Taşı.app</title>
        </Head>
        <div className="flex-grow flex items-center justify-center py-24">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Hata!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'summary', name: 'Profil Özeti', icon: <FaHome /> },
    { id: 'personal', name: 'Kişisel Bilgiler', icon: <FaUser /> },
    { id: 'company', name: 'Şirket Bilgileri', icon: <FaTruck /> },
    { id: 'settings', name: 'Hesap Ayarları', icon: <FaLock /> },
    { id: 'history', name: 'Taşıma Geçmişi', icon: <FaHistory /> },
    { id: 'billing', name: 'Fatura Geçmişi', icon: <FaFileInvoice /> }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Head>
        <title>Profil | Taşı.app</title>
        <meta name="description" content="Taşı.app profil sayfası" />
      </Head>

      {/* Header */}
      <nav className="bg-white shadow-md py-4 relative z-20">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="Taşı.app" className="h-10" />
          </Link>
          <div className="hidden md:flex space-x-6 items-center">
            <Link href="/" className={`text-gray-600 hover:text-orange-600 transition group relative ${router.pathname === '/' ? 'text-orange-600' : ''}`}>
              Anasayfa
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/#services" className={`text-gray-600 hover:text-orange-600 transition group relative ${router.pathname === '/services' ? 'text-orange-600' : ''}`}>
              Hizmetlerimiz
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/#about" className={`text-gray-600 hover:text-orange-600 transition group relative ${router.pathname === '/about' ? 'text-orange-600' : ''}`}>
              Neden Biz?
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link href="/contact" className={`text-gray-600 hover:text-orange-600 transition group relative ${router.pathname === '/contact' ? 'text-orange-600' : ''}`}>
              İletişim
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            {session ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/profile" 
                  className="px-4 py-2 text-sm font-medium text-orange-600 bg-white border border-orange-600 rounded-md hover:bg-orange-50"
                >
                  Profilim
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
                >
                  Çıkış Yap
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700">
                  Giriş Yap
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium text-orange-600 bg-white border border-orange-600 rounded-md hover:bg-orange-50">
                  Kayıt Ol
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Ana İçerik */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sol Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-row items-center mb-6">
                {profileImage ? (
                  <div className="mr-4">
                    <Image
                      src={profileImage}
                      alt="Profil Fotoğrafı"
                      width={96}
                      height={96}
                      className="rounded-full"
                    />
                  </div>
                ) : (
                  <div className="mr-4">
                    <DefaultAvatar name={`${formData.firstName} ${formData.lastName}`} />
                  </div>
                )}
                <div className="flex flex-col">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {`${formData.firstName} ${formData.lastName}`}
                  </h2>
                  <p className="text-gray-600">{formData.email}</p>
                  <p className="text-sm text-gray-500">{formData.accountType === 'corporate' ? 'Kurumsal' : 'Bireysel'}</p>
                </div>
              </div>

              <nav className="grid grid-cols-3 gap-3">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center justify-center h-24 p-3 rounded-lg transition-all shadow-sm hover:shadow ${
                      activeTab === tab.id
                        ? 'bg-orange-50 text-orange-600 border-2 border-orange-400'
                        : 'text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-2">{tab.icon}</div>
                    <span className="text-xs font-medium text-center">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Sağ İçerik */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-800">Profil Özeti</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Ad Soyad</h4>
                        <p className="mt-1 text-gray-900">{`${formData.firstName} ${formData.lastName}`}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">E-posta</h4>
                        <p className="mt-1 text-gray-900">{formData.email}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Telefon</h4>
                        <p className="mt-1 text-gray-900">{formData.phone}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Adres</h4>
                        <p className="mt-1 text-gray-900">
                          {formData.accountType === 'corporate' 
                            ? (
                                <>
                                  {formData.companyAddress}
                                  {(formData.companyDistrict || formData.companyCity) && (
                                    <span>
                                      <br />
                                      {[
                                        formData.companyDistrict, 
                                        formData.companyCity
                                      ].filter(Boolean).join(', ')}
                                    </span>
                                  )}
                                </>
                              )
                            : (
                                <>
                                  {formData.address}
                                  {(formData.district || formData.city) && (
                                    <span>
                                      <br />
                                      {[
                                        formData.district, 
                                        formData.city
                                      ].filter(Boolean).join(', ')}
                                    </span>
                                  )}
                                </>
                              )
                          }
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Hesap Tipi</h4>
                        <p className="mt-1 text-gray-900">{formData.accountType === 'corporate' ? 'Kurumsal' : 'Bireysel'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Hesap Durumu</h4>
                        <p className="mt-1 text-gray-900">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            formData.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {formData.status === 'ACTIVE' ? 'AKTİF' : formData.status}
                          </span>
                        </p>
                      </div>
                      {formData.accountType === 'corporate' && (
                        <>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Şirket Adı</h4>
                            <p className="mt-1 text-gray-900">{formData.companyName}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-800">Kişisel Bilgiler</h3>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      {isEditing ? 'İptal' : 'Düzenle'}
                    </button>
                  </div>

                  <form onSubmit={updateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                          Ad
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={userInfo.firstName}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                          Soyad
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={userInfo.lastName}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          E-posta
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={userInfo.email}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Telefon
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={userInfo.phone}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>

                      {formData.accountType !== 'corporate' && (
                        <>
                          <div>
                            <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                              İlçe
                            </label>
                            <input
                              type="text"
                              id="district"
                              name="district"
                              value={userInfo.district}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                              İl
                            </label>
                            <input
                              type="text"
                              id="city"
                              name="city"
                              value={userInfo.city}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                              Adres
                            </label>
                            <textarea
                              id="address"
                              name="address"
                              value={userInfo.address}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              rows={3}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        >
                          Kaydet
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {activeTab === 'company' && formData.accountType === 'corporate' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-800">Şirket Bilgileri</h3>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      {isEditing ? 'İptal' : 'Düzenle'}
                    </button>
                  </div>

                  <form onSubmit={updateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                          Firma Adı
                        </label>
                        <input
                          type="text"
                          id="companyName"
                          name="companyName"
                          value={userInfo.companyName}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="taxOffice" className="block text-sm font-medium text-gray-700">
                          Vergi Dairesi
                        </label>
                        <input
                          type="text"
                          id="taxOffice"
                          name="taxOffice"
                          value={userInfo.taxOffice}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="taxNumber" className="block text-sm font-medium text-gray-700">
                          Vergi Numarası
                        </label>
                        <input
                          type="text"
                          id="taxNumber"
                          name="taxNumber"
                          value={userInfo.taxNumber}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">
                          Firma Adresi
                        </label>
                        <textarea
                          id="companyAddress"
                          name="companyAddress"
                          value={userInfo.companyAddress}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="companyCity" className="block text-sm font-medium text-gray-700">
                          İl
                        </label>
                        <input
                          type="text"
                          id="companyCity"
                          name="companyCity"
                          value={userInfo.companyCity}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="companyDistrict" className="block text-sm font-medium text-gray-700">
                          İlçe
                        </label>
                        <input
                          type="text"
                          id="companyDistrict"
                          name="companyDistrict"
                          value={userInfo.companyDistrict}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        >
                          Kaydet
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {activeTab === 'company' && formData.accountType !== 'corporate' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-800">Şirket Bilgileri</h3>
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="flex flex-col items-center">
                      <FaTruck className="text-gray-400 text-5xl mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Kurumsal Hesap Değilsiniz</h4>
                      <p className="text-gray-500 mb-4">
                        Şirket bilgilerini görüntülemek için hesabınızı kurumsal hesaba yükseltmeniz gerekmektedir.
                      </p>
                      <button
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                      >
                        Kurumsal Hesaba Yükselt
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-800">Hesap Ayarları</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Bildirimler</h4>
                        <p className="text-sm text-gray-500">E-posta ve SMS bildirimleri al</p>
                      </div>
                      <button
                        type="button"
                        className={`${
                          userInfo.notifications ? 'bg-orange-600' : 'bg-gray-200'
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                        onClick={() => handleInputChange({ target: { name: 'notifications', type: 'checkbox', checked: !userInfo.notifications } })}
                      >
                        <span
                          className={`${
                            userInfo.notifications ? 'translate-x-5' : 'translate-x-0'
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Dil</h4>
                        <p className="text-sm text-gray-500">Arayüz dilini değiştir</p>
                      </div>
                      <select
                        name="language"
                        value={userInfo.language}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                      >
                        <option value="tr">Türkçe</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-800">Taşıma Geçmişi</h3>
                  {shipmentHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Taşıma No
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tarih
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nereden-Nereye
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Durum
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tutar
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {shipmentHistory.map((shipment) => (
                            <tr key={shipment._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {shipment.shipment_number || shipment._id.substring(0,6)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(shipment.createdAt).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  <div className="mb-1">{shipment.from}</div>
                                  <div className="flex items-center">
                                    <svg className="w-3 h-3 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                                    </svg>
                                    <span>{shipment.to}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  shipment.status === 'completed' || shipment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  shipment.status === 'in_progress' || shipment.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {shipment.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {(shipment.amount || shipment.totalAmount || 0).toLocaleString()} TL
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">Henüz taşıma geçmişi bulunmuyor.</p>
                  )}
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-800">Fatura Geçmişi</h3>
                  {invoices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Taşıma No
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tarih
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Açıklama
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tutar
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rota
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              İşlemler
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {invoices.map((invoice) => (
                            <tr key={invoice._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {invoice.shipmentId?.substring(0, 6) || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('tr-TR') : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {invoice.description || 
                                 `Taşıma Hizmeti ${invoice.shipmentId ? `(#${typeof invoice.shipmentId === 'string' ? invoice.shipmentId.substring(0, 6) : invoice.shipmentId})` : ''}`}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                {((invoice.totalAmount || invoice.amount || 0) + (invoice.taxAmount || 0)).toLocaleString('tr-TR')} TL
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex flex-col">
                                  <div className="text-xs text-gray-600 mb-1">
                                    <strong>Alınan:</strong> {invoice.pickupDistrict || '-'}, {invoice.pickupCity || '-'}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    <strong>Teslim:</strong> {invoice.deliveryDistrict || '-'}, {invoice.deliveryCity || '-'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  {invoice.pdf_url || invoice.pdfUrl ? (
                                    <>
                                      <button
                                        onClick={() => window.open(invoice.pdf_url || invoice.pdfUrl, '_blank')}
                                        className="text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out"
                                        title="Görüntüle"
                                      >
                                        <FaEye className="w-5 h-5" />
                                      </button>
                                      <button
                                        onClick={() => window.open(`/api/invoices/${invoice._id}/download`, '_blank')}
                                        className="text-green-600 hover:text-green-800 transition duration-150 ease-in-out"
                                        title="İndir"
                                      >
                                        <FaDownload className="w-5 h-5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-gray-400 flex items-center text-xs">
                                      <FaFilePdf className="w-4 h-4 mr-1" />
                                      Fatura PDF&apos;i henüz hazır değil
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FaFileInvoice className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-2">Henüz fatura bulunmuyor.</p>
                      <p className="text-xs text-gray-400">Taşımalarınıza ait faturalar burada görüntülenecektir.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <UpgradeToCorporateModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgrade={handleUpgradeSuccess}
      />
    </div>
  );
}
