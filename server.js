// server.js — Main Express application entry point

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

require("dotenv").config();

const app = express();

// ============================================================
// ENVIRONMENT
// ============================================================

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Required environment variables
const requiredEnv = ["MONGO_URI", "JWT_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// ============================================================
// TRUST PROXY
// ============================================================
//
// Render / Vercel / other reverse proxies sit in front of
// Express. This allows rate-limit middleware to correctly
// determine the original client IP.
//
// ============================================================

if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ============================================================
// SECURITY — HTTP HEADERS
// ============================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },

    // Prevent browsers from MIME-sniffing responses
    noSniff: true,

    // Reduce information leakage
    hidePoweredBy: true,
  }),
);

// ============================================================
// CORS — ALLOWED FRONTENDS ONLY
// ============================================================

const allowedOrigins = [
  
  // "http://localhost:5173",
  // "http://localhost:5174",
  "https://gurukrupa-frontend.vercel.app",
  "https://gurukrupa-admin.vercel.app",
  "https://gurukrupaenterprises.co.in",
  "https://www.gurukrupaenterprises.co.in",
];

// Allow localhost only during development
if (NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:5173", "http://localhost:5174");
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without Origin:
      // Postman, curl, server-to-server, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ============================================================
// REQUEST BODY LIMITS
// ============================================================

app.use(
  express.json({
    limit: "1mb",
    strict: true,
  }),
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
    parameterLimit: 100,
  }),
);

// ============================================================
// GENERAL API RATE LIMIT
// ============================================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  // General API:
  // Maximum 300 requests per IP / 15 minutes
  max: 300,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// ============================================================
// AUTH RATE LIMIT
// ============================================================
//
// Login is much more sensitive than normal API requests.
//
// 10 login attempts per 15 minutes per IP.
//
// This does NOT replace JWT authentication.
// It simply reduces brute-force attempts.
//

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 10,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    message: "Too many login attempts. Please try again later.",
  },
});

app.use("/api/auth/login", authLimiter);

// ============================================================
// STATIC UPLOADED IMAGES
// ============================================================

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    index: false,
    dotfiles: "deny",
    fallthrough: false,
  }),
);

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/products", require("./routes/productRoutes"));

app.use("/api/categories", require("./routes/categoryRoutes"));

app.use("/api/maintenance", require("./routes/maintenanceRoutes"));

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    status: "OK",
    message: "Gurukrupa API running",
  });
});

// ============================================================
// 404 — UNKNOWN API ROUTE
// ============================================================

app.use((req, res) => {
  return res.status(404).json({
    message: "API endpoint not found",
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);

  // ----------------------------------------------------------
  // CORS error
  // ----------------------------------------------------------

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      message: "Access denied",
    });
  }

  // ----------------------------------------------------------
  // Multer errors
  // ----------------------------------------------------------

  if (err.name === "MulterError") {
    return res.status(400).json({
      message: "File upload error",
    });
  }

  // ----------------------------------------------------------
  // File filter error
  // ----------------------------------------------------------

  if (err.message && err.message.includes("Only image files are allowed")) {
    return res.status(400).json({
      message: err.message,
    });
  }

  // ----------------------------------------------------------
  // JSON parsing error
  // ----------------------------------------------------------

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      message: "Invalid JSON request body",
    });
  }

  // ----------------------------------------------------------
  // Generic error
  // ----------------------------------------------------------

  return res.status(500).json({
    message: "Internal server error",
  });
});

// ============================================================
// MONGODB CONNECTION
// ============================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);

    process.exit(1);
  });
