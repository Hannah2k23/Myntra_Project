// backend/routes/tryon.js
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';
const OUTPUT_DIR = path.join(__dirname, '../uploads');

// Ensure output directory exists
(async () => {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log('✅ Output directory ready:', OUTPUT_DIR);
  } catch (err) {
    console.error('Failed to create output directory:', err);
  }
})();

// Helper: Convert buffer to base64
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

// Helper: Get MIME type from buffer or filename
function getMimeType(buffer, filename) {
  // Check magic numbers first
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }

  // Fallback to extension
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

// POST /api/tryon
router.post('/', upload.fields([
  { name: 'image1', maxCount: 1 },  // product/reference image
  { name: 'image2', maxCount: 1 }   // person/subject image
]), async (req, res) => {
  const startTime = Date.now();
  console.log('🚀 [TRYON] Request received');

  try {
    // Validate API key
    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
      console.error('❌ [TRYON] API key not configured');
      return res.status(500).json({ 
        error: 'Gemini API key not configured. Set GEMINI_API_KEY in .env file' 
      });
    }

    // Validate files
    if (!req.files || !req.files.image1 || !req.files.image2) {
      console.error('❌ [TRYON] Missing images');
      return res.status(400).json({ 
        error: 'Both image1 (product) and image2 (person) are required' 
      });
    }

    const productImage = req.files.image1[0];  // reference/garment
    const personImage = req.files.image2[0];   // subject/person

    console.log('📦 [TRYON] Product/Reference image:', {
      size: productImage.size,
      mimetype: productImage.mimetype,
      originalname: productImage.originalname
    });
    console.log('📦 [TRYON] Person/Subject image:', {
      size: personImage.size,
      mimetype: personImage.mimetype,
      originalname: personImage.originalname
    });

    // Convert images to base64
    console.log('🔄 [TRYON] Converting images to base64...');
    const subjectB64 = bufferToBase64(personImage.buffer);
    const referenceB64 = bufferToBase64(productImage.buffer);
    console.log(`✅ [TRYON] Base64 conversion complete (${Date.now() - startTime}ms)`);

    // Get MIME types
    const subjectMime = getMimeType(personImage.buffer, personImage.originalname);
    const referenceMime = getMimeType(productImage.buffer, productImage.originalname);

    console.log('🎨 [TRYON] MIME types:', { subject: subjectMime, reference: referenceMime });

    // EXACT prompt from bash script
    const prompt = `You are an expert AI photo editor specializing in realistic virtual try-ons and object replacement. Your task is to seamlessly integrate clothing from one person onto another.

Input Images:

Subject Image: This is the image featuring the person whose clothing will be replaced.

Garment Reference Image: This image contains the specific piece of clothing that will be digitally transferred.

Core Action - Garment Transfer:
Identify the primary piece of upper body clothing (e.g., shirt, top, blouse, jacket, dress bodice) worn by the individual in the Subject Image. Precisely remove this garment. Subsequently, take the most prominent upper body garment from the Garment Reference Image and apply it to the person in the Subject Image.

Critical Style & Fit Replication:

Exact Garment Replication: The transferred garment must be an identical replica of the one in the Garment Reference Image in terms of its color, pattern, texture, embroidery, and any unique design details (e.g., collar type, neckline, button placement, embellishments).

Realistic Fit and Drape: The garment must conform naturally to the body shape of the individual in the Subject Image. Simulate realistic folds, wrinkles, and stretching of the fabric, consistent with how that specific material would behave on a human body in that pose.

Style Preservation: Crucially, preserve the wearing style from the Garment Reference Image. This includes:

Sleeve length and style: If the reference garment has short, long, or three-quarter sleeves, ensure the transferred garment reflects this.

Hemline and tuck: If the reference garment is tucked in, untucked, cropped, or has a specific peplum or layered hem, replicate this on the subject.

Overall silhouette: Maintain the original volume and shape of the garment (e.g., fitted, loose, A-line, boxy) as seen in the Garment Reference Image.

Strict Preservation Rules (Non-Negotiables):

Subject's Identity & Appearance: Do NOT alter the face, hair, skin tone, facial expression, posture, or any other physical characteristics of the person in the Subject Image.

Subject's Other Attire: Any clothing not specified for replacement (e.g., pants, skirt, shoes, accessories like watches or earrings) in the Subject Image must remain completely unchanged and perfectly integrated with the new upper garment.

Background and Environment: The entire background, lighting conditions, shadows, reflections, and overall atmosphere of the Subject Image must be preserved without any modifications or artifacts from the transfer process.

Seamless Blending: The transferred garment must blend flawlessly into the existing lighting and shadow environment of the Subject Image, ensuring a cohesive and photorealistic final appearance.

Output Requirements:
The final generated image must be a high-resolution, photorealistic composite where the transferred garment appears to have been naturally worn by the person in the Subject Image, with no visual cues that indicate digital manipulation.`
console.log('📝 [TRYON] Prompt:', prompt);

    // Prepare request EXACTLY like bash script
    // ORDER: text, subject image, reference image
    const geminiRequest = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: subjectMime,
              data: subjectB64
            }
          },
          {
            inline_data: {
              mime_type: referenceMime,
              data: referenceB64
            }
          }
        ]
      }]
    };

    console.log('📡 [TRYON] Sending request to Gemini API...');
    console.log('🔑 [TRYON] Using API Key:', API_KEY.substring(0, 10) + '...');
    console.log('🌐 [TRYON] API URL:', GEMINI_API_URL);

    // Call Gemini API using HEADER authentication like bash script
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequest)
    });

    console.log(`✅ [TRYON] Gemini API response status: ${geminiResponse.status} (${Date.now() - startTime}ms)`);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ [TRYON] Gemini API error:', errorText);
      return res.status(geminiResponse.status).json({ 
        error: 'Gemini API error', 
        details: errorText,
        status: geminiResponse.status
      });
    }

    const geminiData = await geminiResponse.json();
    console.log('📋 [TRYON] Gemini response received');
    
    // Log full response for debugging
    console.log('=== RAW RESPONSE ===');
    console.log(JSON.stringify(geminiData, null, 2));

    // Extract the generated image from response
    let imageData = null;
    
    if (geminiData.candidates && geminiData.candidates[0]) {
      const candidate = geminiData.candidates[0];
      console.log('📊 [TRYON] Response has candidates:', geminiData.candidates.length);
      
      // Check in parts
      if (candidate.content && candidate.content.parts) {
        console.log('📊 [TRYON] Parts count:', candidate.content.parts.length);
        
        for (let i = 0; i < candidate.content.parts.length; i++) {
          const part = candidate.content.parts[i];
          console.log(`📊 [TRYON] Part ${i} keys:`, Object.keys(part));
          
          // Try inline_data (snake_case - API standard)
          if (part.inline_data && part.inline_data.data) {
            imageData = part.inline_data.data;
            console.log(`✅ [TRYON] Found image in part ${i} using inline_data (snake_case), length: ${imageData.length}`);
            break;
          }
          
          // Try inlineData (camelCase - fallback)
          if (part.inlineData && part.inlineData.data) {
            imageData = part.inlineData.data;
            console.log(`✅ [TRYON] Found image in part ${i} using inlineData (camelCase), length: ${imageData.length}`);
            break;
          }

          // Try direct data field (like bash script grep extracts)
          if (part.data) {
            imageData = part.data;
            console.log(`✅ [TRYON] Found image in part ${i} using direct data field, length: ${imageData.length}`);
            break;
          }
        }
      }
    } else {
      console.log('⚠️ [TRYON] No candidates in response');
      console.log('Response keys:', Object.keys(geminiData));
    }

    if (!imageData) {
      console.error('❌ [TRYON] No image found in response');
      return res.status(500).json({ 
        error: 'No image generated in response',
        hint: 'The model may have blocked the request or failed to generate an image.',
        response: geminiData,
        suggestion: 'Check the console logs for the full response structure.'
      });
    }

    console.log('🎨 [TRYON] Image data extracted, base64 length:', imageData.length);

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64');
    console.log(`✅ [TRYON] Image buffer created: ${imageBuffer.length} bytes`);

    // Save to file for debugging
    const timestamp = Date.now();
    const filename = `tryon-${timestamp}.png`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    try {
      await fs.writeFile(filepath, imageBuffer);
      console.log(`✅ [TRYON] Image saved to: ${filepath}`);
    } catch (saveErr) {
      console.warn('⚠️ [TRYON] Failed to save image file:', saveErr.message);
    }

    // Return the image directly as blob
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'X-Processing-Time': `${Date.now() - startTime}ms`,
      'X-Filename': filename,
      'Cache-Control': 'no-cache'
    });

    res.send(imageBuffer);
    console.log(`🎉 [TRYON] Success! Total time: ${Date.now() - startTime}ms`);

  } catch (error) {
    console.error('❌ [TRYON] Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;