const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  serviceName: { type: String, required: true },
  servicePrice: { type: Number, required: true },
  serviceDuration: { type: Number, required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String },
  duration: { type: Number },
  price: { type: Number, required: true },
  depositAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'none' },
  customerNote: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  rating: { type: Number },
  review: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);