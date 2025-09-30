// backend/routes/tryon.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

// -------------------- Config --------------------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const VTON_URL = process.env.VTON_URL;
const VTON_API_KEY = process.env.VTON_API_KEY;
const VTON_HOST = process.env.VTON_HOST;

if (!VTON_URL || !VTON_API_KEY || !VTON_HOST) {
    console.warn('⚠️  Warning: VTON_URL, VTON_API_KEY, or VTON_HOST not set.');
}

// Serve uploads folder statically
router.use('/uploads', express.static(UPLOAD_DIR));

// -------------------- Multer Setup --------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '_' + (file.originalname || 'upload.jpg'))
});
const upload = multer({ storage });

// -------------------- Helpers --------------------
async function safeUnlink(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) await fs.promises.unlink(filePath);
    } catch (e) {
        console.warn('Failed to delete temp file', filePath, e);
    }
}

// -------------------- Try-On Route --------------------
router.post('/', upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 }
]), async (req, res) => {
    const startTime = Date.now();
    const uploadedFiles = [];

    try {
        const files = req.files || {};
        const body = req.body || {};

        console.log('\n🚀 === NEW VTON REQUEST ===');
        console.log('📦 Files received:', Object.keys(files));
        console.log('📋 Body params:', Object.keys(body));

        if (!files.image1 || !files.image2) {
            console.error('❌ Missing images');
            return res.status(400).json({ error: 'Both image1 (product) and image2 (person) are required' });
        }

        const productFile = files.image1[0];
        const personFile = files.image2[0];
        uploadedFiles.push(productFile.path, personFile.path);

        console.log('📸 Product image:', productFile.filename, `(${productFile.size} bytes)`);
        console.log('👤 Person image:', personFile.filename, `(${personFile.size} bytes)`);

        if (!VTON_URL || !VTON_API_KEY || !VTON_HOST) {
            console.error('❌ VTON service not configured');
            return res.status(500).json({ error: 'VTON service not configured on server' });
        }

        // -------------------- Build form-data --------------------
        const form = new FormData();
        form.append('image1', fs.createReadStream(productFile.path), {
            filename: productFile.originalname,
            contentType: productFile.mimetype
        });
        form.append('image2', fs.createReadStream(personFile.path), {
            filename: personFile.originalname,
            contentType: personFile.mimetype
        });

        const { source_type, target_width, target_height, prompt } = body;
        if (source_type) form.append('source_type', source_type);
        if (target_width) form.append('target_width', target_width);
        if (target_height) form.append('target_height', target_height);
        if (prompt) form.append('prompt', prompt);

        console.log('📡 Sending request to VTON API...');
        console.log('🔗 URL:', VTON_URL);

        // -------------------- Send request with timeout --------------------
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 20000); // 20s timeout

        let providerResp;
        try {
            const apiStartTime = Date.now();
            providerResp = await fetch(VTON_URL, {
                method: 'POST',
                headers: {
                    'x-rapidapi-key': VTON_API_KEY,
                    'x-rapidapi-host': VTON_HOST,
                    ...form.getHeaders()
                },
                body: form,
                signal: controller.signal
            });
            clearTimeout(timeout);
            const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(2);
            console.log(`✅ VTON API responded in ${apiDuration}s`);
            console.log('📊 Status:', providerResp.status, providerResp.statusText);
        } catch (err) {
            clearTimeout(timeout);
            console.error('❌ VTON API request failed:', err.message);
            return res.status(500).json({ error: 'VTON API request failed', details: err.message });
        }

        const contentType = providerResp.headers.get('content-type') || '';
        console.log('📄 Content-Type:', contentType);
        console.log('📋 Response headers:', Object.fromEntries(providerResp.headers.entries()));

        // -------------------- Handle image response --------------------
        if (providerResp.ok && contentType.startsWith('image/')) {
            console.log('🖼️  Processing image response...');
            const resultFileName = `result_${Date.now()}.jpg`;
            const resultFilePath = path.join(UPLOAD_DIR, resultFileName);

            console.log('📥 Streaming image to disk...');
            try {
                await streamPipeline(providerResp.body, fs.createWriteStream(resultFilePath));
                console.log(`✅ File saved: ${resultFileName}`);
                const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`✅ Total request time: ${totalDuration}s`);
                console.log('🎉 Sending success response\n');

                return res.json({
                    success: true,
                    resultFileUrl: `/api/tryon/uploads/${resultFileName}`,
                    processingTime: totalDuration + 's'
                });
            } catch (err) {
                console.error('❌ Failed to save image stream:', err);
                return res.status(500).json({ error: 'Failed to save image from VTON API', details: err.message });
            }
        }

        // -------------------- Handle JSON response --------------------
        if (contentType.includes('application/json')) {
            console.log('📋 Processing JSON response...');
            const data = await providerResp.json();
            console.log('Response data:', JSON.stringify(data, null, 2));
            const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Total request time: ${totalDuration}s\n`);
            return res.json({ success: true, ...data });
        }

        // -------------------- Handle unexpected response --------------------
        console.warn('⚠️  Unexpected content type, trying to read as text...');
        const text = await providerResp.text();
        console.log('Response preview:', text.substring(0, 500));
        return res.status(500).json({
            error: 'Unexpected response from VTON API',
            contentType: contentType,
            preview: text.substring(0, 500)
        });

    } catch (err) {
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`❌ Tryon error after ${totalDuration}s:`, err.message);
        console.error('Stack:', err.stack);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    } finally {
        console.log('🧹 Cleaning up temp files...');
        for (const p of uploadedFiles) {
            await safeUnlink(p);
        }
    }
});

module.exports = router;
