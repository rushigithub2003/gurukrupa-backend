// routes/authRoutes.js — Admin authentication routes

const express = require("express");

const router = express.Router();

const {
  login,
  getMe,
  changePassword,
  updateProfile,
} = require("../controllers/authController");

const {
  protect,
} = require("../middleware/authMiddleware");

// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

// Login
//
// Rate limiting is already handled centrally in server.js:
//
// app.use("/api/auth/login", authLimiter);
//
// Therefore, do NOT add another rate limiter here.

router.post(
  "/login",
  login
);

// ============================================================
// PROTECTED AUTH ROUTES
// ============================================================

// Get current admin
router.get(
  "/me",
  protect,
  getMe
);

// Change password
router.put(
  "/change-password",
  protect,
  changePassword
);

// Update profile
router.put(
  "/update-profile",
  protect,
  updateProfile
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;