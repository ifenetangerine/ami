import { NextResponse } from 'next/server'

const DEFAULT_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview'
const DEFAULT_REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE ?? 'verse'

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify({
        model: DEFAULT_REALTIME_MODEL,
        voice: DEFAULT_REALTIME_VOICE
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[v0] Failed to create OpenAI realtime session:', error)
      return NextResponse.json({ error: 'Failed to create OpenAI realtime session' }, { status: 500 })
    }

    const session = await response.json()
    return NextResponse.json(session)
  } catch (error) {
    console.error('[v0] Unexpected realtime session error:', error)
    return NextResponse.json({ error: 'Unexpected realtime session error' }, { status: 500 })
  }
}
