'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff } from 'lucide-react'
import { useEffect } from 'react'

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>
  isActive: boolean
  onToggle: () => void
}

export function CameraPreview({ videoRef, isActive, onToggle }: CameraPreviewProps) {
  useEffect(() => {
    if (videoRef.current && isActive) {
      videoRef.current.play().catch(console.error)
    }
  }, [videoRef, isActive])

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-medical-primary/20">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Camera Feed</span>
          <Button
            size="sm"
            variant={isActive ? "destructive" : "outline"}
            onClick={onToggle}
            className={isActive ? "bg-medical-accent hover:bg-medical-accent/90" : "border-medical-primary/30"}
          >
            {isActive ? (
              <>
                <CameraOff className="h-4 w-4 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-1" />
                Start
              </>
            )}
          </Button>
        </div>

        <div className="relative aspect-video rounded-lg overflow-hidden bg-black/20">
          {isActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Camera inactive</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Used for emotion and pose detection
        </p>
      </div>
    </Card>
  )
}
