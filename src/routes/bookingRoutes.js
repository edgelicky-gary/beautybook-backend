const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');

router.post('/', protect, async (req, res) => {
  try {
    console.log('收到預約請求:', JSON.stringify(req.body));
    const { shopId, shopName, shopAddress, serviceId, serviceName, servicePrice, serviceDuration, date, startTime, customerNote, paymentMethod } = req.body;

    if (!shopId || !serviceName || !servicePrice || !date || !startTime) {
      return res.status(400).json({ message: '缺少必要欄位', received: req.body });
    }

    const booking = new Booking({
      shopId: shopId.toString(),
      shopName: shopName || '',
      shopAddress: shopAddress || '',
      customerId: req.userId,
      serviceName: serviceName,
      servicePrice: Number(servicePrice),
      serviceDuration: Number(serviceDuration) || 60,
      date: new Date(date),
      startTime: startTime,
      price: Number(servicePrice),
      duration: Number(serviceDuration) || 60,
      customerNote: customerNote || '',
      paymentMethod: paymentMethod || 'none',
      status: 'confirmed',
    });

    await booking.save();
    console.log('儲存成功:', booking._id, '店家:', booking.shopName);
    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error('預約錯誤:', err.message);
    res.status(500).json({ message: err.message, details: err.errors });
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
    if (!booking) return res.status(404).json({ message: '找不到預約' });
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

});

module.exports = router;