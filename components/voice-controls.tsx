'use client'

import { Button } from '@/components/ui/button'
import { Mic, MicOff, Square } from 'lucide-react'

interface VoiceControlsProps {
  isListening: boolean
  isSpeaking: boolean
  onStartListening: () => void
  onStopListening: () => void
  onEmergencyStop: () => void
}

export function VoiceControls({
  isListening,
  isSpeaking,
  onStartListening,
  onStopListening,
  onEmergencyStop
}: VoiceControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        size="lg"
        variant={isListening ? "destructive" : "default"}
        className={`rounded-full w-16 h-16 p-0 transition-all ${
          isListening 
            ? 'bg-medical-accent hover:bg-medical-accent/90 animate-pulse' 
            : 'bg-medical-primary hover:bg-medical-primary/90'
        }`}
        onClick={isListening ? onStopListening : onStartListening}
      >
        {isListening ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>

      {(isListening || isSpeaking) && (
        <Button
          size="sm"
          variant="outline"
          className="rounded-full border-medical-accent text-medical-accent hover:bg-medical-accent/10"
          onClick={onEmergencyStop}
        >
          <Square className="h-4 w-4 mr-2" />
          Stop
        </Button>
      )}
    </div>
  )
}
