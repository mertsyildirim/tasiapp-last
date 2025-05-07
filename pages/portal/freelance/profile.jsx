import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { FaUser, FaEnvelope, FaPhone, FaIdCard, FaMapMarkerAlt, FaTruck, FaSave, FaPencilAlt, FaCamera } from 'react-icons/fa';
import FreelanceLayout from '../../../components/portal/FreelanceLayout';

export default function FreelanceProfile() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.replace('/portal/login');
    },
  });
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) return;

    // Örnek profil verisi - gerçek uygulamada API'den alınacak
    const demoProfile = {
      id: 'USR2024001',
      name: 'Ahmet Yılmaz',
      email: 'ahmet.yilmaz@ornek.com',
      phone: '+90 532 123 45 67',
      taxId: '12345678901',
      company: 'Yılmaz Nakliyat',
      address: 'Atatürk Mah. Cumhuriyet Cad. No:123 Kadıköy/İstanbul',
      city: 'İstanbul',
      country: 'Türkiye',
      postalCode: '34000',
      registrationDate: '2023-08-15T10:30:00',
      isFreelance: true,
      activeStatus: true,
      verificationStatus: 'verified',
      rating: 4.8,
      completedTasks: 124,
      preferredRoutes: ['İstanbul-Ankara', 'İstanbul-İzmir'],
      vehicleTypes: ['Tır', 'Kamyon'],
      avatar: null,
      notes: 'Düzenli taşımacılık hizmeti sağlayıcı',
      bankInfo: {
        bankName: 'Örnek Bank',
        accountHolder: 'Ahmet Yılmaz',
        iban: 'TR12 3456 7890 1234 5678 9012 34',
        accountNumber: '12345678'
      }
    };
    
    setProfile(demoProfile);
    setFormData(demoProfile);
    setLoading(false);
  }, [status, router, session]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      bankInfo: {
        ...prev.bankInfo,
        [name]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // API'ye gönderme işlemi burada yapılacak
    setProfile(formData);
    setIsEditing(false);
  };

  // Yükleme durumu
  if (status === 'loading' || loading) {
    return (
      <FreelanceLayout title="Profilim">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
        </div>
      </FreelanceLayout>
    );
  }

  if (!profile) return null;

  return (
    <FreelanceLayout title="Profilim">
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Profil Bilgilerim</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {isEditing ? (
                <>
                  <FaSave className="mr-2 -ml-1 h-4 w-4" />
                  Vazgeç
                </>
              ) : (
                <>
                  <FaPencilAlt className="mr-2 -ml-1 h-4 w-4" />
                  Düzenle
                </>
              )}
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-5 sm:p-6">
              {/* Profil Resmi ve Temel Bilgiler */}
              <div className="flex flex-col md:flex-row items-start md:space-x-8 mb-8">
                <div className="w-full md:w-1/3 flex flex-col items-center mb-4 md:mb-0">
                  <div className="h-40 w-40 bg-gray-200 rounded-full flex items-center justify-center mb-4 relative">
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt="Profil Resmi"
                        className="h-40 w-40 rounded-full object-cover"
                      />
                    ) : (
                      <FaUser className="h-20 w-20 text-gray-400" />
                    )}
                    
                    {isEditing && (
                      <div className="absolute -bottom-2 -right-2">
                        <button
                          type="button"
                          className="h-10 w-10 rounded-full bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          <FaCamera className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-lg font-semibold">{profile.name}</p>
                    <p className="text-sm text-gray-500">{profile.company}</p>
                    <div className="mt-2 flex items-center justify-center">
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Freelance Taşıyıcı
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-center">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`h-5 w-5 ${
                                i < Math.floor(profile.rating) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="ml-1 text-gray-500 text-sm">{profile.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm mt-1 text-gray-600">
                      {profile.completedTasks} Tamamlanan Taşıma
                    </p>
                  </div>
                </div>
                
                <div className="w-full md:w-2/3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaUser className="h-4 w-4 text-gray-400 mr-2" />
                          {profile.name}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Firma Adı</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaTruck className="h-4 w-4 text-gray-400 mr-2" />
                          {profile.company}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      {isEditing ? (
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaEnvelope className="h-4 w-4 text-gray-400 mr-2" />
                          {profile.email}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefon</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaPhone className="h-4 w-4 text-gray-400 mr-2" />
                          {profile.phone}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vergi/TC Kimlik No</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="taxId"
                          value={formData.taxId}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaIdCard className="h-4 w-4 text-gray-400 mr-2" />
                          {profile.taxId}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Adres</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 flex items-center">
                          <FaMapMarkerAlt className="h-4 w-4 text-gray-400 mr-2" />
                          {profile.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Banka Bilgileri */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Banka Bilgileri</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Banka Adı</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="bankName"
                          value={formData.bankInfo.bankName}
                          onChange={handleBankInfoChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{profile.bankInfo.bankName}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hesap Sahibi</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="accountHolder"
                          value={formData.bankInfo.accountHolder}
                          onChange={handleBankInfoChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{profile.bankInfo.accountHolder}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">IBAN</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="iban"
                          value={formData.bankInfo.iban}
                          onChange={handleBankInfoChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{profile.bankInfo.iban}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hesap Numarası</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="accountNumber"
                          value={formData.bankInfo.accountNumber}
                          onChange={handleBankInfoChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{profile.bankInfo.accountNumber}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {isEditing && (
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <FaSave className="mr-2 -ml-1 h-4 w-4" />
                  Değişiklikleri Kaydet
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </FreelanceLayout>
  );
}