// backend/src/models/Shop.js
const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  // 基本資訊
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['hair', 'nail', 'beauty', 'spa', 'massage', 'other'],
    default: 'hair'
  },
  logo: { type: String, default: '' },
  images: [{ type: String }],

  // 聯絡資訊
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, default: '' },

  // 店主
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // LINE 官方帳號
  lineOfficialAccountId: { type: String, default: null },
  lineChannelAccessToken: { type: String, default: null },
  lineChannelSecret: { type: String, default: null },

  // 營業時間
  businessHours: {
    monday:    { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday:   { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday:  { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday:    { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday:  { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday:    { open: String, close: String, isOpen: { type: Boolean, default: false } },
  },

  // 預約設定
  bookingSettings: {
    slotDuration: { type: Number, default: 30 },      // 時段間隔（分鐘）
    maxAdvanceDays: { type: Number, default: 30 },    // 最多提前幾天預約
    minAdvanceHours: { type: Number, default: 2 },    // 最少提前幾小時
    requireDeposit: { type: Boolean, default: false },// 是否需要訂金
    depositAmount: { type: Number, default: 0 },      // 訂金金額
    depositPercent: { type: Number, default: 0 },     // 訂金比例
    autoCancelHours: { type: Number, default: 24 },   // 幾小時未付款自動取消
  },

  // SaaS 訂閱方案
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free'
  },
  planExpiredAt: { type: Date, default: null },
  isActive: { type: Boolean, default: false }, // 需付費啟用

  // 統計
  totalBookings: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },

}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema);
