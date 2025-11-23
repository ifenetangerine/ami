import cv2
import numpy as np
import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepface import DeepFace
from typing import Optional
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Optional dict to hold preloaded DeepFace models to reduce first-request latency
preloaded_models = {}

# Optional classifier pipeline (created by training script)
classifier_pipeline = None
CLASSIFIER_PATH = os.path.join(os.path.dirname(__file__), 'train', 'best_model.joblib')
try:
    import joblib
except Exception:
    joblib = None

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


def preload_deepface_models():
    """Attempt to build/load common DeepFace models at server startup to reduce per-request latency.

    This function is intentionally best-effort: failures will be logged but won't prevent the server
    from starting so that endpoints still work (they will fallback to on-demand model building).
    """
    global preloaded_models
    try:
        logger.info("Preloading DeepFace models: ArcFace (representations) and Emotion (analyzer)")
        try:
            arc = DeepFace.build_model('ArcFace')
            preloaded_models['ArcFace'] = arc
            logger.info('ArcFace model built and cached')
        except Exception as e:
            logger.warning(f'Could not build ArcFace model at startup: {e}')

        # Emotion model is used by DeepFace.analyze for emotion detection
        try:
            emo = DeepFace.build_model('Emotion')
            preloaded_models['Emotion'] = emo
            logger.info('Emotion model built and cached')
        except Exception as e:
            logger.warning(f'Could not build Emotion model at startup: {e}')

    except Exception as e:
        logger.warning(f'Unexpected error while preloading DeepFace models: {e}')


@app.on_event("startup")
async def _on_startup():
    # Best-effort: preload classifier pipeline and DeepFace models so first requests are faster.
    try:
        load_classifier_pipeline()
    except Exception as e:
        logger.warning(f'Failed to load classifier pipeline at startup: {e}')

    try:
        preload_deepface_models()
    except Exception as e:
        logger.warning(f'Preload DeepFace models failed at startup: {e}')


def load_classifier_pipeline(path: str = None):
    global classifier_pipeline
    if classifier_pipeline is not None:
        return classifier_pipeline
    p = path or CLASSIFIER_PATH
    if joblib is None:
        logger.warning('joblib not available; classifier pipeline disabled')
        return None
    if os.path.exists(p):
        try:
            classifier_pipeline = joblib.load(p)
            logger.info(f'Loaded classifier pipeline from {p}')
            return classifier_pipeline
        except Exception as e:
            logger.error(f'Failed to load classifier pipeline: {e}')
            return None
    else:
        logger.info(f'No classifier pipeline found at {p}')
        return None


@app.post('/predict_combined')
async def predict_combined(input_data: FrameInput):
    """Return both DeepFace emotion and the custom classifier prediction (trained on embeddings).

    Response JSON:
      { custom_label, custom_confidence, deepface_emotion, deepface_confidence, face_detected }
    """
    try:
        # lazy load pipeline
        pipeline = load_classifier_pipeline()

        # decode image
        try:
            frame_data = base64.b64decode(input_data.frame)
        except Exception as e:
            logger.error(f'Base64 decode failed: {e}')
            raise HTTPException(status_code=400, detail=f'Invalid Base64: {str(e)}')

        nparr = np.frombuffer(frame_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail='Invalid frame data')

        # Save to temporary file because DeepFace functions often accept file paths reliably
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.jpg') as tmp:
            ok = cv2.imwrite(tmp.name, frame)
            if not ok:
                raise HTTPException(status_code=500, detail='Failed to write temporary image')

            # Run DeepFace analyze for base emotion
            try:
                df_res = DeepFace.analyze(img_path=tmp.name, actions=['emotion'], enforce_detection=False)
                # DeepFace may return list or dict
                if isinstance(df_res, list) and len(df_res) > 0:
                    df_res = df_res[0]
                deepface_emotion = df_res.get('dominant_emotion', 'neutral')
                # get confidence if available
                deepface_conf = 0.0
                emo_map = df_res.get('emotion') or {}
                if deepface_emotion in emo_map:
                    deepface_conf = float(emo_map.get(deepface_emotion, 0.0)) / 100.0
            except Exception as e:
                logger.warning(f'DeepFace analyze failed: {e}')
                deepface_emotion = 'neutral'
                deepface_conf = 0.0

            # If we have a trained classifier pipeline, extract embedding and classify
            custom_label = None
            custom_conf = 0.0
            face_detected = False
            if pipeline is not None:
                try:
                    # Use DeepFace.represent to get embedding vector
                    emb = DeepFace.represent(img_path=tmp.name, model_name=pipeline.get('model_name', 'ArcFace'), enforce_detection=False)
                    # normalize representation format
                    if isinstance(emb, dict) and 'embedding' in emb:
                        vec = np.array(emb['embedding'], dtype=np.float32)
                    elif isinstance(emb, list) and len(emb) > 0 and isinstance(emb[0], dict) and 'embedding' in emb[0]:
                        vec = np.array(emb[0]['embedding'], dtype=np.float32)
                    else:
                        vec = np.array(emb, dtype=np.float32)

                    scaler = pipeline.get('scaler')
                    model = pipeline.get('model')
                    le = pipeline.get('label_encoder')

                    X = vec.reshape(1, -1)
                    if scaler is not None:
                        X = scaler.transform(X)

                    # prediction
                    if hasattr(model, 'predict_proba'):
                        probs = model.predict_proba(X)[0]
                        idx = int(np.argmax(probs))
                        custom_label = le.inverse_transform([idx])[0]
                        custom_conf = float(np.max(probs))
                    else:
                        pred = model.predict(X)[0]
                        custom_label = le.inverse_transform([pred])[0]
                        # fallback confidence
                        custom_conf = 1.0
                    face_detected = True
                except Exception as e:
                    logger.warning(f'Custom classifier prediction failed: {e}')

        return {
            'custom_label': custom_label,
            'custom_confidence': custom_conf,
            'deepface_emotion': deepface_emotion,
            'deepface_confidence': deepface_conf,
            'face_detected': face_detected
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Error in predict_combined: {e}', exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
