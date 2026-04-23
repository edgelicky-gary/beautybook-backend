const express = require('express');
const router = express.Router();
const Service = require('../models/Service');

// GET /api/services/shop/:shopId
router.get('/shop/:shopId', async (req, res) => {
  try {
    const services = await Service.find({ shopId: req.params.shopId, isActive: { $ne: false } });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/services
router.post('/', async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/services/:id
router.put('/:id', async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!service) return res.status(404).json({ message: '找不到服務項目' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/services/:id
router.delete('/:id', async (req, res) => {
  try {
    await Service.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: '已刪除' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
