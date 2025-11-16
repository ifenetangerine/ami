import { useRef, useState, useCallback } from 'react'
import type { EmotionType } from '@/app/page'

interface EmotionDetectionResult {
  emotion: EmotionType
  confidence: number
  timestamp: number
}

export function useEmotionDetection() {
  const [detectedEmotion, setDetectedEmotion] = useState<EmotionType>('neutral')
  const [confidence, setConfidence] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startDetection = useCallback(async (
    onEmotionDetected?: (result: EmotionDetectionResult) => void
  ) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setIsDetecting(true)
      console.log('[v0] Emotion detection started')

      // Simulate emotion detection at regular intervals
      // In production, this would send frames to the backend for analysis
      intervalRef.current = setInterval(() => {
        const emotions: EmotionType[] = ['neutral', 'happy', 'sad', 'anxious', 'angry', 'surprised']
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)]
        const randomConfidence = 0.6 + Math.random() * 0.4

        const result: EmotionDetectionResult = {
          emotion: randomEmotion,
          confidence: randomConfidence,
          timestamp: Date.now()
        }

        setDetectedEmotion(result.emotion)
        setConfidence(result.confidence)

        if (onEmotionDetected) {
          onEmotionDetected(result)
        }

        console.log('[v0] Emotion detected:', result.emotion, 'confidence:', result.confidence.toFixed(2))
      }, 3000)

    } catch (error) {
      console.error('[v0] Failed to start emotion detection:', error)
      throw error
    }
  }, [])

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsDetecting(false)
    setDetectedEmotion('neutral')
    setConfidence(0)
    console.log('[v0] Emotion detection stopped')
  }, [])

  return {
    detectedEmotion,
    confidence,
    isDetecting,
    videoRef,
    startDetection,
    stopDetection
  }
}
