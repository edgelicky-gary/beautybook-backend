// backend/src/routes/lineOaRoutes.js
// LINE OA 設定 + Rich Menu 功能 API
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Shop = require('../models/Shop');
const {
  setupRichMenu,
  testToken,
  listRichMenus,
  deleteRichMenu,
} = require('../services/lineRichMenu');

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

// 測試 token 是否有效
router.post('/test-token', authShopOwner, async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ message: '請提供 accessToken' });
  }
  const result = await testToken(accessToken);
  res.json(result);
});

// 一鍵套用圖文選單
router.post('/setup-richmenu', authShopOwner, async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ message: '請提供 accessToken' });
  }
  const path = require('path');
  const fs = require('fs');
  const imagePath = path.join(__dirname, '..', 'assets', 'richmenu.png');
  if (!fs.existsSync(imagePath)) {
    return res.status(500).json({
      message: 'richmenu.png 不存在於 src/assets/，請聯絡客服',
    });
  }
  const imageBuffer = fs.readFileSync(imagePath);
  const listRes = await listRichMenus(accessToken);
  if (listRes.success && listRes.richmenus?.length > 0) {
    for (const rm of listRes.richmenus) {
      await deleteRichMenu(accessToken, rm.richMenuId);
    }
  }
  const result = await setupRichMenu(accessToken, req.shopId, imageBuffer);
  if (result.success) {
    await Shop.findByIdAndUpdate(req.shopId, {
      lineOaAccessToken: accessToken,
      lineOaRichMenuId: result.richMenuId,
      lineOaSetupAt: new Date(),
    });
  }
  res.json(result);
});

// 列出現有 Rich Menu（debug 用）
router.post('/list-richmenu', authShopOwner, async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ message: '請提供 accessToken' });
  }
  const result = await listRichMenus(accessToken);
  res.json(result);
});

// 移除圖文選單
router.post('/remove-richmenu', authShopOwner, async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ message: '請提供 accessToken' });
  }
  const listRes = await listRichMenus(accessToken);
  if (listRes.success && listRes.richmenus?.length > 0) {
    for (const rm of listRes.richmenus) {
      await deleteRichMenu(accessToken, rm.richMenuId);
    }
  }
  await Shop.findByIdAndUpdate(req.shopId, {
    $unset: { lineOaRichMenuId: 1, lineOaSetupAt: 1 },
  });
  res.json({ success: true });
});

module.exports = router;
