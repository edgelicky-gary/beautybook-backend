const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  discountAmount: { type: Number, required: true },
  usedAt: { type: Date, default: Date.now },
}, { timestamps: true });

couponUsageSchema.index({ couponId: 1, customerId: 1 });

module.exports = mongoose.model('CouponUsage', couponUsageSchema);
