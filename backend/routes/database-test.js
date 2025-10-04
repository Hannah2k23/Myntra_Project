const express = require('express');
const { testConnection, inspectProductsTable } = require('../utils/databaseUtils');
const { 
  getRecommendedProducts, 
  getComplementaryProducts, 
  getColorCompatibleProducts 
} = require('../controllers/productRecommendations');

const router = express.Router();

// Test database connection
router.get('/test-connection', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({ 
        success: true, 
        message: 'Database connected successfully!' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Database connection failed' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Inspect existing products table
router.get('/inspect-products', async (req, res) => {
  try {
    const inspection = await inspectProductsTable();
    res.json({
      success: true,
      data: inspection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test product recommendations with sample data
router.post('/test-recommendations', async (req, res) => {
  try {
    const {
      category = 'top',
      materials = ['cotton', 'cotton blend'],
      budget = { min: 500, max: 2000 },
      subcategories = ['t-shirt', 'shirt']
    } = req.body;

    console.log('🧪 Testing product recommendations with:', {
      category,
      materials,
      budget,
      subcategories
    });

    const products = await getRecommendedProducts({
      category,
      materials,
      budget,
      subcategories
    });

    res.json({
      success: true,
      message: `Found ${products.length} products`,
      filters_used: { category, materials, budget, subcategories },
      products: products
    });

  } catch (error) {
    console.error('❌ Test recommendations error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  }
});

// Test complementary products
router.post('/test-complementary', async (req, res) => {
  try {
    const {
      uploadedCategory = 'top',
      materials = ['cotton'],
      budget = { min: 500, max: 2000 },
      styles = {
        bottom_wear: ['jeans', 'pants'],
        footwear: ['sneakers', 'shoes'],
        accessories: ['bag', 'watch']
      }
    } = req.body;

    const complementaryCategories = ['top', 'bottom', 'footwear', 'accessory'];

    const complementaryProducts = await getComplementaryProducts({
      uploadedCategory,
      complementaryCategories,
      materials,
      budget,
      styles
    });

    res.json({
      success: true,
      message: 'Complementary products fetched',
      filters_used: { uploadedCategory, materials, budget, styles },
      complementary_products: complementaryProducts
    });

  } catch (error) {
    console.error('❌ Test complementary error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;