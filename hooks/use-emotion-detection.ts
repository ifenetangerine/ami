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
      console.log('Requesting camera access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      })

      console.log('Camera stream obtained:', stream.getTracks().length, 'tracks')
      streamRef.current = stream

      if (!videoRef.current) {
        console.error('Video ref not available!')
        return
      }

      // Set the stream to the video element
      videoRef.current.srcObject = stream
      console.log('Stream assigned to video element')

      // Wait a bit for the stream to be ready, then force play
      setTimeout(() => {
        if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play()
            .then(() => console.log('Video play() resolved'))
            .catch(err => console.error('Video play() failed:', err))
        }
      }, 100)

      setIsDetecting(true)
      console.log('Emotion detection started')

      // Capture frames and send to backend for real emotion detection
      intervalRef.current = setInterval(async () => {
        if (!videoRef.current) {
          console.warn('Video ref not available')
          return
        }

        try {
          // Wait for video to have proper dimensions
          if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
            console.warn(`Video not ready yet - dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`)
            return
          }

          // Check if video is playing
          if (videoRef.current.paused) {
            console.warn('Video is paused, trying to resume...')
            try {
              await videoRef.current.play()
            } catch (playErr) {
              console.error('Failed to resume video:', playErr)
            }
            return
          }

          // Create canvas and capture frame from video
          const canvas = document.createElement('canvas')
          canvas.width = videoRef.current.videoWidth
          canvas.height = videoRef.current.videoHeight
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            console.error('Failed to get canvas context')
            return
          }

          ctx.drawImage(videoRef.current, 0, 0)
          const frameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

          if (!frameBase64 || frameBase64.length === 0) {
            console.error('Failed to encode frame to Base64')
            return
          }

          console.log(`Sending frame: ${frameBase64.length} bytes`)

          // Send to backend
          const response = await fetch('/api/emotion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ frame: frameBase64 }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Failed to detect emotion:', response.status, errorText)
            return
          }

          const emotionData = await response.json()
          console.log('Raw emotion response:', emotionData)

          const result: EmotionDetectionResult = {
            emotion: emotionData.emotion as EmotionType,
            confidence: emotionData.confidence,
            timestamp: Date.now()
          }

          console.log('Setting emotion to:', result.emotion, 'confidence:', result.confidence)
          setDetectedEmotion(result.emotion)
          setConfidence(result.confidence)

          if (onEmotionDetected) {
            onEmotionDetected(result)
          }

          console.log('Emotion detected:', result.emotion, 'confidence:', result.confidence.toFixed(2))
        } catch (err) {
          console.error('Error processing emotion frame:', err)
        }
      }, 1000) // Process every 1 second

    } catch (error) {
      console.error('Failed to start emotion detection:', error)
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
    console.log('Emotion detection stopped')
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
