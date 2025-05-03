import { connectToDatabase } from './minimal-mongodb';

export async function logActivity({
  action,
  userId,
  userInfo,
  ip,
  details,
  status = 'success'
}) {
  try {
    const { db } = await connectToDatabase();
    
    await db.collection('activity_logs').insertOne({
      action,
      userId,
      userInfo,
      ip,
      details,
      status,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Aktivite logu kaydedilirken hata:', error);
  }
} 