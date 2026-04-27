// controllers/authController.js — Admin authentication
const jwt   = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Generate JWT
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// @route  POST /api/auth/login
// @desc   Login admin
// @access Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      token: signToken(admin._id),
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route  GET /api/auth/me
// @desc   Get current admin profile
// @access Private
const getMe = async (req, res) => {
  res.json({ admin: { id: req.admin._id, name: req.admin.name, email: req.admin.email } });
};

// @route  PUT /api/auth/change-password
// @desc   Change admin password
// @access Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id);

    if (!(await admin.comparePassword(currentPassword)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    admin.password = newPassword;
    await admin.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Optional: check duplicate email
    if (req.body.email) {
      const existing = await Admin.findOne({ email: req.body.email });
      if (existing && existing._id.toString() !== admin._id.toString()) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Update fields
    admin.name  = req.body.name  || admin.name;
    admin.email = req.body.email || admin.email;

    await admin.save();

    res.json({
      message: "Profile updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



module.exports = { login, getMe, changePassword, updateProfile };