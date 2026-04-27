// backend/src/routes/lineOaRoutes.js
// LINE OA 一鍵設定 Rich Menu 的 API
const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const Shop = require('../models/Shop');
const User = require('../models/User');
const {
  setupRichMenu,
  testToken,
  listRichMenus,
  deleteRichMenu,
} = require('../services/lineRichMenu');

// 中介層：確認登入者是該店家的擁有者
async function authShopOwner(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'shop' || !user.shopId) {
      return res.status(403).json({ message: '只有店家可以使用此功能' });
    }
    req.shopId = user.shopId.toString();
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// 測試 token 是否有效
router.post('/test-token', protect, authShopOwner, async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ message: '請提供 accessToken' });
  }
  const result = await testToken(accessToken);
  res.json(result);
});

// 一鍵設定圖文選單
router.post('/setup-richmenu', protect, authShopOwner, async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ message: '請提供 accessToken' });
  }

  // 從靜態資源讀取圖文選單圖片
  const path = require('path');
  const fs = require('fs');
  const imagePath = path.join(__dirname, '..', 'assets', 'richmenu.png');

  if (!fs.existsSync(imagePath)) {
    return res.status(500).json({
      message: 'richmenu.png 不存在於 src/assets/，請聯繫開發商',
    });
  }

  const imageBuffer = fs.readFileSync(imagePath);

  // 1. 先清掉舊的 Rich Menu（避免堆積）
  const listRes = await listRichMenus(accessToken);
  if (listRes.success && listRes.richmenus?.length > 0) {
    for (const rm of listRes.richmenus) {
      await deleteRichMenu(accessToken, rm.richMenuId);
    }
  }

  // 2. 建立新的 Rich Menu
  const result = await setupRichMenu(accessToken, req.shopId, imageBuffer);

  // 3. 把 token 存到店家資料（之後可用來推播訊息）
  if (result.success) {
    await Shop.findByIdAndUpdate(req.shopId, {
      lineOaAccessToken: accessToken,
      lineOaRichMenuId: result.richMenuId,
      lineOaSetupAt: new Date(),
    });
  }

  res.json(result);
});

// 列出目前的 Rich Menu（debug 用）
router.post('/list-richmenu', protect, authShopOwner, async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ message: '請提供 accessToken' });
  }
  const result = await listRichMenus(accessToken);
  res.json(result);
});

// 移除目前的圖文選單（解除設定）
router.post('/remove-richmenu', protect, authShopOwner, async (req, res) => {
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
