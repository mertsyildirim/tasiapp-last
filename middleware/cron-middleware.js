// Sadece sunucu tarafında çalıştır 
if (typeof window !== 'undefined') {
  module.exports = function() {};
} else {
  // Sunucu tarafında cronJobs modülünü kullan
  const cronJobs = require('../lib/cron-jobs');

  // Cron middleware'i
  let cronStarted = false;

  function initCronJobs() {
    if (cronStarted) {
      console.log('Cron işleri zaten başlatılmış durumda, tekrar başlatılmıyor');
      return;
    }
    
    // Development modunda çift başlatmayı önle
    if (process.env.NODE_ENV === 'development') {
      if (process.env.CRON_ALREADY_STARTED === 'true') {
        console.log('Development modunda çift başlatma önlendi');
        return;
      }
      process.env.CRON_ALREADY_STARTED = 'true';
    }
    
    try {
      cronJobs.startCronJobs();
      cronStarted = true;
      console.log('Cron işleri başarıyla başlatıldı');
    } catch (error) {
      console.error('Cron işleri başlatılırken hata:', error);
    }
  }

  // CommonJS export
  module.exports = initCronJobs;
}