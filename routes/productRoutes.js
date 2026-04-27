// routes/productRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getProducts, getAdminProducts, getProduct,
  createProduct, updateProduct, deleteProduct, getStats,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const upload  = require('../middleware/upload');

// Public routes
router.get('/',          getProducts);
router.get('/:id',       getProduct);

// Admin routes
router.get('/admin/all',   protect, getAdminProducts);
router.get('/admin/stats', protect, getStats);
router.post('/',           protect, upload.single('image'), createProduct);
router.put('/:id',         protect, upload.single('image'), updateProduct);
router.delete('/:id',      protect, deleteProduct);

module.exports = router;