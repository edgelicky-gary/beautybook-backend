// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 基本資訊
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },

  // LINE 整合
  lineUserId: { type: String, default: null },
  lineDisplayName: { type: String, default: '' },

  // 角色：customer(顧客) | staff(員工) | owner(店主) | admin(平台管理員)
  role: { type: String, enum: ['customer', 'staff', 'owner', 'admin'], default: 'customer' },

  // 所屬店家（staff/owner 才有）
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },

  // 會員點數
  points: { type: Number, default: 0 },

  // 生日
  birthday: { type: Date, default: null },

  // 備註（店家記錄）
  notes: { type: String, default: '' },

  // 狀態
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verifyToken: { type: String, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },

}, { timestamps: true });

// 密碼加密
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 驗證密碼
userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
