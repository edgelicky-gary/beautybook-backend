const router = require('express').Router();
const Shop = require('../models/Shop');
const { protect, isOwner } = require('../middleware/authMiddleware');

router.get('/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const shop = await Shop.create({ ...req.body, ownerId: req.userId });
    res.status(201).json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, isOwner, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;