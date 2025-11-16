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
    // Don't auto-initialize anymore - wait for user to click mic button
    // This prevents the realtime connection from being active on page load
  }, [])

  // Start listening
  const startListening = useCallback(async () => {
    try {
      // Initialize on first use if not already attempted
      if (!initAttemptedRef.current) {
        console.log('[v0] Initializing realtime agent on first use...')
        initAttemptedRef.current = true
        await initializeRealtime()
        setIsConnected(true)
        console.log('[v0] Realtime agent ready')
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
  }, [])

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      await speakStopListening()
      setIsListening(false)
      console.log('[v0] Stopped listening')
    } catch (err) {
      const error = err as Error
      console.error('[v0] Failed to stop listening:', error)
      setError(error)
      // Still set to false even if disconnect failed
      setIsListening(false)
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
