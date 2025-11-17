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

    console.log('[v0] Session connected, setting up audio analysis')
    console.log('[v0] Session object keys:', Object.keys(session))
    console.log('[v0] Session object:', session)

    // Initialize the flag
    ;(window as any).__aiSpeaking = false

    // Try different event names and hooks
    if (typeof (session as any).on === 'function') {
      console.log('[v0] Attaching to session.on("output")')
      ;(session as any).on('output', (o: any) => {
        console.log('[v0] Output event fired:', o.type)
        ;(window as any).__aiSpeaking = true
      })
    }

    // Also try agent
    if (typeof (agent as any).on === 'function') {
      console.log('[v0] Attaching to agent.on("response")')
      ;(agent as any).on('response', (r: any) => {
        console.log('[v0] Response event fired')
        ;(window as any).__aiSpeaking = true
      })
    }

    // Monitor the session's internal state
    const stateCheckInterval = setInterval(() => {
      const sessionState = (session as any)
      // Look for audio-related properties
      if (sessionState.isPlayingAudio !== undefined) {
        ;(window as any).__aiSpeaking = sessionState.isPlayingAudio
      }
      if (sessionState.audioBuffer !== undefined && sessionState.audioBuffer.length > 0) {
        ;(window as any).__aiSpeaking = true
      }
    }, 50)

    if (!(session as any).__stateCheckInterval) {
      (session as any).__stateCheckInterval = stateCheckInterval
    }    // Fallback: Set up a heartbeat to animate mouth while speaking
    let heartbeatCount = 0
    const heartbeat = setInterval(() => {
      heartbeatCount++
      const updateFunc = (window as any).updateAvatarAmplitude
      if (updateFunc && typeof updateFunc === 'function') {
        if (heartbeatCount === 1) {
          console.log('[v0] Heartbeat started')
        }

        if ((window as any).__aiSpeaking) {
          // Animate mouth cycling through speaking patterns
          const data = new Float32Array(256)
          const amplitude = 0.4 + Math.sin(Date.now() / 200) * 0.3
          for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() - 0.5) * 2 * amplitude
          }
          updateFunc(data)
        } else {
          // Even when not speaking, call it with empty data
          updateFunc(new Float32Array(256))
        }
      }
    }, 100)

    // Store the heartbeat interval so we can clear it later
    if (!(session as any).__heartbeat) {
      (session as any).__heartbeat = heartbeat
    }

    realtimeSession = session
    realtimeAgent = agent
    console.log('[v0] Realtime session connected with microphone and speaker')
    return session
  } catch (error) {
    console.error('[v0] Failed to initialize realtime:', error)
    throw error
  }
}

export async function startListening() {
  try {
    console.log('[v0] startListening called - initializing realtime')
    const session = await initializeRealtime()
    // RealtimeSession automatically handles microphone input
    console.log('[v0] Listening started - microphone is active')
    return session
  } catch (error) {
    console.error('[v0] Failed to start listening:', error)
    throw error
  }
}

export async function stopListening() {
  try {
    if (!realtimeSession) {
      console.warn('[v0] No active session to stop')
      return
    }

    // Clear heartbeat if it exists
    if ((realtimeSession as any).__heartbeat) {
      clearInterval((realtimeSession as any).__heartbeat)
      console.log('[v0] Cleared audio heartbeat')
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
      // Clear heartbeat if it exists
      if ((realtimeSession as any).__heartbeat) {
        clearInterval((realtimeSession as any).__heartbeat)
      }

      if (typeof (realtimeSession as any).disconnect === 'function') {
        (realtimeSession as any).disconnect()
      } else if (typeof (realtimeSession as any).close === 'function') {
        (realtimeSession as any).close()
      }
    } catch (error) {
      console.warn('[v0] Error closing session:', error)
    }
    realtimeSession = null
    console.log('[v0] Realtime session closed')
  }
}
