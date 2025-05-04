import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';
import { setupCORS, handleOptionsRequest, sendSuccess, sendError, logRequest } from '../../..//lib/api-utils';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';

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
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return sendError(res, 'Yetkilendirme başarısız. Lütfen giriş yapın.', 401);
    }
    
    // Rol kontrolü
    const role = session?.user?.role;
    const roles = session?.user?.roles || [];
    
    const allowedRoles = ['admin', 'super_admin'];
    const hasAllowedRole = roles.some(r => allowedRoles.includes(r)) || allowedRoles.includes(role);
    
    if (!hasAllowedRole) {
      return sendError(res, 'Bu işlem için yetkiniz yok', 403);
    }
    
    if (req.method !== 'PUT' && req.method !== 'POST') {
      res.setHeader('Allow', ['PUT', 'POST']);
      return sendError(res, `Metod ${req.method} izin verilmiyor`, 405);
    }
    
    // Veritabanına bağlan
    const { db } = await connectToDatabase();
    
    const { userId, role: newRole } = req.body;
    
    // Gerekli alanları kontrol et
    if (!userId || !newRole) {
      return sendError(res, 'Kullanıcı ID ve rol alanları zorunludur', 400);
    }
    
    // ObjectId kontrolü
    let objectId;
    try {
      objectId = new ObjectId(userId);
    } catch (error) {
      return sendError(res, 'Geçersiz kullanıcı ID formatı', 400);
    }
    
    // Kullanıcıyı bul
    const user = await db.collection('users').findOne({ _id: objectId });
    
    if (!user) {
      return sendError(res, 'Belirtilen ID ile kullanıcı bulunamadı', 404);
    }
    
    // Kullanıcı rolünü güncelle
    const result = await db.collection('users').updateOne(
      { _id: objectId },
      { 
        $set: { 
          role: newRole,
          roles: [newRole],
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.modifiedCount === 0) {
      return sendError(res, 'Rol güncellenemedi', 400);
    }
    
    // Güncellenmiş kullanıcıyı al
    const updatedUser = await db.collection('users').findOne({ _id: objectId });
    
    return sendSuccess(res, {
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        roles: updatedUser.roles || [updatedUser.role]
      }
    }, 200, 'Kullanıcı rolü başarıyla güncellendi');
    
  } catch (error) {
    console.error('API hatası:', error);
    return sendError(res, 'Sunucu hatası: ' + error.message, 500);
  }
} 