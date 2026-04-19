const router = require('express').Router();
const booking = require('../controllers/bookingController');
const { protect, isOwnerOrStaff } = require('../middleware/authMiddleware');

router.get('/slots', booking.getAvailableSlots);
router.post('/', protect, booking.createBooking);
router.get('/my', protect, booking.getMyBookings);
router.get('/shop/:shopId', protect, isOwnerOrStaff, booking.getShopBookings);
router.put('/:id/cancel', protect, booking.cancelBooking);
router.put('/:id/complete', protect, isOwnerOrStaff, booking.completeBooking);

module.exports = router;