// backend/src/services/couponHelper.js
// 優惠券驗證 + 折扣計算的共用邏輯
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');

// 驗證一張優惠券是否可用於此預約
// 回傳 { valid: bool, message: '...', coupon: {...} }
async function validateCoupon({ couponId, shopId, customerId, serviceIds = [], staffId, totalPrice }) {
  if (!couponId) return { valid: false, message: '請提供 couponId' };

  const coupon = await Coupon.findById(couponId);
  if (!coupon) return { valid: false, message: '找不到此優惠券' };

  // 必須屬於同一間店
  if (String(coupon.shopId) !== String(shopId)) {
    return { valid: false, message: '此優惠券不屬於此店家' };
  }

  if (!coupon.isActive) return { valid: false, message: '此優惠券已停用' };

  const now = new Date();
  if (coupon.startAt && now < new Date(coupon.startAt)) {
    return { valid: false, message: '此優惠券尚未開始使用' };
  }
  if (coupon.endAt && now > new Date(coupon.endAt)) {
    return { valid: false, message: '此優惠券已過期' };
  }

  // 總發行數量
  if (coupon.totalLimit !== null && coupon.totalLimit !== undefined && coupon.usedCount >= coupon.totalLimit) {
    return { valid: false, message: '此優惠券已用完' };
  }

  // 每人限用次數
  if (coupon.perUserLimit !== null && coupon.perUserLimit !== undefined && customerId) {
    const userUsedCount = await CouponUsage.countDocuments({ couponId, customerId });
    if (userUsedCount >= coupon.perUserLimit) {
      return { valid: false, message: '你已達此優惠券的使用次數上限' };
    }
  }

  // 最低消費金額
  if (coupon.minSpend && totalPrice < coupon.minSpend) {
    return { valid: false, message: '未達最低消費金額 NT$' + coupon.minSpend };
  }

  // 適用服務（applyToAll = false 才檢查）
  if (!coupon.applyToAll && coupon.serviceIds && coupon.serviceIds.length > 0) {
    const allowed = coupon.serviceIds.map(String);
    const requested = (serviceIds || []).map(String);
    const ok = requested.some(id => allowed.includes(id));
    if (!ok) return { valid: false, message: '此優惠券不適用於所選服務' };
  }

  // 適用設計師（applyToAllStaff = false 才檢查）
  if (!coupon.applyToAllStaff && coupon.staffIds && coupon.staffIds.length > 0 && staffId) {
    const allowed = coupon.staffIds.map(String);
    if (!allowed.includes(String(staffId))) {
      return { valid: false, message: '此優惠券不適用於所選設計師' };
    }
  }

  return { valid: true, coupon };
}

// 計算折扣金額
// 回傳 { discountAmount: 100, finalPrice: 900 }
function calculateDiscount(coupon, totalPrice) {
  let discountAmount = 0;

  if (coupon.discountType === 'amount') {
    discountAmount = Math.min(coupon.discountValue, totalPrice);
  } else if (coupon.discountType === 'percentage') {
    discountAmount = Math.round(totalPrice * coupon.discountValue / 100);
  } else if (coupon.discountType === 'bogo') {
    // 買幾送幾：簡化處理 = 平均單價 × 送的數量
    // (實務複雜情境另外處理，目前先簡化)
    const buy = coupon.bogoBuy || 1;
    const free = coupon.bogoFree || 1;
    const totalItems = buy + free;
    discountAmount = Math.round(totalPrice * free / totalItems);
  }

  if (discountAmount > totalPrice) discountAmount = totalPrice;
  if (discountAmount < 0) discountAmount = 0;

  return {
    discountAmount,
    finalPrice: Math.max(0, totalPrice - discountAmount),
  };
}

module.exports = { validateCoupon, calculateDiscount };
