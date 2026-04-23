const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true },
  title: { type: String, default: '設計師' },
  description: { type: String, default: '' },
  avatar: { type: String, default: '' },
  workDays: { type: [Number], default: [2, 3, 4, 5, 6] }, // 0=週日 1=週一...
  workStart: { type: String, default: '10:00' },
  workEnd: { type: String, default: '20:00' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.Staff || mongoose.model('Staff', staffSchema);