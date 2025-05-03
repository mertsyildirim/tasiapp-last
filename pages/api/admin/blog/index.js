import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/admin/[...nextauth].js'
import { connectToDatabase } from '/lib/minimal-mongodb'
import Blog from '../../../../models/Blog'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // OPTIONS isteği kontrolü
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
      });
    }
    
    // Veritabanı bağlantısı
    let db;
    try {
      const dbConnection = await connectToDatabase();
      db = dbConnection.db;
      if (!db) {
        throw new Error('Veritabanı bağlantısı kurulamadı');
      }
    } catch (dbError) {
      console.error('Veritabanı bağlantı hatası:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Veritabanı bağlantısı sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
      });
    }

    const collection = db.collection('blogs');

    switch (req.method) {
      case 'GET':
        try {
          const blogs = await collection.find().sort({ createdAt: -1 }).toArray();
          const totalPosts = blogs.length;
          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const totalPages = Math.ceil(totalPosts / limit);
          
          return res.status(200).json({
            success: true,
            blogs,
            totalPosts,
            totalPages,
            page
          });
        } catch (error) {
          console.error('Blog yazıları yüklenirken hata:', error);
          return res.status(500).json({ 
            success: false,
            error: 'Blog yazıları yüklenirken bir hata oluştu' 
          });
        }
        break;

      case 'POST':
        try {
          const blog = new Blog({
            ...req.body,
            author: session.user.id || session.user._id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          const result = await collection.insertOne(blog);
          
          return res.status(201).json({ 
            success: true,
            blog: { ...blog, _id: result.insertedId }
          });
        } catch (error) {
          console.error('Blog yazısı oluşturulurken hata:', error);
          return res.status(500).json({ 
            success: false,
            error: 'Blog yazısı oluşturulurken bir hata oluştu' 
          });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} Not Allowed`
        });
    }
  } catch (error) {
    console.error('API hatası:', error);
    return res.status(500).json({
      success: false,
      error: 'Sunucu hatası: ' + (error.message || 'Bilinmeyen bir hata oluştu')
    });
  }
} 