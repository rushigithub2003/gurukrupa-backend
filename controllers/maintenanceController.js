// controllers/maintenanceController.js
// Secure maintenance status controller
const jwt = require("jsonwebtoken");

const Maintenance = require("../models/Maintenance");

// ============================================================
// CONSTANTS
// ============================================================

const DEFAULT_MESSAGE =
  "Our website is currently under maintenance. Please visit again later.";

const MAX_MESSAGE_LENGTH = 500;

// ============================================================
// GET MAINTENANCE STATUS
// GET /api/maintenance
// Public
// ============================================================

exports.getMaintenance = async (req, res) => {
  try {
    let data = await Maintenance.findOne()
      .select("_id enabled message")
      .lean();

    // --------------------------------------------------------
    // Create default document if none exists
    // --------------------------------------------------------

    if (!data) {
      const created =
        await Maintenance.create({
          enabled: false,
          message: DEFAULT_MESSAGE,
        });

      data = {
        _id: created._id,
        enabled: created.enabled,
        message: created.message,
      };
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(
      "Get maintenance error:",
      err.message
    );

    return res.status(500).json({
      message:
        "Unable to get maintenance status",
    });
  }
};

// ============================================================
// UPDATE MAINTENANCE STATUS
// PUT /api/maintenance
// ADMIN ONLY
// ============================================================

exports.updateMaintenance = async (
  req,
  res
) => {
  try {
    // --------------------------------------------------------
    // Validate request body
    // --------------------------------------------------------

    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        message:
          "Invalid request body",
      });
    }

    // --------------------------------------------------------
    // Only allow expected fields
    // --------------------------------------------------------

    const allowedFields = [
      "enabled",
      "message",
    ];

    const receivedFields =
      Object.keys(req.body);

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
          "Request contains unsupported fields.",
      });
    }

    // --------------------------------------------------------
    // enabled is required
    // --------------------------------------------------------

    const { enabled, message } =
      req.body;

    if (
      typeof enabled !== "boolean"
    ) {
      return res.status(400).json({
        message:
          "The 'enabled' field must be a boolean.",
      });
    }

    // --------------------------------------------------------
    // Validate message
    // --------------------------------------------------------

    if (
      message !== undefined &&
      message !== null &&
      typeof message !== "string"
    ) {
      return res.status(400).json({
        message:
          "The maintenance message must be a string.",
      });
    }

    const cleanMessage =
      typeof message === "string"
        ? message.trim()
        : DEFAULT_MESSAGE;

    if (
      cleanMessage.length >
      MAX_MESSAGE_LENGTH
    ) {
      return res.status(400).json({
        message:
          `Maintenance message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    // --------------------------------------------------------
    // Find existing document
    // --------------------------------------------------------

    let data =
      await Maintenance.findOne();

    // --------------------------------------------------------
    // Create if it doesn't exist
    // --------------------------------------------------------

    if (!data) {
      data =
        new Maintenance({
          enabled,
          message:
            cleanMessage ||
            DEFAULT_MESSAGE,
        });
    } else {
      // ------------------------------------------------------
      // Update ONLY allowed fields
      // ------------------------------------------------------

      data.enabled = enabled;

      data.message =
        cleanMessage ||
        DEFAULT_MESSAGE;
    }

    await data.save();

    // --------------------------------------------------------
    // Safe response
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      data: {
        id: data._id,
        enabled: data.enabled,
        message: data.message,
      },
    });
  } catch (err) {
    console.error(
      "Update maintenance error:",
      err.message
    );

    return res.status(500).json({
      message:
        "Unable to update maintenance settings",
    });
  }
};

// ============================================================
// CREATE ADMIN WEBSITE PREVIEW TOKEN
// POST /api/maintenance/preview
// ADMIN ONLY
// ============================================================

exports.createPreviewToken = async (req, res) => {
  try {
    // --------------------------------------------------------
    // Make sure authenticated admin exists
    // --------------------------------------------------------

    if (!req.admin || !req.admin._id) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    // --------------------------------------------------------
    // Create short-lived preview token
    // --------------------------------------------------------

    const token = jwt.sign(
      {
        id: req.admin._id.toString(),
        purpose: "website-preview",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m",
      }
    );

    return res.status(200).json({
      success: true,
      token,
      expiresIn: 600,
    });
  } catch (err) {
    console.error(
      "Create preview token error:",
      err.message
    );

    return res.status(500).json({
      message:
        "Unable to create website preview",
    });
  }
};

// ============================================================
// VALIDATE ADMIN WEBSITE PREVIEW TOKEN
// POST /api/maintenance/preview/validate
// PUBLIC ENDPOINT
// ============================================================

exports.validatePreviewToken = async (req, res) => {
  try {
    const { token } = req.body;

    // --------------------------------------------------------
    // Validate token exists
    // --------------------------------------------------------

    if (
      !token ||
      typeof token !== "string"
    ) {
      return res.status(401).json({
        valid: false,
        message: "Preview token is required.",
      });
    }

    // --------------------------------------------------------
    // Verify JWT
    // --------------------------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // --------------------------------------------------------
    // Make sure this is a website preview token
    // --------------------------------------------------------

    if (
      !decoded ||
      decoded.purpose !== "website-preview" ||
      typeof decoded.id !== "string"
    ) {
      return res.status(401).json({
        valid: false,
        message: "Invalid preview token.",
      });
    }

    // --------------------------------------------------------
    // Verify admin still exists and is active
    // --------------------------------------------------------

    const Admin = require("../models/Admin");

    const admin = await Admin.findById(
      decoded.id
    ).select("_id isActive role");

    if (!admin) {
      return res.status(401).json({
        valid: false,
        message: "Admin account not found.",
      });
    }

    if (admin.isActive === false) {
      return res.status(403).json({
        valid: false,
        message: "Admin account is disabled.",
      });
    }

    if (admin.role !== "admin") {
      return res.status(403).json({
        valid: false,
        message: "Admin permission required.",
      });
    }

    // --------------------------------------------------------
    // Preview is valid
    // --------------------------------------------------------

    return res.status(200).json({
      valid: true,
    });

  } catch (err) {

    // Expired / invalid JWT
    if (
      err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        valid: false,
        message: "Preview token is invalid or expired.",
      });
    }

    console.error(
      "Preview token validation error:",
      err.message
    );

    return res.status(500).json({
      valid: false,
      message: "Unable to validate website preview.",
    });
  }
};