require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

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

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Debug 路由：檢查環境變數
app.get('/debug-env', (req, res) => {
  const secret = process.env.LINE_LOGIN_CHANNEL_SECRET || '';
  const id = process.env.LINE_LOGIN_CHANNEL_ID || '';
  res.json({
    id_value: id,
    id_length: id.length,
    secret_length: secret.length,
    secret_first5: secret.slice(0, 5),
    secret_last5: secret.slice(-5),
    secret_has_space: secret.includes(' '),
    secret_trimmed_length: secret.trim().length,
  });
});

// Debug 路由：直接用後端讀取的環境變數呼叫 LINE
app.get('/debug-line', async (req, res) => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', 'test');
    params.append('redirect_uri', 'https://beauty-book-web.vercel.app/line-callback');
    params.append('client_id', process.env.LINE_LOGIN_CHANNEL_ID);
    params.append('client_secret', process.env.LINE_LOGIN_CHANNEL_SECRET);

    const r = await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    res.json({ success: true, data: r.data });
  } catch (e) {
    res.json({
      success: false,
      error: e.response?.data || e.message,
      sentClientId: process.env.LINE_LOGIN_CHANNEL_ID,
      sentSecretLength: (process.env.LINE_LOGIN_CHANNEL_SECRET || '').length
    });
  }
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 連線成功');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 BeautyBook 後端啟動於 http://localhost:${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB 連線失敗:', err));
