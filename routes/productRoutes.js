// routes/productRoutes.js

const express = require("express");

const router = express.Router();

const {
  getProducts,
  getAdminProducts,
  getAdminProduct,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getStats,
} = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get active products only
router.get("/", getProducts);

// ============================================================
// ADMIN GET ROUTES
// ============================================================

// Get all products including inactive
// IMPORTANT: Must come before /admin/:id
router.get(
  "/admin/all",
  protect,
  getAdminProducts
);

// Dashboard statistics
// IMPORTANT: Must come before /admin/:id
router.get(
  "/admin/stats",
  protect,
  getStats
);

// Get single product for admin
// Allows admin to edit inactive products
router.get(
  "/admin/:id",
  protect,
  getAdminProduct
);

// ============================================================
// PUBLIC SINGLE PRODUCT
// ============================================================

// Only active products with active categories
// should be accessible publicly
router.get(
  "/:id",
  getProduct
);

// ============================================================
// ADMIN CRUD
// ============================================================

// Create product
router.post(
  "/",
  protect,
  upload.single("image"),
  createProduct
);

// Update product
router.put(
  "/:id",
  protect,
  upload.single("image"),
  updateProduct
);

// Delete product
router.delete(
  "/:id",
  protect,
  deleteProduct
);

module.exports = router;