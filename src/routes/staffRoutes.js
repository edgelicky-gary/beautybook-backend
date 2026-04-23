const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const Booking = require('../models/Booking');

// GET /api/staff/shop/:shopId - 取得店家所有設計師
router.get('/shop/:shopId', async (req, res) => {
  try {
    const staff = await Staff.find({ shopId: req.params.shopId, isActive: true });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/staff - 新增設計師
router.post('/', async (req, res) => {
  try {
    const staff = await Staff.create(req.body);
    res.status(201).json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/staff/:id - 編輯設計師
router.put('/:id', async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!staff) return res.status(404).json({ message: '找不到設計師' });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/staff/:id - 刪除設計師
router.delete('/:id', async (req, res) => {
  try {
    await Staff.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: '已刪除' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/staff/:staffId/availability?date=2026-04-24 - 查詢某設計師某天空檔
router.get('/:staffId/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: '請提供日期' });

    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return res.status(404).json({ message: '找不到設計師' });

    // 查當天該設計師已有的預約時段
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      staffId: req.params.staffId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] },
    });

    const bookedSlots = bookings.map(b => b.startTime);

    // 產生該設計師當天所有時段
    const slots = [];
    const [startH] = staff.workStart.split(':').map(Number);
    const [endH] = staff.workEnd.split(':').map(Number);
    for (let h = startH; h < endH; h++) {
      const time = `${String(h).padStart(2, '0')}:00`;
      slots.push({ time, available: !bookedSlots.includes(time) });
    }

    // 檢查是否為工作日
    const dayOfWeek = new Date(date).getDay();
    if (!staff.workDays.includes(dayOfWeek)) {
      return res.json({ slots: [], isWorkDay: false });
    }

    res.json({ slots, isWorkDay: true, staff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;