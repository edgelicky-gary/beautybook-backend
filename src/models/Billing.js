const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  shopName: { type: String },
  planType: { type: String, default: 'basic' },
  monthlyFee: { type: Number, default: 999 },
  staffFee: { type: Number, default: 200 },
  staffCount: { type: Number, default: 0 },
  totalFee: { type: Number, default: 999 },
  status: { type: String, enum: ['active', 'pending', 'overdue', 'cancelled'], default: 'pending' },
  paymentMethod: { type: String, enum: ['card', 'transfer', 'none'], default: 'none' },
  paidAt: { type: Date },
  dueDate: { type: Date },
  note: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.models.Billing || mongoose.model('Billing', billingSchema);