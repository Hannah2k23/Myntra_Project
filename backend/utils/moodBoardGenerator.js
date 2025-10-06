const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create mood board from analysis results
const generateMoodBoard = async (analysisResult, baseUrl = 'http://localhost:4000') => {
  try {
    const sessionId = analysisResult.session_id;
    const outputDir = path.join(__dirname, '..', 'segmentation', 'outputs', sessionId);
    const moodBoardDir = path.join(outputDir, 'moodboard');
    
    // Ensure mood board directory exists
    if (!fs.existsSync(moodBoardDir)) {
      fs.mkdirSync(moodBoardDir, { recursive: true });
    }
    
    // Collection of images to include in mood board
    const images = [];
    
    // 1. Add the uploaded image (cropped version)
    const uploadedImagePath = path.join(outputDir, 'garment_crop.jpg');
    if (fs.existsSync(uploadedImagePath)) {
      images.push({
        type: 'uploaded',
        path: uploadedImagePath,
        title: analysisResult.analysis.item_description || 'Your Item',
        category: analysisResult.analysis.uploaded_category
      });
    }
    
    // 2. Get first image from each recommended category
    const colorMatchedProducts = analysisResult.product_recommendations?.color_matched_products || {};
    const productsByCategory = {};
    
    // Organize products by category and take the first one from each
    Object.entries(colorMatchedProducts).forEach(([category, products]) => {
      if (products && products.length > 0) {
        const firstProduct = products[0];
        productsByCategory[category] = {
          product: firstProduct,
          type: 'product',
          title: firstProduct.name || 'Product',
          brand: firstProduct.brand || 'Brand',
          price: firstProduct.price || 'N/A',
          category: category
        };
      }
    });
    
    // Add products to images array (limit to 4 to ensure good layout)
    const productItems = Object.values(productsByCategory).slice(0, 4);
    productItems.forEach(item => {
      images.push(item);
    });
    
    // 3. Generate mood board layout
    console.log(`🎨 Creating mood board with ${images.length} images`);
    const moodBoard = await createMoodBoardLayout(images, moodBoardDir, analysisResult);
    
    // 4. Generate sharing URL
    const shareUrl = `${baseUrl}/api/moodboard/share/${sessionId}`;
    
    return {
      success: true,
      moodboard_url: `/segmentation/outputs/${sessionId}/moodboard/mood_board.jpg`,
      share_url: shareUrl,
      session_id: sessionId,
      images_count: images.length,
      layout: moodBoard.layout || []
    };
    
  } catch (error) {
    console.error('Mood board generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create Pinterest-style mood board layout
const createMoodBoardLayout = async (images, outputDir, analysisResult) => {
  try {
    // GenZ + Myntra styling configuration
    const config = {
      canvas: {
        width: 800,
        height: 1000,
        backgroundColor: { r: 255, g: 238, b: 248 } // Light pink Myntra-ish background
      },
      margins: 20,
      spacing: 15,
      borderRadius: 12,
      shadows: true
    };
    
    // Process and layout images
    const layout = await layoutImages(images, config, outputDir);
    
    // Create mood board using Sharp compositing
    const finalMoodBoard = await compositeImagesWithSharp(layout, config, analysisResult);
    
    // Save final mood board
    const outputPath = path.join(outputDir, 'mood_board.jpg');
    await finalMoodBoard.jpeg({ quality: 95 }).toFile(outputPath);
    
    return {
      layout: layout,
      path: outputPath,
      dimensions: config.canvas
    };
    
  } catch (error) {
    console.error('Mood board layout creation error:', error);
    throw error;
  }
};

// Layout images in Pinterest-style grid
const layoutImages = async (images, config, outputDir) => {
  const layout = [];
  const contentArea = {
    x: config.margins,
    y: 130, // After header
    width: config.canvas.width - (config.margins * 2),
    height: config.canvas.height - 150 // Leave space for footer
  };
  
  // Define image sizes and positions for Pinterest-style layout
  const positions = [
    // Main uploaded item (larger, top left)
    { x: 0, y: 0, width: 0.48, height: 0.4 },
    // Product 1 (top right)
    { x: 0.52, y: 0, width: 0.48, height: 0.25 },
    // Product 2 (middle right)
    { x: 0.52, y: 0.27, width: 0.48, height: 0.25 },
    // Product 3 (bottom left)
    { x: 0, y: 0.43, width: 0.31, height: 0.35 },
    // Product 4 (bottom middle)
    { x: 0.33, y: 0.43, width: 0.31, height: 0.35 },
    // Product 5 (bottom right)
    { x: 0.67, y: 0.55, width: 0.31, height: 0.23 }
  ];
  
  console.log(`📐 Processing ${images.length} images for layout`);
  
  for (let i = 0; i < Math.min(images.length, positions.length); i++) {
    const image = images[i];
    const pos = positions[i];
    
    try {
      let imagePath;
      
      if (image.type === 'uploaded') {
        // Use local uploaded image
        imagePath = image.path;
        console.log(`📸 Using uploaded image: ${imagePath}`);
      } else if (image.type === 'product') {
        // Try to get product image
        imagePath = await downloadProductImage(image.product, outputDir);
        console.log(`🛍️ Product image for ${image.product.brand}: ${imagePath ? 'Found' : 'Not found'}`);
      }
      
      if (imagePath && fs.existsSync(imagePath)) {
        // Process image for mood board
        const processedImage = await processImageForMoodBoard(imagePath, {
          width: Math.floor(contentArea.width * pos.width),
          height: Math.floor(contentArea.height * pos.height)
        });
        
        layout.push({
          ...image,
          processed_path: processedImage,
          position: {
            x: contentArea.x + Math.floor(contentArea.width * pos.x),
            y: contentArea.y + Math.floor(contentArea.height * pos.y),
            width: Math.floor(contentArea.width * pos.width),
            height: Math.floor(contentArea.height * pos.height)
          }
        });
        
        console.log(`✅ Added image ${i + 1} to layout`);
      } else {
        console.log(`❌ Skipped image ${i + 1}: not found or invalid`);
      }
    } catch (error) {
      console.error(`Error processing image ${i}:`, error);
    }
  }
  
  console.log(`📋 Final layout has ${layout.length} images`);
  return layout;
};

// Download and cache product images
const downloadProductImage = async (product, cacheDir) => {
  try {
    const imageUrl = product.image_url || product.image;
    if (!imageUrl) return null;
    
    // Skip if it's already a local file path
    if (imageUrl.startsWith('/images/') || imageUrl.startsWith('./') || imageUrl.startsWith('../')) {
      const localPath = path.join(__dirname, '..', 'public', imageUrl.replace('/images/', ''));
      return fs.existsSync(localPath) ? localPath : null;
    }
    
    // For external URLs, try to download
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const https = require('https');
        const http = require('http');
        const urlModule = require('url');
        
        const parsedUrl = urlModule.parse(imageUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        return new Promise((resolve) => {
          const filename = `product_${product.product_id || product.id || Date.now()}_${Date.now()}.jpg`;
          const cachePath = path.join(cacheDir, filename);
          const file = fs.createWriteStream(cachePath);
          
          const request = protocol.get(imageUrl, (response) => {
            if (response.statusCode === 200) {
              response.pipe(file);
              file.on('finish', () => {
                file.close();
                resolve(cachePath);
              });
            } else {
              fs.unlink(cachePath, () => {}); // Clean up
              resolve(null);
            }
          });
          
          request.on('error', () => {
            fs.unlink(cachePath, () => {}); // Clean up
            resolve(null);
          });
          
          // Timeout after 10 seconds
          request.setTimeout(10000, () => {
            request.abort();
            fs.unlink(cachePath, () => {}); // Clean up
            resolve(null);
          });
        });
      } catch (error) {
        console.error('Error downloading external image:', error);
        return null;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Error processing product image:', error);
    return null;
  }
};

// Process individual image for mood board
const processImageForMoodBoard = async (imagePath, targetSize) => {
  try {
    const processed = await sharp(imagePath)
      .resize(targetSize.width, targetSize.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 });
    
    const outputPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, '_processed.jpg');
    await processed.toFile(outputPath);
    
    return outputPath;
  } catch (error) {
    console.error('Error processing image for mood board:', error);
    return imagePath; // Return original if processing fails
  }
};

// Composite images with Sharp for better quality
const compositeImagesWithSharp = async (layout, config, analysisResult) => {
  try {
    // Create base canvas with background
    const baseImage = sharp({
      create: {
        width: config.canvas.width,
        height: config.canvas.height,
        channels: 3,
        background: config.canvas.backgroundColor
      }
    });
    
    // Prepare composite operations
    const composites = [];
    
    // Add header text as SVG overlay
    const headerSvg = createHeaderSVG(config, analysisResult);
    composites.push({
      input: Buffer.from(headerSvg),
      top: 0,
      left: 0
    });
    
    // Add processed images with rounded corners and shadows
    for (const item of layout) {
      if (item.processed_path && fs.existsSync(item.processed_path)) {
        // Create rounded image
        const roundedImage = await sharp(item.processed_path)
          .resize(item.position.width, item.position.height, { fit: 'cover' })
          .composite([{
            input: Buffer.from(`
              <svg width="${item.position.width}" height="${item.position.height}">
                <rect x="0" y="0" width="100%" height="100%" rx="12" ry="12" fill="white"/>
              </svg>
            `),
            blend: 'dest-in'
          }])
          .png()
          .toBuffer();
        
        // Add main rounded image
        composites.push({
          input: roundedImage,
          top: item.position.y,
          left: item.position.x
        });
        
        // Add overlay with product info
        const overlayBuffer = await createImageOverlay(item, config);
        if (overlayBuffer) {
          composites.push({
            input: overlayBuffer,
            top: item.position.y,
            left: item.position.x,
            blend: 'over'
          });
        }
      }
    }
    
    return baseImage.composite(composites);
    
  } catch (error) {
    console.error('Error compositing mood board:', error);
    throw error;
  }
};

// Create header SVG
const createHeaderSVG = (config, analysisResult) => {
  const temp = analysisResult.analysis.temperature ? Math.round(analysisResult.analysis.temperature) : null;
  const weather = temp ? getWeatherEmoji(analysisResult.analysis.weather_recommendations?.weather_category) : '';
  const itemDesc = analysisResult.analysis.item_description || 'Your Style';
  
  return `
    <svg width="${config.canvas.width}" height="130">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#ffeef8;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#fce4ec;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#ffc0cb;stop-opacity:0.6" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradient)"/>
      <text x="50%" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#ff3f6c"> YOUR VIBE BOARD </text>
      <text x="50%" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#333">Styled around your ${itemDesc}</text>
      ${temp ? `<text x="50%" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666">${weather} ${temp}°C Perfect Weather</text>` : ''}
    </svg>
  `;
};

// Create image overlay with product info
const createImageOverlay = async (item, config) => {
  try {
    if (item.type === 'uploaded') {
      // Simple overlay for uploaded item
      const overlay = `
        <svg width="${item.position.width}" height="${item.position.height}">
          <rect x="0" y="${item.position.height - 40}" width="100%" height="40" fill="rgba(255,63,108,0.9)" rx="0" ry="0"/>
          <text x="50%" y="${item.position.height - 15}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">YOUR ITEM</text>
        </svg>
      `;
      return Buffer.from(overlay);
    } else if (item.type === 'product' && item.product) {
      // Product overlay with price and brand
      const product = item.product;
      const overlay = `
        <svg width="${item.position.width}" height="${item.position.height}">
          <rect x="0" y="${item.position.height - 50}" width="100%" height="50" fill="rgba(0,0,0,0.8)" rx="0" ry="0"/>
          <text x="8" y="${item.position.height - 30}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white">${(product.brand || '').substring(0, 15)}</text>
          <text x="8" y="${item.position.height - 15}" font-family="Arial, sans-serif" font-size="11" fill="#ffc0cb">₹${product.price || 'N/A'}</text>
          <text x="${item.position.width - 8}" y="${item.position.height - 15}" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#fff">🛍️</text>
        </svg>
      `;
      return Buffer.from(overlay);
    }
    
    return null;
  } catch (error) {
    console.error('Error creating image overlay:', error);
    return null;
  }
};

// Get weather emoji
const getWeatherEmoji = (category) => {
  switch(category) {
    case 'very_cold': return '🥶';
    case 'cool': return '🌤️';
    case 'warm': return '☀️';
    case 'hot': return '🔥';
    default: return '🌟';
  }
};

module.exports = {
  generateMoodBoard
};