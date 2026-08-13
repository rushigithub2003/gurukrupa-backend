// models/Category.js — Secure Product category schema

const mongoose = require("mongoose");

// ============================================================
// CATEGORY SCHEMA
// ============================================================

const categorySchema = new mongoose.Schema(
  {
    // ========================================================
    // CATEGORY NAME
    // ========================================================

    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    // ========================================================
    // CATEGORY SLUG
    // ========================================================

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 120,

      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Invalid category slug",
      ],
    },

    // ========================================================
    // CATEGORY ICON
    // ========================================================

    icon: {
      type: String,
      default: "📦",
      trim: true,
      maxlength: 100,
    },

    // ========================================================
    // DESCRIPTION
    // ========================================================

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    // ========================================================
    // ACTIVE STATUS
    // ========================================================

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,

    // Ignore fields not defined
    // in this schema.
    strict: true,
  }
);



// ============================================================
// EXPORT
// ============================================================

module.exports =
  mongoose.model(
    "Category",
    categorySchema
  );