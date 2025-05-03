import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/admin/[...nextauth]';
import { sendError } from './api-utils';
import { connectToDatabase } from './minimal-mongodb';
import jwt from 'jsonwebtoken';

/**
 * Kullanıcının oturumunu ve users koleksiyonunda olup olmadığını kontrol eder
 * @param {object} req - HTTP isteği
 * @param {object} res - HTTP yanıtı
 * @returns {Promise<{authorized: boolean, session: object|null, error: string|null}>}
 */
export async function checkUserAuth(req, res) {
  try {
    // Oturum bilgisini al
    const session = await getServerSession(req, res, authOptions);
    
    // Session yoksa hata dön
    if (!session) {
      return { 
        authorized: false, 
        session: null, 
        error: 'Oturum bulunamadı. Lütfen giriş yapın.' 
      };
    }
    
    // Oturum varsa, kullanıcının veritabanında olup olmadığını kontrol et
    try {
      const { db } = await connectToDatabase();
      const userEmail = session?.user?.email;
      
      if (!userEmail) {
        return { 
          authorized: false, 
          session, 
          error: 'Geçerli bir kullanıcı bilgisi bulunamadı'
        };
      }
      
      // Kullanıcının users koleksiyonunda olup olmadığını kontrol et
      const user = await db.collection('users').findOne({ email: userEmail });
      
      if (!user) {
        return { 
          authorized: false,
          session, 
          error: 'Kullanıcı veritabanında bulunamadı'
        };
      }
    
      // Yetkilendirme başarılı - users koleksiyonunda olduğu sürece erişim izni var
      return { 
        authorized: true, 
        session, 
        error: null 
      };
    } catch (error) {
      console.error('Veritabanı kontrol hatası:', error);
      return { 
        authorized: false, 
        session, 
        error: 'Kullanıcı doğrulama sırasında bir hata oluştu' 
      };
    }
  } catch (error) {
    console.error('Yetkilendirme hatası:', error);
    return { 
      authorized: false, 
      session: null, 
      error: 'Yetkilendirme sırasında bir hata oluştu' 
    };
  }
}

/**
 * API endpoint için yetkilendirme kontrolü yapar
 * @param {object} req - HTTP isteği
 * @param {object} res - HTTP yanıtı
 * @param {string[]} allowedRoles - İzin verilen roller (boş dizi verilirse sadece users koleksiyonu kontrolü yapar)
 * @returns {Promise<{authorized: boolean, session: object|null}>}
 */
export async function requireAuth(req, res, allowedRoles = []) {
  const authResult = await checkUserAuth(req, res, allowedRoles);
  
  if (!authResult.authorized) {
    const statusCode = authResult.session ? 403 : 401;
    sendError(res, authResult.error, statusCode);
    return { authorized: false, session: null };
  }
  
  return { authorized: true, session: authResult.session };
}

/**
 * Kullanıcının belirli izinlere sahip olup olmadığını kontrol eder
 * @param {object} session - Kullanıcı oturumu
 * @param {string[]} requiredRoles - Gerekli roller
 * @returns {boolean}
 */
export function hasRole(session, requiredRoles = []) {
  if (!session || !session.user) return false;
  
  const userRole = session.user.role;
  const userRoles = session.user.roles || [];
  
  return requiredRoles.some(role => 
    userRoles.includes(role) || userRole === role
  );
} 