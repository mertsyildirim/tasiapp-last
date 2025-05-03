import mongoose from 'mongoose'

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog başlığı zorunludur'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Blog içeriği zorunludur']
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: [true, 'Kategori zorunludur']
  },
  userType: {
    type: String,
    enum: ['Müşteri', 'Firma', 'Sürücü', 'Freelance'],
    required: [true, 'Kullanıcı tipi zorunludur']
  },
  tags: [{
    type: String,
    trim: true
  }],
  featuredImage: {
    type: String
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  metaDescription: {
    type: String,
    trim: true
  },
  metaKeywords: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
})

// Slug oluşturma
blogSchema.pre('save', function(next) {
  if (!this.isModified('title')) {
    return next()
  }
  this.slug = this.title
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  next()
})

export default mongoose.models.Blog || mongoose.model('Blog', blogSchema) 