#!/bin/bash

echo "=== Checking Next.js Backend ==="
curl -s http://localhost:3000/api/emotion -X POST \
  -H "Content-Type: application/json" \
  -d '{"frame":""}' 2>&1 | head -20
echo -e "\n"

echo "=== Checking Python Backend Health ==="
curl -s http://127.0.0.1:8000/health 2>&1
echo -e "\n"

echo "=== Environment Check ==="
echo "PYTHON_BACKEND_URL=${PYTHON_BACKEND_URL:-not set, will use default}"
