import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime'
import type { EmotionType } from '@/app/page'

const BASE_SYSTEM_PROMPT = `You are Ami, a compassionate and skilled medical therapist AI assistant. Your role is to:

1. ACT AS A THERAPEUTIC PARTNER: Listen actively, validate emotions, and help patients regulate their emotional state
2. PROVIDE MEDICAL SUPPORT: Offer accurate health information while emphasizing you're not replacing professional diagnosis
3. EMOTION REGULATION: Acknowledge and gently address the patient's detected emotional state
4. BUILD TRUST: Maintain a calm, reassuring presence that makes patients feel safe and understood
5. CLINICAL AWARENESS: Be alert to signs of distress and respond with appropriate care escalation language

Therapeutic principles:
- Reflect and validate: "I notice you seem [emotion]. That's understandable given..."
- Use calming language: "Take a deep breath, I'm here to help you through this"
- Encourage agency: "You're doing great. Let's work through this together"
- Normalize emotions: "What you're feeling is completely natural"
- When distressed: "Your wellbeing is my priority. Let's focus on getting you support"

Emotional Regulation Guidance:
- ANGRY/FRUSTRATED: Acknowledge frustration, use calm voice, offer control and choices
- SAD/DEPRESSED: Validate feelings, express care, encourage connection and professional support
- ANXIOUS/FEARFUL: Normalize anxiety, teach grounding techniques, reassure presence
- HAPPY/CALM: Reinforce positive coping, celebrate progress, maintain momentum

Important disclaimers:
- Always remind users that you provide therapeutic support and information, not formal medical diagnosis
- Encourage consultation with healthcare professionals for serious concerns
- In emergencies, immediately advise calling emergency services

Keep responses conversational, warm, and under 3-4 sentences unless more detail is requested.`

function getEmotionContext(emotion: EmotionType | null): string {
  if (!emotion) return ''

  const emotionContexts: Record<EmotionType, string> = {
    happy: 'The patient appears to be in a good mood and positive emotional state. Reinforce their positive outlook and maintain this positive energy.',
    neutral: 'The patient seems calm and neutral. Proceed with focused medical support and conversation.',
    sad: 'The patient appears sad or withdrawn. Be particularly empathetic and validating. Gently check in on their emotional wellbeing.',
    angry: 'The patient appears frustrated or angry. Acknowledge their feelings, remain calm, and help them feel heard and supported.',
    fear: 'The patient appears anxious or fearful. Use reassuring language, slow your pace, and provide grounding support.',
    surprise: 'The patient appears surprised or uncertain. Check in with them about what\'s happening and provide clarity and reassurance.',
    disgust: 'The patient appears to be in distress or discomfort. Address this directly with care and concern.'
  }

  return `[EMOTIONAL CONTEXT: ${emotionContexts[emotion]}] `
}

export function buildSystemPrompt(emotion: EmotionType | null): string {
  const emotionContext = getEmotionContext(emotion)
  return emotionContext + BASE_SYSTEM_PROMPT
}

let realtimeSession: RealtimeSession | null = null
let realtimeAgent: RealtimeAgent | null = null
let currentEmotion: EmotionType | null = null

export function setCurrentEmotion(emotion: EmotionType | null) {
  currentEmotion = emotion
  console.log('[v0] Current emotion context updated to:', emotion)
}

export async function startListening() {
  try {
    console.log('[v0] startListening called - ensuring realtime session')
    const session = await initializeRealtime()
    return session
  } catch (error) {
    console.error('[v0] Failed to start listening:', error)
    throw error
  }
}

