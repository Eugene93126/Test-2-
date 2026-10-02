import type { Ctx } from '../canvas'
import { rng, vnoise } from '../../lib/rand'
import type { P2 } from './geom'

// A pen that draws like a hand: strokes wobble a little, overshoot their ends,
// swell under pressure and taper as the pen lifts.

export interface Ink { color: string; alpha: number }
export const INKS = {
  /** Fine-liner. */
  black: { color: '#14181D', alpha: 0.95 },
  /** Ballpoint: lighter, a touch translucent. */
  blue: { color: '#25418F', alpha: 0.86 },
  /** White ink for the cyanotype. */
  white: { color: '#F2F8FB', alpha: 0.96 },
  paleWhite: { color: '#DCEBF4', alpha: 0.7 },
} satisfies Record<string, Ink>

export interface StrokeOpts {
  w: number
  ink: Ink
  /** Sideways wander, px. */
  wobble?: number
  /** Overshoot past each end, px. */
  over?: number
  /** 0 = blunt ends, 1 = ends taper to a point. */
  taper?: number
  closed?: boolean
  alpha?: number
  /** Heavy start, light finish (hatching). */
  flick?: boolean
}

export class Pen {
  readonly g: Ctx
  private r: () => number
  constructor(g: Ctx, seed: number) { this.g = g; this.r = rng(seed) }

  rand(a = 0, b = 1) { return a + (b - a) * this.r() }

  stroke(src: P2[], o: StrokeOpts) {
    if (src.length < 2) return
    let pts = src
    if (o.closed) {
      // Start somewhere random and go round once, overlapping the start a little.
      const n = src.length, k = Math.floor(this.r() * n)
      const extra = Math.max(2, Math.round(n * 0.05))
      pts = []
      for (let i = 0; i <= n + extra; i++) pts.push(src[(k + i) % n])
    } else if (o.over) {
      const ext = (a: P2, b: P2, d: number): P2 => {
        const l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1
        return [a[0] + ((a[0] - b[0]) / l) * d, a[1] + ((a[1] - b[1]) / l) * d]
      }
      pts = [ext(src[0], src[1], o.over * this.rand(0.3, 1.2)), ...src.slice(1, -1), ext(src[src.length - 1], src[src.length - 2], o.over * this.rand(0.3, 1.2))]
      if (src.length === 2) pts = [pts[0], pts[pts.length - 1]]
    }
    // Resample evenly.
    const cum = [0]
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    const L = cum[cum.length - 1]
    if (L < 0.4) return
    const N = Math.max(2, Math.ceil(L / 2.4))
    const q: P2[] = []
    let seg = 1
    for (let i = 0; i <= N; i++) {
      const s = (L * i) / N
      while (seg < cum.length - 1 && cum[seg] < s) seg++
      const s0 = cum[seg - 1], s1 = cum[seg]
      const k = s1 > s0 ? (s - s0) / (s1 - s0) : 0
      q.push([pts[seg - 1][0] + (pts[seg][0] - pts[seg - 1][0]) * k, pts[seg - 1][1] + (pts[seg][1] - pts[seg - 1][1]) * k])
    }
    // Wobble along the normal.
    const ph = this.r() * 100
    const wob = o.wobble ?? 0.6
    const nrm: P2[] = q.map((_, i) => {
      const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)]
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]
    })
    if (wob > 0) q.forEach((p, i) => {
      const off = wob * (vnoise((L * i) / N / 34 + ph, ph * 0.37) - 0.5) * 2
      p[0] += nrm[i][0] * off; p[1] += nrm[i][1] * off
    })
    const g = this.g
    const alpha = o.ink.alpha * (o.alpha ?? 1)
    g.fillStyle = g.strokeStyle = o.ink.color
    if (o.w < 1.15) {
      g.globalAlpha = alpha * Math.min(1, o.w / 0.7)
      g.lineWidth = Math.max(0.6, o.w)
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.beginPath()
      q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])))
      g.stroke()
      g.globalAlpha = 1
      return
    }
    // Width: pressure noise, tapered ends, optional flick.
    const taper = o.taper ?? 0.7
    const tl = Math.min(L * 0.3, 8 + o.w * 2.5)
    const half = q.map((_, i) => {
      const s = (L * i) / N
      const e = Math.min(1, s / tl, (L - s) / tl)
      const sm = e * e * (3 - 2 * e)
      let w = o.w * (0.84 + 0.3 * vnoise(s / 50 + ph * 2, 3.1)) * (1 - taper + taper * sm)
      if (o.flick) w *= 1 - 0.6 * (s / L)
      return Math.max(0.25, w / 2)
    })
    g.globalAlpha = alpha
    g.beginPath()
    for (let i = 0; i < q.length; i++) { const x = q[i][0] + nrm[i][0] * half[i], y = q[i][1] + nrm[i][1] * half[i]; if (i) g.lineTo(x, y); else g.moveTo(x, y) }
    for (let i = q.length - 1; i >= 0; i--) g.lineTo(q[i][0] - nrm[i][0] * half[i], q[i][1] - nrm[i][1] * half[i])
    g.closePath()
    g.fill()
    g.globalAlpha = 1
  }

  line(a: P2, b: P2, o: StrokeOpts) { this.stroke([a, b], o) }

  /** A screen-space ellipse, drawn as one loop with a little overlap. */
  ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, o: StrokeOpts) {
    const pts: P2[] = []
    const n = Math.max(24, Math.round((rx + ry) * 0.6))
    const c = Math.cos(rot), s = Math.sin(rot)
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([cx + x * c - y * s, cy + x * s + y * c]) }
    this.stroke(pts, { ...o, closed: true })
  }

  dot(x: number, y: number, r: number, ink: Ink) {
    const g = this.g
    g.globalAlpha = ink.alpha
    g.fillStyle = ink.color
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    g.globalAlpha = 1
  }

  /** Parallel strokes across a box, at an angle; the caller clips. */
  hatchBox(x0: number, y0: number, x1: number, y1: number, angle: number, gap: number, o: StrokeOpts, jitter = 0.35) {
    const c = Math.cos(angle), s = Math.sin(angle)
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4
    for (let d = -R; d <= R; d += gap * this.rand(1 - jitter, 1 + jitter)) {
      const px = cx - s * d, py = cy + c * d
      const a0 = -R * this.rand(0.9, 1.05), a1 = R * this.rand(0.9, 1.05)
      this.line([px + c * a0, py + s * a0], [px + c * a1, py + s * a1], o)
    }
  }
}

