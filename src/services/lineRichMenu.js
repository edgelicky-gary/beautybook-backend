// backend/src/services/lineRichMenu.js
// LINE Rich Menu 自動建立工具
const axios = require('axios');

/**
 * 為店家建立並套用 6 宮格圖文選單
 * @param {string} accessToken - 店家 LINE OA 的 Channel Access Token
 * @param {string} shopId - 店家在 BeautyBook 的 ID（用來組預約連結）
 * @param {Buffer} imageBuffer - 圖文選單的 PNG 圖片（2500x1686）
 */
async function setupRichMenu(accessToken, shopId, imageBuffer) {
  const FRONTEND = 'https://beauty-book-web.vercel.app';
  const baseUrl = `${FRONTEND}/?shop=${shopId}`;

  // 1. 建立 Rich Menu 結構（2500x1686，2x3 格）
  // 每格寬度 = 2500/3 = 833.33
  // 每格高度 = 1686/2 = 843
  const richMenuObject = {
    size: { width: 2500, height: 1686 },
    selected: true, // 預設顯示給好友
    name: 'BeautyBook 預約選單',
    chatBarText: '點此開啟選單',
    areas: [
      // 第一列
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'uri', uri: baseUrl, label: '立即預約' },
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'uri', uri: `${baseUrl}&tab=bookings`, label: '我的預約' },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'uri', uri: `${baseUrl}&tab=services`, label: '項目價目表' },
      },
      // 第二列
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: 'uri', uri: `${baseUrl}&tab=promotions`, label: '最新優惠' },
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: 'uri', uri: `${baseUrl}&tab=info`, label: '店家資訊' },
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: 'uri', uri: `${baseUrl}&tab=contact`, label: '聯絡我們' },
      },
    ],
  };

  // 2. 建立 Rich Menu
  let richMenuId;
  try {
    const createRes = await axios.post(
      'https://api.line.me/v2/bot/richmenu',
      richMenuObject,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    richMenuId = createRes.data.richMenuId;
    console.log('✅ Rich Menu 建立成功:', richMenuId);
  } catch (err) {
    return {
      success: false,
      step: 'create',
      error: err.response?.data || err.message,
    };
  }

  // 3. 上傳圖片
  try {
    await axios.post(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      imageBuffer,
      {
        headers: {
          'Content-Type': 'image/png',
          Authorization: `Bearer ${accessToken}`,
        },
        maxBodyLength: Infinity,
      }
    );
    console.log('✅ Rich Menu 圖片上傳成功');
  } catch (err) {
    return {
      success: false,
      step: 'upload',
      richMenuId,
      error: err.response?.data || err.message,
    };
  }

  // 4. 設定為預設選單（套用給所有好友）
  try {
    await axios.post(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log('✅ Rich Menu 已設為預設');
  } catch (err) {
    return {
      success: false,
      step: 'setDefault',
      richMenuId,
      error: err.response?.data || err.message,
    };
  }

  return { success: true, richMenuId };
}

/**
 * 測試 token 是否有效
 */
async function testToken(accessToken) {
  try {
    const res = await axios.get('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return { success: true, botInfo: res.data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

/**
 * 列出店家現有的 Rich Menu（用來檢查/清理）
 */
async function listRichMenus(accessToken) {
  try {
    const res = await axios.get('https://api.line.me/v2/bot/richmenu/list', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return { success: true, richmenus: res.data.richmenus };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

/**
 * 刪除指定的 Rich Menu
 */
async function deleteRichMenu(accessToken, richMenuId) {
  try {
    await axios.delete(`https://api.line.me/v2/bot/richmenu/${richMenuId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message,
    };
  }
}

module.exports = {
  setupRichMenu,
  testToken,
  listRichMenus,
  deleteRichMenu,
};
