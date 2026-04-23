const router = require('express').Router();
const Shop = require('../models/Shop');
const User = require('../models/User');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.get('/shops', protect, isAdmin, async (req, res) => {
  try {
    const shops = await Shop.find().populate('ownerId', 'name email phone');
    res.json({ success: true, shops });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/shops/:id/toggle', protect, isAdmin, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    shop.isActive = !shop.isActive;
    await shop.save();
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/stats', protect, isAdmin, async (req, res) => {
  try {
    const totalShops = await Shop.countDocuments();
    const activeShops = await Shop.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ role: 'customer' });
    res.json({ success: true, stats: { totalShops, activeShops, totalUsers } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;