// backend/src/routes/authRoutes.js
const router = require('express').Router();
const auth = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/line-login', auth.lineLogin);
router.get('/me', protect, auth.getMe);
router.put('/change-password', protect, auth.changePassword);

module.exports = router;

// ─────────────────────────────────────────────
// backend/src/routes/bookingRoutes.js
const bookingRouter = require('express').Router();
const booking = require('../controllers/bookingController');
const { protect, isOwnerOrStaff } = require('../middleware/authMiddleware');

bookingRouter.get('/slots', booking.getAvailableSlots);
bookingRouter.post('/', protect, booking.createBooking);
bookingRouter.get('/my', protect, booking.getMyBookings);
bookingRouter.get('/shop/:shopId', protect, isOwnerOrStaff, booking.getShopBookings);
bookingRouter.put('/:id/cancel', protect, booking.cancelBooking);
bookingRouter.put('/:id/complete', protect, isOwnerOrStaff, booking.completeBooking);

module.exports = bookingRouter;

// ─────────────────────────────────────────────
// backend/src/routes/paymentRoutes.js
const paymentRouter = require('express').Router();
const payment = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

paymentRouter.post('/linepay/request', protect, payment.linePayRequest);
paymentRouter.post('/linepay/confirm', protect, payment.linePayConfirm);
paymentRouter.post('/credit', protect, payment.creditCardRequest);
paymentRouter.post('/jkopay', protect, payment.jkoPayRequest);
paymentRouter.post('/notify', payment.paymentNotify);
paymentRouter.post('/jko/notify', payment.paymentNotify);

module.exports = paymentRouter;

// ─────────────────────────────────────────────
// backend/src/routes/shopRoutes.js
const shopRouter = require('express').Router();
const Shop = require('../models/Shop');
const { protect, isOwner } = require('../middleware/authMiddleware');

shopRouter.get('/:id', async (req, res) => {
  const shop = await Shop.findById(req.params.id);
  res.json({ success: true, shop });
});

shopRouter.post('/', protect, async (req, res) => {
  const shop = await Shop.create({ ...req.body, ownerId: req.userId });
  res.status(201).json({ success: true, shop });
});

shopRouter.put('/:id', protect, isOwner, async (req, res) => {
  const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, shop });
});

module.exports = shopRouter;

// ─────────────────────────────────────────────
// backend/src/routes/serviceRoutes.js
const serviceRouter = require('express').Router();
const Service = require('../models/Service');
const { protect, isOwner } = require('../middleware/authMiddleware');

serviceRouter.get('/shop/:shopId', async (req, res) => {
  const services = await Service.find({ shopId: req.params.shopId, isActive: true });
  res.json({ success: true, services });
});

serviceRouter.post('/', protect, async (req, res) => {
  const service = await Service.create(req.body);
  res.status(201).json({ success: true, service });
});

serviceRouter.put('/:id', protect, async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, service });
});

serviceRouter.delete('/:id', protect, async (req, res) => {
  await Service.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true });
});

module.exports = serviceRouter;

// ─────────────────────────────────────────────
// backend/src/routes/subscriptionRoutes.js
const subRouter = require('express').Router();
const { Subscription, PLANS } = require('../models/Subscription');
const Shop = require('../models/Shop');
const { protect } = require('../middleware/authMiddleware');

subRouter.get('/plans', (req, res) => res.json({ success: true, plans: PLANS }));

subRouter.post('/subscribe', protect, async (req, res) => {
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
});

subRouter.post('/activate/:id', protect, async (req, res) => {
  const sub = await Subscription.findByIdAndUpdate(req.params.id,
    { status: 'active', paidAt: new Date() }, { new: true });
  await Shop.findByIdAndUpdate(sub.shopId, { plan: sub.plan, planExpiredAt: sub.endDate, isActive: true });
  res.json({ success: true, subscription: sub });
});

module.exports = subRouter;

// ─────────────────────────────────────────────
// backend/src/routes/adminRoutes.js
const adminRouter = require('express').Router();
const Shop = require('../models/Shop');
const User = require('../models/User');
const { protect, isAdmin } = require('../middleware/authMiddleware');

adminRouter.get('/shops', protect, isAdmin, async (req, res) => {
  const shops = await Shop.find().populate('ownerId', 'name email phone');
  res.json({ success: true, shops });
});

adminRouter.put('/shops/:id/toggle', protect, isAdmin, async (req, res) => {
  const shop = await Shop.findById(req.params.id);
  shop.isActive = !shop.isActive;
  await shop.save();
  res.json({ success: true, shop });
});

adminRouter.get('/stats', protect, isAdmin, async (req, res) => {
  const totalShops = await Shop.countDocuments();
  const activeShops = await Shop.countDocuments({ isActive: true });
  const totalUsers = await User.countDocuments({ role: 'customer' });
  res.json({ success: true, stats: { totalShops, activeShops, totalUsers } });
});

module.exports = adminRouter;
