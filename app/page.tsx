'use client'

import { AnimatedFace } from '@/components/animated-face'
import { HealthMonitor } from '@/components/health-monitor'
import { VoiceControls } from '@/components/voice-controls'
import { EmotionDisplay } from '@/components/emotion-display'
import { CameraPreview } from '@/components/camera-preview'
import { useEmotionDetection } from '@/hooks/use-emotion-detection'
import { useHealthMonitoring } from '@/hooks/use-health-monitoring'
import { useRealtimeAgent } from '@/hooks/use-realtime-agent'
import { useState, useEffect } from 'react'
import { startListening, stopListening, closeRealtime } from '@/hooks/speak'

export type EmotionType = 'angry' | 'disgust' | 'fear' | 'happy' | 'neutral' | 'sad' | 'surprise'

export default function Page() {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const {
    detectedEmotion,
    confidence,
    isDetecting,
    videoRef,
    startDetection,
    stopDetection
  } = useEmotionDetection()

  const {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearAlert
  } = useHealthMonitoring(videoRef as React.RefObject<HTMLVideoElement>)

  // Initialize realtime agent (handles mic and speaker automatically)
  const { isConnected, isListening: agentIsListening, error, startListening, stopListening: agentStopListening } = useRealtimeAgent({
    onTranscript: (text: string) => {
      console.log('[AMI] User transcript:', text)
    },
    onAudioResponse: () => {
      setIsProcessing(false)
    }
  })

  useEffect(() => {
    if (isListening) {
      setCurrentEmotion('happy')
    } else if (detectedEmotion !== 'neutral') {
      setCurrentEmotion(detectedEmotion)
    } else {
      setCurrentEmotion('neutral')
    }
    console.log('[Page] Emotion state updated - currentEmotion:', currentEmotion, 'detectedEmotion:', detectedEmotion)
  }, [isListening, detectedEmotion])

  useEffect(() => {
    if (isDetecting && !isMonitoring) {
      startMonitoring()
    } else if (!isDetecting && isMonitoring) {
      stopMonitoring()
    }
  }, [isDetecting, isMonitoring, startMonitoring, stopMonitoring])

  useEffect(() => {
    if (isConnected) {
      console.log('[v0] OpenAI Realtime agent connected')
    } else if (error) {
      console.error('[v0] Realtime connection error:', error.message)
    }
  }, [isConnected, error])

  const handleToggleCamera = async () => {
    console.log('[Page] handleToggleCamera called - isDetecting:', isDetecting)
    if (isDetecting) {
      stopDetection()
    } else {
      try {
        await startDetection((result: any) => {
          console.log('[Page] Emotion callback received:', result)
        })
      } catch (err) {
        console.error('[Page] Failed to start camera:', err)
      }
    }
  }

  const handleStartListening = async () => {
    try {
      setIsListening(true)
      await startListening()
    } catch (err) {
      console.error('[v0] Failed to start listening:', err)
      setIsListening(false)
    }
  }

  const handleStopListening = async () => {
    try {
      setIsListening(false)
      await agentStopListening()
    } catch (err) {
      console.error('[v0] Failed to stop listening:', err)
    }
  }

  const handleEmergencyStop = () => {
    if (isListening) {
      handleStopListening()
    }
    closeRealtime()
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <AnimatedFace
          emotion={currentEmotion}
          isListening={isListening}
          isSpeaking={isProcessing}
        />

        <VoiceControls
          isListening={isListening}
          isSpeaking={isProcessing}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onEmergencyStop={handleEmergencyStop}
        />

        <EmotionDisplay
          emotion={detectedEmotion}
          confidence={confidence}
          isActive={isDetecting}
        />

        <CameraPreview
          videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          isActive={isDetecting}
          onToggle={handleToggleCamera}
        />

        <HealthMonitor
          detectedEmotion={detectedEmotion}
          poseDetected={metrics.poseDetected}
          seizureAlert={metrics.seizureAlert}
          posture={metrics.posture}
          isMonitoring={isMonitoring}
          alertHistory={metrics.alertHistory}
          onClearAlert={clearAlert}
        />
      </div>
    </main>
  )
}
