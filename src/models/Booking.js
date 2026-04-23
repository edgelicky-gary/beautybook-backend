const mongoose = require('mongoose');

if (mongoose.models.Booking) {
  module.exports = mongoose.models.Booking;
} else {
  const bookingSchema = new mongoose.Schema({
    shopId: { type: String, required: true },
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
    rating: { type: Number },
    review: { type: String },
  }, { timestamps: true });

  module.exports = mongoose.model('Booking', bookingSchema);
}