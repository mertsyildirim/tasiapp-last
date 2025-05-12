import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaTools, FaBell, FaShieldAlt, FaGlobe, FaToggleOn, FaToggleOff, FaSave, FaUndo } from 'react-icons/fa';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';
import axios from 'axios';

export default function FreelanceSettings() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  
  // Varsayılan ayarları oluşturma fonksiyonu
  const initializeDefaultSettings = () => {
    setSettings({
      notifications: {
        email: {
          newRequests: true,
          taskUpdates: true,
          paymentNotifications: true,
          marketingEmails: true,
        },
        sms: {
          newRequests: true,
          taskUpdates: true,
          paymentNotifications: true,
          emergencyAlerts: true,
        },
        pushNotifications: {
          newRequests: true,
          taskUpdates: true,
          paymentNotifications: true,
          systemUpdates: true,
        },
      },
      privacy: {
        showProfile: true,
        showContactInfo: true,
        showRating: true,
        shareStatistics: true,
      },
      preferences: {
        language: 'tr',
        timezone: 'Europe/Istanbul',
        currency: 'TRY',
        distanceUnit: 'km',
        weightUnit: 'kg',
      },
      security: {
        twoFactorEnabled: true,
        loginNotifications: true,
        lastPasswordChange: new Date().toISOString(),
      }
    });
  };
  
  useEffect(() => {
    if (status === 'loading') return;
    
    console.log("Freelance Settings - Session durumu:", status, "Session:", session);
    
    // Oturum yoksa login sayfasına yönlendir
    if (status !== 'authenticated') {
      console.log("Oturum doğrulanamadı, login sayfasına yönlendiriliyor");
      router.push('/portal/login');
      return;
    }

    // API'den ayarları getir
    const fetchSettings = async () => {
      try {
        setLoading(true);
        console.log("API isteği gönderiliyor...");
        const response = await axios.get('/api/portal/freelance-settings', {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'x-user-id': session?.user?.id
          },
          params: {
            userId: session?.user?.id
          }
        });
        
        console.log('API yanıtı:', response.data);
        
        if (response.data.success) {
          console.log('Ayarlar başarıyla alındı:', response.data.settings);
          setSettings(response.data.settings);
        } else {
          console.error('Ayarlar alınamadı:', response.data.message);
          // Varsayılan boş ayarlar oluştur
          initializeDefaultSettings();
        }
      } catch (error) {
        console.error('Ayarlar alınırken hata:', error);
        console.error('Hata detayları:', error.response?.data);
        
        // Hata durumunda varsayılan ayarları kullan
        initializeDefaultSettings();
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [status, router, session]);

  // Yükleme durumu
  if (status === 'loading' || loading) {
    return (
      <FreelanceLayout title="Ayarlar">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </FreelanceLayout>
    );
  }

  // Oturum açılmamış
  if (status === 'unauthenticated') {
    return (
      <FreelanceLayout title="Ayarlar">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="bg-white shadow-md rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <FaTools className="mx-auto h-12 w-12 text-orange-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Oturum Açmanız Gerekiyor</h3>
              <p className="mt-1 text-sm text-gray-500">
                Ayarlarınızı görüntülemek için lütfen giriş yapın.
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

  const handleToggle = (category, group, setting) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [group]: {
          ...prev[category][group],
          [setting]: !prev[category][group][setting]
        }
      }
    }));
  };

  const handlePreferenceChange = (preference, value) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaveStatus('saving');
      
      const response = await axios.put('/api/portal/freelance-settings', 
        { 
          settings 
        },
        {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'x-user-id': session?.user?.id
          }
        }
      );
      
      if (response.data.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
        console.error('Ayarlar kaydedilemedi:', response.data.message);
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Ayarlar kaydedilirken hata:', error);
      console.error('Hata detayları:', error.response?.data);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleResetSettings = async () => {
    try {
      setSaveStatus('resetting');
      
      // Önce varsayılan ayarları yerel olarak ayarla
      const defaultSettings = {
        notifications: {
          email: {
            newRequests: true,
            taskUpdates: true,
            paymentNotifications: true,
            marketingEmails: true,
          },
          sms: {
            newRequests: true,
            taskUpdates: true,
            paymentNotifications: true,
            emergencyAlerts: true,
          },
          pushNotifications: {
            newRequests: true,
            taskUpdates: true,
            paymentNotifications: true,
            systemUpdates: true,
          },
        },
        privacy: {
          showProfile: true,
          showContactInfo: true,
          showRating: true,
          shareStatistics: true,
        },
        preferences: {
          language: 'tr',
          timezone: 'Europe/Istanbul',
          currency: 'TRY',
          distanceUnit: 'km',
          weightUnit: 'kg',
        },
        security: {
          twoFactorEnabled: true,
          loginNotifications: true,
          lastPasswordChange: new Date().toISOString(),
        }
      };
      
      // Önce yerel state'i güncelle
      setSettings(defaultSettings);
      
      // Ardından bu ayarları API'ye kaydet
      const response = await axios.put('/api/portal/freelance-settings', 
        { 
          settings: defaultSettings 
        },
        {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'x-user-id': session?.user?.id
          }
        }
      );
      
      if (response.data.success) {
        setSaveStatus('success');
        console.log('Varsayılan ayarlar başarıyla kaydedildi:', response.data);
      } else {
        console.error('Varsayılan ayarlar kaydedilemedi:', response.data.message);
        // API başarısız olsa bile yerel değişikliği göster
      }
      
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Ayarlar sıfırlanırken hata:', error);
      console.error('Hata detayları:', error.response?.data);
      
      // Hata olsa bile yerel değişikliği koruyalım
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (!settings) return null;

  return (
    <FreelanceLayout title="Ayarlar">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Sistem Ayarları</h2>
            <div className="flex space-x-3 items-center">
              {saveStatus && (
                <div className={`text-sm px-3 py-1 rounded-md ${
                  saveStatus === 'success' ? 'bg-green-100 text-green-800' : 
                  saveStatus === 'error' ? 'bg-red-100 text-red-800' :
                  saveStatus === 'reset' ? 'bg-blue-100 text-blue-800' :
                  saveStatus === 'resetting' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {saveStatus === 'success' && 'Ayarlar kaydedildi'}
                  {saveStatus === 'error' && 'Hata oluştu'}
                  {saveStatus === 'saving' && 'Kaydediliyor...'}
                  {saveStatus === 'reset' && 'Tüm ayarlar açık duruma getirildi'}
                  {saveStatus === 'resetting' && 'Ayarlar sıfırlanıyor...'}
                </div>
              )}
              <button
                onClick={handleResetSettings}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <FaUndo className="mr-2 -ml-1 h-4 w-4" />
                Sıfırla
              </button>
              <button
                onClick={handleSaveSettings}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <FaSave className="mr-2 -ml-1 h-4 w-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
        
        {/* Bildirim Ayarları */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex items-center">
              <FaBell className="h-5 w-5 text-orange-500 mr-2" />
              <h3 className="text-lg font-medium leading-6 text-gray-900">Bildirim Ayarları</h3>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Hangi bildirimler için hangi kanalları kullanmak istediğinizi ayarlayın.
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="col-span-1">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Bildirim Türü</h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 py-2">Yeni Taşıma Talepleri</p>
                  <p className="text-sm text-gray-700 py-2">Taşıma Güncellemeleri</p>
                  <p className="text-sm text-gray-700 py-2">Ödeme Bildirimleri</p>
                  <p className="text-sm text-gray-700 py-2">Sistem Güncellemeleri</p>
                </div>
              </div>
              
              <div className="col-span-1">
                <h4 className="text-sm font-medium text-gray-900 mb-4">E-posta</h4>
                <div className="space-y-2">
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'email', 'newRequests')}
                      className="text-gray-700"
                    >
                      {settings.notifications.email.newRequests ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'email', 'taskUpdates')}
                      className="text-gray-700"
                    >
                      {settings.notifications.email.taskUpdates ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'email', 'paymentNotifications')}
                      className="text-gray-700"
                    >
                      {settings.notifications.email.paymentNotifications ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'email', 'marketingEmails')}
                      className="text-gray-700"
                    >
                      {settings.notifications.email.marketingEmails ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1">
                <h4 className="text-sm font-medium text-gray-900 mb-4">SMS</h4>
                <div className="space-y-2">
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'sms', 'newRequests')}
                      className="text-gray-700"
                    >
                      {settings.notifications.sms.newRequests ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'sms', 'taskUpdates')}
                      className="text-gray-700"
                    >
                      {settings.notifications.sms.taskUpdates ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'sms', 'paymentNotifications')}
                      className="text-gray-700"
                    >
                      {settings.notifications.sms.paymentNotifications ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'sms', 'emergencyAlerts')}
                      className="text-gray-700"
                    >
                      {settings.notifications.sms.emergencyAlerts ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Uygulama Bildirimleri</h4>
                <div className="space-y-2">
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'pushNotifications', 'newRequests')}
                      className="text-gray-700"
                    >
                      {settings.notifications.pushNotifications.newRequests ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'pushNotifications', 'taskUpdates')}
                      className="text-gray-700"
                    >
                      {settings.notifications.pushNotifications.taskUpdates ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'pushNotifications', 'paymentNotifications')}
                      className="text-gray-700"
                    >
                      {settings.notifications.pushNotifications.paymentNotifications ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => handleToggle('notifications', 'pushNotifications', 'systemUpdates')}
                      className="text-gray-700"
                    >
                      {settings.notifications.pushNotifications.systemUpdates ? (
                        <FaToggleOn className="h-6 w-6 text-orange-500" />
                      ) : (
                        <FaToggleOff className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tercihler ve Bölgesel Ayarlar */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex items-center">
              <FaGlobe className="h-5 w-5 text-orange-500 mr-2" />
              <h3 className="text-lg font-medium leading-6 text-gray-900">Tercihler ve Bölgesel Ayarlar</h3>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Dil, zaman dilimi ve ölçü birimleri gibi bölgesel tercihlerinizi ayarlayın.
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dil</label>
                <select
                  value={settings.preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zaman Dilimi</label>
                <select
                  value={settings.preferences.timezone}
                  onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                >
                  <option value="Europe/Istanbul">İstanbul (GMT+3)</option>
                  <option value="Europe/London">Londra (GMT+0)</option>
                  <option value="Europe/Berlin">Berlin (GMT+1)</option>
                  <option value="America/New_York">New York (GMT-5)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
                <select
                  value={settings.preferences.currency}
                  onChange={(e) => handlePreferenceChange('currency', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                >
                  <option value="TRY">Türk Lirası (₺)</option>
                  <option value="USD">Amerikan Doları ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">İngiliz Sterlini (£)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mesafe Birimi</label>
                <select
                  value={settings.preferences.distanceUnit}
                  onChange={(e) => handlePreferenceChange('distanceUnit', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                >
                  <option value="km">Kilometre (km)</option>
                  <option value="mile">Mil (mi)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ağırlık Birimi</label>
                <select
                  value={settings.preferences.weightUnit}
                  onChange={(e) => handlePreferenceChange('weightUnit', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                >
                  <option value="ton">Ton</option>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="lb">Pound (lb)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Güvenlik Ayarları */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex items-center">
              <FaTools className="h-5 w-5 text-orange-500 mr-2" />
              <h3 className="text-lg font-medium leading-6 text-gray-900">Güvenlik Ayarları</h3>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Hesap güvenliğinizi yönetin ve şifre ayarlarınızı değiştirin.
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">İki Faktörlü Doğrulama</h4>
                    <p className="text-xs text-gray-500">Hesabınıza giriş yaparken ek güvenlik için SMS doğrulaması kullanın</p>
                  </div>
                  <button
                    onClick={() => handleToggle('security', 'twoFactorEnabled', null)}
                    className="text-gray-700"
                  >
                    {settings.security.twoFactorEnabled ? (
                      <FaToggleOn className="h-6 w-6 text-orange-500" />
                    ) : (
                      <FaToggleOff className="h-6 w-6 text-gray-400" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Giriş Bildirimleri</h4>
                    <p className="text-xs text-gray-500">Hesabınıza yeni bir cihazdan giriş yapıldığında bildirim alın</p>
                  </div>
                  <button
                    onClick={() => handleToggle('security', 'loginNotifications', null)}
                    className="text-gray-700"
                  >
                    {settings.security.loginNotifications ? (
                      <FaToggleOn className="h-6 w-6 text-orange-500" />
                    ) : (
                      <FaToggleOff className="h-6 w-6 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Şifre Yönetimi</h4>
                  <p className="text-xs text-gray-500 mb-4">Son şifre değişikliği: {new Date(settings.security.lastPasswordChange).toLocaleDateString('tr-TR')}</p>
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                    Şifremi Değiştir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FreelanceLayout>
  );
}