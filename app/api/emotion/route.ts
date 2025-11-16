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

    // Forward to Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/detect_emotion`, {
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
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in emotion detection API:', error)
    return NextResponse.json(
      { error: 'Failed to process emotion detection', details: String(error) },
      { status: 500 }
    )
  }
}
