require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/shops',    require('./routes/shopRoutes'));
app.use('/api/shop',     require('./routes/shopRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payment',  require('./routes/paymentRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.2.0' }));
app.post('/api/test/create-billing', async (req, res) => { try { const Billing = require('./models/Billing'); const Shop = require('./models/Shop'); const shop = await Shop.findOne(); const b = await Billing.create({ shopId: shop._id, shopName: shop.name, year: 2026, month: 4, monthlyFee: 999, staffFee: 200, totalFee: 1199, status: 'pending', dueDate: new Date('2026-05-31') }); res.json({ success: true, billing: b }); } catch (err) { res.status(500).json({ message: err.message }); } });

// 手動觸發提醒（測試用，正式上線前可移除）
app.post('/api/admin/run-reminder', async (req, res) => {
  // 簡單驗證：需要帶上密鑰
  if (req.body.secret !== process.env.JWT_SECRET) {
    return res.status(403).json({ message: '無權限' });
  }
  const { runReminder } = require('./jobs/reminderJob');
  const result = await runReminder();
  res.json({ success: true, result });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 連線成功');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 BeautyBook 後端啟動於 http://localhost:${PORT}`));

    // 啟動每日提醒排程
    const { startReminderJob } = require('./jobs/reminderJob');
    startReminderJob();
  })
  .catch(err => console.error('❌ MongoDB 連線失敗:', err));
