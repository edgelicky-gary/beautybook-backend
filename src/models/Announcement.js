const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['notice', 'activity', 'update'], default: 'notice' },
  targetShops: { type: [mongoose.Schema.Types.ObjectId], ref: 'Shop', default: [] },
  isActive: { type: Boolean, default: true },
  publishedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);