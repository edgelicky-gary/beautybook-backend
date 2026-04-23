const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: '一般服務' },
  duration: { type: Number, required: true },
  price: { type: Number, required: true },
  discountPrice: { type: Number, default: null },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  staffIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);