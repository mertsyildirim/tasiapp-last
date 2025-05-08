import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Oturum kontrolü
  const session = await getSession({ req });
  
  if (!session) {
    console.log('Oturumsuz erişim - boş veri dönülüyor');
    return res.status(200).json({ 
      success: true, 
      settings: {
        notifications: {
          email: {},
          sms: {},
          pushNotifications: {}
        },
        privacy: {},
        preferences: {
          language: 'tr',
          timezone: 'Europe/Istanbul',
          currency: 'TRY',
          distanceUnit: 'km',
          weightUnit: 'ton',
        },
        security: {}
      }
    });
  }

  // Veritabanına bağlan
  try {
    const { db } = await connectToDatabase();
    const userId = session.user.id;
    
    // GET isteği - mevcut ayarları getir
    if (req.method === 'GET') {
      console.log('Ayarlar getiriliyor - Kullanıcı ID:', userId);
      
      // Kullanıcı ayarlarını ara
      let userSettings;
      
      try {
        // Önce string ID olarak ara
        userSettings = await db.collection('userSettings').findOne({ userId: userId });
        
        // Bulunamadıysa ObjectId ile dene
        if (!userSettings && ObjectId.isValid(userId)) {
          userSettings = await db.collection('userSettings').findOne({ 
            userId: new ObjectId(userId) 
          });
        }
        
        // Kullanıcı email'i ile dene
        if (!userSettings && session.user.email) {
          const user = await db.collection('users').findOne({ 
            email: session.user.email 
          });
          
          if (user) {
            userSettings = await db.collection('userSettings').findOne({ 
              userId: user._id.toString() 
            });
          }
        }
        
        // Kullanıcı şirketini bul
        if (!userSettings && session.user.email) {
          const company = await db.collection('companies').findOne({ 
            email: session.user.email 
          });
          
          if (company) {
            userSettings = await db.collection('userSettings').findOne({ 
              userId: company._id.toString() 
            });
          }
        }
      } catch (error) {
        console.error('Ayarlar aranırken hata:', error);
      }
      
      // Ayarlar bulunamadıysa, varsayılan ayarlar oluştur
      if (!userSettings) {
        console.log('Kullanıcı ayarları bulunamadı, varsayılan ayarlar kullanılıyor');
        const defaultSettings = {
          notifications: {
            email: {
              newRequests: true,
              taskUpdates: true,
              paymentNotifications: true,
              marketingEmails: false,
            },
            sms: {
              newRequests: true,
              taskUpdates: true,
              paymentNotifications: true,
              emergencyAlerts: true,
            },
            pushNotifications: {
              newRequests: true,
              taskUpdates: true,
              paymentNotifications: true,
              systemUpdates: true,
            },
          },
          privacy: {
            showProfile: true,
            showContactInfo: true,
            showRating: true,
            shareStatistics: false,
          },
          preferences: {
            language: 'tr',
            timezone: 'Europe/Istanbul',
            currency: 'TRY',
            distanceUnit: 'km',
            weightUnit: 'ton',
          },
          security: {
            twoFactorEnabled: false,
            loginNotifications: true,
            lastPasswordChange: new Date().toISOString(),
          }
        };
        
        return res.status(200).json({
          success: true,
          settings: defaultSettings
        });
      }
      
      // Ayarları dön
      return res.status(200).json({
        success: true,
        settings: userSettings.settings
      });
    }
    
    // PUT isteği - ayarları güncelle
    if (req.method === 'PUT') {
      console.log('Ayarlar güncelleniyor - Kullanıcı ID:', userId);
      const { settings } = req.body;
      
      if (!settings) {
        return res.status(400).json({
          success: false,
          message: 'Ayarlar verisi eksik'
        });
      }
      
      // Ayarlar belgesini bul veya oluştur (upsert)
      const updateResult = await db.collection('userSettings').updateOne(
        { userId: userId },
        { 
          $set: { 
            settings: settings,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Ayarlar başarıyla güncellendi',
        updated: updateResult.modifiedCount > 0,
        created: updateResult.upsertedCount > 0
      });
    }
    
    // Desteklenmeyen istek metodu
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed'
    });
    
  } catch (error) {
    console.error('Settings API hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: error.message
    });
  }
} 