const router = require('express').Router();
const auth = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/me', protect, auth.getMe);
router.put('/change-password', protect, auth.changePassword);

module.exports = router;