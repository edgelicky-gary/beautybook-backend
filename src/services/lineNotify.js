// backend/src/services/lineNotify.js
// LINE Messaging API 訊息發送工具
const axios = require('axios');
const dayjs = require('dayjs');

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * 發送 LINE 訊息給指定使用者
 * @param {string} lineUserId - LINE userId（從 LINE Login 取得）
 * @param {Array} messages - LINE 訊息陣列
 */
async function pushMessage(lineUserId, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN 未設定');
    return { success: false, error: 'token not set' };
  }
  if (!lineUserId) {
    return { success: false, error: 'no lineUserId' };
  }

  try {
    await axios.post(
      LINE_PUSH_URL,
      { to: lineUserId, messages },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log('✅ LINE 訊息已發送至', lineUserId);
    return { success: true };
  } catch (err) {
    console.error('❌ LINE 訊息發送失敗:', err.response?.data || err.message);
    return { success: false, error: err.response?.data || err.message };
  }
}

/**
 * 預約成功通知
 * @param {object} booking - 已 populate 的 booking 物件
 * @param {object} customer - 顧客 user 物件（需要 lineUserId）
 */
async function sendBookingConfirmation(booking, customer) {
  if (!customer?.lineUserId) return { success: false, error: 'no lineUserId' };

  const shop = booking.shopId;
  const service = booking.serviceId;
  const staff = booking.staffId;

  const dateStr = dayjs(booking.date).format('YYYY/MM/DD');
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const dayLabel = dayNames[dayjs(booking.date).day()];

  const messages = [
    {
      type: 'flex',
      altText: `預約成功！${shop?.name || ''} ${dateStr} ${booking.startTime}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#C9A96E',
          paddingAll: '16px',
          contents: [
            { type: 'text', text: '✓ 預約成功', color: '#FFFFFF', weight: 'bold', size: 'lg' },
            { type: 'text', text: '我們已為您保留座位', color: '#FFFFFF', size: 'sm', margin: 'sm' },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: '20px',
          contents: [
            { type: 'text', text: shop?.name || '店家', weight: 'bold', size: 'xl' },
            { type: 'separator', margin: 'md' },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              margin: 'md',
              contents: [
                row('服務', service?.name || ''),
                row('日期', `${dateStr} (週${dayLabel})`),
                row('時間', booking.startTime),
                row('時長', `約 ${booking.duration} 分鐘`),
                row('設計師', staff?.name || '不指定'),
                row('地址', shop?.address || '請聯繫店家'),
                row('金額', `NT$ ${booking.price?.toLocaleString() || 0}`),
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          paddingAll: '16px',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#C9A96E',
              action: {
                type: 'uri',
                label: '查看我的預約',
                uri: 'https://beauty-book-web.vercel.app',
              },
            },
            {
              type: 'text',
              text: '預約日當天 09:00 將會再次提醒您',
              size: 'xxs',
              color: '#999999',
              align: 'center',
              margin: 'sm',
            },
          ],
        },
      },
    },
  ];

  return await pushMessage(customer.lineUserId, messages);
}

/**
 * 預約當天提醒通知
 */
async function sendBookingReminder(booking, customer) {
  if (!customer?.lineUserId) return { success: false, error: 'no lineUserId' };

  const shop = booking.shopId;
  const service = booking.serviceId;

  const messages = [
    {
      type: 'flex',
      altText: `今日預約提醒：${booking.startTime} ${shop?.name || ''}`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#A8844E',
          paddingAll: '16px',
          contents: [
            { type: 'text', text: '🔔 今日預約提醒', color: '#FFFFFF', weight: 'bold', size: 'lg' },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: '20px',
          contents: [
            { type: 'text', text: '別忘了今天的預約！', weight: 'bold', size: 'lg' },
            { type: 'separator', margin: 'md' },
            {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              margin: 'md',
              contents: [
                row('店家', shop?.name || ''),
                row('服務', service?.name || ''),
                row('時間', booking.startTime),
                row('地址', shop?.address || '請聯繫店家'),
              ],
            },
          ],
        },
      },
    },
  ];

  return await pushMessage(customer.lineUserId, messages);
}

// 內部 helper：產生一行 label + value
function row(label, value) {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      { type: 'text', text: label, color: '#888888', size: 'sm', flex: 2 },
      { type: 'text', text: String(value), wrap: true, color: '#333333', size: 'sm', flex: 5 },
    ],
  };
}

module.exports = {
  pushMessage,
  sendBookingConfirmation,
  sendBookingReminder,
};
