const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Shop = require('../models/Shop');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, category, phone, address, description } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: '店家名稱、信箱和密碼為必填' });
    }
    const exists = await Shop.findOne({ email });
    if (exists) return res.status(400).json({ message: '此信箱已註冊' });
    const shop = await Shop.create({ name, email, password, category, phone, address, description });
    const token = jwt.sign({ shopId: shop._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      shop: { _id: shop._id, name: shop.name, email: shop.email, category: shop.category, phone: shop.phone, address: shop.address, description: shop.description, createdAt: shop.createdAt },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: '請填寫信箱和密碼' });
    const shop = await Shop.findOne({ email });
    if (!shop) return res.status(401).json({ message: '信箱或密碼不正確' });
    const valid = await shop.comparePassword(password);
    if (!valid) return res.status(401).json({ message: '信箱或密碼不正確' });
    const token = jwt.sign({ shopId: shop._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      shop: { _id: shop._id, name: shop.name, email: shop.email, category: shop.category, phone: shop.phone, address: shop.address, description: shop.description, openHours: shop.openHours, closedDays: shop.closedDays, lineChannelAccessToken: shop.lineChannelAccessToken, createdAt: shop.createdAt },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { password, email, ...updates } = req.body;
    const shop = await Shop.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!shop) return res.status(404).json({ message: '找不到店家' });
    res.json({ shop });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;