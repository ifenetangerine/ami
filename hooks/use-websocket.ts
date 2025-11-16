import { useCallback, useEffect, useRef, useState } from 'react'
import { WebSocketClient, type WSMessageType, type WSMessage } from '@/lib/websocket-client'

interface UseRealtimeOptions {
  model?: string
}

export function useWebSocket(options: UseRealtimeOptions = {}) {
  const { model = 'gpt-4o-realtime-preview' } = options

  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const clientRef = useRef<WebSocketClient | null>(null)

  useEffect(() => {
    let isMounted = true

    async function initialize() {
      setIsConnected(false)
      setError(null)

      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY

        if (!apiKey) {
          throw new Error('NEXT_PUBLIC_OPENAI_API_KEY is not configured')
        }

        const wsUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`

        const client = new WebSocketClient({
          url: wsUrl,
          apiKey: apiKey,
          binaryType: 'arraybuffer'
        })

        await client.connect()
        if (!isMounted) {
          client.disconnect()
          return
        }

        clientRef.current = client
        setError(null)
        setIsConnected(true)

        // Send initial session update
        client.sendRaw({
          type: 'session.update',
          session: {
            type: 'realtime',
            modalities: ['text', 'audio'],
            instructions: 'You are Ami, a compassionate medical AI assistant.'
          }
        })

        console.log('[v0] OpenAI Realtime session initialized')
      } catch (err) {
        console.error('[v0] Failed to connect to OpenAI realtime API:', err)
        if (!isMounted) return
        clientRef.current?.disconnect()
        clientRef.current = null
        setError(err as Error)
        setIsConnected(false)
      }
    }

    initialize()

    return () => {
      isMounted = false
      clientRef.current?.disconnect()
      clientRef.current = null
    }
  }, [model])

  const send = useCallback((type: WSMessageType, data?: Record<string, any>) => {
    clientRef.current?.send(type, data)
  }, [])

  const sendRaw = useCallback((payload: Record<string, any>) => {
    clientRef.current?.sendRaw(payload)
  }, [])

  const sendBinary = useCallback((data: ArrayBuffer) => {
    clientRef.current?.sendBinary(data)
  }, [])

  const on = useCallback((type: WSMessageType, handler: (message: WSMessage) => void) => {
    clientRef.current?.on(type, handler)
  }, [])

  const onAny = useCallback((handler: (message: WSMessage) => void) => {
    clientRef.current?.onAny(handler)
  }, [])

  const off = useCallback((type: WSMessageType, handler: (message: WSMessage) => void) => {
    clientRef.current?.off(type, handler)
  }, [])

  const offAny = useCallback((handler: (message: WSMessage) => void) => {
    clientRef.current?.offAny(handler)
  }, [])

  return {
    isConnected,
    error,
    send,
    sendRaw,
    sendBinary,
    on,
    onAny,
    off,
    offAny,
    client: clientRef.current
  }
}
