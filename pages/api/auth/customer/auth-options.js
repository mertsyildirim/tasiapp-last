import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '../../../../lib/minimal-mongodb';
import { compare } from 'bcryptjs';

export const authOptions = {
  // API yapılandırması
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || 'tasiapp-customer-auth-secret-key',

  providers: [
    CredentialsProvider({
      id: 'customer-credentials',
      name: 'customer-credentials',
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" }
      },
      async authorize(credentials) {
        console.log("Customer giriş authorize çağrıldı:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("Kimlik bilgileri eksik");
          return null;
        }

        try {
          const { db } = await connectToDatabase();
          const user = await db.collection('customers').findOne({ email: credentials.email });

          if (!user) {
            console.log("Kullanıcı bulunamadı:", credentials.email);
            return null;
          }

          const isValid = await compare(credentials.password, user.password);
          if (!isValid) {
            console.log("Şifre geçersiz");
            return null;
          }

          console.log("Customer giriş başarılı:", user.email);
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.firstName + ' ' + user.lastName || 'Müşteri',
            phone: user.phone,
            status: user.status || 'active'
          };
        } catch (error) {
          console.error("Customer giriş hatası:", error);
          return null;
        }
      }
    })
  ],
  
  // Oturum yapılandırması
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 saat
    cookieName: 'tasiapp-customer-auth'
  },
  
  // Çerez yapılandırması
  cookies: {
    sessionToken: {
      name: `tasiapp-customer-auth-session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  
  // Sayfa yönlendirmeleri
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login?error=auth',
  },
  
  // Callback'ler
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.phone = user.phone;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = session.user || {};
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.phone = token.phone;
        session.user.status = token.status;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Callback URL'i kontrol et ve düzelt
      if (url.startsWith('/')) {
        // Profile sayfasına yönlendirme için özel kontrol
        if (url.includes('/dashboard')) {
          return `${baseUrl}/profile`;
        }
        // Relative URL'leri baseUrl ile birleştir
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        // Aynı origin'e sahip URL'leri kabul et
        return url;
      }
      return baseUrl + '/profile';
    }
  },
  
  // URL Yapılandırması
  useSecureCookies: process.env.NODE_ENV === 'production',
  
  // Temel URL yapılandırması
  basePath: '/api/auth/customer',
}; 