const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.POSTGRESQL_DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Get product recommendations based on weather analysis
 * @param {Object} filters - Filter criteria from weather recommendations
 * @param {string} filters.category - Product category (top, bottom, footwear, accessory)
 * @param {Array} filters.materials - Array of recommended materials
 * @param {Object} filters.budget - Budget range {min, max}
 * @param {Array} filters.subcategories - Array of recommended subcategories/styles
 * @returns {Promise<Array>} - Array of recommended products
 */
const getRecommendedProducts = async (filters) => {
  try {
    const { category, materials, budget, subcategories } = filters;

    // Base SQL query - using your actual column names
    let query = `
      SELECT 
        product_id,
        name,
        brand,
        price,
        mrp,
        discount_text,
        category,
        sub_category,
        material,
        occasion,
        image_url,
        rating,
        rating_count,
        color,
        hex_color,
        stock,
        popularity_score,
        created_at
      FROM products 
      WHERE 1=1
    `;
    
    let queryParams = [];
    let paramIndex = 1;

    // Filter by category
    if (category) {
      query += ` AND LOWER(category) = LOWER($${paramIndex})`;
      queryParams.push(category);
      paramIndex++;
    }

    // Filter by budget (use price, which is the selling price in your DB)
    if (budget && budget.min !== undefined && budget.max !== undefined) {
      query += ` AND price BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      queryParams.push(budget.min, budget.max);
      paramIndex += 2;
    }

    // Filter by materials (only for upper wear and bottom wear categories)
    const categoryLower = category ? category.toLowerCase() : '';
    const shouldApplyMaterialFilter = ['top', 'bottom', 'upper wear', 'bottom wear', 'bottoms'].includes(categoryLower);
    
    if (materials && materials.length > 0 && shouldApplyMaterialFilter) {
      const materialConditions = materials.map((_, index) => {
        return `LOWER(material) LIKE LOWER($${paramIndex + index}) OR LOWER(name) LIKE LOWER($${paramIndex + index})`;
      }).join(' OR ');
      
      query += ` AND (${materialConditions})`;
      
      // Add material parameters with wildcards
      materials.forEach(material => {
        queryParams.push(`%${material}%`);
      });
      paramIndex += materials.length;
      
      console.log(`🧵 Applied material filter for category: ${category}`);
    } else if (materials && materials.length > 0) {
      console.log(`👟 Skipped material filter for category: ${category} (footwear/accessories)`);
    }

    // Filter by subcategories/styles (case-insensitive partial match)
    if (subcategories && subcategories.length > 0) {
      const subcategoryConditions = subcategories.map((_, index) => {
        return `LOWER(sub_category) LIKE LOWER($${paramIndex + index}) OR LOWER(name) LIKE LOWER($${paramIndex + index}) OR LOWER(occasion) LIKE LOWER($${paramIndex + index})`;
      }).join(' OR ');
      
      query += ` AND (${subcategoryConditions})`;
      
      // Add subcategory parameters with wildcards
      subcategories.forEach(subcategory => {
        queryParams.push(`%${subcategory}%`);
      });
      paramIndex += subcategories.length;
    }

    // Order by relevance and rating
    query += ` 
      ORDER BY 
        price ASC,
        rating DESC NULLS LAST,
        rating_count DESC NULLS LAST,
        popularity_score DESC NULLS LAST
      LIMIT 50
    `;

    console.log('🔍 Product Recommendation Query:', query);
    console.log('📊 Query Parameters:', queryParams);

    const result = await pool.query(query, queryParams);
    
    console.log(`Found ${result.rows.length} recommended products`);
    
    return result.rows;

  } catch (error) {
    console.error('Error fetching product recommendations:', error);
    throw error;
  }
};

/**
 * Get complementary product recommendations based on uploaded item category
 * @param {Object} filters - Filter criteria
 * @param {string} filters.uploadedCategory - User's uploaded item category
 * @param {Array} filters.complementaryCategories - Categories to search for complementary items
 * @param {Array} filters.materials - Recommended materials
 * @param {Object} filters.budget - Budget range
 * @param {Array} filters.styles - Recommended styles for each category
 * @returns {Promise<Object>} - Object with complementary products by category
 */
const getComplementaryProducts = async (filters) => {
  try {
    const { uploadedCategory, complementaryCategories, materials, budget, styles } = filters;

    const complementaryProducts = {};

    // Get products for each complementary category
    for (const category of complementaryCategories) {
      if (category !== uploadedCategory) {
        const categoryStyles = styles[category] || [];
        
        const products = await getRecommendedProducts({
          category: category,
          materials: materials,
          budget: budget,
          subcategories: categoryStyles
        });

        complementaryProducts[category] = products.slice(0, 12); // Limit to 12 products per category
      }
    }

    return complementaryProducts;

  } catch (error) {
    console.error('Error fetching complementary products:', error);
    throw error;
  }
};

/**
 * Search products by color compatibility
 * @param {Object} filters - Color filter criteria
 * @param {string} filters.dominantColor - Dominant color hex
 * @param {Array} filters.recommendedColors - Array of recommended color objects
 * @param {Object} filters.budget - Budget range
 * @returns {Promise<Array>} - Array of color-compatible products
 */
const getColorCompatibleProducts = async (filters) => {
  try {
    const { dominantColor, recommendedColors, budget } = filters;

    // Extract color names/hex values for searching
    const colorSearchTerms = [];
    
    if (recommendedColors) {
      Object.values(recommendedColors).forEach(colorObj => {
        if (colorObj.hex) {
          colorSearchTerms.push(colorObj.hex.toLowerCase());
        }
      });
    }

    // Add common color names based on dominant color
    const dominantRgb = hexToRgb(dominantColor);
    if (dominantRgb) {
      const colorName = getColorName(dominantRgb);
      if (colorName) {
        colorSearchTerms.push(colorName);
      }
    }

    let query = `
      SELECT 
        product_id, name, brand, price, mrp, category, sub_category,
        material, image_url, rating, color, hex_color, occasion
      FROM products 
      WHERE 1=1
    `;
    
    let queryParams = [];
    let paramIndex = 1;

    // Filter by budget
    if (budget && budget.min !== undefined && budget.max !== undefined) {
      query += ` AND price BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      queryParams.push(budget.min, budget.max);
      paramIndex += 2;
    }

    // Filter by colors (search in color field and name)
    if (colorSearchTerms.length > 0) {
      const colorConditions = colorSearchTerms.map((_, index) => {
        return `LOWER(color) LIKE LOWER($${paramIndex + index}) OR LOWER(hex_color) LIKE LOWER($${paramIndex + index}) OR LOWER(name) LIKE LOWER($${paramIndex + index})`;
      }).join(' OR ');
      
      query += ` AND (${colorConditions})`;
      
      colorSearchTerms.forEach(color => {
        queryParams.push(`%${color}%`);
      });
      paramIndex += colorSearchTerms.length;
    }

    query += ` ORDER BY rating DESC, rating_count DESC LIMIT 20`;

    const result = await pool.query(query, queryParams);
    return result.rows;

  } catch (error) {
    console.error('Error fetching color-compatible products:', error);
    throw error;
  }
};

