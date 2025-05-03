// Kampanya kontrol fonksiyonları buraya eklenecek 

export function applyCampaign(basePrice, campaign, options = {}) {
  if (!campaign || !campaign.isActive) return basePrice;

  const meetsMin = basePrice >= (campaign.minAmount || 0);
  let final = basePrice;

  if (campaign.type === "fixed" && meetsMin) {
    final = basePrice - campaign.discountValue;
  } else if (campaign.type === "percent" && meetsMin) {
    final = basePrice - (basePrice * campaign.discountValue / 100);
  } else if (
    campaign.type === "code" &&
    options.code === campaign.code &&
    meetsMin
  ) {
    final = basePrice - campaign.discountValue;
  }

  return Math.max(0, parseFloat(final.toFixed(2)));
}
