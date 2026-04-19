// backend/src/models/Subscription.js
const mongoose = require('mongoose');

// ?规?瀹氱京
const PLANS = {
  free: {
    name: '?嶈不楂旈?',
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
    name: '?虹??规?',
    price: 699,   // ?堣不 NT$990
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
    name: '灏堟キ?规?',
    price: 999,  // ?堣不 NT$1,990
    features: {
      maxStaff: 10,
      maxServices: -1,       // ?￠???      maxBookingsPerMonth: -1,
      lineIntegration: true,
      paymentGateway: true,
      analytics: true,
      customDomain: false,
    }
  },
  enterprise: {
    name: '浼佹キ?规?',
    price: 2990,  // ?堣不 NT$3,990
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

  // 浠樻瑷橀?
  paymentMethod: { type: String, default: 'credit' },
  transactionId: { type: String, default: null },
  paidAt: { type: Date, default: null },

  // ??绾岃不
  autoRenew: { type: Boolean, default: true },

}, { timestamps: true });

module.exports = { Subscription: mongoose.model('Subscription', subscriptionSchema), PLANS };
