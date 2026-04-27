// routes/categoryRoutes.js
const express = require('express');
const router  = express.Router();
const { getCategories, getCategory, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');

router.get('/',          getCategories);               // public
router.get('/:id',       getCategory);                 // public
router.post('/',         protect, createCategory);     // admin
router.put('/:id',       protect, updateCategory);     // admin
router.delete('/:id',    protect, deleteCategory);     // admin

module.exports = router;