'use client'

import { useEffect, useRef, useState } from 'react'
import type { EmotionType } from '@/app/page'

interface AnimatedFaceProps {
  emotion: EmotionType
  isListening: boolean
  isSpeaking: boolean
}

export function AnimatedFace({ emotion, isListening, isSpeaking }: AnimatedFaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<{
    head_open: HTMLImageElement | null
    head_closed: HTMLImageElement | null
    mouth_rest: HTMLImageElement | null
    mouth_open: HTMLImageElement | null
    mouth_narrow: HTMLImageElement | null
    mouth_closed: HTMLImageElement | null
    mouth_rest_frown: HTMLImageElement | null
    background: HTMLImageElement | null
  }>({
    head_open: null,
    head_closed: null,
    mouth_rest: null,
    mouth_open: null,
    mouth_narrow: null,
    mouth_closed: null,
    mouth_rest_frown: null,
    background: null,
  })
  const stateRef = useRef({
    currentMouth: 'rest' as string,
    eyesClosed: false,
    blinkTimer: 0,
    blinkDuration: 0,
    audioAmplitude: 0,
    useFrown: false,
    callCount: 0,
  })
  const [aiSpeaking, setAiSpeaking] = useState(false)

  // Poll the global speaking flag to drive ambient glow
  useEffect(() => {
    const poll = setInterval(() => {
      if (typeof window === 'undefined') return
      const value = (window as any).__aiSpeaking === true
      setAiSpeaking(prev => (prev === value ? prev : value))
    }, 150)

    return () => clearInterval(poll)
  }, [])

  // Keep mouth in emotion-specific resting pose
  useEffect(() => {
    const shouldFrown = emotion === 'sad' || emotion === 'angry' || emotion === 'fear' || emotion === 'disgust'
    stateRef.current.useFrown = shouldFrown
    stateRef.current.currentMouth = shouldFrown ? 'rest_frown' : 'rest'
  }, [emotion])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Load images
    const loadImages = async () => {
      const imageMap: { [key: string]: string } = {
        head_open: '/faces/head_open.png',
        head_closed: '/faces/head_closed.png',
        mouth_rest: '/faces/mouth_rest.png',
        mouth_open: '/faces/mouth_open.png',
        mouth_narrow: '/faces/mouth_narrow.png',
        mouth_closed: '/faces/mouth_closed.png',
        mouth_rest_frown: '/faces/mouth_rest_frown.png',
        background: '/background.png',
      }

      for (const [key, src] of Object.entries(imageMap)) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error(`Failed to load ${src}`))
          img.src = src
        })
        ;(imagesRef.current[key as keyof typeof imagesRef.current] as HTMLImageElement) = img
      }

      startAnimation()
    }

    const startAnimation = () => {
      let animationFrame: number
      let time = 0

      const animate = () => {
        time += 0.016 // ~60fps

        // Update blinking
        stateRef.current.blinkTimer += 0.016
        if (stateRef.current.blinkTimer > 4) {
          // Blink every ~4 seconds
          stateRef.current.eyesClosed = true
          stateRef.current.blinkDuration = 0.15 // Blink for 150ms
          stateRef.current.blinkTimer = 0
        }

        if (stateRef.current.eyesClosed) {
          stateRef.current.blinkDuration -= 0.016
          if (stateRef.current.blinkDuration <= 0) {
            stateRef.current.eyesClosed = false
          }
        }

        // Draw avatar
        drawAvatar(ctx, canvas.width, canvas.height)

        animationFrame = requestAnimationFrame(animate)
      }

      animate()

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame)
        }
      }
    }

    loadImages().catch(err => {
      console.error('[AnimatedFace] Failed to load images:', err)
    })
  }, [])

  const drawAvatar = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    const { head_open, head_closed, mouth_rest, mouth_open, mouth_narrow, mouth_closed, mouth_rest_frown, background } = imagesRef.current

    if (!head_open || !head_closed || !mouth_rest || !background) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw background
    ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight)

    // Draw head (open or closed eyes)
    const headImage = stateRef.current.eyesClosed ? head_closed : head_open
    ctx.drawImage(headImage, 0, 0, canvasWidth, canvasHeight)

    // Draw mouth based on current state
    let mouthImage: HTMLImageElement | null = null
    const mouthType = stateRef.current.currentMouth

    switch (mouthType) {
      case 'open':
        mouthImage = mouth_open
        break
      case 'closed':
        mouthImage = mouth_closed
        break
      case 'narrow':
        mouthImage = mouth_narrow
        break
      case 'rest_frown':
        mouthImage = mouth_rest_frown
        break
      case 'rest':
      default:
        mouthImage = mouth_rest
    }

    if (mouthImage) {
      ctx.drawImage(mouthImage, 0, 0, canvasWidth, canvasHeight)
    }
  }

  const presenceState = aiSpeaking ? 'ai' : isListening ? 'user' : 'idle'
  const glowClass = {
    ai: 'scale-105 shadow-[0_0_60px_rgba(72,195,198,0.45)]',
    user: 'scale-105 shadow-[0_0_40px_rgba(255,255,255,0.35)]',
    idle: 'scale-100 shadow-none',
  }[presenceState]

  return (
    <div className="relative w-full aspect-square">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-full"
      />
      <div className={`absolute inset-0 rounded-full transition-all duration-700 ease-out ${glowClass}`} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`text-medical-primary/20 text-8xl font-bold transition-opacity duration-500 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}>
          AMI
        </div>
      </div>
    </div>
  )
}
