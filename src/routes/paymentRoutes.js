const router = require('express').Router();
const payment = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/linepay/request', protect, payment.linePayRequest);
router.post('/linepay/confirm', protect, payment.linePayConfirm);
router.post('/credit', protect, payment.creditCardRequest);
router.post('/jkopay', protect, payment.jkoPayRequest);
router.post('/notify', payment.paymentNotify);
router.post('/jko/notify', payment.paymentNotify);

module.exports = router;