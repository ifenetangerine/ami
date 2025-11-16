'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Smile, Frown, Meh, AlertCircle, Angry, Zap, Eye } from 'lucide-react'
import type { EmotionType } from '@/app/page'

interface EmotionDisplayProps {
  emotion: EmotionType
  confidence: number
  isActive: boolean
}

const emotionIcons: Record<EmotionType, any> = {
  happy: Smile,
  sad: Frown,
  neutral: Meh,
  angry: Angry,
  disgust: Zap,
  fear: AlertCircle,
  surprise: Eye
}

const emotionColors: Record<EmotionType, string> = {
  happy: 'text-green-500',
  sad: 'text-blue-500',
  neutral: 'text-muted-foreground',
  angry: 'text-red-600',
  disgust: 'text-orange-600',
  fear: 'text-purple-600',
  surprise: 'text-yellow-500'
}

export function EmotionDisplay({ emotion, confidence, isActive }: EmotionDisplayProps) {
  // Ensure emotion is a valid key
  const validEmotions: EmotionType[] = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']
  const isValidEmotion = validEmotions.includes(emotion as EmotionType)
  const safeEmotion: EmotionType = isValidEmotion ? emotion : 'neutral'

  if (!isValidEmotion) {
    console.warn(`[EmotionDisplay] Invalid emotion detected: "${emotion}" - Valid emotions are:`, validEmotions)
  }

  const Icon = emotionIcons[safeEmotion] || Meh
  const colorClass = emotionColors[safeEmotion] || emotionColors['neutral']

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-medical-primary/20">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Emotion Detection</span>
          <Badge
            variant={isActive ? "default" : "outline"}
            className={isActive ? "bg-medical-primary" : ""}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {isActive && (
          <>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-background ${colorClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium capitalize text-foreground">
                    {emotion}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={confidence * 100} className="h-1.5" />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Real-time facial expression analysis
            </div>
          </>
        )}

        {!isActive && (
          <p className="text-xs text-muted-foreground">
            Enable camera to start emotion detection
          </p>
        )}
      </div>
    </Card>
  )
}
