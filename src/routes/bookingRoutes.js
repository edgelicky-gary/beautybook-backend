const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');

router.post('/', protect, async (req, res) => {
  try {
    const { shopId, shopName, shopAddress, serviceId, serviceName, servicePrice, serviceDuration, date, startTime, customerNote, paymentMethod } = req.body;
    if (!shopId || !serviceName || !servicePrice || !date || !startTime) {
      return res.status(400).json({ message: '缺少必要欄位' });
    }
    const booking = new Booking({
      shopId: shopId.toString(),
      shopName: shopName || '',
      shopAddress: shopAddress || '',
      customerId: req.userId,
      serviceName, servicePrice: Number(servicePrice),
      serviceDuration: Number(serviceDuration) || 60,
      date: new Date(date), startTime,
      price: Number(servicePrice),
      duration: Number(serviceDuration) || 60,
      customerNote: customerNote || '',
      paymentMethod: paymentMethod || 'none',
      status: 'confirmed',
    });
    await booking.save();
    res.status(201).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

module.exports = router;