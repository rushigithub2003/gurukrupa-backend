const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getMaintenance,
  updateMaintenance,
  createPreviewToken,
  validatePreviewToken,
} = require("../controllers/maintenanceController");

// ============================================================
// PUBLIC
// ============================================================

// Check maintenance status
router.get("/", getMaintenance);

// Validate temporary admin preview token
router.post(
  "/preview/validate",
  validatePreviewToken
);

// ============================================================
// ADMIN
// ============================================================

// Update maintenance settings
router.put(
  "/",
  protect,
  updateMaintenance
);

// Generate temporary admin preview token
router.post(
  "/preview",
  protect,
  createPreviewToken
);

module.exports = router;