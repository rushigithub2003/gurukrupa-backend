// controllers/categoryController.js — CRUD for categories
const Category = require('../models/Category');
const Product  = require('../models/Product');

// GET /api/categories — all active categories (public)
const getCategories = async (req, res) => {
  try {
    const filter = req.query.all ? {} : { isActive: true };
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/categories/:id — single category
const getCategory = async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json(cat);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/categories — create (admin)
const createCategory = async (req, res) => {
  try {
    const { name, icon, description } = req.body;

    const exists = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (exists) {
      return res.status(400).json({
        message: "Category with this name already exists",
      });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const category = await Category.create({
      name,
      slug,
      icon,
      description,
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// PUT /api/categories/:id — update (admin)
const updateCategory = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (updateData.name) {
      updateData.slug = updateData.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    res.json(category);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// DELETE /api/categories/:id — delete (admin)
const deleteCategory = async (req, res) => {
  try {
    // Prevent deletion if products exist in this category
    const count = await Product.countDocuments({ category: req.params.id });
    if (count > 0)
      return res.status(400).json({ message: `Cannot delete — ${count} product(s) use this category. Reassign them first.` });

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getCategories, getCategory, createCategory, updateCategory, deleteCategory };