// controllers/authController.js — Admin authentication

const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// ============================================================
// HELPERS
// ============================================================

const signToken = (id) => {
  return jwt.sign(
    {
      id: id.toString(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const normalizeEmail = (email) => {
  return String(email).trim().toLowerCase();
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isStrongPassword = (password) => {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

// ============================================================
// POST /api/auth/login
// Login admin
// Public
// ============================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // --------------------------------------------------------
    // Validate request body
    // --------------------------------------------------------

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail =
      normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    if (
      password.length < 1 ||
      password.length > 128
    ) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // --------------------------------------------------------
    // Find admin
    // --------------------------------------------------------

    const admin = await Admin.findOne({
      email: normalizedEmail,
    }).select("+password");

    // --------------------------------------------------------
    // Generic authentication failure
    // --------------------------------------------------------

    if (
      !admin ||
      !(await admin.comparePassword(password))
    ) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // --------------------------------------------------------
    // Check admin account status
    // --------------------------------------------------------

    if (admin.isActive === false) {
      return res.status(403).json({
        message:
          "This admin account has been disabled",
      });
    }

    // --------------------------------------------------------
    // Generate JWT
    // --------------------------------------------------------

    const token = signToken(admin._id);

    return res.status(200).json({
      token,

      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error(
      "Admin login error:",
      err.message
    );

    return res.status(500).json({
      message: "Unable to process login",
    });
  }
};

// ============================================================
// GET /api/auth/me
// Current admin profile
// Protected
// ============================================================

const getMe = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    return res.status(200).json({
      admin: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role,
      },
    });
  } catch (err) {
    console.error(
      "Get admin profile error:",
      err.message
    );

    return res.status(500).json({
      message:
        "Unable to fetch admin profile",
    });
  }
};

// ============================================================
// PUT /api/auth/change-password
// Change admin password
// Protected
// ============================================================

const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body || {};

    // --------------------------------------------------------
    // Validate input types
    // --------------------------------------------------------

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        message:
          "Current password and new password are required",
      });
    }

    // --------------------------------------------------------
    // Validate current password length
    // --------------------------------------------------------

    if (
      currentPassword.length < 1 ||
      currentPassword.length > 128
    ) {
      return res.status(401).json({
        message:
          "Current password is incorrect",
      });
    }

    // --------------------------------------------------------
    // Validate new password
    // --------------------------------------------------------

    if (
      !isStrongPassword(newPassword)
    ) {
      return res.status(400).json({
        message:
          "New password must be 8-128 characters and contain uppercase, lowercase, number, and special character",
      });
    }

    // Don't allow same password
    if (
      currentPassword === newPassword
    ) {
      return res.status(400).json({
        message:
          "New password must be different from current password",
      });
    }

    // --------------------------------------------------------
    // Get admin
    // --------------------------------------------------------

    const admin =
      await Admin.findById(
        req.admin._id
      );

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    // --------------------------------------------------------
    // Check account status
    // --------------------------------------------------------

    if (admin.isActive === false) {
      return res.status(403).json({
        message:
          "This admin account has been disabled",
      });
    }

    // --------------------------------------------------------
    // Verify current password
    // --------------------------------------------------------

    const passwordCorrect =
      await admin.comparePassword(
        currentPassword
      );

    if (!passwordCorrect) {
      return res.status(401).json({
        message:
          "Current password is incorrect",
      });
    }

    // --------------------------------------------------------
    // Save new password
    // --------------------------------------------------------

    admin.password =
      newPassword;

    await admin.save();

    return res.status(200).json({
      message:
        "Password updated successfully",
    });
  } catch (err) {
    console.error(
      "Change password error:",
      err.message
    );

    return res.status(500).json({
      message:
        "Unable to change password",
    });
  }
};

// ============================================================
// PUT /api/auth/update-profile
// Update admin profile
// Protected
// ============================================================

const updateProfile = async (
  req,
  res
) => {
  try {
    const admin =
      await Admin.findById(
        req.admin._id
      );

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    // --------------------------------------------------------
    // Only accept allowed fields
    // --------------------------------------------------------

    const {
      name,
      email,
    } = req.body || {};

    const receivedFields =
      Object.keys(req.body || {});

    const allowedFields = [
      "name",
      "email",
    ];

    const unexpectedFields =
      receivedFields.filter(
        (field) =>
          !allowedFields.includes(
            field
          )
      );

    if (
      unexpectedFields.length > 0
    ) {
      return res.status(400).json({
        message:
          "Request contains unsupported fields",
      });
    }

    // Prevent empty update
    if (
      name === undefined &&
      email === undefined
    ) {
      return res.status(400).json({
        message:
          "At least one profile field is required",
      });
    }

    // --------------------------------------------------------
    // Validate name
    // --------------------------------------------------------

    if (name !== undefined) {
      if (
        typeof name !== "string"
      ) {
        return res.status(400).json({
          message:
            "Name must be a string",
        });
      }

      const cleanName =
        name.trim();

      if (
        cleanName.length < 2 ||
        cleanName.length > 100
      ) {
        return res.status(400).json({
          message:
            "Name must be between 2 and 100 characters",
        });
      }

      admin.name =
        cleanName;
    }

    // --------------------------------------------------------
    // Validate email
    // --------------------------------------------------------

    if (email !== undefined) {
      if (
        typeof email !== "string"
      ) {
        return res.status(400).json({
          message:
            "Email must be a string",
        });
      }

      const normalizedEmail =
        normalizeEmail(email);

      if (
        !isValidEmail(
          normalizedEmail
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid email format",
        });
      }

      // Check duplicate email
      const existing =
        await Admin.findOne({
          email: normalizedEmail,
        });

      if (
        existing &&
        existing._id.toString() !==
          admin._id.toString()
      ) {
        return res.status(400).json({
          message:
            "Email already in use",
        });
      }

      admin.email =
        normalizedEmail;
    }

    // --------------------------------------------------------
    // Save
    // --------------------------------------------------------

    await admin.save();

    return res.status(200).json({
      message:
        "Profile updated successfully",

      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error(
      "Update profile error:",
      err.message
    );

    // MongoDB duplicate-key protection
    if (err.code === 11000) {
      return res.status(400).json({
        message:
          "Email already in use",
      });
    }

    return res.status(500).json({
      message:
        "Unable to update profile",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  login,
  getMe,
  changePassword,
  updateProfile,
};