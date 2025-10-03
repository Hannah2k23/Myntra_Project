// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const products = require('./products.json');

const tryonRoutes = require('./routes/tryon');
const completeMyLookRoutes = require('./routes/complete-my-look');

const app = express();
app.use(cors());
app.use(express.json());

// Serve product images & other static assets
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Serve generated uploads (try-on outputs)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve segmentation outputs
app.use('/segmentation', express.static(path.join(__dirname, 'segmentation')));

// API endpoints
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const p = products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// Try-on route
app.use('/api/tryon', tryonRoutes);

// Complete My Look route
app.use('/api/analyze', completeMyLookRoutes);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
