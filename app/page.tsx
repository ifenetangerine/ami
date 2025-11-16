'use client'

import { AnimatedFace } from '@/components/animated-face'
import { ConversationPanel } from '@/components/conversation-panel'
import { HealthMonitor } from '@/components/health-monitor'
import { VoiceControls } from '@/components/voice-controls'
import { EmotionDisplay } from '@/components/emotion-display'
import { CameraPreview } from '@/components/camera-preview'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis'
import { useEmotionDetection } from '@/hooks/use-emotion-detection'
import { useHealthMonitoring } from '@/hooks/use-health-monitoring'
import { useState, useEffect } from 'react'

export type EmotionType = 'neutral' | 'happy' | 'sad' | 'anxious' | 'angry' | 'surprised'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  emotion?: EmotionType
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral')
  const [isProcessing, setIsProcessing] = useState(false)

  const { isRecording, startRecording, stopRecording, cancelRecording } = useAudioRecorder()
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis()
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
  } = useHealthMonitoring(videoRef)

  useEffect(() => {
    if (isSpeaking) {
      setCurrentEmotion('happy')
    } else if (isRecording) {
      setCurrentEmotion(detectedEmotion)
    } else {
      setCurrentEmotion('neutral')
    }
  }, [isSpeaking, isRecording, detectedEmotion])

  useEffect(() => {
    if (isDetecting && !isMonitoring) {
      startMonitoring()
    } else if (!isDetecting && isMonitoring) {
      stopMonitoring()
    }
  }, [isDetecting, isMonitoring, startMonitoring, stopMonitoring])

  const handleToggleCamera = async () => {
    if (isDetecting) {
      stopDetection()
    } else {
      try {
        await startDetection((result) => {
          console.log('[v0] Emotion update:', result)
        })
      } catch (error) {
        console.error('[v0] Failed to start camera:', error)
      }
    }
  }

  const handleStartListening = async () => {
    try {
      await startRecording((chunk) => {
        console.log('[v0] Audio chunk captured:', chunk.size, 'bytes')
      })
    } catch (error) {
      console.error('[v0] Failed to start listening:', error)
    }
  }

  const handleStopListening = async () => {
    try {
      const audioBlob = await stopRecording()
      console.log('[v0] Audio blob created:', audioBlob.size, 'bytes')
      
      setTimeout(() => {
        const simulatedText = "I've been feeling tired lately and have occasional headaches"
        handleSendMessage(simulatedText)
      }, 500)
    } catch (error) {
      console.error('[v0] Failed to stop listening:', error)
    }
  }

  const handleEmergencyStop = () => {
    if (isRecording) {
      cancelRecording()
    }
    if (isSpeaking) {
      stopSpeaking()
    }
  }

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      emotion: detectedEmotion
    }
    
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          emotion: detectedEmotion
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const data = JSON.parse(line.slice(2))
                if (data) {
                  assistantText += data
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantText || 'I apologize, I had trouble generating a response.',
        timestamp: new Date()
      }
      
      setMessages([...updatedMessages, assistantMessage])
      setIsProcessing(false)
      
      speak(assistantMessage.content, {
        rate: 0.95,
        pitch: 1.1,
        volume: 0.9
      })
    } catch (error) {
      console.error('[v0] Failed to get AI response:', error)
      setIsProcessing(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col lg:flex-row">
      <div className="lg:w-2/5 flex items-center justify-center bg-gradient-to-br from-medical-primary/10 to-medical-secondary/10 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-border/50">
        <div className="w-full max-w-md space-y-6">
          <AnimatedFace 
            emotion={currentEmotion}
            isListening={isRecording}
            isSpeaking={isSpeaking}
          />
          
          <VoiceControls
            isListening={isRecording}
            isSpeaking={isSpeaking}
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
            videoRef={videoRef}
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
      </div>

      <div className="lg:w-3/5 flex flex-col">
        <ConversationPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isProcessing={isProcessing}
        />
      </div>
    </main>
  )
}
