'use client'

import { useEffect, useRef } from 'react'
import type { EmotionType } from '@/app/page'

interface AnimatedFaceProps {
  emotion: EmotionType
  isListening: boolean
  isSpeaking: boolean
}

export function AnimatedFace({ emotion, isListening, isSpeaking }: AnimatedFaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const size = Math.min(canvas.offsetWidth, canvas.offsetHeight)
    canvas.width = size
    canvas.height = size

    let animationFrame: number

    // Animation parameters
    let time = 0
    const animate = () => {
      time += 0.02

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = canvas.width * 0.35

      // Draw face circle with glow effect
      ctx.save()

      // Outer glow
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.2)
      gradient.addColorStop(0, 'rgba(79, 209, 197, 0.3)')
      gradient.addColorStop(1, 'rgba(79, 209, 197, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2)
      ctx.fill()

      // Main face circle
      ctx.fillStyle = 'rgba(79, 209, 197, 0.1)'
      ctx.strokeStyle = 'rgba(79, 209, 197, 0.6)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Pulse effect when listening
      if (isListening) {
        const pulseRadius = radius + Math.sin(time * 3) * 10
        ctx.strokeStyle = `rgba(79, 209, 197, ${0.3 + Math.sin(time * 3) * 0.2})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw eyes based on emotion
      drawEyes(ctx, centerX, centerY, radius, emotion, time, isSpeaking)

      // Draw mouth based on emotion
      drawMouth(ctx, centerX, centerY, radius, emotion, time, isSpeaking)

      ctx.restore()

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [emotion, isListening, isSpeaking])

  return (
    <div className="relative w-full aspect-square">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`text-medical-primary/20 text-8xl font-bold transition-opacity duration-500 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}>
          AMI
        </div>
      </div>
    </div>
  )
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  emotion: EmotionType,
  time: number,
  isSpeaking: boolean
) {
  const eyeY = centerY - radius * 0.15
  const eyeSpacing = radius * 0.3
  const eyeSize = radius * 0.08

  ctx.fillStyle = 'rgba(79, 209, 197, 0.9)'

  // Adjust eye shape based on emotion
  switch (emotion) {
    case 'happy':
      // Crescent eyes
      ctx.beginPath()
      ctx.arc(centerX - eyeSpacing, eyeY, eyeSize, 0.2, Math.PI - 0.2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeSpacing, eyeY, eyeSize, 0.2, Math.PI - 0.2)
      ctx.fill()
      break
    case 'sad':
      // Droopy eyes
      ctx.beginPath()
      ctx.arc(centerX - eyeSpacing, eyeY + 5, eyeSize * 0.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeSpacing, eyeY + 5, eyeSize * 0.8, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'fear':
      // Wide eyes with animation
      const fearSize = eyeSize * (1 + Math.sin(time * 4) * 0.2)
      ctx.beginPath()
      ctx.arc(centerX - eyeSpacing, eyeY, fearSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeSpacing, eyeY, fearSize, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'surprise':
      // Very wide eyes
      ctx.beginPath()
      ctx.arc(centerX - eyeSpacing, eyeY, eyeSize * 1.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeSpacing, eyeY, eyeSize * 1.3, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'angry':
      // Narrow eyes with downward slant
      ctx.beginPath()
      ctx.arc(centerX - eyeSpacing, eyeY - 3, eyeSize, 0.2, Math.PI - 0.2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeSpacing, eyeY - 3, eyeSize, 0.2, Math.PI - 0.2)
      ctx.fill()
      break
    case 'disgust':
      // Squinted eyes
      ctx.beginPath()
      ctx.arc(centerX - eyeSpacing, eyeY, eyeSize * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeSpacing, eyeY, eyeSize * 0.6, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'neutral':
    default:
      // Normal eyes
      ctx.beginPath()
      ctx.arc(centerX - eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(centerX + eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2)
      ctx.fill()
  }
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  emotion: EmotionType,
  time: number,
  isSpeaking: boolean
) {
  const mouthY = centerY + radius * 0.2
  const mouthWidth = radius * 0.4

  ctx.strokeStyle = 'rgba(79, 209, 197, 0.9)'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'

  // Animate mouth when speaking
  const speakOffset = isSpeaking ? Math.sin(time * 10) * 5 : 0

  switch (emotion) {
    case 'happy':
      // Smile
      ctx.beginPath()
      ctx.arc(centerX, mouthY - 10, mouthWidth * 0.8, 0.3, Math.PI - 0.3)
      ctx.stroke()
      break
    case 'sad':
      // Frown
      ctx.beginPath()
      ctx.arc(centerX, mouthY + 20, mouthWidth * 0.8, Math.PI + 0.3, Math.PI * 2 - 0.3)
      ctx.stroke()
      break
    case 'fear':
      // Wavy line
      ctx.beginPath()
      ctx.moveTo(centerX - mouthWidth / 2, mouthY)
      for (let i = 0; i <= 10; i++) {
        const x = centerX - mouthWidth / 2 + (mouthWidth / 10) * i
        const y = mouthY + Math.sin(i + time * 5) * 3
        ctx.lineTo(x, y)
      }
      ctx.stroke()
      break
    case 'surprise':
      // Open circle
      ctx.beginPath()
      ctx.arc(centerX, mouthY + speakOffset, mouthWidth * 0.3, 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'angry':
      // Straight line (frown)
      ctx.beginPath()
      ctx.moveTo(centerX - mouthWidth / 2, mouthY - 5)
      ctx.lineTo(centerX + mouthWidth / 2, mouthY - 5)
      ctx.stroke()
      break
    case 'disgust':
      // Twisted smile
      ctx.beginPath()
      ctx.arc(centerX, mouthY - 5, mouthWidth * 0.6, 0.1, Math.PI - 0.1)
      ctx.stroke()
      break
    case 'neutral':
    default:
      // Straight line
      ctx.beginPath()
      ctx.moveTo(centerX - mouthWidth / 2, mouthY + speakOffset)
      ctx.lineTo(centerX + mouthWidth / 2, mouthY + speakOffset)
      ctx.stroke()
  }
}
