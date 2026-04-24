const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Shop = require('../models/Shop');
const Billing = require('../models/Billing');
const Announcement = require('../models/Announcement');
const Staff = require('../models/Staff');

// ── 驗證 middleware ──
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: '未授權' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.adminId;
    next();
  } catch {
    res.status(401).json({ message: 'Token 無效' });
  }
};

// ── 登入 ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: '帳號或密碼錯誤' });
    const valid = await admin.comparePassword(password);
    if (!valid) return res.status(401).json({ message: '帳號或密碼錯誤' });
    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 初始化第一個管理員帳號（只能用一次）──
router.post('/init', async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    if (count > 0) return res.status(400).json({ message: '管理員已存在' });
    const { name, email, password } = req.body;
    const admin = await Admin.create({ name, email, password });
    res.status(201).json({ message: '管理員建立成功', email: admin.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 取得所有店家 ──
router.get('/shops', adminAuth, async (req, res) => {
  try {
    const shops = await Shop.find().select('-password').sort({ createdAt: -1 });
    const shopsWithBilling = await Promise.all(shops.map(async (shop) => {
      const billing = await Billing.findOne({ shopId: shop._id }).sort({ createdAt: -1 });
      const staffCount = await Staff.countDocuments({ shopId: shop._id, isActive: true });
      return { ...shop.toObject(), billing, staffCount };
    }));
    res.json(shopsWithBilling);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 啟用/停用店家 ──
router.put('/shops/:id/toggle', adminAuth, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: '找不到店家' });
    shop.isActive = !shop.isActive;
    await shop.save();
    res.json({ isActive: shop.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 更新店家功能開關 ──
router.put('/shops/:id/features', adminAuth, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, { features: req.body.features }, { new: true });
    res.json(shop);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 計費管理 ──
router.get('/billing', adminAuth, async (req, res) => {
  try {
    const billings = await Billing.find().sort({ createdAt: -1 });
    res.json(billings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/billing', adminAuth, async (req, res) => {
  try {
    const billing = await Billing.create(req.body);
    res.status(201).json(billing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/billing/:id', adminAuth, async (req, res) => {
  try {
    const billing = await Billing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(billing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 公告管理 ──
router.get('/announcements', adminAuth, async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/announcements', adminAuth, async (req, res) => {
  try {
    const announcement = await Announcement.create(req.body);
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/announcements/:id', adminAuth, async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/announcements/:id', adminAuth, async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: '已刪除' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── 儀表板統計 ──
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalShops = await Shop.countDocuments();
    const activeShops = await Shop.countDocuments({ isActive: true });
    const billings = await Billing.find({ status: 'active' });
    const monthlyRevenue = billings.reduce((sum, b) => sum + (b.totalFee || 0), 0);
    const overdueShops = await Billing.countDocuments({ status: 'overdue' });
    const recentShops = await Shop.find().select('-password').sort({ createdAt: -1 }).limit(5);
    res.json({ totalShops, activeShops, monthlyRevenue, overdueShops, recentShops });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;