// Helper functions
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Calculate color distance between two RGB colors using Euclidean distance
 * @param {Object} rgb1 - First color {r, g, b}
 * @param {Object} rgb2 - Second color {r, g, b}
 * @returns {number} - Distance value (lower = more similar)
 */
const calculateColorDistance = (rgb1, rgb2) => {
  const rDiff = rgb1.r - rgb2.r;
  const gDiff = rgb1.g - rgb2.g;
  const bDiff = rgb1.b - rgb2.b;
  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
};

/**
 * Find closest color match from extracted palette
 * @param {string} productHexColor - Product's hex color
 * @param {Array} extractedColors - Array of extracted color objects with hex values
 * @returns {Object} - {distance, matchedColor, similarity}
 */
const findClosestColorMatch = (productHexColor, extractedColors) => {
  if (!productHexColor || !extractedColors || extractedColors.length === 0) {
    return { distance: Infinity, matchedColor: null, similarity: 0 };
  }

  const productRgb = hexToRgb(productHexColor);
  if (!productRgb) {
    return { distance: Infinity, matchedColor: null, similarity: 0 };
  }

  let minDistance = Infinity;
  let closestColor = null;

  extractedColors.forEach(colorObj => {
    if (colorObj.hex) {
      const extractedRgb = hexToRgb(colorObj.hex);
      if (extractedRgb) {
        const distance = calculateColorDistance(productRgb, extractedRgb);
        if (distance < minDistance) {
          minDistance = distance;
          closestColor = colorObj;
        }
      }
    }
  });

  // Calculate similarity percentage (0-100, where 100 is exact match)
  const maxDistance = Math.sqrt(3 * 255 * 255); // Maximum possible RGB distance
  const similarity = Math.max(0, 100 - (minDistance / maxDistance) * 100);

  return { 
    distance: minDistance, 
    matchedColor: closestColor, 
    similarity: Math.round(similarity * 100) / 100 
  };
};

