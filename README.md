
# Myntra FWD - GenZ Fashion Experience

This project reimagines the Myntra shopping experience for a GenZ audience that values personalization, community, and immersive fashion experiences. The platform goes beyond traditional e-commerce by integrating 3D try-on, style recommendations, moodboards, and outfit completion suggestions using ML models and computer vision technologies.  

The project was developed as part of the **Myntra WeForShe Hackerramp 2025**. The live deployed application can be accessed [here](https://myntra.darthtellectus.top/).

## Features

- **StyleMirror:** Replace the user’s clothing in uploaded/captured photos with selected outfits.
- **3D Try-On:** Interactive 3D rotation and visualization of garments using Three.js and OpenCV.
- **Complete My Look:** ML-powered outfit suggestions, budget alternatives, and full outfit curation.
- **MoodBoard Creation:** Create visual collections of selected outfits and accessories.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express.js
- **ML / Computer Vision:** TensorFlow, Detectron2, CLIP (Zero-shot classification)
- **3D Rendering:** Three.js, OpenCV
- **Database:** PostgreSQL
- **Storage:** S3-compatible storage for images and 3D models
- **External APIs:** Gemini API for StyleMirror

## Getting Started: Steps to Run

### Frontend

```bash
cd frontend
npm install
npm run dev

```

### Backend

```bash
cd backend
python3 -m venv venv
source ./venv/bin/activate

cd segmentation
pip install -r requirements.txt

cd ..
node server.js
```

## Environment Variables

Create a `.env` file in the backend directory and include the following keys:

```bash
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
POSTGRES_URL=your_postgresql_database_url
```

## Notes

- Ensure PostgreSQL is running and accessible with the provided database URL.
- S3-compatible storage credentials should be configured in your environment or through the `.env` file if needed.
- Python version 3.8+ is recommended for the ML and segmentation modules.

## Deployed Link

The project is deployed and accessible at: [https://myntra.darthtellectus.top/](https://myntra.darthtellectus.top/)

## License

This project is for educational and hackathon purposes.
