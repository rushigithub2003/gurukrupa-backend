const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: "Our website is currently under maintenance. Please visit again later.",
  },
});

module.exports = mongoose.model("Maintenance", maintenanceSchema);