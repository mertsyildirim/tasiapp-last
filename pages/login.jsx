'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'

const Login = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // URL'den hata parametresini kontrol et
    if (router.query.error) {
      setError("Giriş yapılırken bir hata oluştu. Lütfen bilgilerinizi kontrol edin.")
    }
    
    console.log("Login - Session check, status:", status, "Session:", session);
    
    if (session) {
      const user = session.user
      console.log("Login - Kullanıcı durumu:", user.status, "Kullanıcı:", user);
      
      if (user.status === 'active') {
        console.log("Login - Aktif kullanıcı, profile sayfasına yönlendiriliyor");
        router.push('/profile')
      } else if (user.status === 'WAITING_APPROVAL') {
        console.log("Login - Onay bekleyen kullanıcı, waiting-approval sayfasına yönlendiriliyor");
        router.push('/waiting-approval')
      } else if (user.status === 'WAITING_DOCUMENTS') {
        console.log("Login - Belge bekleyen kullanıcı, documents sayfasına yönlendiriliyor");
        router.push('/documents')
      }
    }
  }, [session, router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log("Müşteri girişi denemesi başlatılıyor:", formData.email);

    try {
      console.log("SignIn çağrılıyor, parametreler:", {
        provider: 'customer-credentials',
        redirect: false,
        callbackUrl: '/profile'
      });

      const result = await signIn('customer-credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
        callbackUrl: '/profile',
        basePath: '/api/auth/customer'
      })

      console.log("SignIn sonucu:", result);

      if (result?.error) {
        console.error("Giriş hatası:", result.error);
        setError(result.error)
        setLoading(false)
        return
      }

      if (result?.ok) {
        console.log("Giriş başarılı, sonuç:", result);
        
        // Kısa bir gecikme ekleyerek oturumun tam olarak açılmasını bekleyelim
        setTimeout(() => {
          if (result?.url) {
            console.log("Yönlendirme URL'i:", result.url);
            router.push(result.url);
          } else {
            console.log("URL bulunamadı, manuel profile sayfasına yönlendirme yapılıyor");
            router.push('/profile');
          }
        }, 300);
      } else {
        console.error("Giriş sonucu beklenmeyen formatta:", result);
        setError("Giriş işlemi beklenmeyen sonuç döndürdü.");
        setLoading(false);
      }
    } catch (error) {
      console.error('Giriş işlemi sırasında hata:', error)
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Giriş Yap | TaşıApp</title>
      </Head>
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
          <Image src="/logo.png" alt="TaşıApp" width={160} height={50} className="mx-auto" priority />
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-800">Giriş Yap</h2>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-posta Adresi</label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                  placeholder="ornek@email.com"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Şifre</label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button type="button" className="text-gray-400 hover:text-gray-500" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                  loading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Hesabınız yok mu?{' '}
            <Link href="/register" className="text-orange-600 hover:text-orange-500 font-medium">
              Hemen Kaydolun
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login 