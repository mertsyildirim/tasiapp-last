import { connectToDatabase } from '../../../lib/minimal-mongodb';

export default async function handler(req, res) {
  try {
    const { db } = await connectToDatabase();
    console.log('MongoDB bağlantısı başarılı');
    
    // Taleplerden birini örnek olarak al
    const sampleRequest = await db.collection('requests').findOne({});
    
    // Taleplerden status alanlarını al
    const statuses = await db.collection('requests').distinct('status');
    
    // Taşıma tipi bilgilerini al
    const transportTypeInfo = await db.collection('requests').aggregate([
      {
        $project: {
          _id: 1,
          id: 1,
          status: 1,
          transportType: 1,
          transportTypeId: 1,
          transportTypes: 1
        }
      },
      { $limit: 5 }
    ]).toArray();
    
    // Bir şirketin desteklediği taşıma tiplerini al
    const company = await db.collection('companies').findOne({});
    const supportedTransportTypes = company ? company.transportTypes || [] : [];
    
    return res.status(200).json({
      success: true,
      sampleRequest,
      statuses,
      transportTypeInfo,
      company: {
        id: company ? company._id : null,
        companyName: company ? company.companyName : null,
        supportedTransportTypes
      }
    });
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 