import { useCallback, useEffect, useRef, useState } from 'react'
import { WebSocketClient, type WSMessage } from '@/lib/websocket-client'

interface UseRealtimeAudioPlaybackOptions {
  client: WebSocketClient | null
  isConnected: boolean
}

export function useRealtimeAudioPlayback({ client, isConnected }: UseRealtimeAudioPlaybackOptions) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioQueueRef = useRef<Float32Array[]>([])
  const isProcessingRef = useRef(false)

  // Initialize audio context for playback
  const initializeAudioPlayback = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Decode base64 PCM and play
  const playAudioChunk = useCallback((base64Audio: string) => {
    if (!audioContextRef.current) return

    try {
      const ctx = audioContextRef.current

      // Decode base64 to binary
      const binaryStr = atob(base64Audio)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }

      // Convert 16-bit PCM to float32
      const int16Data = new Int16Array(bytes.buffer)
      const float32Data = new Float32Array(int16Data.length)

      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 0x7fff
      }

      // Create and play audio buffer
      const buffer = ctx.createBuffer(1, float32Data.length, ctx.sampleRate)
      const channelData = buffer.getChannelData(0)
      channelData.set(float32Data)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(ctx.currentTime)

      setIsPlaying(true)
      source.onended = () => {
        setIsPlaying(false)
      }

      console.log('[v0] Playing audio chunk')
    } catch (error) {
      console.error('[v0] Failed to play audio chunk:', error)
    }
  }, [])

  // Set up message handler for audio output
  useEffect(() => {
    if (!client || !isConnected) return

    const handleMessage = (message: WSMessage) => {
      // Initialize audio context on first message
      initializeAudioPlayback().catch(console.error)

      // Handle audio delta events from OpenAI realtime
      if (message.type === 'response.audio.delta' && message.delta) {
        playAudioChunk(message.delta)
      }

      // Handle audio transcript done
      if (message.type === 'response.audio_transcript.delta' && message.delta) {
        console.log('[v0] Assistant audio transcript:', message.delta)
      }

      if (message.type === 'response.audio_transcript.done' && message.transcript) {
        console.log('[v0] Assistant audio complete:', message.transcript)
      }
    }

    client.onAny(handleMessage)

    return () => {
      client.offAny(handleMessage)
    }
  }, [client, isConnected, initializeAudioPlayback, playAudioChunk])

  return {
    isPlaying,
    initializeAudioPlayback,
    playAudioChunk
  }
}
