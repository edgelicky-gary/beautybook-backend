// backend/src/services/lineService.js
// LINE Messaging API 推播通知
const axios = require('axios');
const dayjs = require('dayjs');

const LINE_API = 'https://api.line.me/v2/bot';

// 推播預約確認通知給顧客
exports.sendBookingConfirmation = async (booking, shop) => {
  if (!booking.customerId?.lineUserId) return;

  const message = {
    type: 'flex',
    altText: `【${shop.name}】預約確認通知`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#06C755',
        contents: [{
          type: 'text', text: '預約確認', color: '#ffffff',
          size: 'lg', weight: 'bold'
        }]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: shop.name, weight: 'bold', size: 'xl' },
          { type: 'separator' },
          {
            type: 'box', layout: 'vertical', spacing: 'sm',
            contents: [
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: '服務', color: '#888888', flex: 2 },
                { type: 'text', text: booking.serviceId?.name || '', flex: 3 }
              ]},
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: '日期', color: '#888888', flex: 2 },
                { type: 'text', text: dayjs(booking.date).format('YYYY/MM/DD'), flex: 3 }
              ]},
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: '時間', color: '#888888', flex: 2 },
                { type: 'text', text: booking.startTime, flex: 3 }
              ]},
              { type: 'box', layout: 'horizontal', contents: [
                { type: 'text', text: '預約編號', color: '#888888', flex: 2 },
                { type: 'text', text: booking.bookingNo, flex: 3 }
              ]},
            ]
          }
        ]
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [{
          type: 'button', style: 'primary', color: '#06C755',
          action: { type: 'uri', label: '查看預約', uri: `${process.env.FRONTEND_URL}/bookings` }
        }]
      }
    }
  };

  await sendPushMessage(booking.customerId.lineUserId, [message], shop.lineChannelAccessToken);
};

// 推播預約提醒（前一天）
exports.sendReminder = async (booking, shop) => {
  if (!booking.customerId?.lineUserId) return;

  await sendPushMessage(booking.customerId.lineUserId, [{
    type: 'text',
    text: `【提醒】明天 ${booking.startTime} 您在 ${shop.name} 有預約「${booking.serviceId?.name}」，請準時到場！`
  }], shop.lineChannelAccessToken);
};

async function sendPushMessage(to, messages, accessToken) {
  try {
    await axios.post(`${LINE_API}/message/push`, { to, messages }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      }
    });
  } catch (err) {
    console.error('LINE 推播失敗:', err.message);
  }
}

// ─────────────────────────────────────────────────────────
// backend/src/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 路由
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/shops',    require('./routes/shopRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payment',  require('./routes/paymentRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));

// 健康檢查
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// 連接資料庫
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 連線成功');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 BeautyBook 後端啟動於 http://localhost:${PORT}`));
  })
  .catch(err => console.error('❌ MongoDB 連線失敗:', err));
