// backend/src/models/Subscription.js
const mongoose = require('mongoose');

// 方案定義
const PLANS = {
  free: {
    name: '免費體驗',
    price: 0,
    features: {
      maxStaff: 1,
      maxServices: 5,
      maxBookingsPerMonth: 30,
      lineIntegration: false,
      paymentGateway: false,
      analytics: false,
      customDomain: false,
    }
  },
  basic: {
    name: '基礎方案',
    price: 699,   // 月費 NT$699
    features: {
      maxStaff: 3,
      maxServices: 20,
      maxBookingsPerMonth: 200,
      lineIntegration: true,
      paymentGateway: true,
      analytics: false,
      customDomain: false,
    }
  },
  pro: {
    name: '專業方案',
    price: 999,   // 月費 NT$999
    features: {
      maxStaff: 10,
      maxServices: -1,       // 無限制
      maxBookingsPerMonth: -1,
      lineIntegration: true,
      paymentGateway: true,
      analytics: true,
      customDomain: false,
    }
  },
  enterprise: {
    name: '企業方案',
    price: 2990,  // 月費 NT$2,990
    features: {
      maxStaff: -1,
      maxServices: -1,
      maxBookingsPerMonth: -1,
      lineIntegration: true,
      paymentGateway: true,
      analytics: true,
      customDomain: true,
    }
  }
};

const subscriptionSchema = new mongoose.Schema({
  shopId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  plan:      { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], required: true },
  price:     { type: Number, required: true },

  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },

  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'pending'
  },

  // 付款記錄
  paymentMethod: { type: String, default: 'credit' },
  transactionId: { type: String, default: null },
  paidAt: { type: Date, default: null },

  // 自動續費
  autoRenew: { type: Boolean, default: true },

}, { timestamps: true });

module.exports = { Subscription: mongoose.model('Subscription', subscriptionSchema), PLANS };
