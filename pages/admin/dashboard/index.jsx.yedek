import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

const Dashboard = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Oturum kontrolü
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.replace('/admin');
      return;
    }
    
    // NOT: Rol kontrolü kaldırıldı - sadece session kontrolü yapıyoruz
  }, [session, status, router]);

  useEffect(() => {
    // Oturum varsa veri çekme
    if (session) {
      const fetchDashboardData = async () => {
        try {
          const response = await fetch('/api/admin/dashboard');
          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Veriler alınamadı');
          }
          
          setData(result.data);
          setLoading(false);
        } catch (err) {
          console.error('Dashboard verileri alınırken hata:', err);
          setError(err.message || 'Veriler alınamadı');
          setLoading(false);
        }
      };
      
      fetchDashboardData();
    }
  }, [session]);

  if (status === 'loading' || loading) {
    return <div>Yükleniyor...</div>;
  }

  if (error) {
    return <div>Hata: {error}</div>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Hoş geldiniz!</p>
      {data && (
        <div>
          {/* Dashboard verilerini göster */}
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 