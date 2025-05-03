import { Storage } from '@google-cloud/storage';

// Google Cloud Storage istemcisini oluştur
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
});

// Bucket adı
const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'tasiapp-storage';

/**
 * Dosyayı Google Cloud Storage'a yükler
 * @param {Buffer} fileBuffer - Yüklenecek dosya buffer'ı
 * @param {string} fileName - Dosya adı (örn: 'service-icons/service-id.png')
 * @param {string} contentType - Dosya içerik tipi (örn: 'image/png')
 * @returns {Promise<string>} - Dosyanın public URL'i
 */
export async function uploadFile(fileBuffer, fileName, contentType) {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(fileName);
    
    // Dosyayı yükle
    await file.save(fileBuffer, {
      metadata: {
        contentType,
      },
      public: true, // Dosyayı public yap
    });
    
    // Dosyanın public URL'ini döndür
    return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error('Dosya yüklenirken hata:', error);
    throw error;
  }
}

/**
 * Hizmet ikonunu yükler
 * @param {Buffer} iconBuffer - İkon buffer'ı
 * @param {string} serviceId - Hizmet ID'si
 * @param {string} fileExtension - Dosya uzantısı (örn: 'png', 'jpg')
 * @returns {Promise<string>} - İkonun public URL'i
 */
export async function uploadServiceIcon(iconBuffer, serviceId, fileExtension = 'png') {
  const fileName = `service-icons/${serviceId}.${fileExtension}`;
  return uploadFile(iconBuffer, fileName, `image/${fileExtension}`);
}

/**
 * Müşteri faturasını yükler
 * @param {Buffer} pdfBuffer - PDF buffer'ı
 * @param {string} invoiceId - Fatura ID'si
 * @returns {Promise<string>} - PDF'in public URL'i
 */
export async function uploadCustomerInvoicePdf(pdfBuffer, invoiceId) {
  const timestamp = new Date().getTime();
  const fileName = `faturalar/musteri-fatura/invoice_${invoiceId}_${timestamp}.pdf`;
  return uploadFile(pdfBuffer, fileName, 'application/pdf');
}

/**
 * Taşıyıcı faturasını yükler
 * @param {Buffer} pdfBuffer - PDF buffer'ı
 * @param {string} invoiceId - Fatura ID'si
 * @returns {Promise<string>} - PDF'in public URL'i
 */
export async function uploadCarrierInvoicePdf(pdfBuffer, invoiceId) {
  const timestamp = new Date().getTime();
  const fileName = `faturalar/tasiyici-fatura/invoice_${invoiceId}_${timestamp}.pdf`;
  return uploadFile(pdfBuffer, fileName, 'application/pdf');
}

/**
 * Taşıyıcı firmasının vergi levhasını yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} carrierId - Taşıyıcı ID'si
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadCarrierTaxDocument(fileBuffer, carrierId) {
  const timestamp = new Date().getTime();
  const fileName = `tasiyici-firma-belge/vergi-levhalari/vergi_${carrierId}_${timestamp}.pdf`;
  return uploadFile(fileBuffer, fileName, 'application/pdf');
}

/**
 * Taşıyıcı firmasının ticaret sicil gazetesini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} carrierId - Taşıyıcı ID'si
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadCarrierTradeRegistryDocument(fileBuffer, carrierId) {
  const timestamp = new Date().getTime();
  const fileName = `tasiyici-firma-belge/ticaret-sicil/sicil_${carrierId}_${timestamp}.pdf`;
  return uploadFile(fileBuffer, fileName, 'application/pdf');
}

/**
 * Taşıyıcı firmasının imza sirkülerini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} carrierId - Taşıyıcı ID'si
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadCarrierSignatureCircularDocument(fileBuffer, carrierId) {
  const timestamp = new Date().getTime();
  const fileName = `tasiyici-firma-belge/imza-sirkuleri/imza_${carrierId}_${timestamp}.pdf`;
  return uploadFile(fileBuffer, fileName, 'application/pdf');
}

/**
 * Taşıyıcı firmasının K1 belgesini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} carrierId - Taşıyıcı ID'si
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadCarrierK1Document(fileBuffer, carrierId) {
  const timestamp = new Date().getTime();
  const fileName = `tasiyici-firma-belge/k-belgeleri/k1_${carrierId}_${timestamp}.pdf`;
  return uploadFile(fileBuffer, fileName, 'application/pdf');
}

/**
 * Taşıyıcı firmasının K2 belgesini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} carrierId - Taşıyıcı ID'si
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadCarrierK2Document(fileBuffer, carrierId) {
  const timestamp = new Date().getTime();
  const fileName = `tasiyici-firma-belge/k-belgeleri/k2_${carrierId}_${timestamp}.pdf`;
  return uploadFile(fileBuffer, fileName, 'application/pdf');
}

/**
 * Taşıyıcı firmasının K3 belgesini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} carrierId - Taşıyıcı ID'si
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadCarrierK3Document(fileBuffer, carrierId) {
  const timestamp = new Date().getTime();
  const fileName = `tasiyici-firma-belge/k-belgeleri/k3_${carrierId}_${timestamp}.pdf`;
  return uploadFile(fileBuffer, fileName, 'application/pdf');
}

/**
 * Taşıyıcı belgesi türüne göre uygun fonksiyonu çağırır
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} carrierId - Taşıyıcı ID'si
 * @param {string} documentType - Belge türü (vergi, sicil, imza, k1, k2, k3)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadCarrierDocument(fileBuffer, carrierId, documentType) {
  switch (documentType) {
    case 'vergi':
      return uploadCarrierTaxDocument(fileBuffer, carrierId);
    case 'sicil':
      return uploadCarrierTradeRegistryDocument(fileBuffer, carrierId);
    case 'imza':
      return uploadCarrierSignatureCircularDocument(fileBuffer, carrierId);
    case 'k1':
      return uploadCarrierK1Document(fileBuffer, carrierId);
    case 'k2':
      return uploadCarrierK2Document(fileBuffer, carrierId);
    case 'k3':
      return uploadCarrierK3Document(fileBuffer, carrierId);
    default:
      throw new Error(`Geçersiz belge türü: ${documentType}`);
  }
}

/**
 * Dosyayı Google Cloud Storage'dan siler
 * @param {string} fileName - Silinecek dosya adı
 * @returns {Promise<void>}
 */
