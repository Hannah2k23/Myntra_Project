# Product Recommendations Setup

## Database Setup

### 1. Environment Configuration
The `.env` file has been created in the backend directory. You need to add your PostgreSQL database URL:

```bash
# Update this with your actual PostgreSQL URL
POSTGRESQL_DB_URL=your_postgresql_database_url_here
JWT_SECRET=your_jwt_secret_here
```

### 2. Database Schema
Run the SQL commands in `backend/database/schema.sql` to create the products table and sample data.

## Key SQL Queries Used

### 1. Main Product Recommendation Query
```sql
SELECT 
  id, title, brand, price, discounted_price, discount_percentage,
  category, subcategory, material, description, image_url,
  rating, rating_count, available_sizes, colors, created_at
FROM products 
WHERE 
  LOWER(category) = LOWER($1)  -- Filter by category
  AND COALESCE(discounted_price, price) BETWEEN $2 AND $3  -- Budget filter
  AND (
    LOWER(material) LIKE LOWER($4) OR LOWER(description) LIKE LOWER($4)  -- Material filter
    -- Additional material conditions...
  )
  AND (
    LOWER(subcategory) LIKE LOWER($5) OR LOWER(title) LIKE LOWER($5)  -- Style/subcategory filter  
    -- Additional subcategory conditions...
  )
ORDER BY 
  CASE WHEN discounted_price IS NOT NULL THEN discounted_price ELSE price END ASC,
  rating DESC,
  rating_count DESC
LIMIT 50;
```

### 2. Complementary Products Query
```sql
-- Similar query but for different categories than the uploaded item
-- Example: If user uploaded 'top', search for 'bottom', 'footwear', 'accessory'
SELECT * FROM products 
WHERE category IN ('bottom', 'footwear', 'accessory')
  AND COALESCE(discounted_price, price) BETWEEN $1 AND $2
  AND (material filters based on weather recommendations)
  AND (style filters based on complementary recommendations)
```

### 3. Color-Compatible Products Query
```sql
SELECT * FROM products 
WHERE 
  COALESCE(discounted_price, price) BETWEEN $1 AND $2
  AND (
    LOWER(colors) LIKE LOWER($3) OR 
    LOWER(description) LIKE LOWER($3) OR 
    LOWER(title) LIKE LOWER($3)
  )
ORDER BY rating DESC, rating_count DESC
LIMIT 20;
```

## How It Works

### 1. Weather Analysis Integration
- Weather recommendations provide: `materials`, `styles`, `features`, `complementary_items`
- These are used as filter criteria for the database queries

### 2. Three Types of Recommendations
1. **Matching Products**: Items in the same category as uploaded item, matching weather recommendations
2. **Complementary Products**: Items in other categories that pair well with the uploaded item
3. **Color-Compatible Products**: Items that match the extracted color palette

### 3. Response Structure
```json
{
  "success": true,
  "session_id": "cml_1234567890_abc123",
  "analysis": {
    "uploaded_category": "top",
    "item_description": "crop top",
    "weather_recommendations": { /* weather analysis */ },
    "color_analysis": { /* color extraction results */ }
  },
  "product_recommendations": {
    "matching_products": [ /* products matching weather + budget + category */ ],
    "complementary_products": {
      "bottom_wear": [ /* complementary bottom wear */ ],
      "footwear": [ /* complementary footwear */ ],
      "accessories": [ /* complementary accessories */ ]
    },
    "color_compatible_products": [ /* products matching color palette */ ]
  }
}
```

## Database Indexes
The schema includes optimized indexes for:
- Category filtering
- Price range queries  
- Material text search (GIN index)
- Subcategory text search (GIN index)
- Color array searches
- Rating-based sorting

## Next Steps
1. Add your PostgreSQL URL to `.env`
2. Run the schema.sql to create tables
3. Test the complete-my-look endpoint
4. Add more sample products as needed