const getColorName = (rgb) => {
  // Simple color name mapping based on RGB values
  const { r, g, b } = rgb;
  
  if (r > 200 && g > 200 && b > 200) return 'white';
  if (r < 50 && g < 50 && b < 50) return 'black';
  if (r > g && r > b) return 'red';
  if (g > r && g > b) return 'green';
  if (b > r && b > g) return 'blue';
  if (r > 150 && g > 150 && b < 100) return 'yellow';
  if (r > 150 && g < 100 && b > 150) return 'purple';
  if (r < 100 && g > 150 && b > 150) return 'cyan';
  if (r > 150 && g > 100 && b < 100) return 'orange';
  if (r > 100 && g < 100 && b < 100) return 'brown';
  
  return 'neutral';
};

/**
 * Get top 5 color-matched products for each complementary category
 * @param {Object} params - Parameters for color matching
 * @param {string} params.uploadedCategory - User's uploaded item category
 * @param {Array} params.extractedColors - Array of 5 colors from color analysis
 * @param {Object} params.budget - Budget range
 * @param {Object} params.weatherRecommendations - Weather-based recommendations
 * @returns {Promise<Object>} - Top 5 products per category based on color similarity
 */
const getColorMatchedComplementaryProducts = async (params) => {
  try {
    const { uploadedCategory, extractedColors, budget, weatherRecommendations } = params;
    
    console.log('🎨 Starting color-matched complementary product search...');
    console.log('   Extracted colors:', extractedColors?.map(c => c.hex));
    console.log('   Uploaded category:', uploadedCategory);
    
    const results = {};
    
    // Get complementary items from weather recommendations
    const complementaryItems = weatherRecommendations?.recommendations?.complementary_items || {};
    console.log('   Available complementary categories:', Object.keys(complementaryItems));

    // Process each complementary category that has recommendations
    for (const [categoryKey, categoryStyles] of Object.entries(complementaryItems)) {
      // Skip if no styles available for this category
      if (!categoryStyles || categoryStyles.length === 0) {
        console.log(`\n⏭️ Skipping ${categoryKey} - no styles available`);
        continue;
      }
      
      // Map category keys to database categories
      let dbCategory;
      switch(categoryKey.toLowerCase()) {
        case 'upper_wear':
          dbCategory = 'top';
          break;
        case 'bottom_wear':
          dbCategory = 'bottom';
          break;
        case 'footwear':
          dbCategory = 'footwear';
          break;
        case 'accessories':
          dbCategory = 'accessories';
          break;
        default:
          dbCategory = categoryKey;
      }
      
      console.log(`\n🔍 Processing ${categoryKey} -> ${dbCategory} category`);
      console.log(`   Styles for ${categoryKey}:`, categoryStyles);
        
      // Get base products using weather recommendations - DON'T use subcategories filter
      const products = await getRecommendedProducts({
        category: dbCategory,
        materials: weatherRecommendations?.recommendations?.materials || [],
        budget: budget,
        subcategories: [] // Don't filter by subcategories in SQL
      });

      console.log(`   Found ${products.length} base products for ${dbCategory}`);

      if (products.length > 0 && extractedColors && extractedColors.length > 0) {
        // Calculate color similarity for each product
        const productsWithColorMatch = products.map(product => {
          const colorMatch = findClosestColorMatch(product.hex_color || product.color, extractedColors);
          return {
            ...product,
            color_similarity: colorMatch.similarity,
            color_distance: colorMatch.distance,
            matched_extracted_color: colorMatch.matchedColor
          };
        });

        // Sort by color similarity (highest first) and take top 5
        const top5Products = productsWithColorMatch
          .filter(p => p.color_similarity > 0) // Only include products with valid color matches
          .sort((a, b) => b.color_similarity - a.color_similarity)
          .slice(0, 5);

        console.log(`   ✅ Selected top 5 color-matched products for ${categoryKey}`);
        console.log(`   Color similarities: ${top5Products.map(p => `${p.color_similarity}%`).join(', ')}`);

        if (top5Products.length > 0) {
          results[categoryKey] = top5Products;
        }
      }
    }

    console.log(`\n🎯 Color-matched complementary products summary:`);
    Object.entries(results).forEach(([cat, products]) => {
      console.log(`   ${cat}: ${products.length} products (avg similarity: ${Math.round(products.reduce((sum, p) => sum + p.color_similarity, 0) / products.length)}%)`);
    });

    return results;

  } catch (error) {
    console.error('❌ Error in color-matched complementary products:', error);
    throw error;
  }
};

module.exports = {
  getRecommendedProducts,
  getComplementaryProducts,
  getColorCompatibleProducts,
  getColorMatchedComplementaryProducts,
  findClosestColorMatch,
  calculateColorDistance
};