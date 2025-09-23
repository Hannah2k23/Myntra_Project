// backend/routes/tryon.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// -------------------- Config --------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// -------------------- Multer Setup --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage });

// -------------------- Image Mapping --------------------
// Map person image based on input source
const PERSON_IMAGE_MAP = {
  upload: 'mansa.png',  // uploaded image
  camera: 'nitu.png'    // captured via camera
};

// -------------------- Delay Helper --------------------
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -------------------- Try-On Route --------------------
router.post('/', upload.fields([
  { name: 'image1', maxCount: 1 }, // product image
  { name: 'image2', maxCount: 1 }  // person image
]), async (req, res) => {
  try {
    const files = req.files;
    const { source_type } = req.body; // Optional explicit source type from frontend

    if (!files || !files.image1 || !files.image2) {
      return res.status(400).json({ error: 'Both image1 (product) and image2 (person) are required' });
    }

    const productFile = files.image1[0];
    const personFile = files.image2[0];

    // Use explicit source type or fallback detection
    let inputType = source_type;
    if (!inputType || !PERSON_IMAGE_MAP[inputType]) {
      inputType = personFile.originalname.toLowerCase().includes('person') ? 'camera' : 'upload';
    }

    console.log('Source type received:', source_type);
    console.log('Final input type:', inputType);
    console.log('Person file name:', personFile.originalname);

    // Map to mock output image
    const mappedImage = PERSON_IMAGE_MAP[inputType];
    if (!mappedImage) {
      return res.status(400).json({ error: `Invalid input type: ${inputType}. Must be 'camera' or 'upload'` });
    }

    const mappedImagePath = path.join(UPLOAD_DIR, mappedImage);

    if (!fs.existsSync(mappedImagePath)) {
      return res.status(404).json({ error: `Mapped image not found: ${mappedImage}` });
    }

    // -------- Add 7-second delay --------
    await delay(7000);

    // Return mapped image URL (for frontend)
    res.status(200).json({
      resultUrl: `/uploads/${mappedImage}`,
      inputTypeDetected: inputType,
      mappedImage: mappedImage
    });

  } catch (err) {
    console.error('Tryon error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
