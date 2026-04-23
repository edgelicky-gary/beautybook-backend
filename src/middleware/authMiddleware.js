// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Shop = require('../models/Shop');

// 驗證 JWT
exports.protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: '請先登入' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token 無效或已過期' });
  }
};

// 驗證是否為店主
exports.isOwner = async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user || !['owner', 'admin'].includes(user.role)) {
    return res.status(403).json({ message: '權限不足' });
  }
  next();
};

// 驗證是否為店主或員工
exports.isOwnerOrStaff = async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user || !['owner', 'staff', 'admin'].includes(user.role)) {
    return res.status(403).json({ message: '權限不足' });
  }
  next();
};

// 驗證是否為平台管理員
exports.isAdmin = async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: '權限不足' });
  }
  next();
};

// 驗證店家是否已付費啟用
exports.isPlanActive = async (req, res, next) => {
  const shopId = req.params.shopId || req.body.shopId;
  if (!shopId) return next();

  const shop = await Shop.findById(shopId);
  if (!shop?.isActive) {
    return res.status(402).json({ message: '店家方案未啟用，請聯繫平台開通' });
  }
  if (shop.planExpiredAt && new Date() > shop.planExpiredAt) {
    return res.status(402).json({ message: '店家方案已到期，請續費' });
  }
  next();
};
