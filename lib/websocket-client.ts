export type WSMessageType = string

export interface WSMessage {
  type: WSMessageType
  [key: string]: any
}

interface WebSocketClientOptions {
  url: string
  apiKey?: string
  binaryType?: BinaryType
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private readonly url: string
  private readonly apiKey?: string
  private readonly binaryType: BinaryType
  private messageHandlers: Map<WSMessageType, ((message: WSMessage) => void)[]> = new Map()
  private defaultHandlers: Array<(message: WSMessage) => void> = []

  constructor(options: WebSocketClientOptions) {
    this.url = options.url
    this.apiKey = options.apiKey
    this.binaryType = options.binaryType ?? 'arraybuffer'
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // For browser environment, WebSocket doesn't support custom headers
        // The API key is passed in the URL or headers if in a Node.js environment
        const wsUrl = this.apiKey ? `${this.url}&api_key=${this.apiKey}` : this.url
        this.ws = new WebSocket(wsUrl)
        this.ws.binaryType = this.binaryType

        this.ws.onopen = () => {
          console.log('[v0] OpenAI Realtime WebSocket connected')
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            if (typeof event.data === 'string') {
              const message: WSMessage = JSON.parse(event.data)
              this.dispatchMessage(message)
            } else {
              console.log('[v0] Received binary data:', event.data)
            }
          } catch (error) {
            console.error('[v0] Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[v0] WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log('[v0] WebSocket closed', event.code, event.reason)
          this.ws = null
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private dispatchMessage(message: WSMessage) {
    this.defaultHandlers.forEach(handler => handler(message))

    if (!message.type) {
      return
    }

    const handlers = this.messageHandlers.get(message.type)
    if (handlers) {
      handlers.forEach(handler => handler(message))
    }
  }

  on(type: WSMessageType, handler: (message: WSMessage) => void) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }

    this.messageHandlers.get(type)!.push(handler)
  }

  onAny(handler: (message: WSMessage) => void) {
    this.defaultHandlers.push(handler)
  }

  off(type: WSMessageType, handler: (message: WSMessage) => void) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  offAny(handler: (message: WSMessage) => void) {
    const index = this.defaultHandlers.indexOf(handler)
    if (index > -1) {
      this.defaultHandlers.splice(index, 1)
    }
  }

  send(type: WSMessageType, data?: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = data ? { type, ...data } : { type }
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[v0] WebSocket not connected, message not sent')
    }
  }

  sendRaw(payload: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload))
    } else {
      console.warn('[v0] WebSocket not connected, message not sent')
    }
  }

  sendBinary(data: ArrayBuffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    } else {
      console.warn('[v0] WebSocket not connected, binary message not sent')
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}
