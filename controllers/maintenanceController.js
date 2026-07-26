const Maintenance = require("../models/Maintenance");

// Get maintenance status
exports.getMaintenance = async (req, res) => {
  try {
    let data = await Maintenance.findOne();

    if (!data) {
      data = await Maintenance.create({
        enabled: false,
        message: "Our website is currently under maintenance.",
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update maintenance status
exports.updateMaintenance = async (req, res) => {
  try {
    const { enabled, message } = req.body;

    let data = await Maintenance.findOne();

    if (!data) {
      data = new Maintenance();
    }

    data.enabled = enabled;
    data.message = message;

    await data.save();

    res.json({
      success: true,
      data,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};