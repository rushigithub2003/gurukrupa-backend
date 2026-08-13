// controllers/productController.js — Secure product CRUD

const Product = require("../models/Product");
const Category = require("../models/Category");
const fs = require("fs");
const path = require("path");

// ============================================================
// CONSTANTS
// ============================================================

const MAX_PAGE = 100000;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;

// ============================================================
// HELPERS
// ============================================================

// Safely convert pagination values to integers
const getPagination = (page, limit) => {
  let safePage = Number.parseInt(page, 10);
  let safeLimit = Number.parseInt(limit, 10);

  if (!Number.isInteger(safePage) || safePage < 1) {
    safePage = 1;
  }

  if (!Number.isInteger(safeLimit) || safeLimit < 1) {
    safeLimit = 20;
  }

  safePage = Math.min(safePage, MAX_PAGE);
  safeLimit = Math.min(safeLimit, MAX_LIMIT);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

// Safely parse JSON coming from multipart/form-data
const parseJSONField = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Invalid JSON data");
  }
};

// Ensure value is an array of strings
const validateStringArray = (value, fieldName) => {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }

  if (value.length > 100) {
    throw new Error(`${fieldName} contains too many items`);
  }

  return value.map((item) => {
    if (typeof item !== "string") {
      throw new Error(`${fieldName} must contain only strings`);
    }

    const trimmed = item.trim();

    if (trimmed.length > 500) {
      throw new Error(`${fieldName} contains an item that is too long`);
    }

    return trimmed;
  });
};

// Validate text
const validateText = (
  value,
  fieldName,
  minLength = 1,
  maxLength = 5000
) => {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const cleaned = value.trim();

  if (
    cleaned.length < minLength ||
    cleaned.length > maxLength
  ) {
    throw new Error(
      `${fieldName} must be between ${minLength} and ${maxLength} characters`
    );
  }

  return cleaned;
};

// Validate boolean
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
// MongoDB ObjectId validation
// ============================================================

const validateObjectId = (
  id,
  fieldName = "ID"
) => {
  if (
    typeof id !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(id)
  ) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return id;
};

// Escape regex special characters
const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

// ============================================================
// GET /api/products
// PUBLIC — only active products from active categories
// ============================================================

const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      featured,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      isActive: true,
    };

    // --------------------------------------------------------
    // Category filter
    // --------------------------------------------------------

    if (category) {
      validateObjectId(
        category,
        "category ID"
      );

      const activeCategory =
        await Category.exists({
          _id: category,
          isActive: true,
        });

      if (!activeCategory) {
        return res.status(200).json({
          products: [],
          total: 0,
          page: 1,
          pages: 0,
        });
      }

      filter.category = category;
    } else {
      const activeCategories =
        await Category.find({
          isActive: true,
        }).select("_id");

      filter.category = {
        $in: activeCategories.map(
          (cat) => cat._id
        ),
      };
    }

    // --------------------------------------------------------
    // Featured filter
    // --------------------------------------------------------

    if (featured !== undefined) {
      if (
        featured !== "true" &&
        featured !== "false"
      ) {
        return res.status(400).json({
          message:
            "Featured must be true or false",
        });
      }

      if (featured === "true") {
        filter.isFeatured = true;
      }
    }

    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    if (search !== undefined) {
      if (typeof search !== "string") {
        return res.status(400).json({
          message: "Invalid search value",
        });
      }

      const cleanSearch =
        search.trim();

      if (
        cleanSearch.length >
        MAX_SEARCH_LENGTH
      ) {
        return res.status(400).json({
          message:
            "Search query is too long",
        });
      }

      if (cleanSearch.length > 0) {
        const safeSearch =
          escapeRegex(cleanSearch);

        filter.$or = [
          {
            name: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            brand: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            description: {
              $regex: safeSearch,
              $options: "i",
            },
          },
        ];
      }
    }

    // --------------------------------------------------------
    // Pagination
    // --------------------------------------------------------

    const {
      page: currentPage,
      limit: safeLimit,
      skip,
    } = getPagination(
      page,
      limit
    );

    const total =
      await Product.countDocuments(
        filter
      );

    const products =
      await Product.find(filter)
        .populate(
          "category",
          "name slug icon"
        )
        .sort({
          isFeatured: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean();

    return res.status(200).json({
      products,
      total,
      page: currentPage,
      pages: Math.ceil(
        total / safeLimit
      ),
    });
  } catch (err) {
    console.error(
      "Get products error:",
      err.message
    );

    return res.status(400).json({
      message:
        err.message ||
        "Unable to fetch products",
    });
  }
};

