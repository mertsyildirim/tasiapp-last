import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../lib/minimal-mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // Sadece GET isteklerine izin ver
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Oturum kontrolü
  let session = await getSession({ req });
  if (!session) {
    console.log('Oturumsuz erişim - boş veri dönülüyor');
    return res.status(200).json({ 
      success: true, 
      documents: []
    });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Kullanıcı bilgilerini al
    const userId = session.user.id;
    
    // Kullanıcının şirket bilgilerini al
    let company;
    try {
      company = await db.collection('companies').findOne({ 
        $or: [
          { _id: new ObjectId(userId) },
          { _id: userId },
          { email: session.user.email }
        ]
      });
    } catch (error) {
      console.error('Şirket bilgisi alınırken hata:', error);
    }

    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bilgisi bulunamadı' });
    }

    // Şirket belgelerini al (company.documents objesi içindeki belgeler)
    const companyDocuments = [];
    
    if (company.documents) {
      // documents bir obje olabilir (key:value) veya bir dizi olabilir
      if (Array.isArray(company.documents)) {
        // Dizi ise doğrudan ekle
        companyDocuments.push(...company.documents);
      } else {
        // Obje ise her key:value çiftini belgeye dönüştür
        for (const [key, value] of Object.entries(company.documents)) {
          if (value && typeof value === 'object') {
            companyDocuments.push({
              id: `company_${key}_${company._id}`,
              title: getDocumentTitle(key),
              type: key,
              status: value.approved ? 'approved' : 'pending',
              expiryDate: value.expiryDate || null,
              uploadDate: value.uploadDate || new Date(),
              fileUrl: value.url || '',
              fileSize: value.fileSize || '',
              notes: value.notes || getDocumentNotes(key),
              verificationDate: value.verificationDate || null,
              verifiedBy: value.verifiedBy || null,
              documentOwner: 'company',
              ownerName: company.name || company.companyName || 'Şirket'
            });
          }
        }
      }
    }

    // Şirkete bağlı sürücüleri al
    const drivers = await db.collection('drivers')
      .find({ companyId: company._id.toString() })
      .toArray();
    
    console.log(`${drivers.length} sürücü bulundu`);
    
    // Sürücü belgelerini al
    const driverDocuments = [];
    
    for (const driver of drivers) {
      // Her sürücünün belgelerini kontrol et ve ekle
      if (driver.documents) {
        if (Array.isArray(driver.documents)) {
          // Her belgeye sürücü bilgisini ekleyerek pushla
          driver.documents.forEach(doc => {
            driverDocuments.push({
              ...doc,
              id: doc.id || `driver_${doc.type}_${driver._id}`,
              documentOwner: 'driver',
              ownerName: driver.name || driver.firstName + ' ' + driver.lastName || 'Sürücü'
            });
          });
        } else {
          // Obje ise her key:value çiftini belgeye dönüştür
          for (const [key, value] of Object.entries(driver.documents)) {
            if (value && typeof value === 'object') {
              driverDocuments.push({
                id: `driver_${key}_${driver._id}`,
                title: getDocumentTitle(key),
                type: key,
                status: value.approved ? 'approved' : 'pending',
                expiryDate: value.expiryDate || null,
                uploadDate: value.uploadDate || new Date(),
                fileUrl: value.url || '',
                fileSize: value.fileSize || '',
                notes: value.notes || getDocumentNotes(key),
                verificationDate: value.verificationDate || null,
                verifiedBy: value.verifiedBy || null,
                documentOwner: 'driver',
                ownerName: driver.name || driver.firstName + ' ' + driver.lastName || 'Sürücü'
              });
            }
          }
        }
      }
    }
    
    // Araç belgelerini al (company.vehicles veya ayrı vehicles collection)
    const vehicleDocuments = [];
    let vehicles = [];

    // Önce şirketin vehicles alanına bak
    if (company.vehicles && Array.isArray(company.vehicles)) {
      vehicles = company.vehicles;
    } else {
      // vehicles koleksiyonundan şirkete ait araçları al
      vehicles = await db.collection('vehicles')
        .find({ companyId: company._id.toString() })
        .toArray();
      
      console.log(`${vehicles.length} araç bulundu`);
    }

    // Araç belgelerini ekle
    for (const vehicle of vehicles) {
      if (vehicle.documents) {
        if (Array.isArray(vehicle.documents)) {
          // Her belgeye araç bilgisini ekleyerek pushla
          vehicle.documents.forEach(doc => {
            vehicleDocuments.push({
              ...doc,
              id: doc.id || `vehicle_${doc.type}_${vehicle._id}`,
              documentOwner: 'vehicle',
              ownerName: `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber || vehicle.plate || 'Plaka Yok'})`
            });
          });
        } else {
          // Obje ise her key:value çiftini belgeye dönüştür
          for (const [key, value] of Object.entries(vehicle.documents)) {
            if (value && typeof value === 'object') {
              vehicleDocuments.push({
                id: `vehicle_${key}_${vehicle._id}`,
                title: getDocumentTitle(key),
                type: key,
                status: value.approved ? 'approved' : 'pending',
                expiryDate: value.expiryDate || null,
                uploadDate: value.uploadDate || new Date(),
                fileUrl: value.url || '',
                fileSize: value.fileSize || '',
                notes: value.notes || getDocumentNotes(key),
                verificationDate: value.verificationDate || null,
                verifiedBy: value.verifiedBy || null,
                documentOwner: 'vehicle',
                ownerName: `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber || vehicle.plate || 'Plaka Yok'})`
              });
            }
          }
        }
      }
    }
    
    // Tüm belgeleri birleştir
    const allDocuments = [
      ...companyDocuments,
      ...driverDocuments,
      ...vehicleDocuments
    ];
    
    // Sonuç döndür
    return res.status(200).json({ 
      success: true, 
      documents: allDocuments
    });
    
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
}

// Belge türüne göre başlık oluştur
function getDocumentTitle(type) {
  switch(type) {
    // Şirket belgeleri
    case 'license':
      return 'Taşımacılık Yetki Belgesi';
    case 'taxCertificate':
      return 'Vergi Levhası';
    case 'chamberOfCommerce':
      return 'Ticaret Odası Belgesi';
    case 'companyInsurance':
      return 'Şirket Sigorta Poliçesi';
    
    // Sürücü belgeleri
    case 'driverLicense':
    case 'dlFront':
      return 'Ehliyet (Ön)';
    case 'dlBack':
      return 'Ehliyet (Arka)';
    case 'src':
      return 'SRC Belgesi';
    case 'criminalRecord':
      return 'Adli Sicil Kaydı';
    case 'healthReport':
      return 'Sağlık Raporu';
    case 'psychotechnique':
      return 'Psikoteknik Belgesi';
    
    // Araç belgeleri
    case 'registration':
      return 'Ruhsat';
    case 'inspection':
      return 'Muayene Belgesi';
    case 'insurance':
      return 'Sigorta Poliçesi';
    case 'comprehensive':
      return 'Kasko Poliçesi';
    
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1');
  }
}

// Belge türüne göre notları oluştur
function getDocumentNotes(type) {
  switch(type) {
    case 'license':
      return 'K1, K2 veya benzeri taşımacılık yetki belgesi';
    case 'src':
      return 'Mutlaka geçerli bir SRC belgesine sahip olmalı';
    case 'inspection':
      return 'Araç muayenesinin geçerli olması gerekir';
    case 'insurance':
      return 'Zorunlu Trafik Sigortası';
    default:
      return '';
  }
} 