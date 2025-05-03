import mongoose from 'mongoose'

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hizmet adı zorunludur'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Hizmet açıklaması zorunludur']
  },
  detailedDescription: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['taşıma', 'paketleme', 'montaj', 'temizlik', 'diğer'],
    default: 'taşıma'
  },
  price: {
    type: Number,
    required: [true, 'Fiyat zorunludur'],
    min: [0, 'Fiyat 0\'dan küçük olamaz']
  },
  pricePerKm: {
    type: Number,
    default: 0,
    min: [0, 'KM başına fiyat 0\'dan küçük olamaz']
  },
  baseKm: {
    type: Number,
    default: 0,
    min: [0, 'Baz KM 0\'dan küçük olamaz']
  },
  maxKm: {
    type: Number,
    default: 0
  },
  urgentFee: {
    type: Number,
    default: 0,
    min: [0, 'Acil teslim ücreti 0\'dan küçük olamaz']
  },
  nightFee: {
    type: Number,
    default: 0,
    min: [0, 'Gece teslim ücreti 0\'dan küçük olamaz']
  },
  icon: {
    type: String,
    default: '/icons/default.png'
  },
  imageUrl: {
    type: String,
    default: '/images/default-service.jpg'
  },
  redirectUrl: {
    type: String,
    default: '/services'
  },
  isInnerCity: {
    type: Boolean,
    default: true
  },
  isOuterCity: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  vehicleType: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  // Eski paket bilgileri başlıkları (geriye dönük uyumluluk için)
  packageTitle1: {
    type: String,
    default: 'Ağırlık'
  },
  packageTitle2: {
    type: String,
    default: 'Hacim'
  },
  packageTitle3: {
    type: String,
    default: 'Açıklama'
  },
  packageTitle4: {
    type: String,
    default: 'Özel Notlar'
  },
  // Yeni dinamik paket bilgileri başlıkları
  packageTitles: [{
    id: String,
    title: String,
    subtitle: [String],
    required: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['input', 'checkbox', 'number', 'date'],
      default: 'input'
    },
    icon: {
      type: String,
      default: ''
    }
  }],
  slug: {
    type: String,
    unique: true,
    trim: true
  }
}, {
  timestamps: true
})

// Slug oluşturma
serviceSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
  
  // Eğer packageTitles yoksa ve eski başlıklar varsa, otomatik dönüşüm yap
  if (!this.packageTitles || this.packageTitles.length === 0) {
    const titles = [];
    
    if (this.packageTitle1) {
      titles.push({
        id: '1',
        title: this.packageTitle1,
        subtitle: [],
        required: false,
        type: 'input',
        icon: ''
      });
    }
    
    if (this.packageTitle2) {
      titles.push({
        id: '2',
        title: this.packageTitle2,
        subtitle: [],
        required: false,
        type: 'input',
        icon: ''
      });
    }
    
    if (this.packageTitle3) {
      titles.push({
        id: '3',
        title: this.packageTitle3,
        subtitle: [],
        required: false,
        type: 'input',
        icon: ''
      });
    }
    
    if (this.packageTitle4) {
      titles.push({
        id: '4',
        title: this.packageTitle4,
        subtitle: [],
        required: false,
        type: 'input',
        icon: ''
      });
    }
    
    if (titles.length > 0) {
      this.packageTitles = titles;
    }
  }
  
  next()
})

// Sıralama için index
serviceSchema.index({ order: 1 })

export default mongoose.models.Service || mongoose.model('Service', serviceSchema, 'services') 