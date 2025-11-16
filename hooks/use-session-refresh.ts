import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSessionRefreshOptions {
  isConnected: boolean
  onReconnect?: () => void
  onError?: (error: Error) => void
}

export function useSessionRefresh({
  isConnected,
  onReconnect,
  onError
}: UseSessionRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const attemptReconnect = useCallback(async () => {
    if (isConnected) return

    setIsRefreshing(true)
    try {
      console.log('[v0] Attempting to reconnect to OpenAI Realtime')
      if (onReconnect) {
        onReconnect()
      }
    } catch (error) {
      console.error('[v0] Reconnection error:', error)
      if (onError) {
        onError(error as Error)
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [isConnected, onReconnect, onError])

  // Auto-reconnect if connection drops
  useEffect(() => {
    if (isConnected) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      return
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      attemptReconnect()
    }, 3000)

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [isConnected, attemptReconnect])

  return {
    isRefreshing,
    attemptReconnect
  }
}
