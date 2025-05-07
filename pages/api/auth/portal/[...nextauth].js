import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '../../../../lib/minimal-mongodb';
import { compare } from 'bcryptjs';

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      id: "portal-credentials",
      name: 'portal-credentials',
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" }
      },
      async authorize(credentials) {
        console.log('=== GİRİŞ DENEMESI BAŞLADI ===');
        console.log('Email:', credentials.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('HATA: Email veya şifre boş');
          throw new Error('E-posta ve şifre gereklidir');
        }

        try {
          const { db } = await connectToDatabase();
          console.log('MongoDB bağlantısı başarılı');
          
          // Companies koleksiyonunda ara
          let user = await db.collection('companies').findOne({ email: credentials.email });
          let userType = 'company';
          console.log('Companies koleksiyonu sonucu:', user ? 'BULUNDU' : 'Bulunamadı');

          // Drivers koleksiyonunda ara
          if (!user) {
            user = await db.collection('drivers').findOne({ email: credentials.email });
            userType = 'driver';
            console.log('Drivers koleksiyonu sonucu:', user ? 'BULUNDU' : 'Bulunamadı');
          }

          if (!user) {
            console.log('HATA: Kullanıcı bulunamadı');
            throw new Error('Kullanıcı bulunamadı');
          }

          // Şifre kontrolü - eğer şifre alanı yoksa veya boşsa bu kontrolü atla (geliştirme amaçlı)
          if (user.password) {
            const isValid = await compare(credentials.password, user.password);
            console.log('Şifre kontrolü:', isValid ? 'BAŞARILI' : 'HATALI');

            if (!isValid) {
              console.log('HATA: Şifre yanlış');
              throw new Error('E-posta veya şifre hatalı');
            }
          } else {
            console.log('UYARI: Kullanıcı şifresi tanımlanmamış');
          }

          // Driver ve company durumlarını aynı şekilde işle
          const userData = {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.companyName || user.driverName || 'Kullanıcı',
            userType: userType,
            isFreelance: user.isFreelance || false,
            status: user.status || 'ACTIVE' // Varsayılan durum ekledik
          };

          console.log('=== GİRİŞ BAŞARILI ===');
          console.log('Kullanıcı:', userData);
          return userData;

        } catch (error) {
          console.log('=== GİRİŞ HATASI ===');
          console.log('Hata detayı:', error.message);
          throw new Error(error.message || 'Giriş yapılırken bir hata oluştu');
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 saat
    cookieName: 'tasiapp-portal-auth'
  },
  cookies: {
    sessionToken: {
      name: `tasiapp-portal-auth-session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  pages: {
    signIn: '/portal/login',
    error: '/portal/login',
    signOut: '/portal/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log('JWT oluşturuluyor:', { user });
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.userType = user.userType;
        token.isFreelance = user.isFreelance;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        console.log('Session oluşturuluyor:', { token });
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.userType = token.userType;
        session.user.isFreelance = token.isFreelance;
        session.user.status = token.status;
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development'
};

export default NextAuth(authOptions);
