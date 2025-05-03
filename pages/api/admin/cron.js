import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth]';

// Sunucu tarafında çalışacak modülleri import et
const cronJobs = require('../../../lib/cron-jobs');

export default async function handler(req, res) {
  try {
    // Admin oturumu kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Bu işlem için admin yetkisi gerekiyor' });
    }
    
    const { action } = req.query;
    
    switch (action) {
      case 'start':
        cronJobs.startCronJobs();
        return res.status(200).json({ 
          success: true, 
          message: 'Otomatik görevler başlatıldı', 
          timestamp: new Date().toISOString() 
        });
      
      case 'stop':
        cronJobs.stopCronJobs();
        return res.status(200).json({ 
          success: true, 
          message: 'Otomatik görevler durduruldu', 
          timestamp: new Date().toISOString() 
        });
      
      case 'run':
        const result = await cronJobs.copyPaidRequestsToShipments();
        return res.status(200).json({ 
          success: true, 
          message: `İşlem tamamlandı. ${result.processed || 0} adet talep işlendi`, 
          result,
          timestamp: new Date().toISOString() 
        });
      
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Geçersiz işlem. Kullanılabilir işlemler: start, stop, run', 
          timestamp: new Date().toISOString() 
        });
    }
  } catch (error) {
    console.error('Cron API hatası:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Bir hata oluştu', 
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
} 