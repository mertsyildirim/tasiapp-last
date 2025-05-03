// YEDEK DOSYA - DEVRE DIŞI BIRAKILDI
// Orijinal dosya: /pages/api/portal/[...nextauth].js
// Tarih: 2024-04-30

export default function handler(req, res) {
  res.status(403).json({ message: 'Bu endpoint devre dışı bırakıldı' });
}