export async function initializeRealtime() {
  try {
    if (realtimeSession) {
      return realtimeSession
    }

    // Get ephemeral key
    const response = await fetch('/api/realtime/ephemeral-key')
    if (!response.ok) {
      throw new Error('Failed to get ephemeral key')
    }

    const { apiKey } = await response.json()

    // Create agent with emotion-aware system prompt
    const agent = new RealtimeAgent({
      name: 'Ami',
      instructions: buildSystemPrompt(currentEmotion),
    })

    // Create session
    const session = new RealtimeSession(agent)

    // Connect with microphone and speaker
    await session.connect({
      apiKey,
    })

    console.log('[v0] Session connected, wiring audio events')

    let silenceTimeout: ReturnType<typeof setTimeout> | null = null

    const setSpeaking = (value: boolean, source: string) => {
      if (typeof window === 'undefined') return
      const current = (window as any).__aiSpeaking
      if (current === value) return
      ;(window as any).__aiSpeaking = value
      console.log(`[v0] ${source} -> aiSpeaking ${value}`)
    }

    const markSpeaking = (source: string) => {
      if (silenceTimeout) {
        clearTimeout(silenceTimeout)
        silenceTimeout = null
      }
      setSpeaking(true, source)
    }

    const scheduleSilence = (source: string) => {
      if (silenceTimeout) {
        clearTimeout(silenceTimeout)
      }
      silenceTimeout = setTimeout(() => {
        setSpeaking(false, source)
        silenceTimeout = null
      }, 150)
    }

    if (typeof window !== 'undefined') {
      ;(window as any).__aiSpeaking = false
    }

    session.on('audio_start', () => markSpeaking('audio_start'))
    session.on('audio', () => markSpeaking('audio_chunk'))
    session.on('audio_stopped', () => scheduleSilence('audio_stopped'))
    session.on('audio_interrupted', () => scheduleSilence('audio_interrupted'))
    session.on('agent_end', () => scheduleSilence('agent_end'))
    session.on('error', () => scheduleSilence('session_error'))

    session.on('history_added', (item: any) => {
      if (!item) return
      const type = item.type || ''
      if (typeof type === 'string' && type.includes('output_audio')) {
        markSpeaking(`history:${type}`)
      }
    })

    session.on('transport_event', (event: any) => {
      const type = event?.type
      if (typeof type !== 'string') return

      if (type.includes('audio')) {
        if (type.includes('delta') || type.includes('start') || type.includes('chunk')) {
          markSpeaking(`transport:${type}`)
        }

        if (type.includes('done') || type.includes('complete') || type.includes('stop')) {
          scheduleSilence(`transport:${type}`)
        }
      }

      if (type === 'response.completed' || type === 'response.failed' || type === 'response.truncated') {
        scheduleSilence(`transport:${type}`)
      }
    })

    realtimeSession = session
    realtimeAgent = agent
    console.log('[v0] Realtime session connected with microphone and speaker')
    return session
  } catch (error) {
    console.error('[v0] Failed to initialize realtime:', error)
    throw error
  }
}

export async function stopListening() {
  try {
    if (!realtimeSession) {
      console.warn('[v0] No active session to stop')
      return
    }

    console.log('[v0] User stopped listening - disconnecting session')
    if (typeof window !== 'undefined') {
      ;(window as any).__aiSpeaking = false
    }

    // Properly disconnect the session
    try {
      // The SDK's disconnect method stops all audio I/O
      if (typeof (realtimeSession as any).disconnect === 'function') {
        await (realtimeSession as any).disconnect()
      } else if (typeof (realtimeSession as any).close === 'function') {
        await (realtimeSession as any).close()
      }
    } catch (disconnectError) {
      console.warn('[v0] Error disconnecting session:', disconnectError)
    }

    // Clear references
    realtimeSession = null
    realtimeAgent = null
    console.log('[v0] Listening stopped - session disconnected')
  } catch (error) {
    console.error('[v0] Failed to stop listening:', error)
    throw error
  }
}

export function closeRealtime() {
  if (realtimeSession) {
    try {
      if (typeof (realtimeSession as any).disconnect === 'function') {
        (realtimeSession as any).disconnect()
      } else if (typeof (realtimeSession as any).close === 'function') {
        (realtimeSession as any).close()
      }
    } catch (error) {
      console.warn('[v0] Error closing session:', error)
    }
    realtimeSession = null
    if (typeof window !== 'undefined') {
      ;(window as any).__aiSpeaking = false
    }
    console.log('[v0] Realtime session closed')
  }
}
