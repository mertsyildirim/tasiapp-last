import mongoose from 'mongoose'

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kampanya adı zorunludur'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  userType: {
    type: String,
    enum: ['Müşteri', 'Firma', 'Sürücü', 'Freelance'],
    required: [true, 'Kullanıcı tipi zorunludur']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'İndirim tipi zorunludur']
  },
  discountValue: {
    type: Number,
    required: [true, 'İndirim değeri zorunludur'],
    min: [0, 'İndirim değeri 0\'dan küçük olamaz']
  },
  minOrderAmount: {
    type: Number,
    required: [true, 'Minimum sipariş tutarı zorunludur'],
    min: [0, 'Minimum sipariş tutarı 0\'dan küçük olamaz']
  },
  startDate: {
    type: Date,
    required: [true, 'Başlangıç tarihi zorunludur']
  },
  endDate: {
    type: Date,
    required: [true, 'Bitiş tarihi zorunludur']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageLimit: {
    type: Number,
    min: [0, 'Kullanım limiti 0\'dan küçük olamaz']
  },
  userUsageLimit: {
    type: Number,
    min: [0, 'Kullanıcı başına kullanım limiti 0\'dan küçük olamaz']
  },
  usageCount: {
    type: Number,
    default: 0
  },
  userUsageCount: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, {
  timestamps: true
})

// Kampanya süresi dolduğunda otomatik olarak pasif yap
campaignSchema.pre('save', function(next) {
  if (this.endDate && new Date(this.endDate) < new Date()) {
    this.isActive = false
  }
  next()
})

// Kampanya geçerli mi kontrol et
campaignSchema.methods.isValid = function() {
  const now = new Date()
  return this.isActive && 
         now >= this.startDate && 
         now <= this.endDate &&
         (!this.usageLimit || this.usageCount < this.usageLimit)
}

// Kullanıcı kampanyayı kullanabilir mi kontrol et
campaignSchema.methods.canUserUse = function(userId) {
  if (!this.isValid()) return false
  
  if (!this.userUsageLimit) return true
  
  const userCount = this.userUsageCount.get(userId) || 0
  return userCount < this.userUsageLimit
}

// Kampanya kullanımını artır
campaignSchema.methods.incrementUsage = function(userId) {
  this.usageCount += 1
  
  if (userId) {
    const userCount = this.userUsageCount.get(userId) || 0
    this.userUsageCount.set(userId, userCount + 1)
  }
  
  return this.save()
}

export default mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema) 