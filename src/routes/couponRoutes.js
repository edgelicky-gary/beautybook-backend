// backend/src/routes/couponRoutes.js
// 優惠券 CRUD（店家後台用）
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Coupon = require('../models/Coupon');
const Shop = require('../models/Shop');

// 店家身份驗證 middleware（直接從 token 解 shopId）
async function authShopOwner(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: '請先登入' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const shopId = decoded.shopId || decoded.id;
    if (!shopId) return res.status(403).json({ message: '只有店家可以使用此功能' });
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(403).json({ message: '只有店家可以使用此功能' });
    req.shopId = shop._id.toString();
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token 無效或已過期' });
  }
}

// POST /api/coupons - 建立優惠券
router.post('/', authShopOwner, async (req, res) => {
  try {
    const data = { ...req.body, shopId: req.shopId };

    // 代碼券：去除空白並大寫；公開券：不需要 code
    if (data.requireCode && data.code) {
      data.code = data.code.toUpperCase().trim();
    } else {
      data.code = '';
    }

    // 檢查代碼券：同店不可重複代碼
    if (data.requireCode && data.code) {
      const exists = await Coupon.findOne({ shopId: req.shopId, code: data.code });
      if (exists) return res.status(400).json({ message: '此代碼已被使用，請換一個' });
    }

    const coupon = await Coupon.create(data);
    res.status(201).json(coupon);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/coupons - 列出本店所有優惠券
router.get('/', authShopOwner, async (req, res) => {
  try {
    const coupons = await Coupon.find({ shopId: req.shopId }).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/coupons/:id - 看單張
router.get('/:id', authShopOwner, async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, shopId: req.shopId });
    if (!coupon) return res.status(404).json({ message: '找不到優惠券' });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/coupons/:id - 編輯
router.put('/:id', authShopOwner, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.shopId;
    delete data.usedCount;

    if (data.requireCode && data.code) {
      data.code = data.code.toUpperCase().trim();
      const exists = await Coupon.findOne({
        shopId: req.shopId,
        code: data.code,
        _id: { $ne: req.params.id },
      });
      if (exists) return res.status(400).json({ message: '此代碼已被使用，請換一個' });
    } else if (!data.requireCode) {
      data.code = '';
    }

    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shopId },
      data,
      { new: true, runValidators: true }
    );
    if (!coupon) return res.status(404).json({ message: '找不到優惠券' });
    res.json(coupon);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/coupons/:id - 刪除
router.delete('/:id', authShopOwner, async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, shopId: req.shopId });
    if (!coupon) return res.status(404).json({ message: '找不到優惠券' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/coupons/:id/toggle - 啟用/停用切換
router.put('/:id/toggle', authShopOwner, async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, shopId: req.shopId });
    if (!coupon) return res.status(404).json({ message: '找不到優惠券' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
