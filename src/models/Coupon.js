const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

  // 基本資料
  name: { type: String, required: true },
  description: { type: String, default: '' },

  // 折扣類型：amount(金額) / percentage(百分比) / bogo(買幾送幾)
  discountType: { type: String, enum: ['amount', 'percentage', 'bogo'], required: true },
  discountValue: { type: Number, default: 0 },
  bogoBuy: { type: Number, default: 1 },
  bogoFree: { type: Number, default: 1 },

  // 取得方式
  isPublic: { type: Boolean, default: true },
  requireCode: { type: Boolean, default: false },
  code: { type: String, default: '', uppercase: true, trim: true },

  // 使用限制（null = 不限）
  totalLimit: { type: Number, default: null },
  perUserLimit: { type: Number, default: null },
  minSpend: { type: Number, default: null },

  // 適用範圍
  applyToAll: { type: Boolean, default: true },
  serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  applyToAllStaff: { type: Boolean, default: true },
  staffIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }],

  // 有效期限
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },

  // 狀態
  isActive: { type: Boolean, default: true },
  usedCount: { type: Number, default: 0 },
}, { timestamps: true });

couponSchema.index({ shopId: 1, code: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
