import { connectToDatabase } from '/lib/minimal-mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/admin/[...nextauth].js';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  try {
    // Session kontrolü
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: 'Yetkilendirme başarısız. Lütfen giriş yapın.' 
      });
    }
    
    // NOT: Rol kontrolü kaldırıldı - sadece session kontrolü yapıyoruz

    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const skip = (page - 1) * limit;

      let query = {
        $or: [
          { role: 'admin' },
          { roles: { $in: ['admin', 'super_admin'] } }
        ]
      };
      
      if (search) {
        query = {
          $and: [
            {
              $or: [
                { role: 'admin' },
                { roles: { $in: ['admin', 'super_admin'] } }
              ]
            },
            {
              $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
              ]
            }
          ]
        };
      }

      const users = await db.collection('users')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await db.collection('users').countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        success: true,
        users: users.map(user => ({
          id: user._id.toString(),
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role || 'user',
          roles: user.roles || ['user'],
          status: user.status || 'active',
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date()
        })),
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit
        }
      });
    }

    if (req.method === 'POST') {
      const { name, email, phone, password, role = 'user', roles = ['user'] } = req.body;

      if (!name || !email || !phone || !password) {
        return res.status(400).json({
          success: false,
          message: 'Ad, email, telefon ve şifre alanları zorunludur.'
        });
      }

      // Email kontrolü
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Bu email adresi zaten kullanımda.'
        });
      }

      const user = {
        name,
        email,
        phone,
        password, // Gerçek uygulamada şifre hash'lenmelidir
        role,
        roles,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('users').insertOne(user);

      if (result.acknowledged) {
        return res.status(201).json({
          success: true,
          message: 'Kullanıcı başarıyla oluşturuldu',
          user: {
            id: result.insertedId.toString(),
            ...user
          }
        });
      }
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Kullanıcı ID\'si gereklidir.'
        });
      }

      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            ...updateData,
            updatedAt: new Date()
          } 
        }
      );

      if (result.matchedCount > 0) {
        return res.status(200).json({
          success: true,
          message: 'Kullanıcı başarıyla güncellendi'
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Kullanıcı ID\'si gereklidir.'
        });
      }

      const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount > 0) {
        return res.status(200).json({
          success: true,
          message: 'Kullanıcı başarıyla silindi'
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`
    });

  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
      error: error.message
    });
  }
} 