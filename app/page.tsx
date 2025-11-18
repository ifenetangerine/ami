'use client'

import { AnimatedFace } from '@/components/animated-face'
import { HealthMonitor } from '@/components/health-monitor'
import { VoiceControls } from '@/components/voice-controls'
import { EmotionDisplay } from '@/components/emotion-display'
import { CameraPreview } from '@/components/camera-preview'
import { DraggablePanel } from '@/components/draggable-panel'
import { ParticleBackground } from '@/components/particle-background'
import { useEmotionDetection } from '@/hooks/use-emotion-detection'
import { useHealthMonitoring } from '@/hooks/use-health-monitoring'
import { useRealtimeAgent } from '@/hooks/use-realtime-agent'
import { useState, useEffect } from 'react'
import { startListening, stopListening, closeRealtime, setCurrentEmotion } from '@/hooks/speak'

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

  // Update the realtime agent's emotion context
  useEffect(() => {
    setCurrentEmotion(detectedEmotion)
    console.log('[Page] Updating realtime agent emotion context to:', detectedEmotion)
  }, [detectedEmotion])

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
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white">
      {/* Animated particle background */}
      <ParticleBackground />

      {/* Main face container */}
      <div className="relative z-10 flex items-center justify-center w-full h-screen">
        <div className="w-full max-w-2xl aspect-square flex items-center justify-center">
          <AnimatedFace
            emotion={currentEmotion}
            isListening={isListening}
            isSpeaking={isProcessing}
          />
        </div>
      </div>

      {/* Draggable control panel */}
      <DraggablePanel title="Controls & Monitoring" defaultX={20} defaultY={20}>
        <VoiceControls
          isListening={isListening}
          isSpeaking={isProcessing}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onEmergencyStop={handleEmergencyStop}
        />

        <div className="border-t border-medical-primary/20 pt-4" />

        <EmotionDisplay
          emotion={detectedEmotion}
          confidence={confidence}
          isActive={isDetecting}
        />

        <div className="border-t border-medical-primary/20 pt-4" />

        <CameraPreview
          videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          isActive={isDetecting}
          onToggle={handleToggleCamera}
        />

        <div className="border-t border-medical-primary/20 pt-4" />

        <HealthMonitor
          detectedEmotion={detectedEmotion}
          poseDetected={metrics.poseDetected}
          seizureAlert={metrics.seizureAlert}
          posture={metrics.posture}
          isMonitoring={isMonitoring}
          alertHistory={metrics.alertHistory}
          onClearAlert={clearAlert}
        />
      </DraggablePanel>
    </main>
  )
}
