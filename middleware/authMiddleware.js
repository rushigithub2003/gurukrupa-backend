// middleware/authMiddleware.js — Secure JWT verification middleware

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

// ============================================================
// PROTECT ADMIN ROUTES
// ============================================================

const protect = async (req, res, next) => {
  try {
    // ========================================================
    // 1. Get Authorization header
    // ========================================================

    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    // ========================================================
    // 2. Extract token
    // ========================================================

    const token = authHeader
      .substring(7)
      .trim();

    if (!token) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    // ========================================================
    // 3. Verify JWT
    // ========================================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ========================================================
    // 4. Validate JWT payload
    // ========================================================

    if (
      !decoded ||
      typeof decoded.id !== "string" ||
      !decoded.id
    ) {
      return res.status(401).json({
        message:
          "Invalid authentication token",
      });
    }

    // JWT issued-at timestamp is required
    if (
      typeof decoded.iat !== "number"
    ) {
      return res.status(401).json({
        message:
          "Invalid authentication token",
      });
    }

    // ========================================================
    // 5. Validate MongoDB ObjectId
    // ========================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        decoded.id
      )
    ) {
      return res.status(401).json({
        message:
          "Invalid authentication token",
      });
    }

    // ========================================================
    // 6. Find admin
    // ========================================================

    const admin =
      await Admin.findById(
        decoded.id
      ).select(
        "+passwordChangedAt"
      );

    if (!admin) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    // ========================================================
    // 7. Check account status
    // ========================================================

    if (admin.isActive === false) {
      return res.status(403).json({
        message:
          "Admin account is disabled",
      });
    }

    // ========================================================
    // 8. Check admin role
    // ========================================================

    if (admin.role !== "admin") {
      return res.status(403).json({
        message:
          "You do not have permission to perform this action",
      });
    }

    // ========================================================
    // 9. Invalidate JWT issued before password change
    // ========================================================

    if (
      admin.passwordChangedAt &&
      admin.passwordChangedAt.getTime() >
        decoded.iat * 1000
    ) {
      return res.status(401).json({
        message:
          "Authentication token is no longer valid. Please login again.",
      });
    }

    // ========================================================
    // 10. Remove sensitive fields before attaching admin
    // ========================================================

    admin.password = undefined;
    admin.passwordChangedAt = undefined;

    // ========================================================
    // 11. Attach admin to request
    // ========================================================

    req.admin = admin;

    // ========================================================
    // 12. Continue
    // ========================================================

    return next();

  } catch (err) {

    // ========================================================
    // JWT errors
    // ========================================================

    if (
      err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message:
          "Authentication token is invalid or expired",
      });
    }

    // ========================================================
    // Unexpected errors
    // ========================================================

    console.error(
      "Authentication middleware error:",
      err.message
    );

    return res.status(500).json({
      message:
        "Authentication service unavailable",
    });
  }
};

module.exports = {
  protect,
};