import { useEffect, useRef } from 'react'
import { voiceLevel } from './voice'

// Three soft waves that swell with the voice level. Canvas 2D, redrawn only
// while mounted; the level itself is sampled by the orb each frame.
export function Waveform({ color, accent }: { color: string; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    let raf = 0
    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const w = c.clientWidth, h = c.clientHeight
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const t = now / 1000
      const lvl = 0.12 + voiceLevel.value * 0.88
      const lines: [string, number, number, number, number][] = [
        [accent, 1.0, 2.2, 1.6, 2.2],
        [color, 0.6, 3.1, -2.3, 1.4],
        [color, 0.35, 4.3, 3.1, 1.1],
      ]
      for (const [stroke, amp, freq, speed, width] of lines) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 3) {
          const u = x / w
          const env = Math.sin(Math.PI * u) ** 1.6
          const y = h / 2 + Math.sin(u * Math.PI * freq * 2 + t * speed) * env * amp * lvl * (h * 0.42)
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = stroke
        ctx.globalAlpha = amp === 1 ? 0.95 : 0.55
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [color, accent])

  return <canvas ref={ref} className="waveform" aria-hidden="true" />
}
