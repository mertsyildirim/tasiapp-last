'use client'

import React, { useState, useEffect } from 'react'
import { FaSave, FaLock, FaEnvelope, FaBell, FaDesktop, FaDatabase, FaShieldAlt, FaPaintBrush, FaSpinner, FaNewspaper, FaGift, FaHome, FaCog, FaEdit, FaTrash, FaTimes, FaPlus } from 'react-icons/fa'
import AdminLayout from '../../components/admin/Layout'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Oturum kontrolü - sadece admin girişi kontrolü yap
  useEffect(() => {
    // Session durumunu kontrol et
    if (!session) {
      // Oturum yoksa admin giriş sayfasına yönlendir
      router.replace('/admin');
    }
  }, [session, router]);

  const [selectedTab, setSelectedTab] = useState('services')
  
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    homeEnabled: false,
    portalEnabled: false
  })
  const [tempMaintenanceConfig, setTempMaintenanceConfig] = useState({
    homeEnabled: false,
    portalEnabled: false
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [roles, setRoles] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRoles, setSelectedRoles] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);

  // Araç tipleri için state
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [newVehicleType, setNewVehicleType] = useState('');
  const [editingVehicleType, setEditingVehicleType] = useState({ name: '' });
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);
  // Yeni araç tipi ekleme modalı için state
  const [showAddVehicleTypeModal, setShowAddVehicleTypeModal] = useState(false);

  // E-posta ayarları
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPassword: '',
    senderName: '',
    senderEmail: '',
    useSSL: false
  });
  const [testEmail, setTestEmail] = useState('');

  // Bildirim ayarları ve bildirimlerin kendisi
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: false,
    smsNotifications: false,
    desktopNotifications: false,
    systemEvents: false,
    userEvents: false,
    paymentEvents: false,
    shippingEvents: false
  });
  const [notifications, setNotifications] = useState([]);

  // Manuel bildirim gönderme
  const [manualNotification, setManualNotification] = useState({
    title: '',
    message: '',
    type: 'system',
    url: '',
    recipientType: 'all',
    recipientId: '',
    sendEmail: false
  });
  const [isSending, setIsSending] = useState(false);

  // Bakım modu ayarlarını yükle
  useEffect(() => {
    const loadMaintenanceConfig = async () => {
      try {
        const response = await fetch('/api/settings/maintenance');
        const data = await response.json();
        setMaintenanceConfig(data);
        setTempMaintenanceConfig(data);
      } catch (error) {
        console.error('Bakım modu ayarları yüklenirken hata:', error);
      }
    };

    loadMaintenanceConfig();
  }, []);

  // Kullanıcıları yükle
  useEffect(() => {
    if (selectedTab === 'permissions') {
      loadUsers();
    }
  }, [selectedTab]);

  // Kullanıcıları getir
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log('Kullanıcılar yükleniyor...');
      
      // Token doğrulama olmadan test-users API'sini çağırıyoruz
      const response = await fetch('/api/test-users');
      const data = await response.json();
      
      console.log('API yanıtı:', data);
      
      if (data.success && data.users) {
        console.log('Kullanıcılar başarıyla alındı:', data.users.length);
        setUsers(data.users);
      } else {
        console.error('API yanıtında başarı bilgisi yok veya kullanıcı verisi bulunmuyor', data);
        setUsers([]); // Boş dizi ata
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      setUsers([]); // Boş dizi ata
    } finally {
      setLoadingUsers(false);
    }
  };

  // Genel ayarları yükle
  useEffect(() => {
    if (selectedTab === 'general') {
      loadGeneralSettings();
    }
  }, [selectedTab]);

  // Genel ayarları getir
  const loadGeneralSettings = async () => {
    try {
      console.log('Genel ayarlar yükleniyor...');
      setIsSaving(false);
      setSaveMessage('');
      
      const response = await fetch('/api/admin/general-settings');
      
      if (!response.ok) {
        throw new Error('Genel ayarlar getirilemedi');
      }
      
      const result = await response.json();
      console.log('Genel ayarlar:', result);
      
      if (result && result.success && result.data) {
        setGeneralSettings(result.data);
      } else {
        console.error('API yanıt formatı beklenenden farklı:', result);
      }
    } catch (error) {
      console.error('Genel ayarlar yüklenirken hata:', error);
      // Hata olsa da varsayılan ayarlar kullanılacak
    }
  };

  // Genel ayar değişikliklerini işle
  const handleGeneralSettingChange = (field, value) => {
    setGeneralSettings(prev => {
      if (field.startsWith('workingHours.')) {
        const hourField = field.split('.')[1]; // 'start' veya 'end'
        return {
          ...prev,
          workingHours: {
            ...prev.workingHours,
            [hourField]: value
          }
        };
      } else {
        return {
          ...prev,
          [field]: value
        };
      }
    });
  };

  // Genel ayarları kaydet
  const handleSaveGeneralSettings = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');
      console.log('Genel ayarlar kaydediliyor...', generalSettings);
      
      const response = await fetch('/api/admin/general-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(generalSettings)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSaveMessage('Genel ayarlar başarıyla kaydedildi');
      } else {
        setSaveMessage(`Hata: ${data.message || 'Genel ayarlar kaydedilemedi'}`);
      }
    } catch (error) {
      console.error('Genel ayarlar kaydedilirken hata:', error);
      setSaveMessage('Genel ayarlar kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  // Roller tanımı
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoadingRoles(true);
        const response = await fetch('/api/roles');
        const data = await response.json();
        
        if (data.success && data.roles) {
          const formattedRoles = data.roles.map(role => ({
            id: role.id,
            name: role.name,
            description: `${role.permissionCount} yetkiye sahip`
          }));
          setRoles(formattedRoles);
        } else {
          // API'den veri gelmezse varsayılan rolleri kullan
          setRoles([
            { id: 'admin', name: 'Süper Admin', description: 'Tam yetki (tüm işlemler)' },
            { id: 'editor', name: 'İçerik Editörü', description: 'İçerik yönetimi yapabilir' },
            { id: 'support', name: 'Destek Ekibi', description: 'Destek taleplerini yönetebilir' },
            { id: 'customer', name: 'Müşteri', description: 'Standart kullanıcı' },
            { id: 'driver', name: 'Sürücü', description: 'Sürücü kullanıcısı' },
            { id: 'company', name: 'Şirket', description: 'Taşıma şirketi' }
          ]);
        }
      } catch (error) {
        console.error('Roller yüklenirken hata:', error);
        // Hata durumunda varsayılan rolleri kullan
        setRoles([
          { id: 'admin', name: 'Süper Admin', description: 'Tam yetki (tüm işlemler)' },
          { id: 'editor', name: 'İçerik Editörü', description: 'İçerik yönetimi yapabilir' },
          { id: 'support', name: 'Destek Ekibi', description: 'Destek taleplerini yönetebilir' },
          { id: 'customer', name: 'Müşteri', description: 'Standart kullanıcı' },
          { id: 'driver', name: 'Sürücü', description: 'Sürücü kullanıcısı' },
          { id: 'company', name: 'Şirket', description: 'Taşıma şirketi' }
        ]);
      } finally {
        setLoadingRoles(false);
      }
    };
    
    loadRoles();
  }, []);

  // Kullanıcı seçildiğinde mevcut rollerini göster
  const handleUserSelect = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);
    
    if (userId) {
      const user = users.find(u => u.id === userId);
      if (user) {
        console.log('Seçilen kullanıcı rolleri:', user);
        // API'den dönen role veya roles değerini diziye çevir
        let userRoles = [];
        
        if (user.roles && Array.isArray(user.roles)) {
          userRoles = user.roles;
        } else if (user.role) {
          userRoles = Array.isArray(user.role) ? user.role : [user.role];
        } else {
          userRoles = ['customer']; // Varsayılan rol
        }
        
        console.log('Ayarlanan roller:', userRoles);
        setSelectedRoles(userRoles);
      } else {
        setSelectedRoles([]);
      }
    } else {
      setSelectedRoles([]);
    }
  };

  // Rol seçimi değiştiğinde güncelle
  const handleRoleChange = (roleId) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(r => r !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  // Kullanıcı rollerini güncelle
  const updateUserRoles = async () => {
    if (!selectedUser || selectedRoles.length === 0) {
      setSaveMessage('Lütfen bir kullanıcı ve en az bir rol seçin');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/admin/update-user-role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: selectedUser,
          roles: selectedRoles
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSaveMessage('Kullanıcı rolleri başarıyla güncellendi');
        
        // Kullanıcı listesini güncelle
        await loadUsers();
      } else {
        setSaveMessage(`Hata: ${data.error || 'Bilinmeyen bir hata oluştu'}`);
      }
    } catch (error) {
      console.error('Roller güncellenirken hata:', error);
      setSaveMessage('Roller güncellenirken bir hata oluştu');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Bakım modu ayarlarını geçici olarak değiştir
  const handleMaintenanceChange = (type) => {
    setTempMaintenanceConfig(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Tüm ayarları kaydet
  const handleSaveSettings = async () => {
    try {
      // Aktif sekmeye göre uygun kaydetme fonksiyonunu çağır
      if (selectedTab === 'general') {
        await handleSaveGeneralSettings();
        return;
      }
      
      // Bakım modu ayarları için orjinal kod:
      setIsSaving(true);
      const response = await fetch('/api/settings/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tempMaintenanceConfig),
      });

      if (response.ok) {
        setMaintenanceConfig(tempMaintenanceConfig);
        setSaveMessage('Ayarlar başarıyla kaydedildi');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Ayarlar kaydedilirken bir hata oluştu');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Ayarlar kaydedilirken hata:', error);
      setSaveMessage('Ayarlar kaydedilirken bir hata oluştu');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // E-posta ayarlarını yükle
  useEffect(() => {
    if (selectedTab === 'email') {
      loadEmailSettings();
    }
  }, [selectedTab]);

  // E-posta ayarlarını getir
  const loadEmailSettings = async () => {
    try {
      const response = await fetch('/api/admin/email-settings');
      const result = await response.json();
      
      console.log('API Response:', result);
      console.log('API Data:', result.data);
      console.log('API Data Type:', typeof result.data);
      console.log('API Data Keys:', Object.keys(result.data));
      
      if (result.success) {
        const cleanedData = {
          smtpHost: result.data.data.smtpHost || '',
          smtpPort: result.data.data.smtpPort || '',
          smtpUser: result.data.data.smtpUser || '',
          smtpPassword: result.data.data.smtpPassword || '',
          senderName: result.data.data.senderName || '',
          senderEmail: result.data.data.senderEmail || '',
          useSSL: result.data.data.useSSL || false
        };
        
        console.log('Cleaned Data:', cleanedData);
        console.log('Cleaned Data Type:', typeof cleanedData);
        console.log('Cleaned Data Keys:', Object.keys(cleanedData));
        
        setEmailSettings(cleanedData);
        toast.success('E-posta ayarları yüklendi');
      } else {
        toast.error(result.message || 'E-posta ayarları yüklenemedi');
      }
    } catch (error) {
      console.error('E-posta ayarları yüklenirken hata:', error);
      toast.error('E-posta ayarları yüklenirken bir hata oluştu');
    }
  };

  // E-posta ayarlarını değiştir
  const handleEmailSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEmailSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // E-posta ayarlarını kaydet
  const handleSaveEmailSettings = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');
      console.log('E-posta ayarları kaydediliyor...', emailSettings);
      
      // Zorunlu alanları kontrol et
      const requiredFields = ['smtpHost', 'smtpPort', 'smtpUser', 'senderName', 'senderEmail'];
      const missingFields = requiredFields.filter(field => {
        const value = emailSettings[field];
        return value === undefined || value === null || String(value).trim() === '';
      });
      
      if (missingFields.length > 0) {
        const errorMessage = 'Lütfen tüm zorunlu alanları doldurun: ' + 
          missingFields.map(field => {
            switch(field) {
              case 'smtpHost': return 'SMTP Sunucu';
              case 'smtpPort': return 'SMTP Port';
              case 'smtpUser': return 'SMTP Kullanıcı Adı';
              case 'senderName': return 'Gönderen Adı';
              case 'senderEmail': return 'Gönderen E-posta';
              default: return field;
            }
          }).join(', ');
        
        setSaveMessage(`Hata: ${errorMessage}`);
        toast.error(errorMessage);
        setIsSaving(false);
        return;
      }
      
      const response = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailSettings)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSaveMessage('E-posta ayarları başarıyla kaydedildi');
        toast.success('E-posta ayarları başarıyla kaydedildi');
      } else {
        const errorMessage = data.message || 'E-posta ayarları kaydedilemedi';
        setSaveMessage(`Hata: ${errorMessage}`);
        toast.error(`E-posta ayarları kaydedilemedi: ${errorMessage}`);
      }
    } catch (error) {
      console.error('E-posta ayarları kaydedilirken hata:', error);
      const errorMessage = error.message || 'Bilinmeyen bir hata oluştu';
      setSaveMessage(`E-posta ayarları kaydedilirken bir hata oluştu: ${errorMessage}`);
      toast.error(`E-posta ayarları kaydedilirken bir hata oluştu: ${errorMessage}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  // Test e-postası gönder
  const handleSendTestEmail = async () => {
    if (!testEmail) {
      setSaveMessage('Lütfen test için bir e-posta adresi girin');
      toast.warning('Lütfen test için bir e-posta adresi girin');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    
    try {
      setIsSaving(true);
      setSaveMessage('');
      console.log('Test e-postası gönderiliyor:', testEmail);
      
      const response = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'test',
          testEmail: testEmail
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const successMessage = `Test e-postası başarıyla gönderildi: ${testEmail}`;
        setSaveMessage(successMessage);
        toast.success(successMessage);
      } else {
        const errorMessage = data.message || 'Test e-postası gönderilemedi';
        setSaveMessage(`Hata: ${errorMessage}`);
        toast.error(`Test e-postası gönderilemedi: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Test e-postası gönderilirken hata:', error);
      const errorMessage = error.message || 'Bilinmeyen bir hata oluştu';
      setSaveMessage(`Test e-postası gönderilirken bir hata oluştu: ${errorMessage}`);
      toast.error(`Test e-postası gönderilirken bir hata oluştu: ${errorMessage}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  // Bildirimleri yükle
  useEffect(() => {
    if (selectedTab === 'notifications') {
      loadNotifications();
    }
  }, [selectedTab]);
  
  // Bildirimleri getir
  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      console.log('Bildirimler yükleniyor...');
      
      // Token yerine direkt API çağrısı yapıyoruz
      const response = await fetch('/api/admin/notifications?limit=50');
      
      if (!response.ok) {
        throw new Error(`Bildirimler getirilemedi: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API yanıtı:', data);
      
      // API yanıtının yapısını kontrol et ve bildirimleri al
      if (data.success && data.notifications && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      } else {
        console.error('Bilinmeyen API yanıt formatı:', data);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };
  
  // Bildirimleri okundu olarak işaretle
  const markAsRead = async (ids) => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      });
      
      if (!response.ok) {
        throw new Error('Bildirimler işaretlenemedi');
      }
      
      // Bildirimleri yeniden yükle
      loadNotifications();
      setSaveMessage('Bildirimler okundu olarak işaretlendi');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Bildirimler işaretlenirken hata:', error);
      setSaveMessage('Bildirimler işaretlenirken bir hata oluştu');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Bildirimleri sil
  const deleteNotifications = async (ids) => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      });
      
      if (!response.ok) {
        throw new Error('Bildirimler silinemedi');
      }
      
      // Bildirimleri yeniden yükle
      loadNotifications();
      setSaveMessage('Bildirimler silindi');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Bildirimler silinirken hata:', error);
      setSaveMessage('Bildirimler silinirken bir hata oluştu');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Bildirim ayarlarını kaydet
  const handleSaveNotificationSettings = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');
      console.log('Bildirim ayarları kaydediliyor...', notificationSettings);
      
      const response = await fetch('/api/admin/notification-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationSettings)
      });
      
      if (!response.ok) {
        throw new Error('Bildirim ayarları kaydedilemedi');
      }
      
      setSaveMessage('Bildirim ayarları başarıyla kaydedildi');
    } catch (error) {
      console.error('Bildirim ayarları kaydedilirken hata:', error);
      setSaveMessage('Bildirim ayarları kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };
  
  // Bildirim ayarı değişikliği
  const handleNotificationSettingChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Manuel bildirim gönderme
  const handleSendManualNotification = async () => {
    // Boş mesaj ve başlık kontrolü
    if (!manualNotification.title && !manualNotification.message) {
      setSaveMessage('Lütfen en az bir bildirim başlığı veya mesajı girin');
      setTimeout(() => setSaveMessage(''), 5000);
      return;
    }
    
    // Belirli bir kullanıcı seçildiğinde kontrol
    if (manualNotification.recipientType === 'user' && !manualNotification.recipientId) {
      setSaveMessage('Lütfen bir kullanıcı seçin veya farklı bir alıcı türü belirleyin');
      setTimeout(() => setSaveMessage(''), 5000);
      return;
    }
    
    try {
      setIsSending(true);
      setSaveMessage('');
      console.log('Manuel bildirim gönderiliyor...', manualNotification);
      
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(manualNotification)
      });
      
      if (!response.ok) {
        throw new Error('Bildirim gönderilemedi');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSaveMessage('Bildirim başarıyla gönderildi');
        setManualNotification({
          title: '',
          message: '',
          type: 'system',
          url: '',
          recipientType: 'all',
          recipientId: '',
          sendEmail: false
        });
      } else {
        setSaveMessage(`Hata: ${data.error || 'Bildirim gönderilemedi'}`);
      }
    } catch (error) {
      console.error('Bildirim gönderilirken hata:', error);
      setSaveMessage('Bildirim gönderilirken bir hata oluştu');
    } finally {
      setIsSending(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  // Bildirim tipi için CSS sınıfı
  const getNotificationTypeClass = (type) => {
    switch (type) {
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'payment':
        return 'bg-green-100 text-green-800';
      case 'shipping':
      case 'carrier':
        return 'bg-orange-100 text-orange-800';
      case 'message':
        return 'bg-indigo-100 text-indigo-800';
      case 'alert':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Bildirim tipi için okunabilir ad
  const getNotificationTypeName = (type) => {
    switch (type) {
      case 'user':
        return 'Kullanıcı';
      case 'payment':
        return 'Ödeme';
      case 'shipping':
        return 'Taşıma';
      case 'carrier':
        return 'Taşıyıcı';
      case 'message':
        return 'Mesaj';
      case 'alert':
        return 'Uyarı';
      case 'error':
        return 'Hata';
      case 'success':
        return 'Başarılı';
      case 'info':
        return 'Bilgi';
      case 'system':
        return 'Sistem';
      default:
        return type || 'Bilinmiyor';
    }
  };
  
  // Tarih formatla
  const formatDate = (dateString) => {
      const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
  };

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    detailedDescription: '',
    price: '',
    basePrice: '',
    pricePerKm: '',
    maxKm: '',
    isActive: true,
    isInnerCity: true,
    isOuterCity: false,
    icon: '/icons/default.png',
    redirectUrl: '/services/parsiyel',
    packageTitle1: 'Ağırlık',
    packageTitle2: 'Hacim',
    packageTitle3: 'Açıklama',
    packageTitle4: 'Özel Notlar',
    vehicleType: '',
    baseKm: 0,
    urgentFee: 0,
    nightFee: 0
  });

  // Hizmetleri yükle
  useEffect(() => {
    if (selectedTab === 'services') {
      loadServices();
    }
  }, [selectedTab]);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const response = await fetch('/api/admin/services');
      const data = await response.json();
      
      // API direkt olarak hizmetleri döndürüyor
      if (Array.isArray(data)) {
        setServices(data);
      } else {
        console.error('API yanıtında hizmet verisi bulunmuyor', data);
        setServices([]); // Boş dizi ata
      }
    } catch (error) {
      console.error('Hizmetler yüklenirken hata:', error);
      setServices([]); // Boş dizi ata
    } finally {
      setLoadingServices(false);
    }
  };

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [iconPreview, setIconPreview] = useState(null)

  const handleIconChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Dosya önizlemesi için
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('icon', file);
      formData.append('serviceId', editingService._id);
      formData.append('serviceName', editingService.name);
      
      // API'ye gönder
      const response = await fetch('/api/admin/services/upload-icon', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('İkon yüklenirken bir hata oluştu');
      }
      
      const data = await response.json();
      
      // İkon URL'ini güncelle
      handleEditChange('icon', data.iconUrl);
      
      toast.success('İkon başarıyla yüklendi');
    } catch (error) {
      console.error('İkon yüklenirken hata:', error);
      toast.error('İkon yüklenirken bir hata oluştu');
    }
  }

  const handleEditClick = (service) => {
    setEditingService({
      ...service,
      vehicleType: service.vehicleType || '',
      baseKm: service.baseKm || 0,
      urgentFee: service.urgentFee || 0,
      nightFee: service.nightFee || 0
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      // API'ye gönderilecek verileri hazırla
      const updateData = {
        name: editingService.name,
        description: editingService.description,
        detailedDescription: editingService.detailedDescription,
        price: editingService.price,
        is_active: editingService.is_active || editingService.isActive,
        icon: editingService.icon,
        vehicleType: editingService.vehicleType,
        baseKm: editingService.baseKm,
        urgentFee: editingService.urgentFee,
        nightFee: editingService.nightFee,
        basePrice: editingService.basePrice,
        pricePerKm: editingService.pricePerKm,
        maxKm: editingService.maxKm,
        isInnerCity: editingService.isInnerCity,
        isOuterCity: editingService.isOuterCity,
        redirectUrl: editingService.redirectUrl
      };

      // Eğer yeni packageTitles varsa onu kullan, yoksa eski yapıdan veri oluştur
      if (editingService.packageTitles) {
        updateData.packageTitles = editingService.packageTitles;
      } else {
        updateData.packageTitle1 = editingService.packageTitle1 || '';
        updateData.packageTitle2 = editingService.packageTitle2 || '';
        updateData.packageTitle3 = editingService.packageTitle3 || '';
        updateData.packageTitle4 = editingService.packageTitle4 || '';
      }

      const response = await fetch(`/api/admin/services/${editingService._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Hizmet güncellenirken bir hata oluştu');
      }

      toast.success('Hizmet başarıyla güncellendi');
      setShowEditModal(false);
      loadServices(); // Hizmetleri yeniden yükle
    } catch (error) {
      console.error('Hizmet güncelleme hatası:', error);
      toast.error(error.message || 'Hizmet güncellenirken bir hata oluştu');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false)
    setEditingService(null)
  }

  const handleEditChange = (field, value) => {
    setEditingService(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Hizmet durumunu değiştir
  const handleServiceStatusChange = async (serviceId) => {
    try {
      const service = services.find(s => s._id === serviceId);
      if (!service) return;

      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !service.isActive
        }),
      });

      if (!response.ok) {
        throw new Error('Hizmet durumu güncellenirken bir hata oluştu');
      }

      // Başarılı güncelleme sonrası state'i güncelle
      setServices(services.map(s => 
        s._id === serviceId ? { ...s, isActive: !s.isActive } : s
      ));
      
      toast.success('Hizmet durumu başarıyla güncellendi');
    } catch (error) {
      console.error('Hizmet durumu güncellenirken hata:', error);
      toast.error('Hizmet durumu güncellenirken bir hata oluştu');
    }
  }

  // Hizmet fiyatını güncelle
  const handleServicePriceChange = (serviceId, newPrice, field = 'price') => {
    setServices(services.map(service =>
      service.id === serviceId
        ? { ...service, [field]: newPrice }
        : service
    ))
  }

  // Blog ayarları için state
  const [blogSettings, setBlogSettings] = useState({
    enableComments: false,
    allowGuestComments: false,
    postsPerPage: 10,
    defaultCategory: '',
    defaultAuthor: ''
  });

  // Blog ayarlarını kaydet
  const handleSaveBlogSettings = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');
      console.log('Blog ayarları kaydediliyor...', blogSettings);
      
      const response = await fetch('/api/admin/blog-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blogSettings)
      });
      
      if (!response.ok) {
        throw new Error('Blog ayarları kaydedilemedi');
      }
      
      setSaveMessage('Blog ayarları başarıyla kaydedildi');
    } catch (error) {
      console.error('Blog ayarları kaydedilirken hata:', error);
      setSaveMessage('Blog ayarları kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  // Blog ayarı değişikliği
  const handleBlogSettingChange = (field, value) => {
    setBlogSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [campaignSettings, setCampaignSettings] = useState({
    enableCampaigns: false,
    allowMultipleCampaigns: false,
    defaultDiscount: 0
  });

  // Kampanya ayarlarını kaydet
  const handleSaveCampaignSettings = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');
      console.log('Kampanya ayarları kaydediliyor...', campaignSettings);
      
      const response = await fetch('/api/admin/campaign-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignSettings)
      });
      
      if (!response.ok) {
        throw new Error('Kampanya ayarları kaydedilemedi');
      }
      
      setSaveMessage('Kampanya ayarları başarıyla kaydedildi');
    } catch (error) {
      console.error('Kampanya ayarları kaydedilirken hata:', error);
      setSaveMessage('Kampanya ayarları kaydedilirken bir hata oluştu');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  // Kampanya ayarı değişikliği
  const handleCampaignSettingChange = (field, value) => {
    setCampaignSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddService = async () => {
    try {
      console.log('Yeni hizmet ekleniyor:', newService);
      
      // Boş alan kontrolü
      if (!newService.name || !newService.description) {
        alert('Lütfen hizmet adı ve açıklamasını doldurun');
        return;
      }

      // Session kontrolü - useSession hook'undan gelen session bilgisini kullan
      if (!session) {
        alert('Bu işlem için oturum açmanız gerekmektedir');
        return;
      }

      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newService,
          price: newService.basePrice,
          vehicleType: newService.vehicleType,
          baseKm: newService.baseKm,
          urgentFee: newService.urgentFee,
          nightFee: newService.nightFee,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      });

      console.log('API yanıtı:', response);

      if (response.ok) {
        const result = await response.json();
        console.log('Hizmet başarıyla eklendi:', result);
        
        setShowAddModal(false);
        setNewService({
          name: '',
          description: '',
          detailedDescription: '',
          price: '',
          basePrice: '',
          pricePerKm: '',
          maxKm: '',
          isActive: true,
          isInnerCity: true,
          isOuterCity: false,
          icon: '/icons/default.png',
          redirectUrl: '/services/parsiyel',
          packageTitle1: 'Ağırlık',
          packageTitle2: 'Hacim',
          packageTitle3: 'Açıklama',
          packageTitle4: 'Özel Notlar',
          vehicleType: '',
          baseKm: 0,
          urgentFee: 0,
          nightFee: 0
        });
        
        // Hizmetleri yeniden yükle
        loadServices();
      } else {
        const error = await response.json();
        console.error('API hatası:', error);
        alert('Hizmet eklenirken bir hata oluştu: ' + error.message);
      }
    } catch (error) {
      console.error('Hizmet eklenirken hata:', error);
      alert('Hizmet eklenirken bir hata oluştu');
    }
  };

  const handleNewServiceChange = (field, value) => {
    setNewService(prev => ({
      ...prev,
      [field]: value
    }));
  };

  {selectedTab === 'blog' && (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Blog Ayarları</h2>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Genel Ayarlar</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Yorumlar</label>
                <p className="text-sm text-gray-500">Blog yazılarında yorum yapılmasına izin ver</p>
              </div>
              <button
                onClick={() => handleBlogSettingChange('enableComments', !blogSettings.enableComments)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  blogSettings.enableComments ? 'bg-orange-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    blogSettings.enableComments ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Misafir Yorumları</label>
                <p className="text-sm text-gray-500">Üye olmayan kullanıcıların yorum yapmasına izin ver</p>
              </div>
              <button
                onClick={() => handleBlogSettingChange('allowGuestComments', !blogSettings.allowGuestComments)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  blogSettings.allowGuestComments ? 'bg-orange-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    blogSettings.allowGuestComments ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sayfa Başına Yazı
              </label>
              <input
                type="number"
                value={blogSettings.postsPerPage}
                onChange={(e) => handleBlogSettingChange('postsPerPage', parseInt(e.target.value))}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                min="1"
                max="50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Varsayılan Kategori
              </label>
              <input
                type="text"
                value={blogSettings.defaultCategory}
                onChange={(e) => setBlogSettings(prev => ({ ...prev, defaultCategory: e.target.value }))}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Varsayılan Yazar
              </label>
              <input
                type="text"
                value={blogSettings.defaultAuthor}
                onChange={(e) => setBlogSettings(prev => ({ ...prev, defaultAuthor: e.target.value }))}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveBlogSettings}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            disabled={isSaving}
          >
            <FaSave className="mr-2" />
            {isSaving ? 'Kaydediliyor...' : 'Blog Ayarlarını Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )}

  {selectedTab === 'campaigns' && (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Kampanya Ayarları</h2>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Genel Ayarlar</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Kampanyalar</label>
                <p className="text-sm text-gray-500">Kampanya sistemini aktif et</p>
              </div>
              <button
                onClick={() => handleCampaignSettingChange('enableCampaigns', !campaignSettings.enableCampaigns)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  campaignSettings.enableCampaigns ? 'bg-orange-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    campaignSettings.enableCampaigns ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Çoklu Kampanya</label>
                <p className="text-sm text-gray-500">Bir siparişte birden fazla kampanya kullanılmasına izin ver</p>
              </div>
              <button
                onClick={() => handleCampaignSettingChange('allowMultipleCampaigns', !campaignSettings.allowMultipleCampaigns)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  campaignSettings.allowMultipleCampaigns ? 'bg-orange-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    campaignSettings.allowMultipleCampaigns ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Varsayılan İndirim Oranı (%)
              </label>
              <input
                type="number"
                value={campaignSettings.defaultDiscount}
                onChange={(e) => handleCampaignSettingChange('defaultDiscount', parseInt(e.target.value))}
                className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 mb-8">
        <button
          type="button"
          onClick={handleSaveCampaignSettings}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          disabled={isSaving}
        >
          <FaSave className="mr-2" />
          {isSaving ? 'Kaydediliyor...' : 'Kampanya Ayarlarını Kaydet'}
        </button>
      </div>
    </div>
  )}

  const loadVehicleTypes = async () => {
    try {
      const response = await fetch('/api/admin/vehicle-types')
      if (!response.ok) {
        throw new Error('Araç tipleri yüklenirken bir hata oluştu')
      }
      const data = await response.json()
      setVehicleTypes(data)
    } catch (error) {
      console.error('Araç tipleri yükleme hatası:', error)
      toast.error(error.message)
    }
  }

  const handleAddVehicleType = async () => {
    try {
      if (!newVehicleType.trim()) {
        toast.error('Araç tipi adı boş olamaz')
        return
      }

      const response = await fetch('/api/admin/vehicle-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newVehicleType.trim() })
      })

      if (!response.ok) {
        throw new Error('Araç tipi eklenirken bir hata oluştu')
      }

      toast.success('Araç tipi başarıyla eklendi')
      setNewVehicleType('')
      setShowAddVehicleTypeModal(false); // Modal'ı kapat
      loadVehicleTypes()
    } catch (error) {
      console.error('Araç tipi ekleme hatası:', error)
      toast.error(error.message)
    }
  }

  const handleOpenEditVehicleTypeModal = (type) => {
    setEditingVehicleType(type)
    setShowVehicleTypeModal(true)
  }

  const handleCloseVehicleTypeModal = () => {
    setEditingVehicleType({ name: '' })
    setShowVehicleTypeModal(false)
  }

  const handleVehicleTypeChange = (e) => {
    setEditingVehicleType({ ...editingVehicleType, name: e.target.value })
  }

  const handleEditVehicleType = async () => {
    try {
      if (!editingVehicleType.name.trim()) {
        toast.error('Araç tipi adı boş olamaz')
        return
      }

      const response = await fetch(`/api/admin/vehicle-types/${editingVehicleType._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editingVehicleType.name.trim() })
      })

      if (!response.ok) {
        throw new Error('Araç tipi güncellenirken bir hata oluştu')
      }

      toast.success('Araç tipi başarıyla güncellendi')
      handleCloseVehicleTypeModal()
      loadVehicleTypes()
    } catch (error) {
      console.error('Araç tipi güncelleme hatası:', error)
      toast.error(error.message)
    }
  }

  const handleDeleteVehicleType = async (id) => {
    try {
      if (!confirm('Bu araç tipini silmek istediğinizden emin misiniz?')) {
        return;
      }

      const response = await fetch(`/api/admin/vehicle-types/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Araç tipi silinirken bir hata oluştu');
      }

      toast.success('Araç tipi başarıyla silindi');
      loadVehicleTypes();
    } catch (error) {
      console.error('Araç tipi silme hatası:', error);
      toast.error(error.message);
    }
  };

  useEffect(() => {
    loadVehicleTypes()
  }, [])

  // Paket bilgileri başlıkları için yeni state ekleyelim
  const [showPackageInfoModal, setShowPackageInfoModal] = useState(false);
  const [editingPackageInfo, setEditingPackageInfo] = useState([]);
  const [newPackageTitle, setNewPackageTitle] = useState({
    id: Date.now().toString(),
    title: '',
    subtitle: [],
    required: false,
    type: 'input',
    icon: ''
  });
  const [newSubtitle, setNewSubtitle] = useState('');

  // Paket bilgilerini düzenleme modlını açmak için fonksiyon
  const handleOpenPackageInfoModal = () => {
    // Eğer mevcut paket bilgileri varsa, onları kullan
    if (editingService.packageTitles && editingService.packageTitles.length > 0) {
      setEditingPackageInfo(editingService.packageTitles);
    } 
    // Yoksa eski yapıdan yeni yapıya dönüştür
    else {
      const titles = [];
      if (editingService.packageTitle1) {
        titles.push({
          id: '1',
          title: editingService.packageTitle1,
          subtitle: [],
          required: false,
          type: 'input',
          icon: ''
        });
      }
      if (editingService.packageTitle2) {
        titles.push({
          id: '2',
          title: editingService.packageTitle2,
          subtitle: [],
          required: false,
          type: 'input',
          icon: ''
        });
      }
      if (editingService.packageTitle3) {
        titles.push({
          id: '3',
          title: editingService.packageTitle3,
          subtitle: [],
          required: false,
          type: 'input',
          icon: ''
        });
      }
      if (editingService.packageTitle4) {
        titles.push({
          id: '4',
          title: editingService.packageTitle4,
          subtitle: [],
          required: false,
          type: 'input',
          icon: ''
        });
      }
      setEditingPackageInfo(titles);
    }
    setShowPackageInfoModal(true);
  };

  // Paket bilgilerini kaydet ve modalı kapat
  const handleSavePackageInfo = () => {
    handleEditChange('packageTitles', editingPackageInfo);
    setShowPackageInfoModal(false);
  };

  // Yeni başlık ekle
  const handleAddPackageTitle = () => {
    if (newPackageTitle.title.trim() === '') {
      toast.error('Başlık alanı boş olamaz');
      return;
    }
    
    setEditingPackageInfo([...editingPackageInfo, { ...newPackageTitle, id: Date.now().toString() }]);
    setNewPackageTitle({
      id: Date.now().toString(),
      title: '',
      subtitle: [],
      required: false,
      type: 'input',
      icon: ''
    });
  };

  // Başlık güncelleme
  const handlePackageTitleChange = (id, field, value) => {
    setEditingPackageInfo(editingPackageInfo.map(title => 
      title.id === id ? { ...title, [field]: value } : title
    ));
  };

  // Başlık silme
  const handleDeletePackageTitle = (id) => {
    setEditingPackageInfo(editingPackageInfo.filter(title => title.id !== id));
  };

  // Alt başlık ekleme
  const handleAddSubtitle = (titleId) => {
    if (newSubtitle.trim() === '') {
      toast.error('Alt başlık alanı boş olamaz');
      return;
    }
    
    setEditingPackageInfo(editingPackageInfo.map(title => 
      title.id === titleId ? 
      { 
        ...title, 
        subtitle: [...title.subtitle, { text: newSubtitle, icon: '' }]
      } : 
      title
    ));
    setNewSubtitle('');
  };

  // Alt başlık silme
  const handleDeleteSubtitle = (titleId, subtitleIndex) => {
    setEditingPackageInfo(editingPackageInfo.map(title => 
      title.id === titleId ? 
      { ...title, subtitle: title.subtitle.filter((_, index) => index !== subtitleIndex) } : 
      title
    ));
  };

  // Alt başlık güncelleme
  const handleSubtitleChange = (titleId, index, field, value) => {
    setEditingPackageInfo(editingPackageInfo.map(title => 
      title.id === titleId ? {
        ...title,
        subtitle: title.subtitle.map((sub, subIndex) => 
          subIndex === index ? 
          (typeof sub === 'string' ? 
            { text: sub, icon: value } : // String ise objeye dönüştür
            { ...sub, [field]: value }   // Zaten obje ise update et
          ) : sub
        )
      } : title
    ));
  };

  // Genel ayarlar state'i
  const [generalSettings, setGeneralSettings] = useState({
    siteName: '',
    contactEmail: '',
    phone: '',
    address: '',
    workingHours: {
      start: '',
      end: ''
    }
  });

  // Hizmet silme fonksiyonu - services state'ini ve diğer ilgili kodları kullanarak ekleyin
  const handleDeleteService = async (serviceId) => {
    if (window.confirm('Bu hizmeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        const response = await fetch(`/api/admin/services/${serviceId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Hizmet silinirken bir hata oluştu');
        }

        // Başarılı silme işlemi sonrası state'i güncelle
        setServices(services.filter(service => service._id !== serviceId));
        toast.success('Hizmet başarıyla silindi');
      } catch (error) {
        console.error('Hizmet silme hatası:', error);
        toast.error(error.message || 'Hizmet silinirken bir hata oluştu');
      }
    }
  };

  const handleOpenAddVehicleTypeModal = () => {
    setNewVehicleType(''); // Yeni ekleme yaparken alanı temizle
    setShowAddVehicleTypeModal(true);
  };

  const handleCloseAddVehicleTypeModal = () => {
    setShowAddVehicleTypeModal(false);
  };

  // Bildirim ayarlarını yükle
  useEffect(() => {
    if (selectedTab === 'notifications') {
      loadNotificationSettings();
    }
  }, [selectedTab]);

  // Bildirim ayarlarını getir
  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/admin/notification-settings');
      const result = await response.json();
      
      if (result.success && result.data) {
        setNotificationSettings(result.data);
      } else {
        console.error('Bildirim ayarları yüklenemedi:', result.message);
      }
    } catch (error) {
      console.error('Bildirim ayarları yüklenirken hata:', error);
    }
  };

  // Kampanya ayarlarını yükle
  useEffect(() => {
    if (selectedTab === 'campaigns') {
      loadCampaignSettings();
    }
  }, [selectedTab]);

  // Kampanya ayarlarını getir
  const loadCampaignSettings = async () => {
    try {
      const response = await fetch('/api/admin/campaign-settings');
      const result = await response.json();
      
      if (result.success && result.data) {
        setCampaignSettings(result.data);
      } else {
        console.error('Kampanya ayarları yüklenemedi:', result.message);
      }
    } catch (error) {
      console.error('Kampanya ayarları yüklenirken hata:', error);
    }
  };

  // Markalar için state'ler
  const [brands, setBrands] = useState([]);
  const [newBrand, setNewBrand] = useState({
    name: '',
    vehicleType: '',
    models: []
  });
  const [editingBrand, setEditingBrand] = useState(null);
  const [newModel, setNewModel] = useState('');
  const [newBrandModel, setNewBrandModel] = useState('');

  // Araç tipleri listesi
  const vehicleTypeList = [
    'Motosiklet',
    'Otomobil',
    'Kamyonet',
    'Kamyon',
    'Tır',
    'Minibüs',
    'Otobüs'
  ];

  // Markaları yükle
  const loadBrands = async () => {
    try {
      setLoadingBrands(true);
      console.log("Markalar yükleniyor...");
      const response = await fetch('/api/admin/vehicle-brands');
      const data = await response.json();
      
      if (data.success) {
        console.log(`${data.brands.length} marka yüklendi`);
        setBrands(data.brands);
      } else {
        console.error("Markalar yüklenirken hata:", data.message);
        toast.error(data.message || 'Markalar yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Markalar yüklenirken hata:', error);
      toast.error('Markalar yüklenirken bir hata oluştu');
    } finally {
      setLoadingBrands(false);
    }
  };

  // Marka ekle
  const handleAddBrand = async () => {
    if (!newBrand.name || !newBrand.vehicleType) {
      toast.error('Lütfen marka adı ve araç tipini girin');
      return;
    }

    // ObjectId formatına çevir
    const formattedBrand = {
      ...newBrand,
      models: newBrandModel ? [newBrandModel] : []
    };

    try {
      console.log("Marka ekleniyor:", formattedBrand);
      const response = await fetch('/api/admin/vehicle-brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedBrand)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Marka başarıyla eklendi');
        setNewBrand({ name: '', vehicleType: '', models: [] });
        setNewBrandModel('');
        loadBrands();
      } else {
        console.error("Marka eklenirken hata:", data.message);
        toast.error(data.message || 'Marka eklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Marka eklenirken hata:', error);
      toast.error('Marka eklenirken bir hata oluştu');
    }
  };

  // Marka düzenle
  const handleEditBrand = async (brandId) => {
    try {
      console.log("Marka güncelleniyor:", editingBrand);
      const response = await fetch(`/api/admin/vehicle-brands/${editingBrand._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingBrand)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Marka başarıyla güncellendi');
        setEditingBrand(null);
        loadBrands();
      } else {
        toast.error(data.message || 'Marka güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Marka güncellenirken hata:', error);
      toast.error('Marka güncellenirken bir hata oluştu');
    }
  };

  // Marka sil
  const handleDeleteBrand = async (brandId) => {
    if (!confirm('Bu markayı silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/admin/vehicle-brands/${brandId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Marka başarıyla silindi');
        loadBrands();
      } else {
        toast.error(data.message || 'Marka silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Marka silinirken hata:', error);
      toast.error('Marka silinirken bir hata oluştu');
    }
  };

  // Model ekle
  const handleAddModel = async (brandId) => {
    if (!newModel.trim()) {
      toast.error('Lütfen model adını girin');
      return;
    }

    try {
      const response = await fetch(`/api/admin/vehicle-brands/${brandId}/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newModel })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Model başarıyla eklendi');
        setNewModel('');
        loadBrands();
      } else {
        toast.error(data.message || 'Model eklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Model eklenirken hata:', error);
      toast.error('Model eklenirken bir hata oluştu');
    }
  };

  // Model sil
  const handleDeleteModel = async (brandId, modelName) => {
    if (!confirm('Bu modeli silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/admin/vehicle-brands/${brandId}/models/${encodeURIComponent(modelName)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Model başarıyla silindi');
        loadBrands();
      } else {
        toast.error(data.message || 'Model silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Model silinirken hata:', error);
      toast.error('Model silinirken bir hata oluştu');
    }
  };

  // Markalar sekmesi seçildiğinde verileri yükle
  useEffect(() => {
    if (selectedTab === 'brands') {
      loadBrands();
      loadVehicleTypes();
    }
  }, [selectedTab]);

  return (
    <AdminLayout title="Sistem Ayarları">
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
          <div className="border-b mb-4 pb-3 flex flex-nowrap overflow-x-auto">
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'general' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('general')}
            >
              Genel Ayarlar
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'email' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('email')}
            >
              E-posta
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'security' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('security')}
            >
              Güvenlik
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'notifications' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('notifications')}
            >
              Bildirimler
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'permissions' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('permissions')}
            >
              İzinler
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'services' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('services')}
            >
              Hizmetler
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'blog' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('blog')}
            >
              Blog
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'campaigns' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('campaigns')}
            >
              Kampanyalar
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'vehicleTypes' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('vehicleTypes')}
            >
              Araç Tipleri
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${selectedTab === 'brands' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setSelectedTab('brands')}
            >
              Markalar
            </button>
          </div>

          {selectedTab === 'services' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Hizmetler</h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                >
                  Yeni Hizmet Ekle
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hizmet Adı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Açıklama
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Açılış Fiyatı (TL)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        KM Fiyatı (TL)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Max. KM
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Şehir İçi/Dışı
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {services.map((service) => (
                      <tr key={service.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{service.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{service.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{service.price} TL</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{service.pricePerKm} TL</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{service.maxKm} km</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col items-start space-y-1">
                            <div className="flex items-center">
                              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${service.isInnerCity ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                              <span className="text-sm text-gray-600">Şehir İçi</span>
                            </div>
                            <div className="flex items-center">
                              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${service.isOuterCity ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                              <span className="text-sm text-gray-600">Şehir Dışı</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-end items-center space-x-2">
                            <button
                              onClick={() => handleServiceStatusChange(service._id)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                service.isActive ? 'bg-orange-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  service.isActive ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="text-sm text-gray-500">
                              {service.isActive ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-3">
                            <button 
                              onClick={() => handleEditClick(service)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <FaEdit className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteService(service._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FaTrash className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedTab === 'vehicleTypes' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Araç Tipleri</h2>
              <div className="mb-4">
                <button
                  onClick={handleOpenAddVehicleTypeModal}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center"
                >
                  <FaPlus className="mr-2" /> Yeni Araç Tipi Ekle
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Araç Tipi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Oluşturulma Tarihi
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vehicleTypes.map((type) => (
                      <tr key={type._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{type.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {formatDate(new Date(type.createdAt))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleOpenEditVehicleTypeModal(type)}
                            className="text-orange-600 hover:text-orange-900 mr-4"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteVehicleType(type._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedTab === 'general' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Genel Ayarlar</h2>
              
              <div className="mb-6">
                <label htmlFor="site-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Site Adı
                </label>
                <input
                  type="text"
                  id="site-name"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Taşı App"
                  value={generalSettings.siteName}
                  onChange={(e) => handleGeneralSettingChange('siteName', e.target.value)}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                  İletişim E-postası
                </label>
                <input
                  type="email"
                  id="contact-email"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="iletisim@tasiapp.com"
                  value={generalSettings.contactEmail}
                  onChange={(e) => handleGeneralSettingChange('contactEmail', e.target.value)}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon Numarası
                </label>
                <input
                  type="text"
                  id="phone"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="+90 212 123 4567"
                  value={generalSettings.phone}
                  onChange={(e) => handleGeneralSettingChange('phone', e.target.value)}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Şirket Adresi
                </label>
                <textarea
                  id="address"
                  rows="3"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="İstanbul, Türkiye"
                  value={generalSettings.address}
                  onChange={(e) => handleGeneralSettingChange('address', e.target.value)}
                ></textarea>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Çalışma Saatleri
                </label>
                <div className="flex flex-col md:flex-row md:space-x-4">
                  <input
                    type="text"
                    className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-2 md:mb-0"
                    placeholder="Başlangıç Saati"
                    value={generalSettings.workingHours.start}
                    onChange={(e) => handleGeneralSettingChange('workingHours.start', e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Bitiş Saati"
                    value={generalSettings.workingHours.end}
                    onChange={(e) => handleGeneralSettingChange('workingHours.end', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bakım Modu
                </label>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="maintenance-mode-home"
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      checked={tempMaintenanceConfig.homeEnabled}
                      onChange={() => handleMaintenanceChange('homeEnabled')}
                      disabled={isSaving}
                    />
                    <label htmlFor="maintenance-mode-home" className="ml-2 block text-sm text-gray-900">
                      Anasayfa bakım modunu etkinleştir (tasiapp.com)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="maintenance-mode-portal"
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      checked={tempMaintenanceConfig.portalEnabled}
                      onChange={() => handleMaintenanceChange('portalEnabled')}
                      disabled={isSaving}
                    />
                    <label htmlFor="maintenance-mode-portal" className="ml-2 block text-sm text-gray-900">
                      Portal bakım modunu etkinleştir (/portal/* sayfaları)
                    </label>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Not: Admin paneli hiçbir zaman bakım moduna girmez. Anasayfa bakım modu yalnızca ana sayfayı, portal bakım modu ise yalnızca /portal altındaki sayfaları etkiler.
                  </p>
                  {saveMessage && (
                    <p className={`mt-2 text-sm ${saveMessage.includes('hata') ? 'text-red-600' : 'text-green-600'}`}>
                      {saveMessage}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  <FaSave className="mr-2" />
                  {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
              </div>
            </div>
          )}

          {selectedTab === 'blog' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Blog Ayarları</h2>
              
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Genel Ayarlar</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Yorumlar</label>
                        <p className="text-sm text-gray-500">Blog yazılarında yorum yapılmasına izin ver</p>
                      </div>
                      <button
                        onClick={() => setBlogSettings(prev => ({ ...prev, enableComments: !prev.enableComments }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                          blogSettings.enableComments ? 'bg-orange-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            blogSettings.enableComments ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Yorum Onayı</label>
                        <p className="text-sm text-gray-500">Yorumlar yayınlanmadan önce onay gereksin</p>
                      </div>
                      <button
                        onClick={() => setBlogSettings(prev => ({ ...prev, moderateComments: !prev.moderateComments }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                          blogSettings.moderateComments ? 'bg-orange-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            blogSettings.moderateComments ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Misafir Yorumları</label>
                        <p className="text-sm text-gray-500">Üye olmayan kullanıcıların yorum yapmasına izin ver</p>
                      </div>
                      <button
                        onClick={() => setBlogSettings(prev => ({ ...prev, allowGuestComments: !prev.allowGuestComments }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                          blogSettings.allowGuestComments ? 'bg-orange-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            blogSettings.allowGuestComments ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sayfa Başına Yazı
                      </label>
                      <input
                        type="number"
                        value={blogSettings.postsPerPage}
                        onChange={(e) => setBlogSettings(prev => ({ ...prev, postsPerPage: parseInt(e.target.value) }))}
                        className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        min="1"
                        max="50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Varsayılan Kategori
                      </label>
                      <input
                        type="text"
                        value={blogSettings.defaultCategory}
                        onChange={(e) => setBlogSettings(prev => ({ ...prev, defaultCategory: e.target.value }))}
                        className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Varsayılan Yazar
                      </label>
                      <input
                        type="text"
                        value={blogSettings.defaultAuthor}
                        onChange={(e) => setBlogSettings(prev => ({ ...prev, defaultAuthor: e.target.value }))}
                        className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveBlogSettings}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    disabled={isSaving}
                  >
                    <FaSave className="mr-2" />
                    {isSaving ? 'Kaydediliyor...' : 'Blog Ayarlarını Kaydet'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedTab === 'security' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Güvenlik ve Giriş Ayarları</h2>
              
              <div className="mb-6">
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mevcut Şifre
                </label>
                <input
                  type="password"
                  id="current-password"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  id="new-password"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Şifreyi Tekrarla
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İki Faktörlü Doğrulama
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="two-factor"
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label htmlFor="two-factor" className="ml-2 block text-sm text-gray-900">
                    İki faktörlü doğrulamayı etkinleştir
                  </label>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Hesabınızı korumak için giriş yaparken ek bir doğrulama kodu gerekir.
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Oturum Açma Girişimleri
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="3"
                    max="10"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    defaultValue="5"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    başarısız girişten sonra hesabı kilitle
                  </label>
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <FaSave className="mr-2" />
                  Güvenlik Ayarlarını Kaydet
                </button>
              </div>
            </div>
          )}

          {selectedTab === 'email' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">E-posta Ayarları</h2>
              
              {saveMessage && (
                <div className={`mb-4 p-3 rounded-lg ${saveMessage.includes('başarı') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {saveMessage}
                </div>
              )}
              
              <div className="mb-6">
                <label htmlFor="smtp-host" className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Sunucu
                </label>
                <input
                  type="text"
                  id="smtp-host"
                  name="smtpHost"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="smtp.example.com"
                  value={emailSettings.smtpHost}
                  onChange={handleEmailSettingChange}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="smtp-port" className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Port
                </label>
                <input
                  type="text"
                  id="smtp-port"
                  name="smtpPort"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="587"
                  value={emailSettings.smtpPort}
                  onChange={handleEmailSettingChange}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="smtp-user" className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Kullanıcı Adı
                </label>
                <input
                  type="text"
                  id="smtp-user"
                  name="smtpUser"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="email@example.com"
                  value={emailSettings.smtpUser}
                  onChange={handleEmailSettingChange}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="smtp-pass" className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Şifre
                </label>
                <input
                  type="password"
                  id="smtp-pass"
                  name="smtpPassword"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="••••••••"
                  value={emailSettings.smtpPassword}
                  onChange={handleEmailSettingChange}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="sender-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Gönderen Adı
                </label>
                <input
                  type="text"
                  id="sender-name"
                  name="senderName"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Şirket Adı"
                  value={emailSettings.senderName}
                  onChange={handleEmailSettingChange}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="sender-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Gönderen E-posta
                </label>
                <input
                  type="email"
                  id="sender-email"
                  name="senderEmail"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="bildirim@sirketiniz.com"
                  value={emailSettings.senderEmail}
                  onChange={handleEmailSettingChange}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta Şifreleme
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="use-ssl"
                    name="useSSL"
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    checked={emailSettings.useSSL}
                    onChange={handleEmailSettingChange}
                  />
                  <label htmlFor="use-ssl" className="ml-2 block text-sm text-gray-900">
                    SSL kullan
                  </label>
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="test-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Test E-postası İçin Alıcı
                </label>
                <div className="flex">
                  <input
                    type="email"
                    id="test-email"
                    className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                <button
                  type="button"
                    onClick={handleSendTestEmail}
                    className="px-4 py-2 bg-orange-600 text-white rounded-r-md hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={isSaving}
                >
                    {isSaving ? 'Gönderiliyor...' : 'Test E-postası Gönder'}
                </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Test e-postası göndermeden önce ayarları kaydetmeniz önerilir.
                </p>
              </div>
              
              <div className="mt-8">
                <button
                  type="button"
                  onClick={handleSaveEmailSettings}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  disabled={isSaving}
                >
                  <FaSave className="mr-2" />
                  {isSaving ? 'Kaydediliyor...' : 'E-posta Ayarlarını Kaydet'}
                </button>
              </div>
            </div>
          )}

          {selectedTab === 'notifications' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Bildirim Ayarları</h2>
              
              {saveMessage && (
                <div className={`mb-4 p-3 rounded-lg ${saveMessage.includes('başarı') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {saveMessage}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Bildirim Kanalları</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="emailNotifications"
                        name="emailNotifications"
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        checked={notificationSettings.emailNotifications}
                        onChange={handleNotificationSettingChange}
                      />
                      <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                        E-posta bildirimleri
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="smsNotifications"
                        name="smsNotifications"
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        checked={notificationSettings.smsNotifications}
                        onChange={handleNotificationSettingChange}
                      />
                      <label htmlFor="smsNotifications" className="ml-2 block text-sm text-gray-900">
                        SMS bildirimleri
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="desktopNotifications"
                        name="desktopNotifications"
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        checked={notificationSettings.desktopNotifications}
                        onChange={handleNotificationSettingChange}
                      />
                      <label htmlFor="desktopNotifications" className="ml-2 block text-sm text-gray-900">
                        Masaüstü bildirimleri
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Bildirim Olayları</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="systemEvents"
                        name="systemEvents"
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        checked={notificationSettings.systemEvents}
                        onChange={handleNotificationSettingChange}
                      />
                      <label htmlFor="systemEvents" className="ml-2 block text-sm text-gray-900">
                        Sistem olayları
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="userEvents"
                        name="userEvents"
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        checked={notificationSettings.userEvents}
                        onChange={handleNotificationSettingChange}
                      />
                      <label htmlFor="userEvents" className="ml-2 block text-sm text-gray-900">
                        Kullanıcı olayları
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="paymentEvents"
                        name="paymentEvents"
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        checked={notificationSettings.paymentEvents}
                        onChange={handleNotificationSettingChange}
                      />
                      <label htmlFor="paymentEvents" className="ml-2 block text-sm text-gray-900">
                        Ödeme olayları
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="shippingEvents"
                        name="shippingEvents"
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        checked={notificationSettings.shippingEvents}
                        onChange={handleNotificationSettingChange}
                      />
                      <label htmlFor="shippingEvents" className="ml-2 block text-sm text-gray-900">
                        Taşıma olayları
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 mb-8">
                <button
                  type="button"
                  onClick={handleSaveNotificationSettings}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  disabled={isSaving}
                >
                  <FaSave className="mr-2" />
                  {isSaving ? 'Kaydediliyor...' : 'Bildirim Ayarlarını Kaydet'}
                </button>
              </div>
              
              {/* Manuel Bildirim Gönderme Bölümü */}
              <div className="mt-8 mb-8 p-5 border rounded-lg bg-white">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Manuel Bildirim Gönder</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Belirli bir kullanıcıya veya tüm kullanıcılara manuel olarak bildirim gönderebilirsiniz.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="notification-title" className="block text-sm font-medium text-gray-700 mb-1">
                      Bildirim Başlığı
                    </label>
                    <input
                      type="text"
                      id="notification-title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Bildirim başlığını girin"
                      value={manualNotification.title}
                      onChange={(e) => setManualNotification({...manualNotification, title: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="notification-message" className="block text-sm font-medium text-gray-700 mb-1">
                      Bildirim Mesajı
                    </label>
                    <textarea
                      id="notification-message"
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Bildirim içeriğini girin"
                      value={manualNotification.message}
                      onChange={(e) => setManualNotification({...manualNotification, message: e.target.value})}
                    ></textarea>
                  </div>
                  
                  <div>
                    <label htmlFor="notification-type" className="block text-sm font-medium text-gray-700 mb-1">
                      Bildirim Türü
                    </label>
                    <select
                      id="notification-type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={manualNotification.type}
                      onChange={(e) => setManualNotification({...manualNotification, type: e.target.value})}
                    >
                      <option value="system">Sistem Bildirimi</option>
                      <option value="user">Kullanıcı Bildirimi</option>
                      <option value="payment">Ödeme Bildirimi</option>
                      <option value="shipping">Taşıma Bildirimi</option>
                      <option value="alert">Uyarı</option>
                      <option value="info">Bilgi</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="notification-url" className="block text-sm font-medium text-gray-700 mb-1">
                      Yönlendirme URL (İsteğe Bağlı)
                    </label>
                    <input
                      type="text"
                      id="notification-url"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Örn: /admin/users"
                      value={manualNotification.url}
                      onChange={(e) => setManualNotification({...manualNotification, url: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Bildirimlere tıklandığında yönlendirilecek sayfa adresi
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="notification-recipient" className="block text-sm font-medium text-gray-700 mb-1">
                      Alıcı
                    </label>
                    <select
                      id="notification-recipient"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={manualNotification.recipientType}
                      onChange={(e) => setManualNotification({...manualNotification, recipientType: e.target.value})}
                    >
                      <option value="all">Tüm Kullanıcılar</option>
                      <option value="admins">Tüm Yöneticiler</option>
                      <option value="customers">Tüm Müşteriler</option>
                      <option value="carriers">Tüm Taşıyıcılar</option>
                      <option value="drivers">Tüm Sürücüler</option>
                      <option value="user">Belirli Bir Kullanıcı</option>
                    </select>
                  </div>
                  
                  {manualNotification.recipientType === 'user' && (
                    <div>
                      <label htmlFor="notification-user" className="block text-sm font-medium text-gray-700 mb-1">
                        Kullanıcı Seç
                      </label>
                      <select
                        id="notification-user"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        value={manualNotification.recipientId}
                        onChange={(e) => setManualNotification({...manualNotification, recipientId: e.target.value})}
                      >
                        <option value="">Bir kullanıcı seçin</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notification-email"
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      checked={manualNotification.sendEmail}
                      onChange={(e) => setManualNotification({...manualNotification, sendEmail: e.target.checked})}
                    />
                    <label htmlFor="notification-email" className="ml-2 block text-sm text-gray-900">
                      Aynı zamanda e-posta olarak da gönder
                    </label>
                  </div>
                  
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleSendManualNotification}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      disabled={isSending}
                    >
                      {isSending ? <FaSpinner className="animate-spin mr-2" /> : <FaBell className="mr-2" />}
                      {isSending ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Son Bildirimler</h3>
                
                {loadingNotifications ? (
                  <div className="text-center py-4">
                    <FaSpinner className="animate-spin inline-block h-6 w-6 text-orange-500" />
                    <p className="mt-2 text-gray-500">Bildirimler yükleniyor...</p>
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bildirim
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tarih
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tür
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Durum
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            İşlemler
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {notifications.map((notification) => (
                          <tr key={notification.id} className={notification.read ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{notification.text}</div>
                              {notification.description && (
                                <div className="text-sm text-gray-500">{notification.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatDate(notification.createdAt)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getNotificationTypeClass(notification.type)}`}>
                                {getNotificationTypeName(notification.type)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${notification.read ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                                {notification.read ? 'Okundu' : 'Okunmadı'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {!notification.read && (
                                <button 
                                  onClick={() => markAsRead([notification.id])} 
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  Okundu
                                </button>
                              )}
                              <button 
                                onClick={() => deleteNotifications([notification.id])} 
                                className="text-red-600 hover:text-red-900"
                              >
                                Sil
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-gray-500">Henüz bildirim bulunmuyor</p>
                  </div>
                )}
                
                {notifications.length > 0 && (
                  <div className="flex justify-end mt-4 space-x-3">
                    <button
                      onClick={() => markAsRead(notifications.filter(n => !n.read).map(n => n.id))}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      disabled={!notifications.some(n => !n.read) || isSaving}
                    >
                      Tümünü Okundu İşaretle
                    </button>
                    <button
                      onClick={() => deleteNotifications(notifications.map(n => n.id))}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      disabled={isSaving}
                    >
                      Tümünü Sil
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'permissions' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Kullanıcı İzinleri</h2>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-blue-700">Bu bölümden admin kullanıcılarının sistem içindeki yetkilerini detaylı olarak düzenleyebilirsiniz.</p>
              </div>
              
              <div className="mb-6">
                <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Kullanıcı Seçin
                </label>
                <select
                  id="user-select"
                  className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={selectedUser}
                  onChange={handleUserSelect}
                >
                  <option value="">Kullanıcı Seçin</option>
                  {users
                    .filter(user => 
                      user.roles && (user.roles.includes('admin') || 
                      user.roles.includes('editor') || 
                      user.roles.includes('support'))
                    )
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))
                  }
                </select>
                
                {loadingUsers && (
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="inline-block animate-spin mr-1">⟳</span> Kullanıcılar yükleniyor...
                  </div>
                )}
              </div>
              
              {selectedUser && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Roller ve İzinler</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Kullanıcıya verilecek rolleri ve izinleri seçin. Her rol, belirli modüller üzerinde farklı işlemlere izin verir.
                  </p>
                  
                  <div className="space-y-8 mt-6">
                    {/* Taşıyıcı Modülü İzinleri */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Taşıyıcı İzinleri</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center">
                          <input
                            id="carrier-view"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('carrier-view')}
                            onChange={() => handleRoleChange('carrier-view')}
                          />
                          <label htmlFor="carrier-view" className="ml-2 text-sm text-gray-700">Görüntüleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="carrier-add"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('carrier-add')}
                            onChange={() => handleRoleChange('carrier-add')}
                          />
                          <label htmlFor="carrier-add" className="ml-2 text-sm text-gray-700">Ekleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="carrier-edit"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('carrier-edit')}
                            onChange={() => handleRoleChange('carrier-edit')}
                          />
                          <label htmlFor="carrier-edit" className="ml-2 text-sm text-gray-700">Düzenleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="carrier-delete"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('carrier-delete')}
                            onChange={() => handleRoleChange('carrier-delete')}
                          />
                          <label htmlFor="carrier-delete" className="ml-2 text-sm text-gray-700">Silme</label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sürücü Modülü İzinleri */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Sürücü İzinleri</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center">
                          <input
                            id="driver-view"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('driver-view')}
                            onChange={() => handleRoleChange('driver-view')}
                          />
                          <label htmlFor="driver-view" className="ml-2 text-sm text-gray-700">Görüntüleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="driver-add"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('driver-add')}
                            onChange={() => handleRoleChange('driver-add')}
                          />
                          <label htmlFor="driver-add" className="ml-2 text-sm text-gray-700">Ekleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="driver-edit"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('driver-edit')}
                            onChange={() => handleRoleChange('driver-edit')}
                          />
                          <label htmlFor="driver-edit" className="ml-2 text-sm text-gray-700">Düzenleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="driver-delete"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('driver-delete')}
                            onChange={() => handleRoleChange('driver-delete')}
                          />
                          <label htmlFor="driver-delete" className="ml-2 text-sm text-gray-700">Silme</label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Müşteri Modülü İzinleri */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Müşteri İzinleri</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center">
                          <input
                            id="customer-view"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('customer-view')}
                            onChange={() => handleRoleChange('customer-view')}
                          />
                          <label htmlFor="customer-view" className="ml-2 text-sm text-gray-700">Görüntüleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="customer-add"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('customer-add')}
                            onChange={() => handleRoleChange('customer-add')}
                          />
                          <label htmlFor="customer-add" className="ml-2 text-sm text-gray-700">Ekleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="customer-edit"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('customer-edit')}
                            onChange={() => handleRoleChange('customer-edit')}
                          />
                          <label htmlFor="customer-edit" className="ml-2 text-sm text-gray-700">Düzenleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="customer-delete"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('customer-delete')}
                            onChange={() => handleRoleChange('customer-delete')}
                          />
                          <label htmlFor="customer-delete" className="ml-2 text-sm text-gray-700">Silme</label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sipariş/Taşıma Modülü İzinleri */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Taşıma/Sipariş İzinleri</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center">
                          <input
                            id="order-view"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('order-view')}
                            onChange={() => handleRoleChange('order-view')}
                          />
                          <label htmlFor="order-view" className="ml-2 text-sm text-gray-700">Görüntüleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="order-add"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('order-add')}
                            onChange={() => handleRoleChange('order-add')}
                          />
                          <label htmlFor="order-add" className="ml-2 text-sm text-gray-700">Ekleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="order-edit"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('order-edit')}
                            onChange={() => handleRoleChange('order-edit')}
                          />
                          <label htmlFor="order-edit" className="ml-2 text-sm text-gray-700">Düzenleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="order-delete"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('order-delete')}
                            onChange={() => handleRoleChange('order-delete')}
                          />
                          <label htmlFor="order-delete" className="ml-2 text-sm text-gray-700">Silme</label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sistem/Ayarlar Modülü İzinleri */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Sistem/Ayarlar İzinleri</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center">
                          <input
                            id="settings-view"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('settings-view')}
                            onChange={() => handleRoleChange('settings-view')}
                          />
                          <label htmlFor="settings-view" className="ml-2 text-sm text-gray-700">Görüntüleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="settings-edit"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('settings-edit')}
                            onChange={() => handleRoleChange('settings-edit')}
                          />
                          <label htmlFor="settings-edit" className="ml-2 text-sm text-gray-700">Düzenleme</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="user-management"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('user-management')}
                            onChange={() => handleRoleChange('user-management')}
                          />
                          <label htmlFor="user-management" className="ml-2 text-sm text-gray-700">Kullanıcı Yönetimi</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="permission-management"
                            type="checkbox"
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            checked={selectedRoles.includes('permission-management')}
                            onChange={() => handleRoleChange('permission-management')}
                          />
                          <label htmlFor="permission-management" className="ml-2 text-sm text-gray-700">İzin Yönetimi</label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Ana Roller */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Ana Rol Seçimi</h4>
                      <p className="text-sm text-gray-600 mb-4">Ana roller, birden fazla izni otomatik olarak tanımlar. Özel izinler seçildiğinde, ana rol seçilmese bile bu izinler kullanıcıda kalır.</p>
                      
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="role-admin"
                              type="checkbox"
                              checked={selectedRoles.includes('admin')}
                              onChange={() => handleRoleChange('admin')}
                              className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="role-admin" className="font-medium text-gray-700">Süper Admin</label>
                            <p className="text-gray-500">Tüm izinlere erişim sağlar</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="role-editor"
                              type="checkbox"
                              checked={selectedRoles.includes('editor')}
                              onChange={() => handleRoleChange('editor')}
                              className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="role-editor" className="font-medium text-gray-700">İçerik Editörü</label>
                            <p className="text-gray-500">İçerik ekleme ve düzenleme, müşteri ve sipariş görüntüleme</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="role-support"
                              type="checkbox"
                              checked={selectedRoles.includes('support')}
                              onChange={() => handleRoleChange('support')}
                              className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="role-support" className="font-medium text-gray-700">Destek Ekibi</label>
                            <p className="text-gray-500">Müşteri ve sipariş görüntüleme, destek taleplerini yanıtlama</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seçilen İzinlerin Özeti */}
                  <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Seçilen İzinler Özeti</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Toplam {selectedRoles.length} izin seçildi.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedRoles.map(role => (
                        <span key={role} className="bg-orange-100 text-orange-800 text-xs font-medium py-1 px-2 rounded-full">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {saveMessage && (
                <div className={`mt-4 ${saveMessage.includes('Hata') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMessage}
                </div>
              )}
              
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  onClick={updateUserRoles}
                  disabled={isSaving || !selectedUser || selectedRoles.length === 0}
                >
                  <FaSave className="mr-2" />
                  {isSaving ? 'Kaydediliyor...' : 'Kullanıcı İzinlerini Kaydet'}
                </button>
              </div>
              
              {/* Yönerge Kutusu */}
              <div className="mt-10 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">İzin Modülü Kullanımı</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                  <li>Sadece admin panele erişimi olan kullanıcılar bu sayfada listelenir.</li>
                  <li>İzinler hem tek tek seçilebilir, hem de ana roller üzerinden toplu olarak verilebilir.</li>
                  <li>Her modül için Görüntüleme, Ekleme, Düzenleme ve Silme izinleri ayrı ayrı verilebilir.</li>
                  <li>Düzenleme izni olmadan Ekleme ve Silme izinleri tek başına çalışabilir.</li>
                  <li>Bir kullanıcının izinlerini değiştirmek için önce kullanıcıyı seçin, sonra izinleri düzenleyin.</li>
                </ul>
              </div>
            </div>
          )}

          {selectedTab === 'campaigns' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Kampanya Ayarları</h2>
              
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Genel Ayarlar</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Kampanyalar</label>
                        <p className="text-sm text-gray-500">Kampanya sistemini aktif et</p>
                      </div>
                      <button
                        onClick={() => handleCampaignSettingChange('enableCampaigns', !campaignSettings.enableCampaigns)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                          campaignSettings.enableCampaigns ? 'bg-orange-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            campaignSettings.enableCampaigns ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Çoklu Kampanya</label>
                        <p className="text-sm text-gray-500">Bir siparişte birden fazla kampanya kullanılmasına izin ver</p>
                      </div>
                      <button
                        onClick={() => handleCampaignSettingChange('allowMultipleCampaigns', !campaignSettings.allowMultipleCampaigns)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                          campaignSettings.allowMultipleCampaigns ? 'bg-orange-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            campaignSettings.allowMultipleCampaigns ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Varsayılan İndirim Oranı (%)
                      </label>
                      <input
                        type="number"
                        value={campaignSettings.defaultDiscount}
                        onChange={(e) => handleCampaignSettingChange('defaultDiscount', parseInt(e.target.value))}
                        className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 mb-8">
                <button
                  type="button"
                  onClick={handleSaveCampaignSettings}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  disabled={isSaving}
                >
                  <FaSave className="mr-2" />
                  {isSaving ? 'Kaydediliyor...' : 'Kampanya Ayarlarını Kaydet'}
                </button>
              </div>
            </div>
          )}

          {selectedTab === 'brands' && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Marka Ekle</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand-name" className="block text-sm font-medium text-gray-700">
                      Marka Adı
                    </label>
                    <input
                      type="text"
                      id="brand-name"
                      value={newBrand.name}
                      onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="vehicle-type" className="block text-sm font-medium text-gray-700">
                      Araç Tipi
                    </label>
                    <select
                      id="vehicle-type"
                      value={newBrand.vehicleType}
                      onChange={(e) => setNewBrand({ ...newBrand, vehicleType: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    >
                      <option value="">Araç Tipi Seçin</option>
                      {vehicleTypes.map((type) => (
                        <option key={type._id} value={type._id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="brand-model" className="block text-sm font-medium text-gray-700">
                      Model (İlk model, opsiyonel)
                    </label>
                    <input
                      type="text"
                      id="brand-model"
                      value={newBrandModel}
                      onChange={(e) => setNewBrandModel(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                      placeholder="Örn: Corolla, Transit, Sprinter"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleAddBrand}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Marka Ekle
                  </button>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Markalar</h3>
                {loadingBrands ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                  </div>
                ) : brands.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Henüz marka bulunmuyor.</p>
                ) : (
                  <div className="space-y-6">
                    {brands.map((brand) => (
                      <div key={brand._id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{brand.name}</h4>
                            <p className="text-sm text-gray-500">{brand.vehicleType}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingBrand(brand)}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteBrand(brand._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Modeller</h5>
                          <div className="flex items-center space-x-2 mb-4">
                            <input
                              type="text"
                              value={newModel}
                              onChange={(e) => setNewModel(e.target.value)}
                              placeholder="Yeni model adı"
                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                            />
                            <button
                              onClick={() => handleAddModel(brand._id)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                            >
                              Ekle
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {brand.models.map((model) => (
                              <div
                                key={model}
                                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                              >
                                <span className="text-sm text-gray-700">{model}</span>
                                <button
                                  onClick={() => handleDeleteModel(brand._id, model)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <FaTimes />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hizmet Düzenleme Modalı */}
      {showEditModal && editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
            <h3 className="text-lg font-semibold mb-4">Hizmet Düzenle</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hizmet Adı
                  </label>
                  <input
                    type="text"
                    value={editingService.name}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <textarea
                    value={editingService.description}
                    onChange={(e) => handleEditChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows="2"
                    placeholder="Kısa açıklama"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detaylı Açıklama
                  </label>
                  <textarea
                    value={editingService.detailedDescription}
                    onChange={(e) => handleEditChange('detailedDescription', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows="4"
                    placeholder="Hizmet hakkında detaylı bilgi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İkon
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.ico"
                        onChange={handleIconChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        İzin verilen formatlar: .jpg, .jpeg, .png, .ico
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                      {iconPreview ? (
                        <img src={iconPreview} alt="Icon preview" className="w-full h-full object-contain" />
                      ) : editingService.icon ? (
                        <img src={editingService.icon} alt="Current icon" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-gray-400">İkon</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paket Bilgileri Başlıkları
                  </label>
                  <button
                    onClick={handleOpenPackageInfoModal}
                    className="w-full px-4 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 flex items-center justify-center"
                  >
                    <FaEdit className="mr-2" />
                    Paket Bilgilerini Düzenle
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açılış Fiyatı (TL)
                  </label>
                  <input
                    type="number"
                    value={editingService.basePrice}
                    onChange={(e) => handleEditChange('basePrice', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    KM Başına Fiyat (TL)
                  </label>
                  <input
                    type="number"
                    value={editingService.pricePerKm}
                    onChange={(e) => handleEditChange('pricePerKm', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maksimum KM
                  </label>
                  <input
                    type="number"
                    value={editingService.maxKm}
                    onChange={(e) => handleEditChange('maxKm', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Araç Tipi
                  </label>
                  <select
                    value={editingService.vehicleType}
                    onChange={(e) => handleEditChange('vehicleType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Araç Tipi Seçin</option>
                    {vehicleTypes.map((type) => (
                      <option key={type._id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açılış Fiyatı Kaç KM
                  </label>
                  <input
                    type="number"
                    value={editingService.baseKm}
                    onChange={(e) => handleEditChange('baseKm', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acil Teslim Ücreti
                  </label>
                  <input
                    type="number"
                    value={editingService.urgentFee}
                    onChange={(e) => handleEditChange('urgentFee', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gece Teslim Ücreti
                  </label>
                  <input
                    type="number"
                    value={editingService.nightFee}
                    onChange={(e) => handleEditChange('nightFee', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Şehir İçi
                    </label>
            <button
                      onClick={() => handleEditChange('isInnerCity', !editingService.isInnerCity)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                        editingService.isInnerCity ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editingService.isInnerCity ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
            </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Şehir Dışı
                    </label>
            <button
                      onClick={() => handleEditChange('isOuterCity', !editingService.isOuterCity)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                        editingService.isOuterCity ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editingService.isOuterCity ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
            </button>
        </div>
      </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                disabled={isSaving}
              >
                {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Hizmet Ekleme Modalı */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-7xl">
            <h3 className="text-xl font-semibold mb-4">Yeni Hizmet Ekle</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Hizmet Adı</label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => handleNewServiceChange('name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kısa Açıklama</label>
                <input
                  type="text"
                  value={newService.description}
                  onChange={(e) => handleNewServiceChange('description', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Detaylı Açıklama</label>
                <textarea
                  value={newService.detailedDescription}
                  onChange={(e) => handleNewServiceChange('detailedDescription', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  rows="3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temel Fiyat</label>
                  <input
                    type="number"
                    value={newService.basePrice}
                    onChange={(e) => handleNewServiceChange('basePrice', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Km Başına Ücret</label>
                  <input
                    type="number"
                    value={newService.pricePerKm}
                    onChange={(e) => handleNewServiceChange('pricePerKm', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Araç Tipi</label>
                  <select
                    value={newService.vehicleType}
                    onChange={(e) => handleNewServiceChange('vehicleType', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  >
                    <option value="">Araç Tipi Seçin</option>
                    {vehicleTypes.map((type) => (
                      <option key={type._id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Açılış Fiyatı Kaç KM</label>
                  <input
                    type="number"
                    value={newService.baseKm}
                    onChange={(e) => handleNewServiceChange('baseKm', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acil Teslim Ücreti</label>
                  <input
                    type="number"
                    value={newService.urgentFee}
                    onChange={(e) => handleNewServiceChange('urgentFee', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gece Teslim Ücreti</label>
                  <input
                    type="number"
                    value={newService.nightFee}
                    onChange={(e) => handleNewServiceChange('nightFee', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Maksimum Mesafe (km)</label>
                  <input
                    type="number"
                    value={newService.maxKm}
                    onChange={(e) => handleNewServiceChange('maxKm', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">İkon</label>
                  <input
                    type="text"
                    value={newService.icon}
                    onChange={(e) => handleNewServiceChange('icon', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newService.isActive}
                    onChange={(e) => handleNewServiceChange('isActive', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Aktif</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newService.isInnerCity}
                    onChange={(e) => handleNewServiceChange('isInnerCity', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Şehir İçi</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newService.isOuterCity}
                    onChange={(e) => handleNewServiceChange('isOuterCity', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Şehirler Arası</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yönlendirme URL&apos;i
                </label>
                <input
                  type="text"
                  value={newService.redirectUrl}
                  onChange={(e) => handleNewServiceChange('redirectUrl', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  placeholder="/services/parsiyel"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Örnek: /services/parsiyel, /services/evden-eve, /services/kargo
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paket Bilgileri Başlıkları</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newService.packageTitle1}
                    onChange={(e) => handleNewServiceChange('packageTitle1', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="1. Başlık (örn: Ağırlık)"
                  />
                  <input
                    type="text"
                    value={newService.packageTitle2}
                    onChange={(e) => handleNewServiceChange('packageTitle2', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="2. Başlık (örn: Hacim)"
                  />
                  <input
                    type="text"
                    value={newService.packageTitle3}
                    onChange={(e) => handleNewServiceChange('packageTitle3', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="3. Başlık (örn: Açıklama)"
                  />
                  <input
                    type="text"
                    value={newService.packageTitle4}
                    onChange={(e) => handleNewServiceChange('packageTitle4', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="4. Başlık (örn: Özel Notlar)"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleAddService}
                className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Araç Tipi Düzenleme Modalı */}
      {showVehicleTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Araç Tipi Düzenle</h3>
            <input
              type="text"
              value={editingVehicleType.name}
              onChange={handleVehicleTypeChange}
              placeholder="Araç tipi adı"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
            />
            <div className="flex justify-end gap-2">
            <button
                onClick={handleCloseVehicleTypeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
                İptal
            </button>
                    <button
                onClick={handleEditVehicleType}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                Kaydet
                    </button>
        </div>
      </div>
        </div>
      )}

      {/* Araç Tipi Ekleme Modalı */}
      {showAddVehicleTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Yeni Araç Tipi Ekle</h3>
            <input
              type="text"
              value={newVehicleType}
              onChange={(e) => setNewVehicleType(e.target.value)}
              placeholder="Araç tipi adı"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCloseAddVehicleTypeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                İptal
              </button>
              <button
                onClick={handleAddVehicleType}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paket Bilgileri Düzenleme Modalı */}
      {showPackageInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Paket Bilgileri Başlıklarını Düzenle</h3>
            
            <div className="space-y-6">
              {/* Mevcut başlıklar listesi */}
              <div>
                <h4 className="text-md font-medium mb-2">Mevcut Başlıklar</h4>
                {editingPackageInfo.length === 0 ? (
                  <p className="text-gray-500 italic">Henüz başlık eklenmemiş</p>
                ) : (
                  <div className="space-y-4">
                    {editingPackageInfo.map((title, index) => (
                      <div key={title.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <span className="bg-orange-100 text-orange-700 font-medium rounded-full w-6 h-6 flex items-center justify-center mr-2">
                              {index + 1}
                            </span>
                            <h5 className="font-medium">{title.title}</h5>
                          </div>
                          <button
                            onClick={() => handleDeletePackageTitle(title.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Başlık
                            </label>
                            <input
                              type="text"
                              value={title.title}
                              onChange={(e) => handlePackageTitleChange(title.id, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-sm font-medium text-gray-600">
                                Tür
                              </label>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">Zorunlu</span>
                                <input
                                  type="checkbox"
                                  checked={title.required}
                                  onChange={(e) => handlePackageTitleChange(title.id, 'required', e.target.checked)}
                                  className="h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
                                />
                              </div>
                            </div>
                            <select
                              value={title.type}
                              onChange={(e) => handlePackageTitleChange(title.id, 'type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="input">Metin Girişi</option>
                              <option value="checkbox">Onay Kutusu</option>
                              <option value="number">Sayı</option>
                              <option value="date">Tarih</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* Icon Alanı */}
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Icon (isteğe bağlı)
                          </label>
                          <div className="flex items-center">
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.ico,.svg"
                              onChange={e => handlePackageTitleChange(title.id, 'iconFile', e.target.files[0])}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            {title.iconFile && (
                              <div className="ml-2 p-2 bg-gray-100 rounded-md">
                                <img src={URL.createObjectURL(title.iconFile)} alt="Icon preview" className="w-8 h-8 object-contain" />
                              </div>
                            )}
                            {/* Eğer eski icon url varsa göster */}
                            {!title.iconFile && title.icon && (
                              <div className="ml-2 p-2 bg-gray-100 rounded-md">
                                <img src={title.icon} alt="Icon preview" className="w-8 h-8 object-contain" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, ICO veya SVG dosyası yükleyebilirsiniz.
                          </p>
                        </div>
                        
                        {/* Alt başlıklar */}
                        <div className="mt-4">
                          <h6 className="text-sm font-medium text-gray-600 mb-2">Alt Başlıklar</h6>
                          
                          {title.subtitle && title.subtitle.length > 0 ? (
                            <div className="space-y-2 mb-2">
                              {title.subtitle.map((sub, subIndex) => {
                                // Alt başlık için text ve icon değerlerini belirle
                                const subtitleText = typeof sub === 'string' ? sub : sub.text;
                                const subtitleIcon = typeof sub === 'string' ? '' : (sub.icon || '');
                                
                                return (
                                  <div key={subIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <div className="flex items-center flex-1">
                                      {subtitleIcon && (
                                        <span className="mr-2 text-orange-500">
                                          <i className={subtitleIcon}></i>
                                        </span>
                                      )}
                                      <span className="text-sm">{subtitleText}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="Oran (%)"
                                        value={sub.ratio || ''}
                                        onChange={e => handleSubtitleChange(title.id, subIndex, 'ratio', e.target.value)}
                                        className="mr-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 w-16"
                                      />
                                      <select
                                        value={sub.relatedServiceId || ''}
                                        onChange={e => handleSubtitleChange(title.id, subIndex, 'relatedServiceId', e.target.value)}
                                        className="mr-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 w-40"
                                      >
                                        <option value="">Diğer Hizmet Seç</option>
                                        {services.filter(s => s._id !== editingService._id).map(service => (
                                          <option key={service._id} value={service._id}>{service.name}</option>
                                        ))}
                                      </select>
                                      <input
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.ico,.svg"
                                        onChange={e => handleSubtitleChange(title.id, subIndex, 'iconFile', e.target.files[0])}
                                        className="mr-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 w-28"
                                      />
                                      {sub.iconFile && (
                                        <img src={URL.createObjectURL(sub.iconFile)} alt="Alt başlık icon" className="w-6 h-6 object-contain ml-2" />
                                      )}
                                      {!sub.iconFile && sub.icon && (
                                        <img src={sub.icon} alt="Alt başlık icon" className="w-6 h-6 object-contain ml-2" />
                                      )}
                                      <button
                                        onClick={() => handleDeleteSubtitle(title.id, subIndex)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                      >
                                        <FaTimes />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm italic mb-2">Alt başlık eklenmemiş</p>
                          )}
                          
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="Yeni alt başlık"
                              value={newSubtitle}
                              onChange={(e) => setNewSubtitle(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <button
                              onClick={() => handleAddSubtitle(title.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Ekle
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Yeni başlık ekleme */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium mb-2">Yeni Başlık Ekle</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Başlık"
                      value={newPackageTitle.title}
                      onChange={(e) => setNewPackageTitle({...newPackageTitle, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleAddPackageTitle}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    >
                      Başlık Ekle
                    </button>
                    
                    <div className="flex items-center ml-4">
                      <span className="text-sm text-gray-500 mr-2">Zorunlu</span>
                      <input
                        type="checkbox"
                        checked={newPackageTitle.required}
                        onChange={(e) => setNewPackageTitle({...newPackageTitle, required: e.target.checked})}
                        className="h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                    </div>
                    
                    <select
                      value={newPackageTitle.type}
                      onChange={(e) => setNewPackageTitle({...newPackageTitle, type: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="input">Metin Girişi</option>
                      <option value="checkbox">Onay Kutusu</option>
                      <option value="number">Sayı</option>
                      <option value="date">Tarih</option>
                    </select>
                  </div>
                  
                  {/* Icon Alanı */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Icon (isteğe bağlı)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.ico,.svg"
                        onChange={e => setNewPackageTitle({...newPackageTitle, iconFile: e.target.files[0]})}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {newPackageTitle.iconFile && (
                        <div className="ml-2 p-2 bg-gray-100 rounded-md">
                          <img src={URL.createObjectURL(newPackageTitle.iconFile)} alt="Icon preview" className="w-8 h-8 object-contain" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, ICO veya SVG dosyası yükleyebilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowPackageInfoModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSavePackageInfo}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Marka Düzenleme Modalı */}
      {editingBrand && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Marka Düzenle</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-brand-name" className="block text-sm font-medium text-gray-700">
                      Marka Adı
                    </label>
                    <input
                      type="text"
                      id="edit-brand-name"
                      value={editingBrand.name}
                      onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-vehicle-type" className="block text-sm font-medium text-gray-700">
                      Araç Tipi
                    </label>
                    <select
                      id="edit-vehicle-type"
                      value={editingBrand.vehicleType}
                      onChange={(e) => setEditingBrand({ ...editingBrand, vehicleType: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    >
                      <option value="">Araç Tipi Seçin</option>
                      {vehicleTypes.map((type) => (
                        <option key={type._id} value={type._id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => handleEditBrand(editingBrand._id)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBrand(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        {/* ... existing code ... */}
      </div>
    </AdminLayout>
  )
} 