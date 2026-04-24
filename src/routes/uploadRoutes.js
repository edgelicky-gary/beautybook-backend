const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'beautybook/payment',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit' }],
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const Billing = require('../models/Billing');

// POST /api/upload/payment-proof/:billingId
router.post('/payment-proof/:billingId', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: '請上傳圖片' });
    const imageUrl = req.file.path;
    await Billing.findByIdAndUpdate(req.params.billingId, {
      paymentProofUrl: imageUrl,
      paymentMethod: 'transfer',
      status: 'pending',
      paymentProofUploadedAt: new Date(),
    });
    res.json({ url: imageUrl, message: '上傳成功' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;