import { useCallback, useEffect, useRef, useState } from 'react'
import { initializeRealtime, startListening as speakStartListening, stopListening as speakStopListening, closeRealtime as speakCloseRealtime } from './speak'

interface UseRealtimeAgentOptions {
  instructions?: string
  onTranscript?: (text: string) => void
  onAudioResponse?: () => void
}

export function useRealtimeAgent({ instructions, onTranscript, onAudioResponse }: UseRealtimeAgentOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const initAttemptedRef = useRef(false)

  // Initialize on mount
  useEffect(() => {
    if (initAttemptedRef.current) return
    initAttemptedRef.current = true

    const initialize = async () => {
      try {
        console.log('[v0] Initializing realtime agent...')
        const session = await initializeRealtime()
        setIsConnected(true)
        setError(null)
        console.log('[v0] Realtime agent ready')
      } catch (err) {
        const error = err as Error
        console.error('[v0] Failed to initialize realtime agent:', error)
        setError(error)
        setIsConnected(false)
      }
    }

    initialize()
  }, [])

  // Start listening
  const startListening = useCallback(async () => {
    try {
      if (!isConnected) {
        throw new Error('Realtime agent not initialized')
      }
      setIsListening(true)
      await speakStartListening()
      console.log('[v0] Started listening')
    } catch (err) {
      const error = err as Error
      console.error('[v0] Failed to start listening:', error)
      setError(error)
      setIsListening(false)
      throw error
    }
  }, [isConnected])

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      setIsListening(false)
      await speakStopListening()
      console.log('[v0] Stopped listening')
    } catch (err) {
      const error = err as Error
      console.error('[v0] Failed to stop listening:', error)
      setError(error)
      throw error
    }
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    speakCloseRealtime()
    setIsConnected(false)
    setIsListening(false)
    console.log('[v0] Realtime agent disconnected')
  }, [])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    isListening,
    error,
    startListening,
    stopListening,
    disconnect,
  }
}
