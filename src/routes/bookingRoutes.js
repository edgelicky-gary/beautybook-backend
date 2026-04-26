const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { sendBookingConfirmation } = require('../services/lineNotify');

router.post('/', protect, async (req, res) => {
  // 用來收集 LINE 通知的除錯資訊
  const lineDebug = { steps: [] };

  try {
    const { shopId, shopName, shopAddress, serviceId, serviceName, servicePrice, serviceDuration, staffName, date, startTime, customerNote, paymentMethod } = req.body;
    if (!shopId || !serviceName || !servicePrice || !date || !startTime) {
      return res.status(400).json({ message: '缺少必要欄位' });
    }
    const booking = new Booking({
      shopId: shopId.toString(),
      shopName: shopName || '',
      shopAddress: shopAddress || '',
      customerId: req.userId,
      serviceName,
      servicePrice: Number(servicePrice),
      serviceDuration: Number(serviceDuration) || 60,
      date: new Date(date),
      startTime,
      price: Number(servicePrice),
      duration: Number(serviceDuration) || 60,
      customerNote: customerNote || '',
      paymentMethod: paymentMethod || 'none',
      status: 'confirmed',
    });
    await booking.save();

    // === LINE 通知 ===
    lineDebug.steps.push('1. 預約已建立');
    try {
      const customer = await User.findById(req.userId);
      lineDebug.customerFound = !!customer;
      lineDebug.lineUserId = customer?.lineUserId || null;
      lineDebug.steps.push(`2. 顧客查詢: ${customer ? '找到' : '找不到'}`);
      lineDebug.steps.push(`3. lineUserId: ${customer?.lineUserId || '未綁定'}`);

      if (customer?.lineUserId) {
        // 組裝 LINE 訊息需要的物件結構（補上欠缺的欄位）
        const bookingForLine = {
          ...booking.toObject(),
          shopId: { name: shopName, address: shopAddress, _id: shopId },
          serviceId: { name: serviceName, duration: Number(serviceDuration) || 60 },
          staffId: { name: staffName || '不指定' },
        };
        lineDebug.steps.push('4. 開始發送 LINE 訊息');
        const result = await sendBookingConfirmation(bookingForLine, customer);
        lineDebug.lineResult = result;
        lineDebug.steps.push(`5. 結果: ${JSON.stringify(result)}`);
      } else {
        lineDebug.steps.push('4. 跳過（未綁定 LINE）');
      }
    } catch (notifyErr) {
      lineDebug.error = notifyErr.message;
      lineDebug.steps.push(`錯誤: ${notifyErr.message}`);
    }

    res.status(201).json({ success: true, booking, lineDebug });
  } catch (err) {
    res.status(500).json({ message: err.message, lineDebug });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.userId }).sort({ date: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customerId: req.userId });
    if (!booking) return res.status(404).json({ message: '找不到此預約' });
    booking.status = 'cancelled';
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/shop/:shopId', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ shopId: req.params.shopId })
      .populate('customerId', 'name phone email')
      .sort({ date: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!booking) return res.status(404).json({ message: '找不到此預約' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
