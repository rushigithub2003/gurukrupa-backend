// controllers/productController.js — Full CRUD for products
const Product = require('../models/Product');
const fs      = require('fs');
const path    = require('path');

// GET /api/products — list with search, filter, pagination
const getProducts = async (req, res) => {
  try {
    const { search, category, featured, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (category)  filter.category   = category;
    if (featured === 'true') filter.isFeatured = true;
    if (search)    filter.$or = [
      { name:        { $regex: search, $options: 'i' } },
      { brand:       { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name slug icon')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/products/admin — list all products including inactive (admin)
const getAdminProducts = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search)   filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ];

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/products/:id — single product
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug icon');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/products — create (admin)
const createProduct = async (req, res) => {
  try {
    let { name, brand, category, description, shortSpecs, specs, features, isActive, isFeatured, tags, imageUrl } = req.body;

    // Parse JSON strings if sent as form-data
    if (typeof shortSpecs === 'string') shortSpecs = JSON.parse(shortSpecs);
    if (typeof features   === 'string') features   = JSON.parse(features);
    if (typeof specs      === 'string') specs      = JSON.parse(specs);
    if (typeof tags       === 'string') tags       = JSON.parse(tags);

    // Image: uploaded file takes priority over URL
    let image = imageUrl || '';
    if (req.file) image = `/uploads/${req.file.filename}`;

    const product = await Product.create({
      name, brand, category, description, shortSpecs, specs, features,
      image, isActive, isFeatured, tags,
    });

    const populated = await product.populate('category', 'name slug');
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// PUT /api/products/:id — update (admin)
const updateProduct = async (req, res) => {
  try {
    let { shortSpecs, features, specs, tags, imageUrl, ...rest } = req.body;

    if (typeof shortSpecs === 'string') shortSpecs = JSON.parse(shortSpecs);
    if (typeof features   === 'string') features   = JSON.parse(features);
    if (typeof specs      === 'string') specs      = JSON.parse(specs);
    if (typeof tags       === 'string') tags       = JSON.parse(tags);

    const updateData = { ...rest, shortSpecs, features, specs, tags };

    // If new file uploaded, delete old file and set new path
    if (req.file) {
      const existing = await Product.findById(req.params.id);
      if (existing?.image?.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', existing.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updateData.image = `/uploads/${req.file.filename}`;
    } else if (imageUrl !== undefined) {
      updateData.image = imageUrl;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('category', 'name slug');

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// DELETE /api/products/:id — delete (admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Delete uploaded image file if exists
    if (product.image?.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', product.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/products/stats — dashboard stats (admin)
const getStats = async (req, res) => {
  try {
    const [totalProducts, activeProducts, featuredProducts, totalCategories] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isFeatured: true }),
      require('../models/Category').countDocuments(),
    ]);
    res.json({ totalProducts, activeProducts, featuredProducts, totalCategories });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getProducts, getAdminProducts, getProduct, createProduct, updateProduct, deleteProduct, getStats };