// ============================================================
// GET /api/products/admin/all
// ADMIN — all products
// ============================================================

const getAdminProducts = async (
  req,
  res
) => {
  try {
    const {
      search,
      category,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // --------------------------------------------------------
    // Category filter
    // --------------------------------------------------------

    if (category) {
      validateObjectId(
        category,
        "category ID"
      );

      filter.category = category;
    }

    // --------------------------------------------------------
    // Search
    // --------------------------------------------------------

    if (search !== undefined) {
      if (typeof search !== "string") {
        return res.status(400).json({
          message:
            "Invalid search value",
        });
      }

      const cleanSearch =
        search.trim();

      if (
        cleanSearch.length >
        MAX_SEARCH_LENGTH
      ) {
        return res.status(400).json({
          message:
            "Search query is too long",
        });
      }

      if (cleanSearch.length > 0) {
        const safeSearch =
          escapeRegex(cleanSearch);

        filter.$or = [
          {
            name: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            brand: {
              $regex: safeSearch,
              $options: "i",
            },
          },
        ];
      }
    }

    // --------------------------------------------------------
    // Pagination
    // --------------------------------------------------------

    const {
      page: currentPage,
      limit: safeLimit,
      skip,
    } = getPagination(
      page,
      limit
    );

    const total =
      await Product.countDocuments(
        filter
      );

    const products =
      await Product.find(filter)
        .populate(
          "category",
          "name slug icon isActive"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(safeLimit)
        .lean();

    return res.status(200).json({
      products,
      total,
      page: currentPage,
      pages: Math.ceil(
        total / safeLimit
      ),
    });
  } catch (err) {
    console.error(
      "Get admin products error:",
      err.message
    );

    return res.status(400).json({
      message:
        err.message ||
        "Unable to fetch products",
    });
  }
};

// ============================================================
// GET /api/products/:id
// PUBLIC — only active product + active category
// ============================================================

const getProduct = async (
  req,
  res
) => {
  try {
    const id =
      validateObjectId(
        req.params.id,
        "product ID"
      );

    const product =
      await Product.findOne({
        _id: id,
        isActive: true,
      })
        .populate({
          path: "category",
          select:
            "name slug icon",
          match: {
            isActive: true,
          },
        })
        .lean();

    if (
      !product ||
      !product.category
    ) {
      return res.status(404).json({
        message:
          "Product not found",
      });
    }

    return res.status(200).json(
      product
    );
  } catch (err) {
    console.error(
      "Get product error:",
      err.message
    );

    return res.status(400).json({
      message:
        err.message ||
        "Unable to fetch product",
    });
  }
};

// ============================================================
// GET /api/products/admin/:id
// ADMIN — any product including inactive
// ============================================================

const getAdminProduct = async (
  req,
  res
) => {
  try {
    const id =
      validateObjectId(
        req.params.id,
        "product ID"
      );

    const product =
      await Product.findById(id)
        .populate(
          "category",
          "name slug icon isActive"
        )
        .lean();

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found",
      });
    }

    return res.status(200).json(
      product
    );
  } catch (err) {
    console.error(
      "Get admin product error:",
      err.message
    );

    return res.status(400).json({
      message:
        err.message ||
        "Unable to fetch product",
    });
  }
};

// ============================================================
// POST /api/products
// ADMIN — create product
// ============================================================

