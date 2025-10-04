const express = require('express');
const { getWeatherBasedRecommendations } = require('../utils/weatherRecommendations');
const { 
  getRecommendedProducts, 
  getComplementaryProducts, 
  getColorCompatibleProducts 
} = require('../controllers/productRecommendations');
const { testConnection, inspectProductsTable } = require('../utils/databaseUtils');

const router = express.Router();

/**
 * Complete flow test: Weather Analysis → SQL Queries → Product Recommendations
 */
router.post('/test-complete-flow', async (req, res) => {
  try {
    const {
      tempC = 25,
      category = 'top', 
      itemDescription = 'crop top',
      budget = { min: 500, max: 2000 }
    } = req.body;

    console.log('🧪 Testing complete flow with:', {
      tempC, category, itemDescription, budget
    });

    // Step 1: Generate weather recommendations (simulate what complete-my-look does)
    const weatherRecommendations = getWeatherBasedRecommendations(tempC, category, itemDescription);
    
    console.log('🌡️ Weather Recommendations Generated:');
    console.log('   Materials:', weatherRecommendations.recommendations.materials);
    console.log('   Styles:', weatherRecommendations.recommendations.styles);
    console.log('   Complementary Items:', weatherRecommendations.recommendations.complementary_items);

    // Step 2: Test SQL queries with weather recommendation data
    console.log('\n🔍 Testing SQL Queries...');

    // Test 1: Get products matching weather recommendations
    const matchingProducts = await getRecommendedProducts({
      category: category,
      materials: weatherRecommendations.recommendations.materials,
      budget: budget,
      subcategories: weatherRecommendations.recommendations.styles
    });

    console.log(`✅ Found ${matchingProducts.length} matching products`);

    // Test 2: Get complementary products
    const complementaryCategories = ['top', 'bottom', 'footwear', 'accessory'];
    const complementaryProducts = await getComplementaryProducts({
      uploadedCategory: category,
      complementaryCategories: complementaryCategories,
      materials: weatherRecommendations.recommendations.materials,
      budget: budget,
      styles: weatherRecommendations.recommendations.complementary_items
    });

    console.log('✅ Complementary products fetched');

    // Test 3: Simulate color-compatible products (with dummy color data)
    const dummyColorData = {
      dominantColor: '#FF5733',
      recommendedColors: {
        lighter_shade: { hex: '#FF8A65' },
        darker_shade: { hex: '#D32F2F' },
        complementary: { hex: '#33FF57' }
      }
    };

    const colorCompatibleProducts = await getColorCompatibleProducts({
      dominantColor: dummyColorData.dominantColor,
      recommendedColors: dummyColorData.recommendedColors,
      budget: budget
    });

    console.log(`✅ Found ${colorCompatibleProducts.length} color-compatible products`);

    // Return comprehensive results
    res.json({
      success: true,
      test_input: {
        temperature: tempC,
        category: category,
        item_description: itemDescription,
        budget: budget
      },
      weather_analysis: {
        weather_category: weatherRecommendations.weather_category,
        materials: weatherRecommendations.recommendations.materials,
        styles: weatherRecommendations.recommendations.styles,
        complementary_items: weatherRecommendations.recommendations.complementary_items,
        features: weatherRecommendations.recommendations.features,
        avoid: weatherRecommendations.recommendations.avoid
      },
      sql_query_results: {
        matching_products: {
          count: matchingProducts.length,
          sample: matchingProducts.slice(0, 3), // Show first 3 products
          query_filters_used: {
            category: category,
            materials: weatherRecommendations.recommendations.materials,
            subcategories: weatherRecommendations.recommendations.styles,
            budget: budget
          }
        },
        complementary_products: {
          categories: Object.keys(complementaryProducts),
          counts: Object.fromEntries(
            Object.entries(complementaryProducts).map(([cat, products]) => [cat, products.length])
          ),
          sample: Object.fromEntries(
            Object.entries(complementaryProducts).map(([cat, products]) => [cat, products.slice(0, 2)])
          )
        },
        color_compatible_products: {
          count: colorCompatibleProducts.length,
          sample: colorCompatibleProducts.slice(0, 3),
          color_filters_used: dummyColorData
        }
      },
      summary: {
        total_matching_products: matchingProducts.length,
        complementary_categories_found: Object.keys(complementaryProducts).length,
        color_compatible_products: colorCompatibleProducts.length,
        sql_queries_executed: 3,
        all_queries_successful: true
      }
    });

  } catch (error) {
    console.error('❌ Complete flow test error:', error);
    res.status(500).json({
      success: false,
      message: 'Complete flow test failed',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * Test with different weather scenarios
 */
router.get('/test-weather-scenarios', async (req, res) => {
  try {
    const scenarios = [
      { tempC: 5, category: 'top', description: 'oversized hoodie', name: 'Very Cold Weather' },
      { tempC: 15, category: 'bottom', description: 'skinny jeans', name: 'Cool Weather' },
      { tempC: 25, category: 'top', description: 'crop top', name: 'Warm Weather' },
      { tempC: 35, category: 'footwear', description: 'sandals', name: 'Hot Weather' }
    ];

    const budget = { min: 500, max: 2000 };
    const results = {};

    for (const scenario of scenarios) {
      console.log(`\n🌡️ Testing scenario: ${scenario.name}`);
      
      const weatherRec = getWeatherBasedRecommendations(scenario.tempC, scenario.category, scenario.description);
      
      const products = await getRecommendedProducts({
        category: scenario.category,
        materials: weatherRec.recommendations.materials,
        budget: budget,
        subcategories: weatherRec.recommendations.styles
      });

      results[scenario.name] = {
        input: scenario,
        weather_recommendations: {
          materials: weatherRec.recommendations.materials,
          styles: weatherRec.recommendations.styles,
          features: weatherRec.recommendations.features
        },
        products_found: products.length,
        sample_products: products.slice(0, 2)
      };
    }

    res.json({
      success: true,
      message: 'Weather scenario testing completed',
      scenarios: results
    });

  } catch (error) {
    console.error('❌ Weather scenarios test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;