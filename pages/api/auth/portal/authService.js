import { connectToDatabase } from '/lib/minimal-mongodb';
import bcrypt from 'bcryptjs';

/**
 * Portal kullanıcı kimlik doğrulama servisi
 * @param {string} email - Kullanıcı email adresi
 * @param {string} password - Kullanıcı şifresi
 * @returns {Promise<Object>} Doğrulanmış kullanıcı bilgileri
 * @throws {Error} Doğrulama hatası durumunda
 */
export async function validatePortalCredentials(email, password) {
  if (!email || !password) {
    throw new Error('Email ve şifre gereklidir');
  }

  try {
    const { db } = await connectToDatabase();
    
    // Kullanıcıyı bul
    const user = await db.collection('companies').findOne({ 
      email: email.toLowerCase().trim()
    });
    
    if (!user) {
      console.log('Kullanıcı bulunamadı:', email);
      throw new Error('Kullanıcı bulunamadı');
    }

    // Şifre kontrolü
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log('Şifre eşleşmedi:', email);
      throw new Error('Geçersiz şifre');
    }

    // Hesap durumu kontrolü
    if (user.status === 'REJECTED') {
      console.log('Kullanıcı reddedilmiş:', email);
      throw new Error('Hesabınız reddedilmiş durumda');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: 'carrier',
      status: user.status,
      isFreelance: user.isFreelance || false
    };
  } catch (error) {
    console.error('Portal doğrulama hatası:', error);
    throw new Error(error.message || 'Doğrulama sırasında bir hata oluştu');
  }
} 