const createProduct = async (
  req,
  res
) => {
  try {
    let {
      name,
      brand,
      category,
      description,
      shortSpecs,
      specs,
      features,
      isActive,
      isFeatured,
      tags,
      imageUrl,
    } = req.body;

    // --------------------------------------------------------
    // Basic validation
    // --------------------------------------------------------

    name = validateText(
      name,
      "Product name",
      2,
      200
    );

    brand = validateText(
      brand,
      "Brand",
      1,
      100
    );

    description =
      validateText(
        description,
        "Description",
        1,
        5000
      );

    validateObjectId(
      category,
      "category ID"
    );

    // New products can only use active categories
    const categoryExists =
      await Category.exists({
        _id: category,
        isActive: true,
      });

    if (!categoryExists) {
      return res.status(400).json({
        message:
          "Selected category does not exist or is inactive",
      });
    }

    // --------------------------------------------------------
    // Parse arrays / objects
    // --------------------------------------------------------

    shortSpecs =
      parseJSONField(
        shortSpecs,
        []
      );

    features =
      parseJSONField(
        features,
        []
      );

    specs =
      parseJSONField(
        specs,
        {}
      );

    tags =
      parseJSONField(
        tags,
        []
      );

    shortSpecs =
      validateStringArray(
        shortSpecs,
        "Short specifications"
      );

    features =
      validateStringArray(
        features,
        "Features"
      );

    tags =
      validateStringArray(
        tags,
        "Tags"
      );

    // --------------------------------------------------------
    // Specifications
    // --------------------------------------------------------

    if (
      typeof specs !==
        "object" ||
      Array.isArray(specs) ||
      specs === null
    ) {
      return res.status(400).json({
        message:
          "Specifications must be an object",
      });
    }

    const safeSpecs = {};
    const specKeys =
      Object.keys(specs);

    if (specKeys.length > 100) {
      return res.status(400).json({
        message:
          "Too many specifications",
      });
    }

    for (const key of specKeys) {
      const cleanKey =
        key.trim();

      if (
        !cleanKey ||
        cleanKey.length > 100 ||
        cleanKey.startsWith("$") ||
        cleanKey.includes(".")
      ) {
        return res.status(400).json({
          message:
            "Invalid specification name",
        });
      }

      if (
        typeof specs[key] !==
        "string"
      ) {
        return res.status(400).json({
          message:
            "Specification values must be strings",
        });
      }

      safeSpecs[cleanKey] =
        specs[key]
          .trim()
          .slice(0, 500);
    }

    // --------------------------------------------------------
    // Boolean fields
    // --------------------------------------------------------

    if (isActive !== undefined) {
      isActive =
        parseBoolean(
          isActive,
          "isActive"
        );
    } else {
      isActive = true;
    }

    if (isFeatured !== undefined) {
      isFeatured =
        parseBoolean(
          isFeatured,
          "isFeatured"
        );
    } else {
      isFeatured = false;
    }

    // --------------------------------------------------------
    // Image
    // --------------------------------------------------------

    let image = "";

    if (req.file) {
      image =
        `/uploads/${req.file.filename}`;
    } else if (
      imageUrl !== undefined &&
      imageUrl !== ""
    ) {
      if (
        typeof imageUrl !==
        "string"
      ) {
        return res.status(400).json({
          message:
            "Invalid image URL",
        });
      }

      const cleanUrl =
        imageUrl.trim();

      try {
        const url =
          new URL(cleanUrl);

        if (
          url.protocol !==
            "http:" &&
          url.protocol !==
            "https:"
        ) {
          return res.status(400).json({
            message:
              "Invalid image URL",
          });
        }

        image = cleanUrl;
      } catch {
        return res.status(400).json({
          message:
            "Invalid image URL",
        });
      }
    }

    // --------------------------------------------------------
    // Create
    // --------------------------------------------------------

    const product =
      await Product.create({
        name,
        brand,
        category,
        description,
        shortSpecs,
        specs: safeSpecs,
        features,
        image,
        isActive,
        isFeatured,
        tags,
      });

    const populated =
      await product.populate(
        "category",
        "name slug icon isActive"
      );

    return res.status(201).json(
      populated
    );
  } catch (err) {
    console.error(
      "Create product error:",
      err.message
    );

    return res.status(400).json({
      message:
        err.message ||
        "Unable to create product",
    });
  }
};

// ============================================================
// PUT /api/products/:id
// ADMIN — update product
// ============================================================

