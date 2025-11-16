'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Smile, Frown, Meh, AlertCircle, Angry, Sparkles } from 'lucide-react'
import type { EmotionType } from '@/app/page'

interface EmotionDisplayProps {
  emotion: EmotionType
  confidence: number
  isActive: boolean
}

const emotionIcons: Record<EmotionType, any> = {
  neutral: Meh,
  happy: Smile,
  sad: Frown,
  anxious: AlertCircle,
  angry: Angry,
  surprised: Sparkles
}

const emotionColors: Record<EmotionType, string> = {
  neutral: 'text-muted-foreground',
  happy: 'text-green-500',
  sad: 'text-blue-500',
  anxious: 'text-yellow-500',
  angry: 'text-red-500',
  surprised: 'text-purple-500'
}

export function EmotionDisplay({ emotion, confidence, isActive }: EmotionDisplayProps) {
  const Icon = emotionIcons[emotion]
  const colorClass = emotionColors[emotion]

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
