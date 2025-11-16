import { useCallback, useRef, useState } from 'react'

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string, options?: {
    voice?: SpeechSynthesisVoice
    rate?: number
    pitch?: number
    volume?: number
  }) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance

      // Apply options
      if (options?.voice) utterance.voice = options.voice
      if (options?.rate) utterance.rate = options.rate
      if (options?.pitch) utterance.pitch = options.pitch
      if (options?.volume) utterance.volume = options.volume

      utterance.onstart = () => {
        setIsSpeaking(true)
        console.log('[v0] Speech synthesis started')
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        console.log('[v0] Speech synthesis ended')
      }

      utterance.onerror = (event) => {
        setIsSpeaking(false)
        console.error('[v0] Speech synthesis error:', event)
      }

      window.speechSynthesis.speak(utterance)
    } else {
      console.error('[v0] Speech synthesis not supported')
    }
  }, [])

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      console.log('[v0] Speech synthesis stopped')
    }
  }, [])

  const pause = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause()
      console.log('[v0] Speech synthesis paused')
    }
  }, [])

  const resume = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume()
      console.log('[v0] Speech synthesis resumed')
    }
  }, [])

  return {
    isSpeaking,
    speak,
    stop,
    pause,
    resume
  }
}
