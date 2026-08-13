// models/Product.js — Secure Product schema

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // ========================================================
    // PRODUCT NAME
    // ========================================================

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },

    // ========================================================
    // BRAND
    // ========================================================

    brand: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },

    // ========================================================
    // CATEGORY
    // ========================================================

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    // ========================================================
    // DESCRIPTION
    // ========================================================

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    // ========================================================
    // SHORT SPECIFICATIONS
    // ========================================================

    shortSpecs: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 200,
        },
      ],

      default: [],

      validate: {
        validator: function (value) {
          return value.length <= 30;
        },

        message:
          "A product cannot have more than 30 short specifications",
      },
    },

    // ========================================================
    // SPECIFICATIONS
    // ========================================================

    specs: {
      type: Map,
      of: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      default: {},
    },

    // ========================================================
    // FEATURES
    // ========================================================

    features: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 500,
        },
      ],

      default: [],

      validate: {
        validator: function (value) {
          return value.length <= 50;
        },

        message:
          "A product cannot have more than 50 features",
      },
    },

    // ========================================================
    // IMAGE
    // ========================================================

    image: {
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

    // ========================================================
    // FEATURED STATUS
    // ========================================================

    isFeatured: {
      type: Boolean,
      default: false,
    },

    // ========================================================
    // TAGS
    // ========================================================

    tags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 100,
        },
      ],

      default: [],

      validate: {
        validator: function (value) {
          return value.length <= 30;
        },

        message:
          "A product cannot have more than 30 tags",
      },
    },
  },
  {
    timestamps: true,

    // Ignore fields that aren't defined
    // in the schema.
    strict: true,
  }
);

// ============================================================
// TEXT INDEX
// ============================================================

productSchema.index({
  name: "text",
  brand: "text",
  description: "text",
});

module.exports =
  mongoose.model(
    "Product",
    productSchema
  );