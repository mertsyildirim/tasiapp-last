// Fiyat hesaplama fonksiyonları buraya eklenecek 

export function calculateBasePrice(distance, options, pricing) {
  const basePrice = Number(pricing.basePrice) || 0;
  const baseKm = Number(pricing.baseKm) || 0;
  const pricePerKm = Number(pricing.pricePerKm) || 0;
  const urgentFee = Number(pricing.urgentFee) || 0;
  const nightFee = Number(pricing.nightFee) || 0;
  const distanceVal = Number(distance) || 0;

  const extraKm = Math.max(distanceVal - baseKm, 0);
  
  console.log("🔍 Fiyat Hesaplama");
  console.log("Mesafe:", distanceVal);
  console.log("Base Fiyat:", basePrice);
  console.log("Base KM:", baseKm);
  console.log("Fazla KM:", extraKm);
  console.log("KM Başına Fiyat:", pricePerKm);
  console.log("Urgent:", urgentFee, "Night:", nightFee);

  let total = basePrice + (extraKm * pricePerKm);

  if (options?.isUrgent) total += urgentFee;
  if (options?.isNight) total += nightFee;

  return Math.round(total);
} 

/**
 * Taşıyıcı komisyon hesaplaması yapar
 * @param {number} totalAmount - Müşterinin ödediği toplam miktar
 * @param {number} commissionRate - Taşıyıcının komisyon oranı (0-100 arası)
 * @returns {Object} - Taşıyıcıya ödenecek miktar ve platformda kalacak komisyon miktarı
 */
export function calculateCarrierPayment(totalAmount, commissionRate = 0) {
  // Girdileri sayıya çevir
  const amount = Number(totalAmount) || 0;
  const rate = Number(commissionRate) || 0;
  
  // Oran 0-100 arasında olmalı
  const validRate = Math.max(0, Math.min(100, rate));
  
  // Komisyon miktarını hesapla (toplam fiyat * komisyon oranı / 100)
  const commissionAmount = amount * (validRate / 100);
  
  // Taşıyıcıya ödenecek miktarı hesapla (toplam fiyat - komisyon miktarı)
  const carrierPayment = amount - commissionAmount;
  
  console.log("💰 Komisyon Hesaplama");
  console.log("Toplam Tutar:", amount);
  console.log("Komisyon Oranı:", validRate);
  console.log("Komisyon Miktarı:", commissionAmount);
  console.log("Taşıyıcı Ödemesi:", carrierPayment);
  
  return {
    totalAmount: amount,
    commissionRate: validRate,
    commissionAmount: commissionAmount,
    carrierPayment: carrierPayment
  };
} 