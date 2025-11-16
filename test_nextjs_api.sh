#!/bin/bash

# Get a test frame
python3 << 'PYTHON'
import base64
import cv2
import numpy as np

# Create a test image
img = np.ones((480, 640, 3), dtype=np.uint8) * 128
_, encoded = cv2.imencode('.jpg', img)
frame_base64 = base64.b64encode(encoded).decode('utf-8')

print(frame_base64)
PYTHON
