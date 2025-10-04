-- Products table schema for Myntra Project
-- This table stores all product information needed for recommendations

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    discounted_price DECIMAL(10,2),
    discount_percentage INTEGER,
    category VARCHAR(50) NOT NULL, -- 'top', 'bottom', 'footwear', 'accessory'
    subcategory VARCHAR(100), -- 'crop top', 'skinny jeans', 'sneakers', etc.
    material VARCHAR(200), -- 'cotton', 'denim', 'leather', 'cotton blend'
    description TEXT,
    image_url VARCHAR(500),
    rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    available_sizes TEXT[], -- Array of sizes like ['S', 'M', 'L', 'XL']
    colors TEXT[], -- Array of colors like ['red', 'blue', 'black']
    tags TEXT[], -- Additional tags for better search
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_discounted_price ON products(discounted_price);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_material ON products USING GIN(to_tsvector('english', material));
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products USING GIN(to_tsvector('english', subcategory));
CREATE INDEX IF NOT EXISTS idx_products_colors ON products USING GIN(colors);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = TRUE;

-- Sample data insertion (you can modify these according to your needs)
INSERT INTO products (title, brand, price, discounted_price, discount_percentage, category, subcategory, material, description, image_url, rating, rating_count, available_sizes, colors) VALUES
-- Upper Wear
('Cotton Crop Top', 'StyleCo', 899.00, 674.25, 25, 'top', 'crop top', 'cotton', 'Comfortable cotton crop top perfect for casual wear', '/images/crop-top-1.jpg', 4.2, 150, ARRAY['S', 'M', 'L'], ARRAY['white', 'black', 'pink']),
('Oversized Hoodie', 'ComfortWear', 1599.00, 1199.25, 25, 'top', 'hoodie', 'cotton blend', 'Cozy oversized hoodie for cool weather', '/images/hoodie-1.jpg', 4.5, 200, ARRAY['M', 'L', 'XL'], ARRAY['grey', 'black', 'navy']),
('Silk Blouse', 'Elegance', 2499.00, 1999.20, 20, 'top', 'blouse', 'silk', 'Elegant silk blouse for formal occasions', '/images/blouse-1.jpg', 4.3, 80, ARRAY['S', 'M', 'L'], ARRAY['white', 'cream', 'light blue']),

-- Bottom Wear  
('Skinny Fit Jeans', 'DenimCo', 1899.00, 1329.30, 30, 'bottom', 'skinny jeans', 'denim', 'High-quality skinny fit jeans with stretch', '/images/skinny-jeans-1.jpg', 4.4, 300, ARRAY['28', '30', '32', '34'], ARRAY['blue', 'black', 'grey']),
('Palazzo Pants', 'FlowStyle', 1299.00, 974.25, 25, 'bottom', 'palazzo', 'rayon', 'Comfortable flowy palazzo pants', '/images/palazzo-1.jpg', 4.1, 120, ARRAY['S', 'M', 'L', 'XL'], ARRAY['black', 'navy', 'maroon']),
('Formal Trousers', 'OfficePro', 2199.00, 1759.20, 20, 'bottom', 'trousers', 'polyester blend', 'Professional formal trousers', '/images/trousers-1.jpg', 4.0, 90, ARRAY['28', '30', '32', '34'], ARRAY['black', 'grey', 'navy']),

-- Footwear
('Canvas Sneakers', 'ShoeCo', 1699.00, 1189.30, 30, 'footwear', 'sneakers', 'canvas', 'Comfortable canvas sneakers for daily wear', '/images/sneakers-1.jpg', 4.3, 180, ARRAY['6', '7', '8', '9', '10'], ARRAY['white', 'black', 'red']),
('Leather Boots', 'BootMaster', 3499.00, 2449.30, 30, 'footwear', 'boots', 'leather', 'Genuine leather boots for winter', '/images/boots-1.jpg', 4.6, 95, ARRAY['6', '7', '8', '9'], ARRAY['brown', 'black']),
('Casual Sandals', 'ComfortStep', 999.00, 699.30, 30, 'footwear', 'sandals', 'synthetic', 'Lightweight casual sandals', '/images/sandals-1.jpg', 3.9, 60, ARRAY['6', '7', '8', '9'], ARRAY['black', 'brown', 'blue']),

-- Accessories
('Leather Handbag', 'LuxeBags', 2999.00, 2099.30, 30, 'accessory', 'handbag', 'leather', 'Premium leather handbag', '/images/handbag-1.jpg', 4.4, 70, ARRAY['One Size'], ARRAY['black', 'brown', 'tan']),
('Sunglasses', 'SunStyle', 1299.00, 779.40, 40, 'accessory', 'sunglasses', 'plastic', 'UV protection sunglasses', '/images/sunglasses-1.jpg', 4.2, 150, ARRAY['One Size'], ARRAY['black', 'brown', 'blue']),
('Wrist Watch', 'TimeKeeper', 1899.00, 1329.30, 30, 'accessory', 'watch', 'metal', 'Stylish wrist watch', '/images/watch-1.jpg', 4.1, 85, ARRAY['One Size'], ARRAY['silver', 'gold', 'black']);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();