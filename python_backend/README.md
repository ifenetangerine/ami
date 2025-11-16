# Python Backend Setup

This directory contains a FastAPI service for real-time facial emotion detection using DeepFace.

## Installation

```bash
# Create virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
```

The server will start on `http://127.0.0.1:8000`

## Endpoints

### POST `/detect_emotion`
Analyzes a video frame for emotion detection using DeepFace.

**Request:**
```json
{
  "frame": "base64_encoded_jpeg_image"
}
```

**Response:**
```json
{
  "emotion": "happy",
  "confidence": 0.92,
  "face_detected": true
}
```

Emotions: `angry`, `disgust`, `fear`, `happy`, `neutral`, `sad`, `surprise`

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## How It Works

1. **Face Detection**: Uses OpenCV's Haar Cascade classifier to locate faces in the frame
2. **Emotion Analysis**: Uses DeepFace to analyze the detected face ROI and predict emotion
3. **Emotion Mapping**: Returns DeepFace emotions directly:
   - `angry`, `disgust`, `fear`, `happy`, `neutral`, `sad`, `surprise`
4. **Confidence Scoring**: Returns emotion type with 0-1 confidence score

## DeepFace Models

DeepFace uses multiple neural network models:
- **Emotion**: VGG-Face (fine-tuned for 7 emotions)
- The models are downloaded automatically on first use (~100MB)

## Environment Variables

In your `.env.local`:
```
PYTHON_BACKEND_URL=http://127.0.0.1:8000
```

## Integration with Next.js

The Next.js frontend sends Base64-encoded video frames to `/api/emotion`, which forwards them to this Python service.

The hook `hooks/use-emotion-detection.ts` captures frames and displays real-time emotion detection in the UI.

## Performance Notes

- DeepFace models take time to load on first request (~5-10 seconds)
- Subsequent requests are faster (~100-500ms per frame)
- Processing every 1 second provides good balance between accuracy and performance
