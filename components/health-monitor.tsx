'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Activity, AlertTriangle, X } from 'lucide-react'
import type { EmotionType } from '@/app/page'

interface HealthMonitorProps {
  detectedEmotion: EmotionType
  poseDetected: boolean
  seizureAlert: boolean
  posture?: string
  isMonitoring?: boolean
  alertHistory?: Array<{
    type: 'seizure' | 'posture' | 'general'
    message: string
    timestamp: Date
  }>
  onClearAlert?: (index: number) => void
}

export function HealthMonitor({
  detectedEmotion,
  poseDetected,
  seizureAlert,
  posture = 'unknown',
  isMonitoring = false,
  alertHistory = [],
  onClearAlert
}: HealthMonitorProps) {
  return (
    <div className="space-y-4">
      {/* Main Health Metrics Card */}
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-medical-primary/20">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-medical-primary" />
              <span className="text-sm font-medium text-foreground">Health Monitoring</span>
            </div>
            <Badge 
              variant={isMonitoring ? "default" : "outline"}
              className={isMonitoring ? "bg-medical-primary" : ""}
            >
              {isMonitoring ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {isMonitoring && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Emotion</span>
                  <Badge variant="outline" className="capitalize border-medical-primary/30 text-medical-primary">
                    {detectedEmotion}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Posture</span>
                  <Badge 
                    variant={poseDetected ? "default" : "outline"}
                    className={poseDetected ? "bg-medical-secondary capitalize" : "capitalize"}
                  >
                    {posture}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Pose Detection</span>
                  <Badge 
                    variant={poseDetected ? "default" : "outline"}
                    className={poseDetected ? "bg-medical-primary" : ""}
                  >
                    {poseDetected ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              {seizureAlert && (
                <div className="flex items-start gap-2 p-3 bg-medical-accent/10 rounded-md border border-medical-accent/30 animate-pulse">
                  <AlertTriangle className="h-5 w-5 text-medical-accent flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-medical-accent block">
                      Seizure Alert
                    </span>
                    <span className="text-xs text-medical-accent/80">
                      Unusual movement detected. Check on user immediately.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {!isMonitoring && (
            <p className="text-xs text-muted-foreground">
              Enable camera to start health monitoring
            </p>
          )}
        </div>
      </Card>

      {alertHistory.length > 0 && (
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-medical-accent/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-medical-accent" />
                <span className="text-sm font-medium text-foreground">Alert History</span>
              </div>
              <Badge variant="outline" className="border-medical-accent/30">
                {alertHistory.length}
              </Badge>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {alertHistory.map((alert, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 p-2 bg-background rounded-md border border-border/50"
                >
                  <AlertTriangle className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${
                    alert.type === 'seizure' ? 'text-medical-accent' : 'text-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">
                      {alert.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {onClearAlert && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onClearAlert(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
