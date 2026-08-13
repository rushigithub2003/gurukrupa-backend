// middleware/upload.js — Secure Multer image upload configuration

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ============================================================
// UPLOAD DIRECTORY
// ============================================================

const uploadDir = path.join(
  __dirname,
  "..",
  "uploads"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

// ============================================================
// ALLOWED IMAGE TYPES
// ============================================================

const allowedTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

// ============================================================
// ALLOWED FILE EXTENSIONS
// ============================================================

const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
];

// ============================================================
// STORAGE
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension =
      allowedTypes[file.mimetype];

    if (!extension) {
      return cb(
        new Error(
          "Unsupported image type"
        )
      );
    }

    // Generate cryptographically secure random filename
    const randomName =
      crypto
        .randomBytes(24)
        .toString("hex");

    cb(
      null,
      `product-${randomName}${extension}`
    );
  },
});

// ============================================================
// FILE FILTER
// ============================================================

const fileFilter = (
  req,
  file,
  cb
) => {
  // ----------------------------------------------------------
  // Validate original filename
  // ----------------------------------------------------------

  if (
    typeof file.originalname !==
    "string"
  ) {
    return cb(
      new Error(
        "Invalid filename"
      ),
      false
    );
  }

  if (
    file.originalname.length > 255
  ) {
    return cb(
      new Error(
        "Filename is too long"
      ),
      false
    );
  }

  // ----------------------------------------------------------
  // Validate MIME type
  // ----------------------------------------------------------

  const expectedExtension =
    allowedTypes[file.mimetype];

  if (!expectedExtension) {
    return cb(
      new Error(
        "Only JPG, PNG, GIF and WebP images are allowed"
      ),
      false
    );
  }

  // ----------------------------------------------------------
  // Validate original extension
  // ----------------------------------------------------------

  const originalExtension =
    path
      .extname(
        file.originalname
      )
      .toLowerCase();

  if (
    !allowedExtensions.includes(
      originalExtension
    )
  ) {
    return cb(
      new Error(
        "Invalid image file extension"
      ),
      false
    );
  }

  // ----------------------------------------------------------
  // Ensure MIME type and extension agree
  // ----------------------------------------------------------

  const normalizedExtension =
    originalExtension === ".jpeg"
      ? ".jpg"
      : originalExtension;

  if (
    normalizedExtension !==
    expectedExtension
  ) {
    return cb(
      new Error(
        "Image extension does not match its file type"
      ),
      false
    );
  }

  // ----------------------------------------------------------
  // Accept file
  // ----------------------------------------------------------

  cb(null, true);
};

// ============================================================
// MULTER CONFIGURATION
// ============================================================

const upload = multer({
  storage,

  fileFilter,

  limits: {
    // Maximum image size: 5 MB
    fileSize: 5 * 1024 * 1024,

    // Only one file
    files: 1,

    // Maximum size of an individual multipart field
    fieldSize: 1 * 1024 * 1024,

    // Maximum number of non-file fields
    fields: 30,

    // Maximum total multipart parts
    parts: 31,

    // Prevent extremely large field names
    fieldNameSize: 100,

    // Prevent extremely large filenames
    fileNameSize: 255,
  },
});

// ============================================================
// EXPORT
// ============================================================

module.exports = upload;