const mongoose = require('mongoose');

if (mongoose.models.Booking) {
  delete mongoose.models.Booking;
}

const bookingSchema = new mongoose.Schema({
  bookingNo: { type: String, default: null, sparse: true },
  shopId: { type: String, required: true },
  shopName: { type: String, default: '' },
  shopAddress: { type: String, default: '' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceName: { type: String, required: true },
  servicePrice: { type: Number, required: true },
  serviceDuration: { type: Number, default: 60 },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, default: 60 },
  paymentMethod: { type: String, default: 'none' },
  customerNote: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  couponName: { type: String, default: '' },
  discountAmount: { type: Number, default: 0 },
  finalPrice: { type: Number, default: 0 },
  rating: { type: Number },
  review: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);