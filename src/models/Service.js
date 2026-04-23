// backend/src/models/Service.js
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: '一般服務' },
  duration: { type: Number, required: true },  // 分鐘
  price: { type: Number, required: true },
  discountPrice: { type: Number, default: null },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  // 可服務的員工
  staffIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);

// ─────────────────────────────────────────────────────────
// backend/src/models/Staff.js
const staffSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  title: { type: String, default: '設計師' },   // 職稱
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
  specialties: [{ type: String }],              // 專長
  serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  // 個人排班（覆蓋店家預設）
  customHours: { type: mongoose.Schema.Types.Mixed, default: null },
  // 請假日期
  daysOff: [{ type: Date }],
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const Staff = mongoose.model('Staff', staffSchema);

// ─────────────────────────────────────────────────────────
// backend/src/models/Booking.js
const bookingSchema = new mongoose.Schema({
  bookingNo: { type: String, unique: true },    // 預約編號 BB202400001

  // 關聯
  shopId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },

  // 時間
  date:      { type: Date, required: true },
  startTime: { type: String, required: true },  // "14:00"
  endTime:   { type: String, required: true },  // "15:00"
  duration:  { type: Number, required: true },  // 分鐘

  // 金額
  price:        { type: Number, required: true },
  depositAmount:{ type: Number, default: 0 },
  paidAmount:   { type: Number, default: 0 },

  // 付款
  paymentMethod: {
    type: String,
    enum: ['linepay', 'credit', 'jkopay', 'transfer', 'cash', 'none'],
    default: 'none'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'deposit_paid', 'paid', 'refunded'],
    default: 'unpaid'
  },
  transactionId: { type: String, default: null },

  // 狀態
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },

  // 備註
  customerNote: { type: String, default: '' },
  staffNote:    { type: String, default: '' },

  // 提醒
  reminderSent: { type: Boolean, default: false },

  // 評價
  rating:  { type: Number, min: 1, max: 5, default: null },
  review:  { type: String, default: '' },

}, { timestamps: true });

// 自動產生預約編號
bookingSchema.pre('save', async function(next) {
  if (!this.bookingNo) {
    const count = await mongoose.model('Booking').countDocuments();
    this.bookingNo = `BB${new Date().getFullYear()}${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = { Staff, Booking };
