// models/Admin.js — Secure admin user schema

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    // ========================================================
    // ADMIN NAME
    // ========================================================

    name: {
      type: String,
      required: true,
      default: "Admin",
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    // ========================================================
    // ADMIN EMAIL
    // ========================================================

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,

      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },

    // ========================================================
    // PASSWORD
    // ========================================================

    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 128,
      select: false,
    },

    // ========================================================
    // PASSWORD CHANGED AT
    // ========================================================

    passwordChangedAt: {
      type: Date,
      default: null,
      select: false,
    },

    // ========================================================
    // ROLE
    // ========================================================

    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
      immutable: true,
    },

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// PASSWORD HASHING
// ============================================================

adminSchema.pre("save", async function () {
  // Password hasn't changed
  if (!this.isModified("password")) {
    return;
  }

  // Strong password length validation
  if (
    typeof this.password !== "string" ||
    this.password.length < 8 ||
    this.password.length > 128
  ) {
    throw new Error(
      "Password must be between 8 and 128 characters"
    );
  }

  // Record when the password was changed.
  // This is used to invalidate older JWTs.
  this.passwordChangedAt = new Date();

  // Hash password
  this.password = await bcrypt.hash(
    this.password,
    12
  );
});

// ============================================================
// PASSWORD COMPARISON
// ============================================================

adminSchema.methods.comparePassword =
  async function (candidatePassword) {
    if (
      typeof candidatePassword !== "string" ||
      !this.password
    ) {
      return false;
    }

    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model(
  "Admin",
  adminSchema
);