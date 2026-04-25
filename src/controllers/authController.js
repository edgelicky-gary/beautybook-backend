// backend/src/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// 產生 JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ─── 一般註冊 ─────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email 已被使用' });
    const user = await User.create({ name, email, phone, password });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 一般登入 ─────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Email 或密碼錯誤' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Email 或密碼錯誤' });
    if (!user.isActive) return res.status(403).json({ message: '帳號已停用' });
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar, shopId: user.shopId }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 手機號碼快速登入/註冊 ────────────────────────────────
exports.phoneLogin = async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ message: '請輸入手機號碼' });
    let user = await User.findOne({ phone });
    if (user) {
      const token = generateToken(user._id);
      return res.json({
        success: true,
        token,
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, lineUserId: user.lineUserId },
        isNewUser: false,
      });
    }
    if (!name) return res.status(400).json({ message: '請輸入姓名' });
    user = await User.create({
      name,
      phone,
      email: `phone_${phone}@beautybook.app`,
      password: Math.random().toString(36) + Math.random().toString(36),
    });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      isNewUser: true,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── LINE Login ───────────────────────────────────────────
exports.lineLogin = async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    // 1. 用 code 換取 access_token
    const qs = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    });

    const tokenRes = await axios.post('https://api.line.me/oauth2/v2.1/token', qs.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenRes.data;

    // 2. 取得 LINE 用戶資料
    const profileRes = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { userId: lineUserId, displayName, pictureUrl } = profileRes.data;

    // 3. 找或建立用戶，並綁定 lineUserId
    const authHeader = req.headers.authorization;
    let user;

    if (authHeader) {
      // 已登入，綁定 LINE 到現有帳號
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findByIdAndUpdate(
        decoded.id,
        { lineUserId, lineDisplayName: displayName, avatar: pictureUrl || '' },
        { new: true }
      );
    } else {
      // 未登入，找或建立帳號
      user = await User.findOne({ lineUserId });
      if (!user) {
        user = await User.create({
          name: displayName,
          email: `line_${lineUserId}@beautybook.app`,
          phone: '',
          password: Math.random().toString(36),
          lineUserId,
          lineDisplayName: displayName,
          avatar: pictureUrl || '',
          isVerified: true,
        });
      }
    }

    const newToken = generateToken(user._id);
    res.json({ success: true, token: newToken, user });

  } catch (err) {
   
    console.error('LINE login error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'LINE 綁定失敗', error: err.response?.data || err.message });
  }};

// ─── 取得目前用戶資料 ─────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: '用戶不存在' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 修改密碼 ─────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: '舊密碼錯誤' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: '密碼更新成功' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
