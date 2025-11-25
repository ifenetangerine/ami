"use client"

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

interface AnalyticsPanelProps {
  analytics?: string
  raw?: any
  loading?: boolean
  onClear?: () => void
  transcript?: string[]
}

export function AnalyticsPanel({ analytics, raw, loading = false, onClear, transcript }: AnalyticsPanelProps) {
  const [showRaw, setShowRaw] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [emotionAnalytics, setEmotionAnalytics] = useState<{ [key: string]: number } | null>(null)

  const calculateEmotionAnalytics = (rawData: any[]) => {
    const emotionCounts: { [key: string]: number } = {}

    rawData.forEach((entry) => {
      const emotion = entry.emotion
      if (emotion) {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
      }
    })

    setEmotionAnalytics(emotionCounts)
  }

  // Recompute emotion analytics when `raw` prop changes.
  useEffect(() => {
    if (!raw) {
      setEmotionAnalytics(null)
      return
    }

    // Raw may contain an `emotions` array (we attach this in `page.tsx`),
    // or it may be an array of emotion entries directly.
    if (Array.isArray(raw)) {
      calculateEmotionAnalytics(raw)
    } else if (raw && Array.isArray(raw.emotions)) {
      calculateEmotionAnalytics(raw.emotions)
    } else if (raw && Array.isArray(raw.openai?.emotions)) {
      calculateEmotionAnalytics(raw.openai.emotions)
    } else {
      // No usable emotion data present
      setEmotionAnalytics(null)
    }
  }, [raw])

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Post Conversation Analytics</h3>
        <div className="flex items-center gap-2">
          {onClear && (
            <Button size="sm" variant="ghost" onClick={onClear}>Clear</Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Generating analytics…</p>
      ) : analytics ? (
        <div className="space-y-2">
          <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded">{analytics}</pre>
          <Button size="sm" variant="outline" onClick={() => setShowRaw(s => !s)}>
            {showRaw ? 'Hide raw' : 'Show raw'}
          </Button>
          {showRaw && (
            <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded">{JSON.stringify(raw, null, 2)}</pre>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">No analytics available.</p>
          <Button size="sm" variant="ghost" onClick={() => setShowTranscript(s => !s)}>
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
          </Button>
          {showTranscript && (
            <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded">{(transcript || []).join('\n')}</pre>
          )}
        </div>
      )}

      {emotionAnalytics && (
        <div className="mt-4">
          <h4 className="text-sm font-medium">Emotion Analytics</h4>
          <ul className="text-xs">
            {Object.entries(emotionAnalytics).map(([emotion, count]) => (
              <li key={emotion}>{emotion}: {count}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
