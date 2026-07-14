// models/Category.js — Product category schema
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true },
  icon:        { type: String, default: '📦' },
  description: { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

// Auto-generate slug from name before save
// categorySchema.pre('save', function(next) {
//   if (this.isModified('name')) {
//     this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
//   }
//   next();
// });

module.exports = mongoose.model('Category', categorySchema);