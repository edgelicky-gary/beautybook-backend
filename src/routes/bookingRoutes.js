const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { sendBookingConfirmation } = require('../services/lineNotify');

// 建立預約
router.post('/', protect, async (req, res) => {
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

    // 發送 LINE 預約成功通知（非同步，失敗不影響預約建立）
    User.findById(req.userId).then(customer => {
      if (customer?.lineUserId) {
        const bookingForLine = {
          ...booking.toObject(),
          shopId: { name: shopName, address: shopAddress, _id: shopId },
          serviceId: { name: serviceName, duration: Number(serviceDuration) || 60 },
          staffId: { name: staffName || '不指定' },
        };
        sendBookingConfirmation(bookingForLine, customer).catch(err => {
          console.error('LINE 通知發送失敗:', err.message);
        });
      }
    }).catch(err => {
      console.error('LINE 通知處理錯誤:', err.message);
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 取得我的預約列表
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.userId }).sort({ date: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 取消預約
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

// 店家查詢預約列表
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

// 更新預約狀態
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
