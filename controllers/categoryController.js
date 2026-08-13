// controllers/categoryController.js
// Secure CRUD for categories

const Category = require("../models/Category");
const Product = require("../models/Product");

// ============================================================
// HELPERS
// ============================================================

// Strict MongoDB ObjectId validation
const validateObjectId = (id, fieldName = "ID") => {
  if (typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

// ============================================================
// CATEGORY NAME VALIDATION
// ============================================================

const validateName = (name) => {
  if (typeof name !== "string") {
    throw new Error("Category name must be a string");
  }

  const cleanName = name.trim();

  if (cleanName.length < 2 || cleanName.length > 100) {
    throw new Error("Category name must be between 2 and 100 characters");
  }

  return cleanName;
};

// ============================================================
// TEXT VALIDATION
// ============================================================

const validateText = (value, fieldName, maxLength) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const cleanValue = value.trim();

  if (cleanValue.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }

  return cleanValue;
};

// ============================================================
// BOOLEAN VALIDATION
// ============================================================

const parseBoolean = (value, fieldName) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${fieldName} must be true or false`);
};

// ============================================================
// SLUG GENERATION
// ============================================================

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

// ============================================================
// REGEX ESCAPING
// ============================================================

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// ============================================================
// GET /api/categories
// PUBLIC — ACTIVE categories only
// ============================================================

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
    })
      .sort({
        name: 1,
      })
      .lean();

    return res.status(200).json(categories);
  } catch (err) {
    console.error("Get categories error:", err.message);

    return res.status(500).json({
      message: "Unable to fetch categories",
    });
  }
};

// ============================================================
// GET /api/categories/:id
// PUBLIC — ACTIVE category only
// ============================================================

const getCategory = async (req, res) => {
  try {
    const id = validateObjectId(req.params.id, "category ID");

    const category = await Category.findOne({
      _id: id,
      isActive: true,
    }).lean();

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    return res.status(200).json(category);
  } catch (err) {
    console.error("Get category error:", err.message);

    return res.status(400).json({
      message: err.message || "Unable to fetch category",
    });
  }
};

// ============================================================
// GET /api/categories/admin/all
// ADMIN — ALL categories including inactive
// ============================================================

const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find({})
      .sort({
        name: 1,
      })
      .lean();

    return res.status(200).json(categories);
  } catch (err) {
    console.error("Get admin categories error:", err.message);

    return res.status(500).json({
      message: "Unable to fetch categories",
    });
  }
};

// ============================================================
// GET /api/categories/admin/:id
// ADMIN — single category including inactive
// ============================================================

const getAdminCategory = async (req, res) => {
  try {
    const id = validateObjectId(req.params.id, "category ID");

    const category = await Category.findById(id).lean();

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    return res.status(200).json(category);
  } catch (err) {
    console.error("Get admin category error:", err.message);

    return res.status(400).json({
      message: err.message || "Unable to fetch category",
    });
  }
};

// ============================================================
// POST /api/categories
// ADMIN — create category
// ============================================================

const createCategory = async (req, res) => {
  try {
    const { name, icon, description } = req.body || {};

    // --------------------------------------------------------
    // Validate name
    // --------------------------------------------------------

    const cleanName = validateName(name);

    // --------------------------------------------------------
    // Validate icon
    // --------------------------------------------------------

    const cleanIcon =
      icon === undefined ? "📦" : validateText(icon, "Icon", 100);

    // --------------------------------------------------------
    // Validate description
    // --------------------------------------------------------

    const cleanDescription =
      description === undefined
        ? ""
        : validateText(description, "Description", 1000);

    // --------------------------------------------------------
    // Generate slug
    // --------------------------------------------------------

    const slug = generateSlug(cleanName);

    if (!slug || slug.length < 2 || slug.length > 120) {
      return res.status(400).json({
        message: "Category name cannot generate a valid slug",
      });
    }

    // --------------------------------------------------------
    // Check duplicate name
    // --------------------------------------------------------

    const escapedName = escapeRegex(cleanName);

    const existingName = await Category.findOne({
      name: {
        $regex: `^${escapedName}$`,
        $options: "i",
      },
    }).lean();

    if (existingName) {
      return res.status(400).json({
        message: "Category with this name already exists",
      });
    }

    // --------------------------------------------------------
    // Check duplicate slug
    // --------------------------------------------------------

    const existingSlug = await Category.findOne({
      slug,
    }).lean();

    if (existingSlug) {
      return res.status(400).json({
        message: "A category with a similar name already exists",
      });
    }

    // --------------------------------------------------------
    // Create
    // --------------------------------------------------------

    const category = await Category.create({
      name: cleanName,
      slug,
      icon: cleanIcon || "📦",
      description: cleanDescription || "",
    });

    return res.status(201).json(category);
  } catch (err) {
    console.error("Create category error:", err.message);

    // MongoDB unique index protection
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];

      if (duplicateField === "slug") {
        return res.status(400).json({
          message: "A category with a similar name already exists",
        });
      }

      return res.status(400).json({
        message: "Category with this name already exists",
      });
    }

    return res.status(400).json({
      message: err.message || "Unable to create category",
    });
  }
};

// ============================================================
// PUT /api/categories/:id
// ADMIN — update category
// ============================================================

const updateCategory = async (req, res) => {
  try {
    const id = validateObjectId(req.params.id, "category ID");

    const body = req.body || {};

    // --------------------------------------------------------
    // Allowed fields only
    // --------------------------------------------------------

    const allowedFields = ["name", "icon", "description", "isActive"];

    const receivedFields = Object.keys(body);

    const unexpectedFields = receivedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (unexpectedFields.length > 0) {
      return res.status(400).json({
        message: "Request contains unsupported fields",
      });
    }

    // --------------------------------------------------------
    // Prevent empty update
    // --------------------------------------------------------

    if (receivedFields.length === 0) {
      return res.status(400).json({
        message: "At least one category field is required",
      });
    }

    // --------------------------------------------------------
    // Find existing category
    // --------------------------------------------------------

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    const updateData = {};

    // --------------------------------------------------------
    // Name
    // --------------------------------------------------------

    if (body.name !== undefined) {
      const cleanName = validateName(body.name);

      const escapedName = escapeRegex(cleanName);

      // Check duplicate name
      const duplicate = await Category.findOne({
        _id: {
          $ne: id,
        },

        name: {
          $regex: `^${escapedName}$`,
          $options: "i",
        },
      }).lean();

      if (duplicate) {
        return res.status(400).json({
          message: "Category with this name already exists",
        });
      }

      // Generate new slug
      const newSlug = generateSlug(cleanName);

      if (!newSlug || newSlug.length < 2 || newSlug.length > 120) {
        return res.status(400).json({
          message: "Category name cannot generate a valid slug",
        });
      }

      // Check duplicate slug
      const slugDuplicate = await Category.findOne({
        _id: {
          $ne: id,
        },

        slug: newSlug,
      }).lean();

      if (slugDuplicate) {
        return res.status(400).json({
          message: "A category with a similar name already exists",
        });
      }

      updateData.name = cleanName;

      updateData.slug = newSlug;
    }

    // --------------------------------------------------------
    // Icon
    // --------------------------------------------------------

    if (body.icon !== undefined) {
      const cleanIcon = validateText(body.icon, "Icon", 100);

      updateData.icon = cleanIcon || "📦";
    }

    // --------------------------------------------------------
    // Description
    // --------------------------------------------------------

    if (body.description !== undefined) {
      updateData.description = validateText(
        body.description,
        "Description",
        1000,
      );
    }

    // --------------------------------------------------------
    // Active status
    // --------------------------------------------------------

    if (body.isActive !== undefined) {
      updateData.isActive = parseBoolean(body.isActive, "isActive");
    }

    // --------------------------------------------------------
    // Update
    // --------------------------------------------------------

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updatedCategory) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    return res.status(200).json(updatedCategory);
  } catch (err) {
    console.error("Update category error:", err.message);

    // MongoDB unique index protection
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];

      if (duplicateField === "slug") {
        return res.status(400).json({
          message: "A category with a similar name already exists",
        });
      }

      return res.status(400).json({
        message: "Category with this name already exists",
      });
    }

    return res.status(400).json({
      message: err.message || "Unable to update category",
    });
  }
};

// ============================================================
// DELETE /api/categories/:id
// ADMIN — delete category
// ============================================================

const deleteCategory = async (req, res) => {
  try {
    const id = validateObjectId(req.params.id, "category ID");

    // --------------------------------------------------------
    // Check products using category
    // --------------------------------------------------------

    const productCount = await Product.countDocuments({
      category: id,
    });

    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete — ${productCount} product(s) use this category. Reassign them first.`,
      });
    }

    // --------------------------------------------------------
    // Delete
    // --------------------------------------------------------

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    return res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (err) {
    console.error("Delete category error:", err.message);

    return res.status(400).json({
      message: err.message || "Unable to delete category",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getCategories,
  getCategory,
  getAdminCategories,
  getAdminCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
