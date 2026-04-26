// backend/src/jobs/reminderJob.js
// 每日 09:00 提醒當天有預約的顧客
const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { sendBookingReminder } = require('../services/lineNotify');

/**
 * 啟動每日提醒排程
 * 設定：每天 09:00（台灣時間）執行
 */
function startReminderJob() {
  // cron 格式：分 時 日 月 星期
  // '0 9 * * *' = 每天 09:00
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 開始執行每日預約提醒...');
    await runReminder();
  }, {
    timezone: 'Asia/Taipei'
  });

  console.log('✅ 每日提醒排程已啟動（每天 09:00）');
}

/**
 * 實際發送提醒邏輯（可單獨呼叫做測試）
 */
async function runReminder() {
  try {
    // 取今天的開始和結束時間（台灣時區）
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 查詢今天 confirmed 狀態的預約
    const bookings = await Booking.find({
      date: { $gte: todayStart, $lte: todayEnd },
      status: 'confirmed',
    });

    console.log(`找到 ${bookings.length} 筆今日預約`);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const booking of bookings) {
      try {
        const customer = await User.findById(booking.customerId);

        if (!customer?.lineUserId) {
          skipped++;
          continue;
        }

        // 組裝提醒訊息需要的物件
        const bookingForLine = {
          ...booking.toObject(),
          shopId: { name: booking.shopName, address: booking.shopAddress, _id: booking.shopId },
          serviceId: { name: booking.serviceName, duration: booking.serviceDuration || booking.duration },
        };

        const result = await sendBookingReminder(bookingForLine, customer);
        if (result.success) {
          sent++;
        } else {
          failed++;
          console.error(`提醒發送失敗 (booking ${booking._id}):`, result.error);
        }
      } catch (err) {
        failed++;
        console.error(`處理預約 ${booking._id} 時發生錯誤:`, err.message);
      }
    }

    console.log(`✅ 提醒完成 - 發送: ${sent}, 跳過: ${skipped}, 失敗: ${failed}`);
    return { total: bookings.length, sent, skipped, failed };
  } catch (err) {
    console.error('❌ 提醒任務執行錯誤:', err.message);
    return { error: err.message };
  }
}

module.exports = { startReminderJob, runReminder };