const updateProduct = async (
  req,
  res
) => {
  let newUploadedFile = null;
  let oldImagePath = null;

  try {
    const id =
      validateObjectId(
        req.params.id,
        "product ID"
      );

    let {
      name,
      brand,
      category,
      description,
      shortSpecs,
      specs,
      features,
      isActive,
      isFeatured,
      tags,
      imageUrl,
    } = req.body;

    // --------------------------------------------------------
    // Find existing product
    // --------------------------------------------------------

    const existing =
      await Product.findById(id);

    if (!existing) {
      return res.status(404).json({
        message:
          "Product not found",
      });
    }

    const updateData = {};

    // --------------------------------------------------------
    // Text fields
    // --------------------------------------------------------

    if (name !== undefined) {
      updateData.name =
        validateText(
          name,
          "Product name",
          2,
          200
        );
    }

    if (brand !== undefined) {
      updateData.brand =
        validateText(
          brand,
          "Brand",
          1,
          100
        );
    }

    if (description !== undefined) {
      updateData.description =
        validateText(
          description,
          "Description",
          1,
          5000
        );
    }

    // --------------------------------------------------------
    // Category
    // --------------------------------------------------------

    if (category !== undefined) {
      validateObjectId(
        category,
        "category ID"
      );

      const selectedCategory =
        await Category.findById(
          category
        )
          .select(
            "_id isActive"
          )
          .lean();

      if (!selectedCategory) {
        return res.status(400).json({
          message:
            "Selected category does not exist",
        });
      }

      const currentCategoryId =
        existing.category?.toString();

      const selectedCategoryId =
        selectedCategory._id.toString();

      const isSameCategory =
        currentCategoryId ===
        selectedCategoryId;

      // Same inactive category → ALLOW
      // New active category → ALLOW
      // Different inactive category → REJECT

      if (
        !selectedCategory.isActive &&
        !isSameCategory
      ) {
        return res.status(400).json({
          message:
            "Selected category is inactive. Please select an active category.",
        });
      }

      updateData.category =
        category;
    }

    // --------------------------------------------------------
    // Short specifications
    // --------------------------------------------------------

    if (
      shortSpecs !== undefined
    ) {
      shortSpecs =
        parseJSONField(
          shortSpecs,
          []
        );

      updateData.shortSpecs =
        validateStringArray(
          shortSpecs,
          "Short specifications"
        );
    }

    // --------------------------------------------------------
    // Features
    // --------------------------------------------------------

    if (
      features !== undefined
    ) {
      features =
        parseJSONField(
          features,
          []
        );

      updateData.features =
        validateStringArray(
          features,
          "Features"
        );
    }

    // --------------------------------------------------------
    // Tags
    // --------------------------------------------------------

    if (tags !== undefined) {
      tags =
        parseJSONField(
          tags,
          []
        );

      updateData.tags =
        validateStringArray(
          tags,
          "Tags"
        );
    }

    // --------------------------------------------------------
    // Specifications
    // --------------------------------------------------------

    if (specs !== undefined) {
      specs =
        parseJSONField(
          specs,
          {}
        );

      if (
        typeof specs !==
          "object" ||
        Array.isArray(specs) ||
        specs === null
      ) {
        return res.status(400).json({
          message:
            "Specifications must be an object",
        });
      }

      const safeSpecs = {};
      const specKeys =
        Object.keys(specs);

      if (specKeys.length > 100) {
        return res.status(400).json({
          message:
            "Too many specifications",
        });
      }

      for (const key of specKeys) {
        const cleanKey =
          key.trim();

        if (
          !cleanKey ||
          cleanKey.length > 100 ||
          cleanKey.startsWith("$") ||
          cleanKey.includes(".")
        ) {
          return res.status(400).json({
            message:
              "Invalid specification name",
          });
        }

        if (
          typeof specs[key] !==
          "string"
        ) {
          return res.status(400).json({
            message:
              "Specification values must be strings",
          });
        }

        safeSpecs[cleanKey] =
          specs[key]
            .trim()
            .slice(0, 500);
      }

      updateData.specs =
        safeSpecs;
    }

    // --------------------------------------------------------
    // Boolean fields
    // --------------------------------------------------------

    if (isActive !== undefined) {
      updateData.isActive =
        parseBoolean(
          isActive,
          "isActive"
        );
    }

    if (
      isFeatured !== undefined
    ) {
      updateData.isFeatured =
        parseBoolean(
          isFeatured,
          "isFeatured"
        );
    }

    // --------------------------------------------------------
    // Image
    // --------------------------------------------------------

    if (req.file) {
      newUploadedFile =
        req.file.filename;

      updateData.image =
        `/uploads/${req.file.filename}`;

      // Store old image path.
      // We delete it ONLY after
      // database update succeeds.

      if (
        existing.image &&
        existing.image.startsWith(
          "/uploads/"
        )
      ) {
        const oldFilename =
          path.basename(
            existing.image
          );

        oldImagePath =
          path.join(
            __dirname,
            "..",
            "uploads",
            oldFilename
          );
      }
    } else if (
      imageUrl !== undefined
    ) {
      if (
        typeof imageUrl !==
        "string"
      ) {
        return res.status(400).json({
          message:
            "Invalid image URL",
        });
      }

      const cleanUrl =
        imageUrl.trim();

      if (cleanUrl === "") {
        updateData.image = "";
      } else {
        try {
          const url =
            new URL(cleanUrl);

          if (
            url.protocol !==
              "http:" &&
            url.protocol !==
              "https:"
          ) {
            return res.status(400).json({
              message:
                "Invalid image URL",
            });
          }

          updateData.image =
            cleanUrl;
        } catch {
          return res.status(400).json({
            message:
              "Invalid image URL",
          });
        }
      }
    }

    // --------------------------------------------------------
    // Update database FIRST
    // --------------------------------------------------------

    const product =
      await Product.findByIdAndUpdate(
        id,
        updateData,
        {
          returnDocument: "after",
          runValidators: true,
        }
      ).populate(
        "category",
        "name slug icon isActive"
      );

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found",
      });
    }

    // --------------------------------------------------------
    // Database update succeeded
    // Delete old image
    // --------------------------------------------------------

    if (
      oldImagePath &&
      fs.existsSync(oldImagePath)
    ) {
      try {
        fs.unlinkSync(
          oldImagePath
        );
      } catch (fileError) {
        console.error(
          "Unable to delete old image:",
          fileError.message
        );
      }
    }

    return res.status(200).json(
      product
    );
  } catch (err) {
    console.error(
      "Update product error:",
      err.message
    );

    // --------------------------------------------------------
    // Database update failed
    // Remove newly uploaded image
    // --------------------------------------------------------

    if (newUploadedFile) {
      const newImagePath =
        path.join(
          __dirname,
          "..",
          "uploads",
          path.basename(
            newUploadedFile
          )
        );

      if (
        fs.existsSync(
          newImagePath
        )
      ) {
        try {
          fs.unlinkSync(
            newImagePath
          );
        } catch (cleanupError) {
          console.error(
            "Unable to clean up uploaded image:",
            cleanupError.message
          );
        }
      }
    }

    return res.status(400).json({
      message:
        err.message ||
        "Unable to update product",
    });
  }
};