/* ---------- Lettering ---------- */

/** Hand lettering: each capital set a little off its neighbours. */
export function letter(g: Ctx, text: string, x: number, y: number, size: number, ink: Ink, seed: number, o: { weight?: number; align?: 'left' | 'center' | 'right'; track?: number; font?: string } = {}) {
  const r = rng(seed)
  const font = o.font ?? '"Instrument Sans"'
  g.save()
  g.font = `${o.weight ?? 560} ${size}px ${font}`
  try { (g as Ctx & { fontStretch: string }).fontStretch = 'condensed' } catch { /* older canvases */ }
  g.fillStyle = ink.color
  g.textBaseline = 'alphabetic'
  const track = (o.track ?? 0.06) * size
  const widths = [...text].map(ch => g.measureText(ch).width + track)
  const total = widths.reduce((a, b) => a + b, 0) - track
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x
  const slope = (r() - 0.5) * 0.02
  ;[...text].forEach((ch, i) => {
    g.save()
    g.translate(cx, y + (r() - 0.5) * size * 0.07 + slope * (cx - x))
    g.rotate((r() - 0.5) * 0.06 + slope)
    const k = 1 + (r() - 0.5) * 0.08
    g.scale(k, k)
    g.globalAlpha = ink.alpha * (0.86 + r() * 0.14)
    g.fillText(ch, 0, 0)
    g.restore()
    cx += widths[i] * (1 + (r() - 0.5) * 0.08)
  })
  g.restore()
  return total
}
