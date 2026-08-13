// routes/categoryRoutes.js

const express = require("express");

const router = express.Router();

const {
  getCategories,
  getCategory,
  getAdminCategories,
  getAdminCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect } = require("../middleware/authMiddleware");

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Active categories only
router.get(
  "/",
  getCategories
);

// ============================================================
// ADMIN GET ROUTES
// IMPORTANT: These must come BEFORE /:id
// ============================================================

// All categories including inactive
router.get(
  "/admin/all",
  protect,
  getAdminCategories
);

// Single category including inactive
router.get(
  "/admin/:id",
  protect,
  getAdminCategory
);

// ============================================================
// PUBLIC SINGLE CATEGORY
// ============================================================

// Single active category only
router.get(
  "/:id",
  getCategory
);

// ============================================================
// ADMIN CRUD
// ============================================================

// Create category
router.post(
  "/",
  protect,
  createCategory
);

// Update category
router.put(
  "/:id",
  protect,
  updateCategory
);

// Delete category
router.delete(
  "/:id",
  protect,
  deleteCategory
);

module.exports = router;