// ============================================================
// DELETE /api/products/:id
// ADMIN — delete product
// ============================================================

const deleteProduct = async (
  req,
  res
) => {
  try {
    const id =
      validateObjectId(
        req.params.id,
        "product ID"
      );

    const product =
      await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found",
      });
    }

    if (
      product.image &&
      product.image.startsWith(
        "/uploads/"
      )
    ) {
      const filename =
        path.basename(
          product.image
        );

      const imagePath =
        path.join(
          __dirname,
          "..",
          "uploads",
          filename
        );

      if (
        fs.existsSync(imagePath)
      ) {
        fs.unlinkSync(
          imagePath
        );
      }
    }

    await product.deleteOne();

    return res.status(200).json({
      message:
        "Product deleted successfully",
    });
  } catch (err) {
    console.error(
      "Delete product error:",
      err.message
    );

    return res.status(400).json({
      message:
        err.message ||
        "Unable to delete product",
    });
  }
};

// ============================================================
// GET /api/products/admin/stats
// ADMIN — dashboard statistics
// ============================================================

const getStats = async (
  req,
  res
) => {
  try {
    const [
      totalProducts,
      activeProducts,
      featuredProducts,
      totalCategories,
    ] = await Promise.all([
      Product.countDocuments(),

      Product.countDocuments({
        isActive: true,
      }),

      Product.countDocuments({
        isFeatured: true,
      }),

      Category.countDocuments(),
    ]);

    return res.status(200).json({
      totalProducts,
      activeProducts,
      featuredProducts,
      totalCategories,
    });
  } catch (err) {
    console.error(
      "Get product stats error:",
      err.message
    );

    return res.status(500).json({
      message:
        "Unable to fetch statistics",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  getProducts,
  getAdminProducts,
  getAdminProduct,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getStats,
};