const router = require('express').Router();
const { Subscription, PLANS } = require('../models/Subscription');
const Shop = require('../models/Shop');
const { protect } = require('../middleware/authMiddleware');

router.get('/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

router.post('/subscribe', protect, async (req, res) => {
  try {
    const { shopId, plan, paymentMethod } = req.body;
    const planData = PLANS[plan];
    if (!planData) return res.status(400).json({ message: '無效方案' });

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const sub = await Subscription.create({
      shopId, ownerId: req.userId, plan,
      price: planData.price, startDate, endDate,
      paymentMethod, status: 'pending',
    });

    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/activate/:id', protect, async (req, res) => {
  try {
    const sub = await Subscription.findByIdAndUpdate(req.params.id,
      { status: 'active', paidAt: new Date() }, { new: true });
    await Shop.findByIdAndUpdate(sub.shopId, {
      plan: sub.plan, planExpiredAt: sub.endDate, isActive: true
    });
    res.json({ success: true, subscription: sub });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;