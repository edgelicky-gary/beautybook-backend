const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { sendBookingConfirmation } = require('../services/lineNotify');
const { validateCoupon, calculateDiscount } = require('../services/couponHelper');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');

// 建立預約
router.post('/', protect, async (req, res) => {
  try {
    const {
      shopId, shopName, shopAddress,
      serviceId, serviceName, servicePrice, serviceDuration,
      staffName, staffId,
      date, startTime,
      customerNote, paymentMethod,
      couponId,
    } = req.body;

    if (!shopId || !serviceName || !servicePrice || !date || !startTime) {
      return res.status(400).json({ message: '缺少必要欄位' });
    }

    const totalPrice = Number(servicePrice);
    let discountAmount = 0;
    let finalPrice = totalPrice;
    let validCoupon = null;

    // 處理優惠券
    if (couponId) {
      const result = await validateCoupon({
        couponId,
        shopId,
        customerId: req.userId,
        serviceIds: serviceId ? [serviceId] : [],
        staffId,
        totalPrice,
      });
      if (!result.valid) {
        return res.status(400).json({ message: result.message });
      }
      const calc = calculateDiscount(result.coupon, totalPrice);
      discountAmount = calc.discountAmount;
      finalPrice = calc.finalPrice;
      validCoupon = result.coupon;
    }

    const booking = new Booking({
      shopId: shopId.toString(),
      shopName: shopName || '',
      shopAddress: shopAddress || '',
      customerId: req.userId,
      serviceName,
      servicePrice: totalPrice,
      serviceDuration: Number(serviceDuration) || 60,
      date: new Date(date),
      startTime,
      price: totalPrice,
      duration: Number(serviceDuration) || 60,
      customerNote: customerNote || '',
      paymentMethod: paymentMethod || 'none',
      status: 'confirmed',
      couponId: validCoupon ? validCoupon._id : null,
      couponName: validCoupon ? validCoupon.name : '',
      discountAmount,
      finalPrice,
    });
    await booking.save();

    // 寫 CouponUsage + 累加 usedCount
    if (validCoupon) {
      await CouponUsage.create({
        couponId: validCoupon._id,
        shopId: validCoupon.shopId,
        customerId: req.userId,
        bookingId: booking._id,
        discountAmount,
      });
      await Coupon.findByIdAndUpdate(validCoupon._id, { $inc: { usedCount: 1 } });
    }

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
          console.error('LINE 通知失敗:', err.message);
        });
      }
    }).catch(err => {
      console.error('LINE 通知錯誤:', err.message);
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 我的預約列表
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
    if (!booking) return res.status(404).json({ message: '找不到該預約' });
    booking.status = 'cancelled';
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 店家查看預約列表
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
    if (!booking) return res.status(404).json({ message: '找不到該預約' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
