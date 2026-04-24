const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Billing = require('../models/Billing');
const Shop = require('../models/Shop');

const ECPAY_MERCHANT_ID = '2000132';
const ECPAY_HASH_KEY = '5294y06JbISpM5x9';
const ECPAY_HASH_IV = 'v77hoKGq4kWxNNIS';
const ECPAY_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckout/Index';
const BACKEND_URL = 'https://beautybook-backend-production.up.railway.app';

// 產生檢查碼
function generateCheckMac(params) {
  const sorted = Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = params[key];
    return acc;
  }, {});
  let str = `HashKey=${ECPAY_HASH_KEY}&${Object.entries(sorted).map(([k, v]) => `${k}=${v}`).join('&')}&HashIV=${ECPAY_HASH_IV}`;
  str = encodeURIComponent(str).toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2a/g, '*')
    .replace(/%2d/g, '-')
    .replace(/%2e/g, '.')
    .replace(/%5f/g, '_');
  return crypto.createHash('sha256').update(str).digest('hex').toUpperCase();
}

// POST /api/payment/create - 建立付款訂單
router.post('/create', async (req, res) => {
  try {
    const { billingId } = req.body;
    const billing = await Billing.findById(billingId);
    if (!billing) return res.status(404).json({ message: '找不到帳單' });

    const orderId = `BB${Date.now()}`;
    const params = {
      MerchantID: ECPAY_MERCHANT_ID,
      MerchantTradeNo: orderId,
      MerchantTradeDate: (() => { const d = new Date(); const pad = n => String(n).padStart(2, '0'); return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; })(),
      PaymentType: 'aio',
      TotalAmount: billing.totalFee,
      TradeDesc: `BeautyBook月費-${billing.shopName}`,
      ItemName: `BeautyBook月費 NT$${billing.totalFee}`,
      ReturnURL: `${BACKEND_URL}/api/payment/notify`,
      ClientBackURL: `https://beautybook-shop-admin.vercel.app/payment-result`,
      ChoosePayment: 'Credit',
      EncryptType: 1,
    };
    params.CheckMacValue = generateCheckMac(params);

    // 儲存 orderId 到 billing
    await Billing.findByIdAndUpdate(billingId, { orderId });

    // 回傳表單資料讓前端提交
    res.json({ url: ECPAY_URL, params });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payment/notify - 綠界付款結果通知
router.post('/notify', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { MerchantTradeNo, RtnCode, CheckMacValue, ...rest } = req.body;
    
    // 驗證檢查碼
    const params = { MerchantTradeNo, RtnCode, ...rest };
    delete params.CheckMacValue;
    const expectedMac = generateCheckMac(params);
    
    if (CheckMacValue !== expectedMac) {
      return res.send('0|ErrorMessage');
    }

    if (RtnCode === '1') {
      // 付款成功，更新 billing 狀態
      await Billing.findOneAndUpdate(
        { orderId: MerchantTradeNo },
        { status: 'active', paidAt: new Date(), paymentMethod: 'card' }
      );
    }

    res.send('1|OK');
  } catch (err) {
    res.send('0|ErrorMessage');
  }
});

module.exports = router;