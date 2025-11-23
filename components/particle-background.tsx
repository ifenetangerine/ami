'use client'

import { useEffect, useRef } from 'react'

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Perlin-like noise function using sine waves
    const noise = (x: number, y: number, t: number) => {
      return Math.sin(x * 0.01 + t * 0.001) * Math.cos(y * 0.01 + t * 0.0008) +
             Math.sin(x * 0.005 + t * 0.0012) * Math.cos(y * 0.005 + t * 0.0009) +
             Math.sin(x * 0.002) * Math.cos(y * 0.002 + t * 0.0005)
    }

    // Particle system with flow field
    const particles: Array<{
      x: number
      y: number
      baseX: number
      baseY: number
      size: number
      opacity: number
      targetOpacity: number
      age: number
      colorShift: number
    }> = []

    // Create particles - more evenly distributed with varied sizes
    const particleCount = 120
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const sizeVariation = Math.random()
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        size: sizeVariation < 0.5 ? Math.random() * 2 + 1.5 : Math.random() * 5 + 2.5,
        opacity: Math.random() * 0.3 + 0.2,
        targetOpacity: Math.random() * 0.3 + 0.2,
        age: Math.random() * 1000,
        colorShift: Math.random()
      })
    }

    let animationFrame: number
    let time = 0

    const animate = () => {
      time += 1

      // Draw gradient background - calm, clinical hospital aesthetic
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#f8fbfc')
      gradient.addColorStop(0.5, '#f0f7fa')
      gradient.addColorStop(1, '#e8f3f8')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add subtle wave pattern - organic, flowing
      ctx.strokeStyle = 'rgba(72, 195, 198, 0.03)'
      ctx.lineWidth = 1
      for (let wave = 0; wave < 8; wave++) {
        ctx.beginPath()
        const yOffset = (wave * canvas.height / 8) + Math.sin(time * 0.0002) * 20
        ctx.moveTo(0, yOffset)
        for (let x = 0; x < canvas.width; x += 40) {
          const y = yOffset + Math.sin(x * 0.005 + time * 0.0003) * 15
          ctx.lineTo(x, y)
        }
        ctx.lineTo(canvas.width, yOffset)
        ctx.stroke()
      }

      // Add subtle vertical lines - grid-like but soft
      ctx.strokeStyle = 'rgba(72, 195, 198, 0.02)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < canvas.width; x += 120) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        for (let y = 0; y < canvas.height; y += 60) {
          const offsetX = Math.sin(y * 0.003 + time * 0.0002) * 8
          ctx.lineTo(x + offsetX, y)
        }
        ctx.stroke()
      }

      // Update and draw particles with organic flow
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.age += 1

        // Use flow field to move particles organically
        const angle = noise(p.baseX, p.baseY, time) * Math.PI * 2
        const speed = 0.3 + Math.sin(time * 0.001 + p.age * 0.001) * 0.2

        // Apply smooth movement following the flow
        p.x += Math.cos(angle) * speed
        p.y += Math.sin(angle) * speed

        // Add slight oscillation for organic feel
        const offsetX = Math.sin(time * 0.0005 + p.baseX * 0.01) * 15
        const offsetY = Math.cos(time * 0.0004 + p.baseY * 0.01) * 15
        const displayX = p.x + offsetX
        const displayY = p.y + offsetY

        // Wrap around screen smoothly
        const wrappedX = ((displayX % canvas.width) + canvas.width) % canvas.width
        const wrappedY = ((displayY % canvas.height) + canvas.height) % canvas.height

        // Smoothly transition opacity
        p.opacity += (p.targetOpacity - p.opacity) * 0.08

        // Randomly change target opacity for breathing effect
        if (Math.random() < 0.003) {
          p.targetOpacity = Math.random() * 0.4 + 0.15
        }

        // Generate color based on size and colorShift for variety
        let hue = 172 // base mint green
        let saturation = 72
        let lightness = 60

        if (p.colorShift < 0.3) {
          // Some particles more cyan
          hue = 180
          lightness = 65
        } else if (p.colorShift > 0.7) {
          // Some particles more teal
          hue = 165
          lightness = 55
        }

        // Convert HSL to RGB
        const c = ((1 - Math.abs(2 * (lightness / 100) - 1)) * (saturation / 100))
        const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
        const m = (lightness / 100) - (c / 2)
        let r = 0, g = 0, b = 0

        if (hue >= 0 && hue < 60) {
          r = c; g = x; b = 0
        } else if (hue >= 60 && hue < 120) {
          r = x; g = c; b = 0
        } else if (hue >= 120 && hue < 180) {
          r = 0; g = c; b = x
        } else if (hue >= 180 && hue < 240) {
          r = 0; g = x; b = c
        } else if (hue >= 240 && hue < 300) {
          r = x; g = 0; b = c
        } else {
          r = c; g = 0; b = x
        }

        r = Math.round((r + m) * 255)
        g = Math.round((g + m) * 255)
        b = Math.round((b + m) * 255)

        // Draw particle with varied colors
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`
        ctx.beginPath()
        ctx.arc(wrappedX, wrappedY, p.size, 0, Math.PI * 2)
        ctx.fill()

        // Draw soft connections to nearby particles for organic web
        for (let j = i + 1; j < Math.min(i + 8, particles.length); j++) {
          const p2 = particles[j]
          const offsetX2 = Math.sin(time * 0.0005 + p2.baseX * 0.01) * 15
          const offsetY2 = Math.cos(time * 0.0004 + p2.baseY * 0.01) * 15
          const wrappedX2 = ((p2.x + offsetX2) % canvas.width + canvas.width) % canvas.width
          const wrappedY2 = ((p2.y + offsetY2) % canvas.height + canvas.height) % canvas.height

          const dx = wrappedX2 - wrappedX
          const dy = wrappedY2 - wrappedY
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 200 && dist > 10) {
            const connectionOpacity = Math.max(0, (1 - dist / 200) * 0.2 * p.opacity * p2.opacity)
            ctx.strokeStyle = `rgba(72, 195, 198, ${connectionOpacity})`
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.moveTo(wrappedX, wrappedY)
            ctx.lineTo(wrappedX2, wrappedY2)
            ctx.stroke()
          }
        }
      }

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  )
}
