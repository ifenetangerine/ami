import base64
import requests
import cv2
import numpy as np

# Create a simple test image (640x480 BGR image with a face-like pattern)
img = cv2.imread('/Users/irenetang/Downloads/ami-mvp/public/favicon.ico') if cv2.imread('/Users/irenetang/Downloads/ami-mvp/public/favicon.ico') is not None else np.zeros((480, 640, 3), dtype=np.uint8)

if img is None or img.shape[0] == 0:
    # Create a blank test image
    img = np.ones((480, 640, 3), dtype=np.uint8) * 128

# Encode to JPEG and Base64
_, encoded = cv2.imencode('.jpg', img)
frame_base64 = base64.b64encode(encoded).decode('utf-8')

print(f"Frame Base64 length: {len(frame_base64)}")

# Send to backend
response = requests.post('http://127.0.0.1:8000/detect_emotion', 
    json={'frame': frame_base64},
    headers={'Content-Type': 'application/json'}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
