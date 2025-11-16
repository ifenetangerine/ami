# Emotion Detection Workflow - Verification Checklist

## File Structure
✓ `/Users/irenetang/Downloads/ami-mvp/app/api/emotion/route.ts` - Next.js API bridge
✓ `/Users/irenetang/Downloads/ami-mvp/python_backend/main.py` - Python backend
✓ `/Users/irenetang/Downloads/ami-mvp/hooks/use-emotion-detection.ts` - React hook

## Workflow Chain

### 1. Frontend (React Hook)
**File**: `hooks/use-emotion-detection.ts`
- Gets webcam stream via `getUserMedia()`
- Every 1 second:
  - Captures frame to canvas
  - Converts to Base64 JPEG
  - POSTs to `/api/emotion` with `{ frame: "base64string" }`
- Updates emotion state from response

**Checks**:
- ✓ Video dimensions checked before encoding
- ✓ Canvas context properly validated
- ✓ Base64 encoding with quality 0.8
- ✓ Error handling with logging

### 2. Next.js API Bridge
**File**: `app/api/emotion/route.ts`
- Receives POST request with Base64 frame
- Forwards to Python backend at `http://127.0.0.1:8000/detect_emotion`
- Returns emotion + confidence to frontend

**Checks**:
- ✓ Fixed: `export async function` (was `export async def`)
- ✓ Uses `PYTHON_BACKEND_URL` env var with fallback
- ✓ Proper error handling with details

### 3. Python Backend
**File**: `python_backend/main.py`
- Receives POST to `/detect_emotion`
- Decodes Base64 frame
- Detects faces with Haar Cascade
- Analyzes emotion with DeepFace
- Returns `{ emotion, confidence, face_detected }`

**Checks**:
- ✓ CORS enabled for localhost:3000 and localhost:3001
- ✓ Base64 decode with error handling
- ✓ Haar Cascade face detection
- ✓ DeepFace emotion analysis
- ✓ Emotion mapping to app types
- ✓ Better error logging with `exc_info=True`

## Setup Instructions

### 1. Start Python Backend
```bash
cd /Users/irenetang/Downloads/ami-mvp/python_backend
python main.py
# Should see: "INFO:     Uvicorn running on http://127.0.0.1:8000"
```

### 2. Verify Python Backend
```bash
curl http://127.0.0.1:8000/health
# Should return: {"status":"ok"}
```

### 3. Add to `.env.local` (optional)
```
PYTHON_BACKEND_URL=http://127.0.0.1:8000
```

### 4. Start Next.js
```bash
pnpm dev
# Should see: "ready - started server on ... url: http://localhost:3000"
```

### 5. Enable Emotion Detection
- Open http://localhost:3000
- Click camera/emotion detection button
- Open browser console (F12) to see logs
- Should see frame sizes and detection results

## Debugging

**Bad Request (400)** on `/api/emotion`:
- Check if frame Base64 is empty
- Browser console will show frame size: "Sending frame: XXXX bytes"
- If 0 bytes, video not loaded yet

**Python Backend Error**:
- Check terminal logs for detailed stack trace
- Python logs show frame decode/face detection/emotion analysis steps

**No Emotion Detected**:
- Check `face_detected: false` in response
- Ensure face is visible and well-lit
- Try moving closer to camera

**Timeout/Connection Error**:
- Verify Python backend running: `curl http://127.0.0.1:8000/health`
- Check CORS: Python backend allows localhost:3000/3001
- Network tab in DevTools shows error details

## Expected Logs

**Browser Console**:
```
Emotion detection started
Sending frame: 15234 bytes
Emotion detected: happy confidence: 0.85
Emotion detected: neutral confidence: 0.62
```

**Python Terminal**:
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     127.0.0.1:8000 - "POST /detect_emotion HTTP/1.1" 200 OK
INFO:     Received frame of length: 15234
INFO:     Emotion detected: happy (confidence: 0.85)
```
