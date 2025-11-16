import cv2
import numpy as np
import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepface import DeepFace
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load face cascade classifier for detection
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
)

class FrameInput(BaseModel):
    frame: str  # Base64 encoded image


def map_deepface_emotion(deepface_emotion: str) -> str:
    """
    Return DeepFace emotion labels directly.
    DeepFace returns: angry, disgust, fear, happy, neutral, sad, surprise
    """
    return deepface_emotion.lower()
@app.post("/detect_emotion")
async def detect_emotion(input_data: FrameInput):
    """
    Detect emotion from a Base64 encoded frame using DeepFace.
    Returns emotion type and confidence score.
    """
    try:
        logger.info(f"Received frame of length: {len(input_data.frame)}")

        # Decode Base64 frame
        try:
            frame_data = base64.b64decode(input_data.frame)
        except Exception as e:
            logger.error(f"Base64 decode failed: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid Base64: {str(e)}")

        nparr = np.frombuffer(frame_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            logger.error("Frame decode failed - resulted in None")
            raise HTTPException(status_code=400, detail="Invalid frame data")

        # Convert to grayscale for face detection
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect faces using Haar Cascade
        faces = face_cascade.detectMultiScale(
            gray_frame,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        if len(faces) == 0:
            logger.info("No faces detected")
            return {
                "emotion": "neutral",
                "confidence": 0.0,
                "face_detected": False
            }

        # Use the largest face detected
        (x, y, w, h) = max(faces, key=lambda f: f[2] * f[3])

        # Extract face ROI
        face_roi = frame[y:y + h, x:x + w]

        try:
            # Perform emotion analysis using DeepFace
            result = DeepFace.analyze(face_roi, actions=['emotion'], enforce_detection=False)

            if result and len(result) > 0:
                emotion_data = result[0]
                deepface_emotion = emotion_data['dominant_emotion']
                emotion_confidence = emotion_data['emotion'][deepface_emotion]

                # Map to our emotion types
                emotion = map_deepface_emotion(deepface_emotion)
                confidence = min(1.0, emotion_confidence / 100.0)  # Convert percentage to 0-1 scale

                logger.info(f"Emotion detected: {emotion} (confidence: {confidence:.2f})")

                return {
                    "emotion": emotion,
                    "confidence": float(confidence),
                    "face_detected": True
                }
        except Exception as deepface_error:
            logger.warning(f"DeepFace analysis failed: {str(deepface_error)}")
            # Return neutral if analysis fails
            return {
                "emotion": "neutral",
                "confidence": 0.0,
                "face_detected": True
            }

    except Exception as e:
        logger.error(f"Error in emotion detection: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
