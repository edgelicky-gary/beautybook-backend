// backend/src/controllers/paymentController.js
const axios = require('axios');
const crypto = require('crypto');
const { Booking } = require('../models/Service');

const IS_SANDBOX = process.env.NODE_ENV !== 'production';

// ============================================================
// LINE Pay
// ============================================================
const LINE_PAY_BASE = IS_SANDBOX
  ? 'https://sandbox-api-pay.line.me'
  : 'https://api-pay.line.me';

function linePayHeaders(path, body) {
  const nonce = Date.now().toString();
  const secret = process.env.LINE_PAY_CHANNEL_SECRET;
  const sig = crypto.createHmac('sha256', secret)
    .update(`${secret}${path}${JSON.stringify(body)}${nonce}`)
    .digest('base64');
  return {
    'Content-Type': 'application/json',
    'X-LINE-ChannelId': process.env.LINE_PAY_CHANNEL_ID,
    'X-LINE-Authorization-Nonce': nonce,
    'X-LINE-Authorization': sig,
  };
}

exports.linePayRequest = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId)
      .populate('serviceId', 'name')
      .populate('shopId', 'name');

    const amount = booking.depositAmount > 0 ? booking.depositAmount : booking.price;
    const path = '/v3/payments/request';
    const body = {
      amount, currency: 'TWD',
      orderId: bookingId,
      packages: [{
        id: bookingId,
        amount,
        products: [{ name: booking.serviceId.name, quantity: 1, price: amount }]
      }],
      redirectUrls: {
        confirmUrl: `${process.env.FRONTEND_URL}/payment/confirm`,
        cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel`,
      }
    };

    const resp = await axios.post(`${LINE_PAY_BASE}${path}`, body, {
      headers: linePayHeaders(path, body)
    });

    if (resp.data.returnCode === '0000') {
      res.json({
        success: true,
        paymentUrl: resp.data.info.paymentUrl.web,
        transactionId: resp.data.info.transactionId,
      });
    } else {
      res.status(400).json({ message: resp.data.returnMessage });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.linePayConfirm = async (req, res) => {
  try {
    const { transactionId, bookingId, amount } = req.body;
    const path = `/v3/payments/${transactionId}/confirm`;
    const body = { amount, currency: 'TWD' };

    const resp = await axios.post(`${LINE_PAY_BASE}${path}`, body, {
      headers: linePayHeaders(path, body)
    });

    if (resp.data.returnCode === '0000') {
      await Booking.findByIdAndUpdate(bookingId, {
        paymentStatus: amount < (await Booking.findById(bookingId)).price ? 'deposit_paid' : 'paid',
        paidAmount: amount,
        transactionId,
        status: 'confirmed',
      });
      res.json({ success: true });
    } else {
      res.status(400).json({ message: resp.data.returnMessage });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// 藍新金流 - 信用卡
// ============================================================
function newebEncrypt(data) {
  const key = process.env.NEWEBPAY_HASH_KEY;
  const iv = process.env.NEWEBPAY_HASH_IV;
  const str = new URLSearchParams(data).toString();
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
  return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

function newebHash(encrypted) {
  const key = process.env.NEWEBPAY_HASH_KEY;
  const iv = process.env.NEWEBPAY_HASH_IV;
  return crypto.createHash('sha256')
    .update(`HashKey=${key}&${encrypted}&HashIV=${iv}`)
    .digest('hex').toUpperCase();
}

exports.creditCardRequest = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    const amount = booking.depositAmount > 0 ? booking.depositAmount : booking.price;

    const tradeData = {
      MerchantID: process.env.NEWEBPAY_MERCHANT_ID,
      RespondType: 'JSON', TimeStamp: Math.floor(Date.now() / 1000),
      Version: '2.0', MerchantOrderNo: bookingId,
      Amt: amount, ItemDesc: '預約訂金',
      ReturnURL: `${process.env.FRONTEND_URL}/payment/result`,
      NotifyURL: `${process.env.BACKEND_URL}/api/payment/notify`,
      CREDIT: 1,
    };

    const encrypted = newebEncrypt(tradeData);
    res.json({
      success: true,
      paymentUrl: IS_SANDBOX
        ? 'https://ccore.newebpay.com/MPG/mpg_gateway'
        : 'https://core.newebpay.com/MPG/mpg_gateway',
      merchantId: process.env.NEWEBPAY_MERCHANT_ID,
      tradeData: encrypted,
      tradeSha: newebHash(encrypted),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// 街口支付 (JKOPay)
// 申請: https://www.jkopay.com/merchant
// ============================================================
exports.jkoPayRequest = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    const amount = booking.depositAmount > 0 ? booking.depositAmount : booking.price;

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      merchant_code: process.env.JKOPAY_MERCHANT_CODE,
      order_id: bookingId,
      total_amount: amount,
      currency: 'TWD',
      description: '美業預約訂金',
      callback_url: `${process.env.BACKEND_URL}/api/payment/jko/notify`,
      redirect_url: `${process.env.FRONTEND_URL}/payment/result`,
      timestamp,
    };

    // 簽名
    const signStr = Object.keys(payload).sort()
      .map(k => `${k}=${payload[k]}`).join('&') + process.env.JKOPAY_SECRET_KEY;
    payload.sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const resp = await axios.post(
      IS_SANDBOX
        ? 'https://uat-pay.jkopay.com/api/v2/orders'
        : 'https://pay.jkopay.com/api/v2/orders',
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    res.json({ success: true, paymentUrl: resp.data.payment_url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================================================
// 付款通知 Webhook（藍新/街口共用）
// ============================================================
exports.paymentNotify = async (req, res) => {
  try {
    const { Status, MerchantOrderNo } = req.body;
    if (Status === 'SUCCESS') {
      await Booking.findByIdAndUpdate(MerchantOrderNo, {
        paymentStatus: 'paid',
        status: 'confirmed',
      });
    }
    res.send('OK');
  } catch (err) {
    res.send('ERROR');
  }
};
