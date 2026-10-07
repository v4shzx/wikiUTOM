'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  bx: number
  by: number
  r: number
  phase: number
}

export default function PlexusEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const LINK_DISTANCE = 140
    const MOUSE_LINK_DISTANCE = 200
    const REPULSION_RADIUS = 130
    const REPULSION_FORCE = 0.9
    const MAX_SPEED = 2.4
    const PARTICLE_DENSITY = 12000
    const MAX_PARTICLES = 140
    const MIN_PARTICLES = 50
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const mouse = { x: -9999, y: -9999 }
    let particles: Particle[] = []
    let raf = 0
    let width = 0
    let height = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * DPR)
      canvas.height = Math.floor(height * DPR)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      const count = Math.min(
        MAX_PARTICLES,
        Math.max(MIN_PARTICLES, Math.floor((width * height) / PARTICLE_DENSITY))
      )
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        bx: (Math.random() - 0.5) * 1.2,
        by: (Math.random() - 0.5) * 1.2,
        vx: 0,
        vy: 0,
        r: Math.random() * 1.6 + 0.9,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    const draw = () => {
      const time = performance.now() / 1000
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.hypot(dx, dy)
        if (dist < REPULSION_RADIUS && dist > 0.01) {
          const force = ((REPULSION_RADIUS - dist) / REPULSION_RADIUS) * REPULSION_FORCE
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }
        p.vx += (p.bx - p.vx) * 0.03
        p.vy += (p.by - p.vy) * 0.03
        const speed = Math.hypot(p.vx, p.vy)
        if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED
          p.vy = (p.vy / speed) * MAX_SPEED
        }
        p.x += p.vx
        p.y += p.vy
        if (p.x <= 0 || p.x >= width) p.vx *= -1
        if (p.y <= 0 || p.y >= height) p.vy *= -1
      }

      ctx.lineWidth = 1

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DISTANCE) {
            const alpha = (1 - dist / LINK_DISTANCE) * 0.35
            ctx.strokeStyle = `rgba(110, 231, 183, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }

        const mdx = a.x - mouse.x
        const mdy = a.y - mouse.y
        const mdist = Math.hypot(mdx, mdy)
        if (mdist < MOUSE_LINK_DISTANCE) {
          const alpha = (1 - mdist / MOUSE_LINK_DISTANCE) * 0.5
          ctx.strokeStyle = `rgba(167, 243, 208, ${alpha})`
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.stroke()
        }
      }

      for (const p of particles) {
        const pulse = p.r + Math.sin(time * 2 + p.phase) * 0.35
        ctx.fillStyle = 'rgba(52, 211, 153, 0.85)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(0.4, pulse), 0, Math.PI * 2)
        ctx.fill()
      }

      if (!reduceMotion) {
        raf = requestAnimationFrame(draw)
      }
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
}
