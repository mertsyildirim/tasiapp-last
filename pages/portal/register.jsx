import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { FaCheck, FaExclamationCircle } from 'react-icons/fa';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    taxNumber: '',
    taxOffice: '',
    address: '',
    city: '',
    district: '',
    isFreelance: false,
    contactPerson: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    vehicleTypes: [],
    serviceAreas: [],
    documents: { taxCertificate: null, companyRegistration: null, driverLicense: null },
    agreeToTerms: false,
    documentLater: false
  });
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    if (phoneNumber.length < 4) return phoneNumber;
    if (phoneNumber.length < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else if (name === 'phoneNumber') {
      setFormData((prev) => ({
        ...prev,
        [name]: formatPhoneNumber(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setApiError('');

    try {
      const submitData = {
        companyName: formData.companyName,
        taxNumber: formData.taxNumber,
        taxOffice: formData.taxOffice,
        address: formData.address,
        city: formData.city,
        district: formData.district,
        isFreelance: formData.isFreelance,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        status: formData.documentLater ? 'WAITING_DOCUMENTS' : 'WAITING_APPROVAL',
        role: 'carrier',
        documents: formData.documentLater ? null : formData.documents,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Gönderilen veri:', submitData);

      const response = await axios.post('/api/portal/register', submitData);

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/portal/register-success');
        }, 2000);
      }
    } catch (error) {
      console.error('Kayıt hatası:', error);
      console.error('Hata detayları:', error.response?.data);
      setApiError(error.response?.data?.error || error.response?.data?.details || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const newFieldErrors = {};
    let hasError = false;

    if (step === 1) {
      if (!formData.companyName) newFieldErrors.companyName = true;
      if (!formData.taxNumber) newFieldErrors.taxNumber = true;
      if (!formData.taxOffice) newFieldErrors.taxOffice = true;
      if (!formData.address) newFieldErrors.address = true;
      if (!formData.city) newFieldErrors.city = true;
      if (!formData.district) newFieldErrors.district = true;

      if (Object.keys(newFieldErrors).length > 0) {
        setErrors({ step1: 'Lütfen tüm zorunlu alanları doldurun' });
        setFieldErrors(newFieldErrors);
        return;
      }
    } else if (step === 2) {
      if (!formData.contactPerson) newFieldErrors.contactPerson = true;
      if (!formData.phoneNumber) newFieldErrors.phoneNumber = true;
      if (!formData.email) newFieldErrors.email = true;

      if (Object.keys(newFieldErrors).length > 0) {
        setErrors({ step2: 'Lütfen tüm zorunlu alanları doldurun' });
        setFieldErrors(newFieldErrors);
        return;
      }
    } else if (step === 3) {
      if (!formData.password) newFieldErrors.password = true;
      if (!formData.confirmPassword) newFieldErrors.confirmPassword = true;
      if (formData.password !== formData.confirmPassword) {
        newFieldErrors.password = true;
        newFieldErrors.confirmPassword = true;
        setErrors({ step3: 'Şifreler eşleşmiyor' });
        setFieldErrors(newFieldErrors);
        return;
      }

      if (Object.keys(newFieldErrors).length > 0) {
        setErrors({ step3: 'Lütfen tüm zorunlu alanları doldurun' });
        setFieldErrors(newFieldErrors);
        return;
      }
    }
    
    setErrors({});
    setFieldErrors({});
    setStep(step + 1);
  };

  const getInputClassName = (fieldName) => {
    const baseClass = "w-full border p-2 rounded focus:ring-orange-500 focus:border-orange-500";
    return fieldErrors[fieldName] 
      ? `${baseClass} border-red-500 focus:ring-red-500 focus:border-red-500` 
      : baseClass;
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mx-auto">
              <FaCheck className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-3 text-lg font-medium text-gray-900">Kayıt Başarılı!</h2>
            <p className="mt-2 text-sm text-gray-500">Hesabınız oluşturuldu. Yönlendiriliyorsunuz...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Taşıyıcı Kayıt - TaşıApp</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Image src="/logo.png" alt="TaşıApp Logo" width={150} height={50} className="mx-auto" priority />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Taşıyıcı Kayıt</h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">

            {apiError && (
              <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-400">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FaExclamationCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{apiError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="h-2 w-full bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-orange-500 rounded-full"
                  style={{ width: `${(step / 4) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span className={step >= 1 ? 'text-orange-600 font-medium' : ''}>Şirket</span>
                <span className={step >= 2 ? 'text-orange-600 font-medium' : ''}>İletişim</span>
                <span className={step >= 3 ? 'text-orange-600 font-medium' : ''}>Hesap</span>
                <span className={step >= 4 ? 'text-orange-600 font-medium' : ''}>Belgeler</span>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {errors[`step${step}`] && (
                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors[`step${step}`]}
                  </div>
                </div>
              )}
              {step === 1 && (
                <>
                  <div className="space-y-4">
                    <div>
                      <input 
                        type="text" 
                        name="companyName" 
                        placeholder="Firma Adı" 
                        value={formData.companyName} 
                        onChange={handleChange} 
                        required
                        className={getInputClassName('companyName')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        name="taxNumber" 
                        placeholder="Vergi Numarası" 
                        value={formData.taxNumber} 
                        onChange={handleChange} 
                        required
                        className={getInputClassName('taxNumber')}
                      />
                      <input 
                        type="text" 
                        name="taxOffice" 
                        placeholder="Vergi Dairesi" 
                        value={formData.taxOffice} 
                        onChange={handleChange} 
                        required
                        className={getInputClassName('taxOffice')}
                      />
                    </div>
                    <div>
                      <textarea 
                        name="address" 
                        placeholder="Adres" 
                        value={formData.address} 
                        onChange={handleChange} 
                        required
                        rows="2"
                        className={getInputClassName('address')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        name="city" 
                        placeholder="Şehir" 
                        value={formData.city} 
                        onChange={handleChange} 
                        required
                        className={getInputClassName('city')}
                      />
                      <input 
                        type="text" 
                        name="district" 
                        placeholder="İlçe" 
                        value={formData.district} 
                        onChange={handleChange} 
                        required
                        className={getInputClassName('district')}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        name="isFreelance" 
                        checked={formData.isFreelance} 
                        onChange={handleChange} 
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" 
                      />
                      <span className="text-sm text-gray-700">Freelance Çalışıyorum</span>
                    </div>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="space-y-4">
                    <div>
                      <input 
                        type="text" 
                        name="contactPerson" 
                        placeholder="Yetkili Bilgileri" 
                        value={formData.contactPerson} 
                        onChange={handleChange} 
                        required
                        className={getInputClassName('contactPerson')}
                      />
                    </div>
                    <div>
                      <input 
                        type="tel" 
                        name="phoneNumber" 
                        placeholder="Telefon Numarası" 
                        value={formData.phoneNumber} 
                        onChange={handleChange} 
                        required
                        maxLength="14"
                        className={getInputClassName('phoneNumber')}
                      />
                    </div>
                    <div>
                      <input 
                        type="email" 
                        name="email" 
                        placeholder="E-posta Adresi" 
                        value={formData.email} 
                        onChange={handleChange} 
                        required
                        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                        className={getInputClassName('email')}
                      />
                    </div>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="space-y-4">
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="Şifre" 
                      value={formData.password} 
                      onChange={handleChange} 
                      required
                      minLength="6"
                      className={getInputClassName('password')}
                    />
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      placeholder="Şifre Tekrar" 
                      value={formData.confirmPassword} 
                      onChange={handleChange} 
                      required
                      minLength="6"
                      className={getInputClassName('confirmPassword')}
                    />
                  </div>
                </>
              )}
              {step === 4 && (
                <>
                  <div className="space-y-4">
                    {!formData.documentLater && (
                      <div className="border rounded-lg p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Gerekli Belgeler</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vergi Levhası</label>
                            <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ticaret Sicil Gazetesi</label>
                            <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">İmza Sirküleri</label>
                            <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Yetki Belgesi</label>
                            <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Taşımacılık Belgesi</label>
                            <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sigorta Poliçesi</label>
                            <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                          </div>
                          {formData.isFreelance && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sürücü Belgesi (Ön)</label>
                                <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sürücü Belgesi (Arka)</label>
                                <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">SRC Belgesi</label>
                                <input type="file" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" name="documentLater" checked={formData.documentLater} onChange={handleChange} className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" />
                        <span className="text-sm text-gray-700">Belgeleri Daha Sonra Yükleyeceğim</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleChange} className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" />
                        <span className="text-sm text-gray-700">Taşıyıcı Firma Kullanım Koşullarını Kabul Ediyorum</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                {step > 1 && (
                  <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md">Geri</button>
                )}
                {step < 4 ? (
                  <button type="button" onClick={handleNext} className="ml-auto px-4 py-2 bg-orange-500 text-white rounded-md">İleri</button>
                ) : (
                  <button type="submit" disabled={loading} className="ml-auto px-4 py-2 bg-orange-500 text-white rounded-md">{loading ? 'Kaydediliyor...' : 'Kaydı Tamamla'}</button>
                )}
              </div>
            </form>

            <div className="mt-6 text-center">
              <Link href="/portal/login" className="text-orange-600 hover:text-orange-500 text-sm">
                Zaten hesabınız var mı? Giriş Yapın
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
