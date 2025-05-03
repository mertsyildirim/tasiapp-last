const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const httpsLocalhost = require('https-localhost');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Lokal sertifikalar oluştur - updated API
const PORT = 3000;
const localhost = httpsLocalhost();
const certs = localhost.cert;

app.prepare().then(() => {
  // Cron işlerini başlat (uygulama import ile başlatılmış olsa da, burada da bir kez daha kontrol edelim)
  try {
    // ESM ve CJS uyumsuzluğunu dynamic import ile çöz
    import('./middleware/cron-middleware.js')
      .then(module => {
        module.default();
        console.log('Cron işleri server.js üzerinden başlatıldı');
      })
      .catch(err => {
        console.error('Cron işleri yüklenirken hata:', err);
      });
  } catch (error) {
    console.error('Cron başlatma hatası:', error);
  }

  createServer(certs, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Next.js tarafından istek işleniyor
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Hata:', err);
      res.statusCode = 500;
      res.end('Dahili sunucu hatası');
    }
  }).listen(PORT, (err) => {
    if (err) throw err;
    console.log(`\n🔒 HTTPS sunucusu çalışıyor: https://localhost:${PORT}`);
    console.log(`👍 Güvenli bir konum API'si için artık doğrudan bu URL'yi kullanabilirsiniz\n`);
  });
}); 