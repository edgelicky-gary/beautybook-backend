const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  category: { type: String, default: '美髮' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  description: { type: String, default: '' },
  openHours: { type: String, default: '10:00 - 20:00' },
  closedDays: { type: String, default: '' },
  lineChannelAccessToken: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

shopSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

shopSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
