'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from 'next-auth/react';

export default function PortalIndex() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (session) {
      const user = session.user;
      
      // Kullanıcı tipine ve durumuna göre yönlendirme
      if (user.type === 'driver') {
        router.push('/portal/driver/dashboard');
      } else if (user.type === 'company') {
        switch (user.status) {
          case 'WAITING_APPROVAL':
            router.push('/portal/waiting-approval');
            break;
          case 'WAITING_DOCUMENTS':
            router.push('/portal/documents');
            break;
          default:
            router.push('/portal/dashboard');
        }
      }
    } else {
      router.push('/portal/login');
    }
  }, [session, status, router]);

  return (
    <>
      <Head>
        <title>Taşıyıcı Portalı - TaşıApp</title>
        <meta name="description" content="TaşıApp Taşıyıcı Portalı" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            TaşıApp Taşıyıcı Portalı
          </h1>
          <p className="text-gray-600">
            Yönlendiriliyorsunuz...
          </p>
        </div>
      </div>
    </>
  );
} 