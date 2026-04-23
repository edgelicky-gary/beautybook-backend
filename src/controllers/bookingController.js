// backend/src/controllers/bookingController.js
const { Booking } = require('../models/Service');
const Service = require('../models/Service');
const { Staff } = require('../models/Service');
const Shop = require('../models/Shop');
const dayjs = require('dayjs');

// ─── 取得可預約時段 ───────────────────────────────────────
exports.getAvailableSlots = async (req, res) => {
  try {
    const { shopId, staffId, serviceId, date } = req.query;

    const shop = await Shop.findById(shopId);
    const service = await Service.findById(serviceId);
    if (!shop || !service) return res.status(404).json({ message: '店家或服務不存在' });

    const dayOfWeek = dayjs(date).format('dddd').toLowerCase();
    const hours = shop.businessHours[dayOfWeek];
    if (!hours?.isOpen) return res.json({ slots: [], message: '該日店家公休' });

    // 產生時段列表
    const slots = [];
    const slotDuration = shop.bookingSettings.slotDuration || 30;
    const serviceDuration = service.duration;

    let current = dayjs(`${date} ${hours.open}`);
    const closeTime = dayjs(`${date} ${hours.close}`);

    while (current.add(serviceDuration, 'minute').isBefore(closeTime) ||
           current.add(serviceDuration, 'minute').isSame(closeTime)) {
      slots.push(current.format('HH:mm'));
      current = current.add(slotDuration, 'minute');
    }

    // 過濾已被預約的時段
    const existingBookings = await Booking.find({
      staffId,
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    });

    const availableSlots = slots.filter(slot => {
      const slotStart = dayjs(`${date} ${slot}`);
      const slotEnd = slotStart.add(serviceDuration, 'minute');

      return !existingBookings.some(booking => {
        const bStart = dayjs(`${date} ${booking.startTime}`);
        const bEnd = dayjs(`${date} ${booking.endTime}`);
        return slotStart.isBefore(bEnd) && slotEnd.isAfter(bStart);
      });
    });

    res.json({ success: true, slots: availableSlots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 建立預約 ─────────────────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const { shopId, staffId, serviceId, date, startTime, customerNote, paymentMethod } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: '服務不存在' });

    const endTime = dayjs(`${date} ${startTime}`)
      .add(service.duration, 'minute')
      .format('HH:mm');

    // 再次確認時段是否可用
    const conflict = await Booking.findOne({
      staffId,
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (conflict) return res.status(409).json({ message: '該時段已被預約，請選擇其他時段' });

    const shop = await Shop.findById(shopId);
    const depositAmount = shop.bookingSettings.requireDeposit
      ? shop.bookingSettings.depositAmount || (service.price * shop.bookingSettings.depositPercent / 100)
      : 0;

    const booking = await Booking.create({
      shopId,
      customerId: req.userId,
      staffId,
      serviceId,
      date: new Date(date),
      startTime,
      endTime,
      duration: service.duration,
      price: service.price,
      depositAmount,
      paymentMethod: paymentMethod || 'none',
      customerNote,
      status: depositAmount > 0 ? 'pending' : 'confirmed',
    });

    await booking.populate(['serviceId', 'staffId', 'shopId']);

    // 傳送 LINE 通知
    // await sendLineNotification(booking);

    res.status(201).json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 取得我的預約列表 ─────────────────────────────────────
exports.getMyBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { customerId: req.userId };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('shopId', 'name address logo phone')
      .populate('staffId')
      .populate('serviceId', 'name duration price image')
      .sort({ date: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(filter);
    res.json({ success: true, bookings, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 取消預約 ─────────────────────────────────────────────
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customerId: req.userId });
    if (!booking) return res.status(404).json({ message: '預約不存在' });

    const hoursUntil = dayjs(`${booking.date} ${booking.startTime}`).diff(dayjs(), 'hour');
    if (hoursUntil < 2) return res.status(400).json({ message: '預約時間過近，無法取消' });

    booking.status = 'cancelled';
    await booking.save();

    res.json({ success: true, message: '預約已取消' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 店家取得預約列表 ─────────────────────────────────────
exports.getShopBookings = async (req, res) => {
  try {
    const { date, staffId, status } = req.query;
    const filter = { shopId: req.params.shopId };

    if (date) filter.date = new Date(date);
    if (staffId) filter.staffId = staffId;
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('customerId', 'name phone email avatar')
      .populate('staffId')
      .populate('serviceId', 'name duration price')
      .sort({ date: 1, startTime: 1 });

    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 完成預約 / 評價 ──────────────────────────────────────
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: '預約不存在' });

    if (req.body.rating) {
      booking.rating = req.body.rating;
      booking.review = req.body.review || '';
    }
    booking.status = 'completed';
    await booking.save();

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
