const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateMoodBoard } = require('../utils/moodBoardGenerator');
const auth = require('../middlewares/auth');

const router = express.Router();

// Generate mood board endpoint (Protected - requires auth)
router.post('/generate/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    // Look for existing analysis results
    const outputDir = path.join(__dirname, '..', 'segmentation', 'outputs', sessionId);
    const analysisResultPath = path.join(outputDir, 'analysis_result.json');
    
    let analysisResult;
    
    // Try to load from saved file or use provided data
    if (fs.existsSync(analysisResultPath)) {
      const savedData = JSON.parse(fs.readFileSync(analysisResultPath, 'utf8'));
      analysisResult = savedData;
    } else if (req.body && req.body.analysis_result) {
      // Use provided analysis result
      analysisResult = req.body.analysis_result;
      analysisResult.session_id = sessionId;
      
      // Save for future reference
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(analysisResultPath, JSON.stringify(analysisResult, null, 2));
    } else {
      return res.status(404).json({
        success: false,
        message: 'Analysis results not found for this session. Please run analysis first.'
      });
    }
    
    // Generate mood board
    console.log(`🎨 Generating mood board for session: ${sessionId}`);
    console.log(`📊 Analysis result keys:`, Object.keys(analysisResult));
    const moodBoardResult = await generateMoodBoard(analysisResult, baseUrl);
    
    console.log(`🔍 Mood board result:`, JSON.stringify(moodBoardResult, null, 2));
    
    if (moodBoardResult.success) {
      console.log('✨ Mood board generated successfully!');
      const response = {
        success: true,
        message: 'Your aesthetic mood board is ready! ✨',
        session_id: sessionId,
        moodboard: {
          url: moodBoardResult.moodboard_url,
          share_url: moodBoardResult.share_url,
          images_count: moodBoardResult.images_count,
          layout: moodBoardResult.layout
        }
      };
      console.log(`📤 Sending response:`, JSON.stringify(response, null, 2));
      res.json(response);
    } else {
      console.error('❌ Mood board generation failed:', moodBoardResult.error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate mood board',
        error: moodBoardResult.error
      });
    }
    
  } catch (error) {
    console.error('Mood board generation endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Share mood board endpoint (PUBLIC - no auth required)
router.get('/share/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if mood board exists
    const moodBoardPath = path.join(__dirname, '..', 'segmentation', 'outputs', sessionId, 'moodboard', 'mood_board.jpg');
    const analysisResultPath = path.join(__dirname, '..', 'segmentation', 'outputs', sessionId, 'analysis_result.json');
    
    if (!fs.existsSync(moodBoardPath)) {
      return res.status(404).json({
        success: false,
        message: 'Mood board not found. It may have been deleted or never generated.'
      });
    }
    
    // Load analysis data for context
    let analysisResult = null;
    if (fs.existsSync(analysisResultPath)) {
      analysisResult = JSON.parse(fs.readFileSync(analysisResultPath, 'utf8'));
    }
    
    // Create shareable HTML page
    const imageUrl = `${req.protocol}://${req.get('host')}/segmentation/outputs/${sessionId}/moodboard/mood_board.jpg`;
    const description = analysisResult ? `Mood board for ${analysisResult.analysis.item_description}` : 'Style mood board';
    const weatherContext = analysisResult?.analysis.temperature ? `${Math.round(analysisResult.analysis.temperature)}°C` : null;
    const createdDate = fs.statSync(moodBoardPath).mtime.toLocaleDateString();
    
    const sharePageHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>✨ My Style Vibe Board ✨</title>
        <meta name="description" content="Check out my curated style mood board from Myntra!">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">
        <meta property="og:title" content="My Style Vibe Board">
        <meta property="og:description" content="${description}${weatherContext ? ` • Perfect for ${weatherContext} weather` : ''}">
        <meta property="og:image" content="${imageUrl}">
        
        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${req.protocol}://${req.get('host')}${req.originalUrl}">
        <meta property="twitter:title" content="My Style Vibe Board">
        <meta property="twitter:description" content="${description}${weatherContext ? ` • Perfect for ${weatherContext} weather` : ''}">
        <meta property="twitter:image" content="${imageUrl}">
        
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                background: linear-gradient(135deg, #ffeef8 0%, #fce4ec 100%);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                max-width: 800px;
                width: 100%;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(255,63,108,0.15);
                overflow: hidden;
                animation: fadeInUp 0.8s ease-out;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .header {
                background: linear-gradient(135deg, #ff3f6c, #e91e63);
                color: white;
                padding: 30px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: -50%;
                right: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            }
            
            .header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                position: relative;
                z-index: 1;
            }
            
            .header .subtitle {
                font-size: 1.1rem;
                opacity: 0.9;
                position: relative;
                z-index: 1;
            }
            
            .mood-board-container {
                padding: 30px;
                text-align: center;
            }
            
            .mood-board-info {
                margin-bottom: 30px;
            }
            
            .description {
                font-size: 1.2rem;
                color: #374151;
                margin-bottom: 10px;
                font-weight: 600;
            }
            
            .meta-info {
                display: flex;
                justify-content: center;
                gap: 20px;
                flex-wrap: wrap;
                margin-bottom: 20px;
            }
            
            .meta-item {
                background: #f3f4f6;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 0.9rem;
                color: #6b7280;
            }
            
            .mood-board-image {
                width: 100%;
                max-width: 600px;
                height: auto;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                margin-bottom: 30px;
                transition: transform 0.3s ease;
            }
            
            .mood-board-image:hover {
                transform: scale(1.02);
            }
            
            .actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
                margin-top: 30px;
            }
            
            .btn {
                padding: 12px 24px;
                border-radius: 25px;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #ff3f6c, #e91e63);
                color: white;
            }
            
            .btn-outline {
                background: transparent;
                color: #ff3f6c;
                border: 2px solid #ff3f6c;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(255,63,108,0.3);
            }
            
            .btn-outline:hover {
                background: #ff3f6c;
                color: white;
            }
            
            .footer {
                background: #f9fafb;
                padding: 20px;
                text-align: center;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
            }
            
            @media (max-width: 768px) {
                .header h1 {
                    font-size: 2rem;
                }
                
                .actions {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .meta-info {
                    flex-direction: column;
                    align-items: center;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>My Style Vibe Board</h1>
                <div class="subtitle">Curated with love from Myntra</div>
            </div>
            
            <div class="mood-board-container">
                <div class="mood-board-info">
                    <div class="description">${description}</div>
                    <div class="meta-info">
                        <div class="meta-item">Created ${createdDate}</div>
                        ${weatherContext ? `<div class="meta-item">🌡️ Perfect for ${weatherContext}</div>` : ''}
                        <div class="meta-item">AI-Generated</div>
                    </div>
                </div>
                
                <img src="${imageUrl}" alt="Style Mood Board" class="mood-board-image" />
                
                <div class="actions">
                    <a href="${imageUrl}" download="my-vibe-board.jpg" class="btn btn-primary">
                        Download
                    </a>
                    <button onclick="copyLink()" class="btn btn-outline">
                        Copy Link
                    </button>
                    <button onclick="shareTwitter()" class="btn btn-outline">
                        Share on Twitter
                    </button>
                    <button onclick="sharePinterest()" class="btn btn-outline">
                        Pin it
                    </button>
                </div>
            </div>
            
            <div class="footer">
                <p>Powered by Myntra AI • Create your own style mood board</p>
            </div>
        </div>
        
        <script>
            function copyLink() {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('Link copied to clipboard!');
                });
            }
            
            function shareTwitter() {
                const text = encodeURIComponent('Check out my curated style mood board! ✨ #MyntraStyle #OOTD');
                const url = encodeURIComponent(window.location.href);
                window.open(\`https://twitter.com/intent/tweet?text=\${text}&url=\${url}\`, '_blank');
            }
            
            function sharePinterest() {
                const url = encodeURIComponent(window.location.href);
                const imageUrl = encodeURIComponent('${imageUrl}');
                const description = encodeURIComponent('${description} - My curated style mood board from Myntra!');
                window.open(\`https://pinterest.com/pin/create/button/?url=\${url}&media=\${imageUrl}&description=\${description}\`, '_blank');
            }
        </script>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(sharePageHTML);
    
  } catch (error) {
    console.error('Share mood board error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load mood board',
      error: error.message
    });
  }
});

// Direct mood board image access (PUBLIC - no auth required)
router.get('/image/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const moodBoardPath = path.join(__dirname, '..', 'segmentation', 'outputs', sessionId, 'moodboard', 'mood_board.jpg');
    
    if (!fs.existsSync(moodBoardPath)) {
      return res.status(404).json({
        success: false,
        message: 'Mood board image not found'
      });
    }
    
    // Set appropriate headers for image
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the image
    const imageStream = fs.createReadStream(moodBoardPath);
    imageStream.pipe(res);
    
  } catch (error) {
    console.error('Mood board image access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load mood board image',
      error: error.message
    });
  }
});

module.exports = router;