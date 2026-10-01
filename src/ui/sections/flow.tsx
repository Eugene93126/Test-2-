import { useEffect, useRef } from 'react'

// Light that travels along a curve: small comets for Claude Circle. Each one is
// its own element moved by a transform animation, so the browser runs it on the
// compositor and nothing is redrawn while it flies.

export type Pt = [number, number]

/** The tree's link shape: a cubic with level handles, from a to b. */
export function linkPath(a: Pt, b: Pt) {
  const mx = (a[0] + b[0]) / 2
  return `M${a[0]} ${a[1]} C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`
}

interface Sample { x: number; y: number; a: number; u: number }

/** Points along linkPath(a, b), spaced by arc length; u runs 0..1. */
export function sampleLink(a: Pt, b: Pt, n = 22): Sample[] {
  const mx = (a[0] + b[0]) / 2
  const fine: { x: number; y: number; a: number; len: number }[] = []
  let len = 0, px = a[0], py = a[1]
  for (let i = 0; i <= 64; i++) {
    const t = i / 64, s = 1 - t
    const x = s * s * s * a[0] + 3 * s * s * t * mx + 3 * s * t * t * mx + t * t * t * b[0]
    const y = s * s * s * a[1] + 3 * s * s * t * a[1] + 3 * s * t * t * b[1] + t * t * t * b[1]
    const dx = 3 * s * s * (mx - a[0]) + 3 * t * t * (b[0] - mx)
    const dy = 6 * s * t * (b[1] - a[1])
    len += Math.hypot(x - px, y - py)
    fine.push({ x, y, a: Math.atan2(dy, dx), len })
    px = x; py = y
  }
  const out: Sample[] = []
  let j = 0
  for (let i = 0; i <= n; i++) {
    const target = (i / n) * len
    while (j < fine.length - 1 && fine[j + 1].len < target) j++
    const f = fine[Math.min(j + 1, fine.length - 1)]
    out.push({ x: f.x, y: f.y, a: f.a, u: len ? f.len / len : 0 })
  }
  return out
}

/** A comet visible from w0 to w1 of each cycle, travelling `upTo` of the way. */
function travel(pts: Sample[], w0: number, w1: number, upTo: number): Keyframe[] {
  const tf = (p: Sample) => `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) rotate(${p.a.toFixed(3)}rad)`
  const used = pts.filter(p => p.u <= upTo + 1e-6)
  const f: Keyframe[] = [{ offset: 0, opacity: 0, transform: tf(used[0]) }]
  if (w0 > 0) f.push({ offset: w0, opacity: 0, transform: tf(used[0]) })
  used.forEach(p => {
    const k = p.u / upTo
    const fade = Math.min(1, k / 0.14, (1 - k) / 0.2)
    f.push({ offset: w0 + (w1 - w0) * k, opacity: Math.max(0, fade), transform: tf(p) })
  })
  if (w1 < 1) f.push({ offset: 1, opacity: 0, transform: tf(used[used.length - 1]) })
  return f
}

interface SparkProps {
  pts: Sample[]
  period: number
  delay: number
  window?: [number, number]
  upTo?: number
  className?: string
}

export function Spark({ pts, period, delay, window: w = [0, 1], upTo = 1, className = '' }: SparkProps) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !el.animate) return
    const a = el.animate(travel(pts, w[0], w[1], upTo), { duration: period, delay, iterations: Infinity, fill: 'backwards' })
    return () => a.cancel()
  }, [pts, period, delay, w[0], w[1], upTo])
  return <span ref={ref} className={`spark ${className}`} aria-hidden="true" />
}

/** A ring that flashes when a comet arrives at `at` (0..1) of each cycle. */
export function Arrival({ x, y, r, period, delay, at, className = '' }: { x: number; y: number; r: number; period: number; delay: number; at: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !el.animate) return
    const a = el.animate([
      { offset: 0, opacity: 0, transform: 'scale(0.7)' },
      { offset: Math.max(0, at - 0.02), opacity: 0, transform: 'scale(0.7)' },
      { offset: Math.min(1, at + 0.03), opacity: 0.85, transform: 'scale(1.05)' },
      { offset: Math.min(1, at + 0.16), opacity: 0, transform: 'scale(1.9)' },
      { offset: 1, opacity: 0, transform: 'scale(1.9)' },
    ], { duration: period, delay, iterations: Infinity, fill: 'backwards', easing: 'linear' })
    return () => a.cancel()
  }, [period, delay, at])
  return <span ref={ref} className={`halo ${className}`} style={{ left: x, top: y, width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r }} aria-hidden="true" />
}
