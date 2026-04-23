const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/staff', require('./routes/staffRoutes'));

app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/shops',    require('./routes/shopRoutes'));
app.use('/api/shop',     require('./routes/shopRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payment',  require('./routes/paymentRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 連線成功');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 BeautyBook 後端啟動於 http://localhost:${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB 連線失敗:', err));