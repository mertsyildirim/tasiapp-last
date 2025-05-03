import { connectToDatabase } from '/lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { setupCORS, handleOptionsRequest, sendSuccess, sendError, logRequest } from '../../../lib/api-utils';

export default async function handler(req, res) {
  // CORS ayarlarını ekle
  setupCORS(res);
  
  // OPTIONS isteğini işle
  if (handleOptionsRequest(req, res)) {
    return;
  }
  
  // İsteği logla
  logRequest(req);
  
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return sendError(res, 'Yetkilendirme başarısız. Lütfen giriş yapın.', 401);
    }
    
    // Rol kontrolü
    const role = session?.user?.role;
    const roles = session?.user?.roles || [];
    
    const allowedRoles = ['super_admin'];
    const hasAllowedRole = roles.some(r => allowedRoles.includes(r)) || allowedRoles.includes(role);
    
    if (!hasAllowedRole) {
      return sendError(res, 'Bu işlem için yetkiniz yok', 403);
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return sendError(res, 'Method not allowed', 405);
    }

    const { email, roles: newRoles } = req.body;

    if (!email || !newRoles) {
      return sendError(res, 'Email ve roller gereklidir', 400);
    }

    // Email formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Geçerli bir e-posta adresi giriniz', 400);
    }

    const { db } = await connectToDatabase();

    // Kullanıcıyı bul
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      return sendError(res, 'Kullanıcı bulunamadı', 404);
    }

    // Rolleri array olarak standardize et
    const normalizedRoles = Array.isArray(newRoles) ? newRoles : [newRoles];

    const result = await db.collection('users').updateOne(
      { email },
      { 
        $set: { 
          roles: normalizedRoles,
          role: normalizedRoles[0], // İlk rolü ana rol olarak belirle
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return sendError(res, 'Kullanıcı bulunamadı', 404);
    }

    return sendSuccess(res, null, 200, 'Kullanıcı rolleri başarıyla güncellendi');

  } catch (error) {
    console.error('Rol güncelleme hatası:', error);
    return sendError(res, 'Sunucu hatası', 500, error);
  }
} 