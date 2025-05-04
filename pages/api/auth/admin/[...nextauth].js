import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '../../../../lib/minimal-mongodb';
import { compare } from 'bcryptjs';

export const authOptions = {
  // API yapılandırması
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || 'tasiapp-admin-auth-secret-key',

  // Provider'lar
  providers: [
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'admin-credentials',
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" }
      },
      async authorize(credentials) {
        console.log("Admin giriş authorize çağrıldı:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("Kimlik bilgileri eksik");
          return null;
        }

        try {
          const { db } = await connectToDatabase();
          const user = await db.collection('users').findOne({ email: credentials.email });

          if (!user) {
            console.log("Kullanıcı bulunamadı:", credentials.email);
            return null;
          }

          const isValid = await compare(credentials.password, user.password);
          if (!isValid) {
            console.log("Şifre geçersiz");
            return null;
          }

          console.log("Admin giriş başarılı:", user.email);
          
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name || "Admin Kullanıcı",
            role: user.role || "admin",
            status: user.status || "active"
          };
        } catch (error) {
          console.error("Admin giriş hatası:", error);
          return null;
        }
      }
    })
  ],
  
  // Oturum yapılandırması
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 saat
    cookieName: 'tasiapp-admin-auth'
  },
  
  // Çerez yapılandırması
  cookies: {
    sessionToken: {
      name: `tasiapp-admin-auth-session-token`,
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
    signIn: '/admin',
    signOut: '/admin',
    error: '/admin',
  },
  
  // Callback'ler
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
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
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Callback URL'i kontrol et ve düzelt
      if (url.startsWith('/')) {
        // Relative URL'leri baseUrl ile birleştir
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        // Aynı origin'e sahip URL'leri kabul et
        return url;
      }
      return baseUrl;
    }
  },
  
  // URL Yapılandırması
  useSecureCookies: process.env.NODE_ENV === 'production',
  
  // Temel URL yapılandırması
  basePath: '/api/auth/admin',
};

export default NextAuth(authOptions); 