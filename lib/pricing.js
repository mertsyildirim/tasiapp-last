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