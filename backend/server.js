// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const products = require("./products.json");

// Try-on routes
const tryonRoutes = require("./routes/tryon");

// Auth controllers (expects controllers/authController.js to export loginUser, registerUser)
const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Serve product images & other static assets
app.use("/images", express.static(path.join(__dirname, "public", "images")));

// Serve generated uploads (try-on outputs)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API endpoints
app.get("/api/products", (req, res) => {
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const p = products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

//auth route

app.use("/api/auth", authRoutes); 

// Try-on route
app.use("/api/tryon", tryonRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
