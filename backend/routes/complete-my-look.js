const express = require('express');
const { IncomingForm } = require('formidable');
const path = require('path');
const fs = require('fs');
const { PythonShell } = require('python-shell');
const sharp = require('sharp');

const router = express.Router();

// Ensure directories exist
const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, '..', 'uploads', 'complete-my-look'),
    path.join(__dirname, '..', 'segmentation', 'outputs')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Complete My Look analysis endpoint
router.post('/', async (req, res) => {
  ensureDirectories();
  
  const form = new IncomingForm({
    uploadDir: path.join(__dirname, '..', 'uploads', 'complete-my-look'),
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    multiples: false
  });

  try {
    // Use callback-based parsing instead of promise-based
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        return res.status(400).json({
          success: false,
          message: 'Failed to parse form data'
        });
      }
    
      // Extract form data (formidable returns arrays for fields)
      const uploaded_category = Array.isArray(fields.uploaded_category) 
        ? fields.uploaded_category[0] 
        : fields.uploaded_category;
      const min_price = parseFloat(
        Array.isArray(fields.min_price) ? fields.min_price[0] : fields.min_price
      );
      const max_price = parseFloat(
        Array.isArray(fields.max_price) ? fields.max_price[0] : fields.max_price
      );
      const lat = fields.lat 
        ? parseFloat(Array.isArray(fields.lat) ? fields.lat[0] : fields.lat) 
        : null;
      const lon = fields.lon 
        ? parseFloat(Array.isArray(fields.lon) ? fields.lon[0] : fields.lon) 
        : null;
      const temp_c = fields.temp_c 
        ? parseFloat(Array.isArray(fields.temp_c) ? fields.temp_c[0] : fields.temp_c) 
        : null;
      
      // Validate required fields
      if (!uploaded_category || !files.image || isNaN(min_price) || isNaN(max_price)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: category, image, price range'
        });
      }
      
      if (min_price > max_price) {
        return res.status(400).json({
          success: false,
          message: 'Minimum price cannot be greater than maximum price'
        });
      }
      
      // Get the uploaded image file
      const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
      const originalPath = imageFile.filepath || imageFile.path;
      
      // Generate unique session ID for this analysis
      const sessionId = `cml_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const outputDir = path.join(__dirname, '..', 'segmentation', 'outputs', sessionId);
      
      try {
        // Optimize image if needed (resize large images)
        const optimizedPath = path.join(outputDir, 'optimized_input.jpg');
        fs.mkdirSync(outputDir, { recursive: true });
        
        await sharp(originalPath)
          .resize(1024, 1024, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .jpeg({ quality: 90 })
          .toFile(optimizedPath);
        
        console.log(`[${sessionId}] Starting segmentation for category: ${uploaded_category}`);
        
        // Run segmentation
        const segmentationResult = await runSegmentation(optimizedPath, outputDir);
        
        if (!segmentationResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Segmentation failed',
            error: segmentationResult.error
          });
        }
        
        console.log(`[${sessionId}] Segmentation completed successfully`);
        
        // Return segmentation results with color analysis
        const response = {
          success: true,
          session_id: sessionId,
          analysis: {
            uploaded_category,
            price_range: { min: min_price, max: max_price },
            location: lat && lon ? { lat, lon } : null,
            temperature: temp_c,
            segmentation: {
              mask_area: segmentationResult.mask_area,
              crop_size: segmentationResult.crop_size,
              bbox: segmentationResult.bbox,
              method: segmentationResult.method
            },
            color_analysis: segmentationResult.color_analysis || null
          },
          files: {
            original: `/segmentation/outputs/${sessionId}/optimized_input.jpg`,
            mask: `/segmentation/outputs/${sessionId}/garment_mask.png`,
            crop: `/segmentation/outputs/${sessionId}/garment_crop.jpg`,
            masked_transparent: segmentationResult.color_analysis?.masked_image_path 
              ? `/segmentation/outputs/${sessionId}/masked_transparent.png` 
              : null
          },
          next_steps: [
            segmentationResult.color_analysis ? '✅ Color extraction completed' : '⏳ Color extraction',
            'CLIP-based category classification', 
            'Style compatibility analysis',
            'Weather-aware recommendations',
            'Budget-filtered catalog search'
          ]
        };
        
        res.json(response);
        
      } catch (processingError) {
        console.error('Image processing error:', processingError);
        res.status(500).json({
          success: false,
          message: 'Image processing failed',
          error: processingError.message
        });
      }
    });
    
  } catch (error) {
    console.error('Complete My Look analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Analysis failed',
      error: error.message
    });
  }
});

// Helper function to run Python segmentation
const runSegmentation = (inputPath, outputDir) => {
  return new Promise((resolve, reject) => {
    // Build arguments array
    const args = ['--input', inputPath, '--output', outputDir];
    
    const options = {
      mode: 'text',
      pythonPath: 'python',
      pythonOptions: ['-u'], 
      scriptPath: path.join(__dirname, '..', 'segmentation'),
      args: args
    };
    
    console.log(`🐍 Running segmentation:`);
    console.log(`   Command: python simple_segment.py ${args.join(' ')}`);
    
    // Create Python shell with event handling for real-time logging
    const pythonShell = new PythonShell('simple_segment.py', options);
    
    let pythonOutput = '';
    let pythonErrors = '';
    
    // Listen for stdout messages (JSON result)
    pythonShell.on('message', (message) => {
      pythonOutput += message + '\n';
      console.log('📄 Python stdout:', message);
    });
    
    // Listen for stderr messages (color extraction logs)
    pythonShell.on('stderr', (stderr) => {
      pythonErrors += stderr + '\n';
      console.log('🎨 Python stderr:', stderr);
    });
    
    // Handle completion
    pythonShell.end((err, code, signal) => {
      if (err) {
        console.error('❌ Python segmentation error:', err);
        console.error('Python stderr output:', pythonErrors);
        resolve({
          success: false,
          error: `Segmentation script failed: ${err.message}`
        });
        return;
      }
      
      if (!pythonOutput.trim()) {
        console.error('❌ No output from Python script');
        console.log('All Python stderr:', pythonErrors);
        resolve({
          success: false,
          error: 'No output from segmentation script'
        });
        return;
      }
      
      try {
        // Parse the JSON result from stdout
        const lines = pythonOutput.trim().split('\n');
        const jsonOutput = lines[lines.length - 1];
        console.log('✅ Python JSON result:', jsonOutput);
        
        const result = JSON.parse(jsonOutput);
        
        // Log color results if available
        if (result.color_analysis) {
          console.log('🎨 ==================== COLOR ANALYSIS RESULTS ====================');
          console.log(`🔥 Dominant Color: ${result.color_analysis.dominant_color.hex} (RGB: ${result.color_analysis.dominant_color.rgb})`);
          
          const colors = result.color_analysis.recommended_colors;
          console.log('✨ Recommended Colors:');
          console.log(`   ☀️  Lighter Shade: ${colors.lighter_shade.hex}`);
          console.log(`   🌙 Darker Shade: ${colors.darker_shade.hex}`);
          console.log(`   🔄 Complementary: ${colors.complementary.hex}`);
          console.log(`   ⚫ Neutral Black: ${colors.neutral_black.hex}`);
          console.log(`   ⚪ Neutral White: ${colors.neutral_white.hex}`);
          
          console.log('🎭 Full Palette:');
          result.color_analysis.palette.forEach((color, i) => {
            console.log(`   ${i + 1}. ${color.hex} (RGB: ${color.rgb})`);
          });
          console.log('🎨 ================================================================');
        }
        
        resolve(result);
        
      } catch (parseError) {
        console.error('❌ Failed to parse Python output:', parseError);
        console.log('Raw Python stdout:', pythonOutput);
        console.log('Raw Python stderr:', pythonErrors);
        resolve({
          success: false,
          error: 'Failed to parse segmentation results',
          raw_output: pythonOutput
        });
      }
    });
  });
};

// Serve segmentation output files
router.use('/outputs', express.static(path.join(__dirname, '..', 'segmentation', 'outputs')));

module.exports = router;