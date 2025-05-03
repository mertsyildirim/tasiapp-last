import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/router';
import { signIn, signOut, useSession } from 'next-auth/react';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (status !== 'loading') {
      setLoading(false);
    }
  }, [status]);

  const login = async (email, password) => {
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (result.ok) {
      return { success: true };
    } else {
      return { success: false, message: result.error || 'Giriş başarısız' };
    }
  };

  const logout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const register = async () => {
    console.warn('Kayıt fonksiyonu henüz tanımlanmadı.');
    return { success: false, error: 'Kayıt desteklenmiyor' };
  };

  const updateProfile = async () => {
    console.warn('Profil güncelleme fonksiyonu tanımlanmadı.');
    return { success: false, error: 'Profil güncelleme desteklenmiyor' };
  };

  const authContextValue = {
    isAuthenticated: status === 'authenticated',
    user: session?.user || null,
    loading,
    login,
    logout,
    register,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function withAuth(Component, allowedRoles = []) {
  return function AuthenticatedComponent(props) {
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!isAuthenticated) {
          router.push('/login');
          return;
        }

        if (allowedRoles.length > 0) {
          const userRole = user?.role || '';
          const userRoles = user?.roles || [userRole];

          const hasAllowedRole =
            userRoles.some((role) => allowedRoles.includes(role)) ||
            allowedRoles.includes(userRole);

          if (!hasAllowedRole) {
            router.push('/');
          }
        }
      }
    }, [loading, isAuthenticated, user, router]);

    if (loading) return <div>Yükleniyor...</div>;

    return user ? <Component {...props} /> : null;
  };
}
