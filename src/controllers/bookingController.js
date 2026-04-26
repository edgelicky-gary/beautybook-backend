// backend/src/controllers/bookingController.js
const { Booking } = require('../models/Service');
const Service = require('../models/Service');
const { Staff } = require('../models/Service');
const Shop = require('../models/Shop');
const User = require('../models/User');
const dayjs = require('dayjs');
const { sendBookingConfirmation } = require('../services/lineNotify');

exports.getAvailableSlots = async (req, res) => {
  try {
    const { shopId, staffId, serviceId, date } = req.query;
    const shop = await Shop.findById(shopId);
    const service = await Service.findById(serviceId);
    if (!shop || !service) return res.status(404).json({ message: '店家或服務不存在' });

    const dayOfWeek = dayjs(date).format('dddd').toLowerCase();
    const hours = shop.businessHours[dayOfWeek];
    if (!hours?.isOpen) return res.json({ slots: [], message: '當日店家公休' });

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

    const existingBookings = await Booking.find({
      staffId, date: new Date(date),
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

exports.createBooking = async (req, res) => {
  // 收集 LINE 通知過程的所有資訊，回傳給前端
  const lineDebug = { steps: [] };

  try {
    const { shopId, staffId, serviceId, date, startTime, customerNote, paymentMethod } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: '服務不存在' });

    const endTime = dayjs(`${date} ${startTime}`).add(service.duration, 'minute').format('HH:mm');

    const conflict = await Booking.findOne({
      staffId, date: new Date(date),
      status: { $in: ['pending', 'confirmed'] },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }]
    });
    if (conflict) return res.status(409).json({ message: '此時段已被預約，請選擇其他時段' });

    const shop = await Shop.findById(shopId);
    const depositAmount = shop.bookingSettings.requireDeposit
      ? shop.bookingSettings.depositAmount || (service.price * shop.bookingSettings.depositPercent / 100)
      : 0;

    const booking = await Booking.create({
      shopId, customerId: req.userId, staffId, serviceId,
      date: new Date(date), startTime, endTime,
      duration: service.duration, price: service.price,
      depositAmount, paymentMethod: paymentMethod || 'none',
      customerNote,
      status: depositAmount > 0 ? 'pending' : 'confirmed',
    });
    await booking.populate(['serviceId', 'staffId', 'shopId']);

    // === LINE 通知（每一步都記錄） ===
    lineDebug.steps.push('1. 預約已建立，開始查詢顧客');
    try {
      const customer = await User.findById(req.userId);
      lineDebug.customerFound = !!customer;
      lineDebug.lineUserId = customer?.lineUserId || null;
      lineDebug.steps.push(`2. 顧客查詢結果: ${customer ? '找到' : '找不到'}`);
      lineDebug.steps.push(`3. lineUserId: ${customer?.lineUserId || '空'}`);

      if (customer?.lineUserId) {
        lineDebug.steps.push('4. 開始發送 LINE 訊息');
        const result = await sendBookingConfirmation(booking, customer);
        lineDebug.lineResult = result;
        lineDebug.steps.push(`5. LINE 發送結果: ${JSON.stringify(result)}`);
      } else {
        lineDebug.steps.push('4. 跳過 LINE 通知（未綁定）');
      }
    } catch (notifyErr) {
      lineDebug.error = notifyErr.message;
      lineDebug.stack = notifyErr.stack;
      lineDebug.steps.push(`錯誤: ${notifyErr.message}`);
    }

res.status(201).json({ NEW_VERSION: true, success: true, booking, lineDebug });
  } catch (err) {
    res.status(500).json({ message: err.message, lineDebug });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { customerId: req.userId };
    if (status) filter.status = status;
    const bookings = await Booking.find(filter)
      .populate('shopId', 'name address logo phone')
      .populate('staffId')
      .populate('serviceId', 'name duration price image')
      .sort({ date: -1 }).limit(limit).skip((page - 1) * limit);
    const total = await Booking.countDocuments(filter);
    res.json({ success: true, bookings, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customerId: req.userId });
    if (!booking) return res.status(404).json({ message: '預約不存在' });
    const hoursUntil = dayjs(`${booking.date} ${booking.startTime}`).diff(dayjs(), 'hour');
    if (hoursUntil < 2) return res.status(400).json({ message: '預約前 2 小時內無法取消' });
    booking.status = 'cancelled';
    await booking.save();
    res.json({ success: true, message: '預約已取消' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
