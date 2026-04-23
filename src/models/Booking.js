const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  shopId: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  serviceId: { type: String },
  serviceName: { type: String, required: true },
  servicePrice: { type: Number, required: true },
  serviceDuration: { type: Number, default: 60 },
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

mongoose.models.Booking || mongoose.model('Booking', bookingSchema)