const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getMaintenance,
  updateMaintenance,
} = require("../controllers/maintenanceController");

// Public
router.get("/", getMaintenance);

// Admin
router.put("/", protect, updateMaintenance);

module.exports = router;