const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

// 產生 JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// 一般註冊
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

// 一般登入
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

// 手機號碼登入
exports.phoneLogin = async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ message: '請提供手機號碼' });
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
    if (!name) return res.status(400).json({ message: '請提供姓名' });
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

// LINE Login（支援登入 + 綁定兩種模式）
exports.lineLogin = async (req, res) => {
  try {
    const { code, redirectUri, bindToken } = req.body;

    console.log('LINE login called:', { code: code?.slice(0,10), redirectUri, hasBind: !!bindToken });

    if (!code) {
      return res.status(400).json({ success: false, message: '缺少 code 參數' });
    }
    if (!redirectUri) {
      return res.status(400).json({ success: false, message: '缺少 redirectUri 參數' });
    }

    // 1. 用 code 換取 LINE access_token
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', process.env.LINE_LOGIN_CHANNEL_ID);
    params.append('client_secret', process.env.LINE_LOGIN_CHANNEL_SECRET);

    let tokenRes;
    try {
      tokenRes = await axios.post(
        'https://api.line.me/oauth2/v2.1/token',
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (lineErr) {
      console.error('LINE token error:', lineErr.response?.data);
      return res.status(400).json({
        success: false,
        message: 'LINE 授權失敗',
        detail: lineErr.response?.data
      });
    }

    const { access_token } = tokenRes.data;

    // 2. 取得 LINE 使用者資料
    const profileRes = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { userId: lineUserId, displayName, pictureUrl } = profileRes.data;
    console.log('LINE profile:', { lineUserId, displayName });

    // 3. 判斷模式
    if (bindToken) {
      // ── 綁定模式：把 LINE 綁到現有帳號 ──
      let decoded;
      try {
        decoded = jwt.verify(bindToken, process.env.JWT_SECRET);
      } catch (e) {
        return res.status(401).json({ success: false, message: 'Token 無效或已過期，請重新登入' });
      }

      // 確認此 LINE 帳號沒被其他人用
      const existingLine = await User.findOne({ lineUserId });
      if (existingLine && existingLine._id.toString() !== decoded.id) {
        return res.status(400).json({ success: false, message: '此 LINE 帳號已綁定其他使用者' });
      }

      const user = await User.findByIdAndUpdate(
        decoded.id,
        { lineUserId, lineDisplayName: displayName, avatar: pictureUrl || '' },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: '找不到使用者' });
      }

      console.log('LINE bind success:', user._id);
      return res.json({
        success: true,
        message: 'LINE 綁定成功',
        data: {
          lineLinked: true,
          lineName: displayName,
          lineAvatar: pictureUrl,
        }
      });
    }

    // ── 登入模式：用 LINE 登入或建立帳號 ──
    let user = await User.findOne({ lineUserId });
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
    } else {
      user.lineDisplayName = displayName;
      user.avatar = pictureUrl || user.avatar;
      await user.save();
    }

    const newToken = generateToken(user._id);
    console.log('LINE login success:', user._id);
    res.json({
      success: true,
      token: newToken,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        lineUserId: user.lineUserId,
        lineDisplayName: user.lineDisplayName,
        avatar: user.avatar,
        lineLinked: true,
      }
    });

  } catch (err) {
    console.error('LINE login error:', err.message);
    res.status(500).json({ success: false, message: 'LINE 登入失敗', error: err.message });
  }
};

// 取得當前使用者資料
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: '找不到使用者' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 修改密碼
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: '舊密碼錯誤' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: '密碼修改成功' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
