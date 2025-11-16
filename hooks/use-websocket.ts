import { useEffect, useRef, useState } from 'react'
import { WebSocketClient, type WSMessageType } from '@/lib/websocket-client'

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const clientRef = useRef<WebSocketClient | null>(null)

  useEffect(() => {
    const client = new WebSocketClient(url)
    clientRef.current = client

    client.connect()
      .then(() => {
        setIsConnected(true)
        setError(null)
      })
      .catch((err) => {
        setError(err)
        setIsConnected(false)
      })

    return () => {
      client.disconnect()
    }
  }, [url])

  const send = (type: WSMessageType, data: any) => {
    clientRef.current?.send(type, data)
  }

  const sendBinary = (data: ArrayBuffer) => {
    clientRef.current?.sendBinary(data)
  }

  const on = (type: WSMessageType, handler: (data: any) => void) => {
    clientRef.current?.on(type, handler)
  }

  const off = (type: WSMessageType, handler: (data: any) => void) => {
    clientRef.current?.off(type, handler)
  }

  return {
    isConnected,
    error,
    send,
    sendBinary,
    on,
    off,
    client: clientRef.current
  }
}
