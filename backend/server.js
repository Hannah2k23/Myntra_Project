// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");

// Routes
const tryonRoutes = require("./routes/tryon");
const authRoutes = require("./routes/auth");
const completeMyLookRoutes = require("./routes/complete-my-look");
const databaseTestRoutes = require("./routes/database-test");
const integrationTestRoutes = require("./routes/test-integration");
const productRoutes = require("./routes/productRoutes");
const auth = require("./middlewares/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Postgres pool (directly here instead of db.js)
const pool = new Pool({
  connectionString: process.env.POSTGRESQL_DB_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

// Attach pool to app locals (so controllers can access it)
app.locals.pool = pool;

// Static assets
app.use("/images", express.static(path.join(__dirname, "public", "images")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/segmentation", express.static(path.join(__dirname, "segmentation")));

// API Routes
app.use("/api/products", productRoutes); 
app.use("/api/auth", authRoutes);
app.use("/api/tryon",auth,tryonRoutes);
app.use("/api/analyze", auth,completeMyLookRoutes);
app.use("/api/database", databaseTestRoutes);
app.use("/api/test", integrationTestRoutes);
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
