import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { signIn, useSession } from 'next-auth/react';
import Head from 'next/head';
import Image from 'next/image';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function AdminLogin() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Client-side rendering için
  useEffect(() => {
    setMounted(true);
  }, []);

  // Oturum kontrolü - Eğer giriş yapmışsa dashboard'a yönlendir
  useEffect(() => {
    console.log("Admin Login - Session Status:", status, "Session:", session);
    
    if (status === 'authenticated' && session) {
      console.log("Admin Login - Already authenticated, redirecting to dashboard");
      router.replace('/admin/dashboard');
    }
  }, [status, session, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDebugInfo(null);

    console.log("Giriş denemesi başlatılıyor...");
    console.log("Giriş bilgileri:", { email: formData.email, providedPassword: "******" });

    try {
      // Giriş öncesi bilgileri logla
      console.log("SignIn çağrılıyor, parametreler:", {
        provider: 'admin-credentials',
        redirect: false,
        callbackUrl: '/admin/dashboard',
      });

      const result = await signIn('admin-credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
        callbackUrl: '/admin/dashboard',
      });

      console.log("SignIn sonucu:", result);
      
      // Detaylı debug bilgilerini ekrana yazdır
      setDebugInfo(JSON.stringify(result, null, 2));

      if (result?.error) {
        console.error("Giriş hatası:", result.error);
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result?.ok) {
        console.log("Giriş başarılı, sonuç:", result);
        
        // Kısa bir gecikme ekleyerek oturumun tam olarak açılmasını bekleyelim
        setTimeout(() => {
          if (result?.url) {
            console.log("Yönlendirme URL'i:", result.url);
            router.push(result.url);
          } else {
            console.log("URL bulunamadı, manuel dashboard'a yönlendirme yapılıyor");
            router.push('/admin/dashboard');
          }
        }, 300);
      } else {
        console.error("Giriş sonucu beklenmeyen formatta:", result);
        setError("Giriş işlemi beklenmeyen sonuç döndürdü.");
      }
    } catch (error) {
      console.error('Giriş hatası (catch bloğu):', error);
      setError(`Bir hata oluştu: ${error.message}`);
      setDebugInfo(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } finally {
      setLoading(false);
    }
  };

  // Client-side rendering için
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <Head>
        <title>Admin Girişi | Taşı.app</title>
        <meta name="description" content="Taşı.app admin giriş sayfası" />
      </Head>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <Image src="/logo.png" alt="Taşı.app" width={160} height={50} className="mx-auto" priority />
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-800">Admin Paneli Girişi</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Bu sayfaya sadece kayıtlı kullanıcılar erişebilir
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-posta Adresi
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="ornek@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Şifre
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-md"
                placeholder="••••••••"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </div>
        </form>

        {debugInfo && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Bilgileri:</h3>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
              {debugInfo}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 