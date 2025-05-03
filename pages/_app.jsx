import '../styles/globals.css'
import Head from 'next/head'
import Script from 'next/script'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../lib/auth'
import { SessionProvider } from 'next-auth/react'

// NOT: Artık server.js içinde cron işleri başlatılacak, buradan kaldırıldı

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter()
  
  // Sayfa düzenini özelleştirme desteği
  const getLayout = Component.getLayout || ((page) => page)

  // Sayfa değişikliklerinde URL'i takip et
  useEffect(() => {
    const handleRouteChange = url => {
      console.log(`App navigated to: ${url}`)
      window.scrollTo(0, 0)
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router])

  // Sayfanın url pathine göre doğru SessionProvider konfigürasyonu
  let sessionConfig = { session };
  
  // Sadece spesifik sayfa türleri için basePath'i ayarlayalım
  if (router.pathname.startsWith('/admin')) {
    sessionConfig.basePath = "/api/auth/admin";
  } else if (router.pathname.startsWith('/portal')) {
    sessionConfig.basePath = "/api/auth/portal";
  } else if (router.pathname.startsWith('/customer')) {
    sessionConfig.basePath = "/api/auth/customer";
  } else if (router.pathname === '/login' || router.pathname === '/register' || router.pathname === '/dashboard' || router.pathname === '/profile') {
    // Müşteri arayüzü için auth yapılandırması
    sessionConfig.basePath = "/api/auth/customer";
  }

  console.log(`Auth basePath for ${router.pathname}: ${sessionConfig.basePath || '/api/auth'}`);

  // Chatwoot widget'ı için kontrol - admin ve portal sayfalarında gösterilmesin
  const showChatwoot = !router.pathname.startsWith('/admin') && !router.pathname.startsWith('/portal');

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Taşı App - Taşıma ve Lojistik</title>
      </Head>
      
      <SessionProvider {...sessionConfig}>
        <AuthProvider>
          {getLayout(<Component {...pageProps} />)}
        </AuthProvider>
      </SessionProvider>
      
      {/* Chatwoot widget - Sadece ana site sayfalarında görünecek */}
      {showChatwoot && (
        <Script id="chatwoot-widget" strategy="afterInteractive">
          {`
            (function(d,t) {
              var BASE_URL="https://app.chatwoot.com";
              var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
              g.src=BASE_URL+"/packs/js/sdk.js";
              g.defer = true;
              g.async = true;
              s.parentNode.insertBefore(g,s);
              g.onload=function(){
                window.chatwootSDK.run({
                  websiteToken: 'Hfu2GmBnTRKTsCJ4W55qmFdW',
                  baseUrl: BASE_URL
                })
              }
            })(document,"script");
          `}
        </Script>
      )}
    </>
  )
}

export default MyApp 