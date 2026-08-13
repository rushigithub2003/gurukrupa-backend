// models/Maintenance.js

const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
      required: true,
    },

    message: {
      type: String,
      default:
        "Our website is currently under maintenance. Please visit again later.",
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

module.exports =
  mongoose.model(
    "Maintenance",
    maintenanceSchema,
  );