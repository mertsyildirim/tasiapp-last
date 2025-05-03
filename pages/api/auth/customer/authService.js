import { connectToDatabase } from '/lib/minimal-mongodb';
import bcrypt from 'bcryptjs';

/**
 * Müşteri kimlik doğrulama servisi
 * @param {string} email - Kullanıcı email adresi
 * @param {string} password - Kullanıcı şifresi
 * @returns {Promise<Object>} Doğrulanmış kullanıcı bilgileri
 * @throws {Error} Doğrulama hatası durumunda
 */
export async function validateCustomerCredentials(email, password) {
  if (!email || !password) {
    throw new Error('Email ve şifre gereklidir');
  }

  try {
    const { db } = await connectToDatabase();
    
    // Kullanıcıyı bul
    const user = await db.collection('customers').findOne({ 
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
    if (user.status !== 'ACTIVE') {
      console.log('Hesap aktif değil:', email);
      throw new Error('Hesabınız aktif değil');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountType: user.accountType,
      status: user.status,
      phone: user.phone,
      companyName: user.companyName,
      taxOffice: user.taxOffice,
      taxNumber: user.taxNumber,
      companyAddress: user.companyAddress
    };
  } catch (error) {
    console.error('Müşteri doğrulama hatası:', error);
    throw new Error(error.message || 'Doğrulama sırasında bir hata oluştu');
  }
} 