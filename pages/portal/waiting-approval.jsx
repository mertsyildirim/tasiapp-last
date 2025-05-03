import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function WaitingApproval() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/portal/login');
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/portal/login');
  };

  return (
    <>
      <Head>
        <title>Onay Bekleniyor | TaşıApp</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Image src="/logo.png" alt="TaşıApp" width={160} height={50} className="mx-auto" priority />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Hesabınız Onay Bekliyor
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Onay Süreci Devam Ediyor</h3>
              <p className="mt-2 text-sm text-gray-500">
                Başvurunuz inceleniyor. Onay sürecimiz genellikle 24-48 saat içinde tamamlanmaktadır.
                Onay durumunuz hakkında size e-posta ile bilgilendirme yapılacaktır.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Giriş Sayfasına Dön
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 