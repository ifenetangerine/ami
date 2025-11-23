import { NextRequest, NextResponse } from 'next/server'

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  try {
    const { frame } = await request.json()

    if (!frame) {
      return NextResponse.json(
        { error: 'No frame provided' },
        { status: 400 }
      )
    }

    // Forward to Python backend combined endpoint (returns DeepFace + custom classifier)
    const response = await fetch(`${PYTHON_BACKEND_URL}/predict_combined`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ frame }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Python backend error:', error)
      return NextResponse.json(
        { error: 'Emotion detection failed', details: error },
        { status: response.status }
      )
    }

    const result = await response.json()

    // Map combined response to the original shape expected by useEmotionDetection
    // Prefer DeepFace emotion/confidence but include custom classifier data under `custom_*` keys
    const mapped = {
      emotion: result.deepface_emotion || result.custom_label || 'neutral',
      confidence: typeof result.deepface_confidence === 'number' ? result.deepface_confidence : (result.custom_confidence || 0),
      face_detected: result.face_detected || false,
      // preserve custom fields for frontend access
      custom_label: result.custom_label || null,
      custom_confidence: result.custom_confidence || null,
      raw: result
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error in emotion detection API:', error)
    return NextResponse.json(
      { error: 'Failed to process emotion detection', details: String(error) },
      { status: 500 }
    )
  }
}
