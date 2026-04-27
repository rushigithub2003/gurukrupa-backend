// models/Product.js — Product schema
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  brand:       { type: String, required: true, trim: true },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  description: { type: String, required: true },
  shortSpecs:  [{ type: String }],           // e.g. ["38ppm","Duplex","Wi-Fi"]
  specs:       { type: Map, of: String },    // e.g. { "Resolution": "1200dpi" }
  features:    [{ type: String }],           // bullet list
  image:       { type: String, default: '' },// URL or uploaded filename
  isActive:    { type: Boolean, default: true },
  isFeatured:  { type: Boolean, default: false },
  tags:        [{ type: String }],
}, { timestamps: true });

// Text index for search
productSchema.index({ name: 'text', brand: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);