export async function deleteFile(fileName) {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    await bucket.file(fileName).delete();
  } catch (error) {
    console.error('Dosya silinirken hata:', error);
    throw error;
  }
}

/**
 * Hizmet ikonunu siler
 * @param {string} serviceId - Hizmet ID'si
 * @param {string} fileExtension - Dosya uzantısı (örn: 'png', 'jpg')
 * @returns {Promise<void>}
 */
export async function deleteServiceIcon(serviceId, fileExtension = 'png') {
  const fileName = `service-icons/${serviceId}.${fileExtension}`;
  return deleteFile(fileName);
}

/**
 * Sürücü ehliyetinin ön yüzünü yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} driverId - Sürücü ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadDriverLicenseFront(fileBuffer, driverId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `surucu-belge/ehliyet/on-yuz/ehliyet_on_${driverId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Sürücü ehliyetinin arka yüzünü yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} driverId - Sürücü ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadDriverLicenseBack(fileBuffer, driverId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `surucu-belge/ehliyet/arka-yuz/ehliyet_arka_${driverId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Sürücü SRC belgesini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} driverId - Sürücü ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadDriverSrcDocument(fileBuffer, driverId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `surucu-belge/src/src_${driverId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Sürücü adli sicil kaydını yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} driverId - Sürücü ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadDriverCriminalRecordDocument(fileBuffer, driverId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `surucu-belge/adli-sicil/sicil_${driverId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Sürücü sağlık raporunu yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} driverId - Sürücü ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadDriverHealthReportDocument(fileBuffer, driverId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `surucu-belge/saglik-raporu/saglik_${driverId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Sürücü psikoteknik belgesini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} driverId - Sürücü ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadDriverPsychotechniqueDocument(fileBuffer, driverId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `surucu-belge/psikoteknik/psikoteknik_${driverId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Sürücü belgesini tipine göre yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} driverId - Sürücü ID'si
 * @param {string} documentType - Belge türü (dlFront, dlBack, src, criminalRecord, healthReport, psychotechnique)
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg) 
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadDriverDocument(fileBuffer, driverId, documentType, fileExtension) {
  switch (documentType) {
    case 'dlFront':
      return uploadDriverLicenseFront(fileBuffer, driverId, fileExtension);
    case 'dlBack':
      return uploadDriverLicenseBack(fileBuffer, driverId, fileExtension);
    case 'src':
      return uploadDriverSrcDocument(fileBuffer, driverId, fileExtension);
    case 'criminalRecord':
      return uploadDriverCriminalRecordDocument(fileBuffer, driverId, fileExtension);
    case 'healthReport':
      return uploadDriverHealthReportDocument(fileBuffer, driverId, fileExtension);
    case 'psychotechnique':
      return uploadDriverPsychotechniqueDocument(fileBuffer, driverId, fileExtension);
    default:
      throw new Error(`Geçersiz sürücü belgesi türü: ${documentType}`);
  }
}

/**
 * Dosya uzantısına göre içerik tipini döndürür
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {string} - İçerik tipi
 */
function getContentType(fileExtension) {
  const ext = fileExtension.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Araç ruhsatını yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} vehicleId - Araç ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadVehicleRegistrationDocument(fileBuffer, vehicleId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `arac-belge/ruhsat/ruhsat_${vehicleId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Araç muayene belgesini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} vehicleId - Araç ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadVehicleInspectionDocument(fileBuffer, vehicleId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `arac-belge/muayene/muayene_${vehicleId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Araç sigorta poliçesini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} vehicleId - Araç ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadVehicleInsuranceDocument(fileBuffer, vehicleId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `arac-belge/sigorta/sigorta_${vehicleId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Araç kasko poliçesini yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} vehicleId - Araç ID'si
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg)
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadVehicleComprehensiveDocument(fileBuffer, vehicleId, fileExtension) {
  const timestamp = new Date().getTime();
  const fileName = `arac-belge/kasko/kasko_${vehicleId}_${timestamp}.${fileExtension}`;
  return uploadFile(fileBuffer, fileName, getContentType(fileExtension));
}

/**
 * Araç belgesini tipine göre yükler
 * @param {Buffer} fileBuffer - Belge buffer'ı
 * @param {string} vehicleId - Araç ID'si
 * @param {string} documentType - Belge türü (registration, inspection, insurance, comprehensive)
 * @param {string} fileExtension - Dosya uzantısı (pdf, jpg, png, jpeg) 
 * @returns {Promise<string>} - Belgenin public URL'i
 */
export async function uploadVehicleDocument(fileBuffer, vehicleId, documentType, fileExtension) {
  switch (documentType) {
    case 'registration':
      return uploadVehicleRegistrationDocument(fileBuffer, vehicleId, fileExtension);
    case 'inspection':
      return uploadVehicleInspectionDocument(fileBuffer, vehicleId, fileExtension);
    case 'insurance':
      return uploadVehicleInsuranceDocument(fileBuffer, vehicleId, fileExtension);
    case 'comprehensive':
      return uploadVehicleComprehensiveDocument(fileBuffer, vehicleId, fileExtension);
    default:
      throw new Error(`Geçersiz araç belgesi türü: ${documentType}`);
  }
} 