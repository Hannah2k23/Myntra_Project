// backend/routes/tryon.js
const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Use memory storage to handle files as buffers, which is efficient for this use case.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ensure the 'uploads' directory exists for storing the final images.
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * @route   POST /api/tryon
 * @desc    Accepts two images and an optional prompt to perform a virtual try-on.
 * @access  Public
 * @param   {file} image1 - The product/garment image.
 * @param   {file} image2 - The person/model image.
 * @param   {string} [prompt] - Optional custom prompt to override the default.
 */
router.post('/', upload.fields([{ name: 'image1' }, { name: 'image2' }]), async (req, res) => {
  try {
    // --- 1. Prompt Preparation ---
    // A detailed default prompt for high-quality, consistent results.
    const defaultPrompt = `
Okay, here is a detailed, flexible prompt designed to work with any two input images for a virtual try-on, ensuring clarity and high-quality output. It's structured to guide an advanced AI image editor.

The Universal Virtual Try-On Prompt
"You are an expert AI photo editor specializing in realistic virtual try-ons and object replacement. Your task is to seamlessly integrate clothing from one person onto another.

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
The final generated image must be a high-resolution, photorealistic composite where the transferred garment appears to have been naturally worn by the person in the Subject Image, with no visual cues that indicate digital manipulation.
`.trim();

    // Use the user's prompt if provided, otherwise fall back to the detailed default.
    const prompt = (req.body && req.body.prompt && req.body.prompt.trim()) ? req.body.prompt.trim() : defaultPrompt;

    // --- 2. Image Validation & Preparation ---
    const image1 = req.files?.image1?.[0]; // Product Image
    const image2 = req.files?.image2?.[0]; // Person Image

    if (!image1 || !image2) {
      return res.status(400).json({ error: 'Both image1 (product) and image2 (person) are required.' });
    }

    // Convert image buffers to base64 data URLs for the API request.
    const image1DataUrl = `data:${image1.mimetype};base64,${image1.buffer.toString('base64')}`;
    const image2DataUrl = `data:${image2.mimetype};base64,${image2.buffer.toString('base64')}`;

    // --- 3. API Call to Banana.dev ---
    const BANANA_API_URL = 'https://api.banana.dev/v1/generate';
    const BANANA_API_KEY = process.env.BANANA_API_KEY;

    if (!BANANA_API_KEY) {
      console.error('BANANA_API_KEY is not set in environment variables.');
      return res.status(500).json({ error: 'API key is not configured on the backend.' });
    }

    // IMPORTANT: Replace 'your-gemini-model-key' with the actual model key for your Banana.dev container.
    const modelKey = 'your-gemini-model-key'; 

    const requestBody = {
      model: modelKey,
      prompt: prompt,
      images: [image1DataUrl, image2DataUrl] // Pass images as an array of data URLs
    };

    const response = await fetch(BANANA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BANANA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Banana API Error Response:', errorText);
      return res.status(response.status).json({ error: 'Failed to get a successful response from the AI service.', details: errorText });
    }

    const bananaData = await response.json();

    // --- 4. Simplified & Robust Response Parsing ---
    // Modern Banana containers often return the result in a predictable format.
    // We expect a base64 encoded image string. Common keys are 'image_base64', 'image', or 'output'.
    // Example expected response: { "id": "...", "modelOutputs": [{ "image_base64": "..." }] }
    
    const output = bananaData.modelOutputs?.[0];
    let imageBase64 = output?.image_base64 || output?.image || output?.output;

    if (!imageBase64) {
      console.warn('Could not find image_base64 in bananaData.modelOutputs. Returning raw response for inspection.');
      return res.status(500).json({ 
        error: 'AI service did not return an image in the expected format.', 
        raw_response: bananaData 
      });
    }

    // The result might be a raw base64 string or a full data URL. This handles both.
    const dataUrlMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    let base64Payload;
    let mimeType = 'image/jpeg'; // Default MIME type

    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Payload = dataUrlMatch[2];
    } else {
      // If it's just the base64 string without the prefix, use it directly.
      base64Payload = imageBase64;
    }
    
    // Construct the full data URL for the client response.
    const resultDataUrl = `data:${mimeType};base64,${base64Payload}`;

    // --- 5. Save and Respond ---
    const fileExtension = mimeType.split('/')[1] || 'jpg';
    const filename = `tryon_result_${Date.now()}.${fileExtension}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filepath, Buffer.from(base64Payload, 'base64'));

    const resultUrl = `/uploads/${filename}`; // The URL path to the saved file.

    res.status(200).json({
      resultUrl: resultUrl,
      resultDataUrl: resultDataUrl,
      raw: bananaData // Include the raw response for debugging purposes.
    });

  } catch (err) {
    console.error('An unexpected error occurred in the tryon route:', err);
    res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

module.exports = router;