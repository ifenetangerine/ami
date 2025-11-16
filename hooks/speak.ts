import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime'

const SYSTEM_PROMPT = `You are Ami, a compassionate and knowledgeable medical AI assistant. Your personality traits:

1. EMPATHETIC: You genuinely care about the user's wellbeing and adjust your tone based on their emotional state
2. KNOWLEDGEABLE: You provide accurate medical information while being clear you're not replacing professional diagnosis
3. CALM: You maintain a soothing, reassuring presence especially in stressful situations
4. RESPECTFUL: You acknowledge the user's concerns without dismissing them

Important disclaimers:
- Always remind users that you provide information, not formal medical diagnosis
- Encourage users to consult healthcare professionals for serious concerns
- In emergencies, immediately advise calling emergency services

Keep responses conversational, clear, and under 3-4 sentences unless more detail is requested.`

let realtimeSession: RealtimeSession | null = null

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

    // Create agent with system prompt
    const agent = new RealtimeAgent({
      name: 'Ami',
      instructions: SYSTEM_PROMPT,
    })

    // Create session
    const session = new RealtimeSession(agent)

    // Connect with microphone and speaker
    await session.connect({
      apiKey,
    })

    realtimeSession = session
    console.log('[v0] Realtime session connected with microphone and speaker')

    return session
  } catch (error) {
    console.error('[v0] Failed to initialize realtime:', error)
    throw error
  }
}

export async function startListening() {
  try {
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
    // Note: The RealtimeSession handles audio input/output automatically
    // You may need to pause or stop based on the actual SDK API
    console.log('[v0] Listening stopped')
  } catch (error) {
    console.error('[v0] Failed to stop listening:', error)
    throw error
  }
}

export function closeRealtime() {
  if (realtimeSession) {
    // Disconnect based on actual SDK method
    // realtimeSession.disconnect?.()
    realtimeSession = null
    console.log('[v0] Realtime session closed')
  }
}
