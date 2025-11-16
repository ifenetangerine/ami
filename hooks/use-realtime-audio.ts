import { useCallback, useEffect, useRef, useState } from 'react'
import { WebSocketClient, type WSMessage } from '@/lib/websocket-client'

interface UseRealtimeAudioOptions {
  client: WebSocketClient | null
  isConnected: boolean
  onTranscript?: (text: string) => void
  onAudioChunk?: (chunk: Uint8Array) => void
  onError?: (error: Error) => void
}

export function useRealtimeAudio({
  client,
  isConnected,
  onTranscript,
  onAudioChunk,
  onError
}: UseRealtimeAudioOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize audio context and processor for capturing PCM frames
  const initializeAudioCapture = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const ctx = audioContextRef.current
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    if (!sourceRef.current) {
      sourceRef.current = ctx.createMediaStreamSource(stream)
    }

    if (!processorRef.current) {
      processorRef.current = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current.onaudioprocess = (event) => {
        if (!isStreaming || !client || !isConnected) return

        const pcmData = event.inputBuffer.getChannelData(0)
        const int16Data = new Int16Array(pcmData.length)

        for (let i = 0; i < pcmData.length; i++) {
          int16Data[i] = Math.max(-1, Math.min(1, pcmData[i])) * 0x7fff
        }

        if (onAudioChunk) {
          onAudioChunk(new Uint8Array(int16Data.buffer))
        }

        // Send audio to OpenAI via input_audio_buffer.append
        const base64Audio = Buffer.from(int16Data.buffer).toString('base64')
        client.sendRaw({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        })
      }

      sourceRef.current.connect(processorRef.current)
      processorRef.current.connect(ctx.destination)
    }

    setIsStreaming(true)
    console.log('[v0] Audio capture initialized')
  }, [client, isConnected, isStreaming, onAudioChunk])

  // Stop audio capture
  const stopAudioCapture = useCallback(() => {
    setIsStreaming(false)

    if (processorRef.current && sourceRef.current) {
      sourceRef.current.disconnect(processorRef.current)
      processorRef.current.disconnect()
      processorRef.current = null
      sourceRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    console.log('[v0] Audio capture stopped')
  }, [])

  // Commit audio buffer and create response
  const commitAudioAndRespond = useCallback(() => {
    if (!client || !isConnected) {
      if (onError) {
        onError(new Error('WebSocket not connected'))
      }
      return
    }

    try {
      // Commit the input audio buffer
      client.sendRaw({
        type: 'input_audio_buffer.commit'
      })

      // Create a response from OpenAI
      client.sendRaw({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio']
        }
      })

      console.log('[v0] Audio buffer committed and response requested')
    } catch (error) {
      if (onError) {
        onError(error as Error)
      }
    }
  }, [client, isConnected, onError])

  // Set up message handlers for receiving transcripts
  useEffect(() => {
    if (!client || !isConnected) return

    const handleMessage = (message: WSMessage) => {
      // Handle transcript from conversation items
      if (message.type === 'conversation.item.create') {
        const item = message.item
        if (item && item.type === 'message' && item.role === 'user') {
          const content = item.content?.[0]
          if (content && content.type === 'text' && onTranscript) {
            onTranscript(content.text)
          }
        }
      }

      // Handle response text
      if (message.type === 'response.text.delta' && message.delta && onTranscript) {
        onTranscript(message.delta)
      }

      // Handle response text done
      if (message.type === 'response.text.done' && message.text && onTranscript) {
        onTranscript(message.text)
      }

      // Log errors
      if (message.type === 'error') {
        console.error('[v0] Realtime error:', message.error)
        if (onError) {
          onError(new Error(message.error?.message ?? 'Unknown realtime error'))
        }
      }
    }

    client.onAny(handleMessage)

    return () => {
      client.offAny(handleMessage)
    }
  }, [client, isConnected, onTranscript, onError])

  return {
    isStreaming,
    initializeAudioCapture,
    stopAudioCapture,
    commitAudioAndRespond
  }
}
