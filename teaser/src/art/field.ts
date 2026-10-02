import { rng } from '../lib/rand'

// Three steel spheres, each a small magnet whose north pole points along the
// triangle to the next sphere, so the field closes into one loop through all
// three. Field lines and iron-filing chains are traced in sheet millimetres.

export const SHEET_MM = { w: 420, h: 297 }
export const SPHERE_R = 12.5
const C = { x: SHEET_MM.w / 2, y: SHEET_MM.h / 2 + 4 }
const SIDE = 100
const CIRC = SIDE / Math.sqrt(3)

export interface Pole { x: number; y: number; mx: number; my: number }

/** Sphere centres (sheet mm) and magnetic moments, top / bottom-right / bottom-left. */
export const SPHERES: Pole[] = [-90, 30, 150].map(a => {
  const r = (a * Math.PI) / 180
  // Moment tangent to the circumcircle: each north pole faces the next sphere.
  return { x: C.x + Math.cos(r) * CIRC, y: C.y + Math.sin(r) * CIRC, mx: -Math.sin(r), my: Math.cos(r) }
})
export const SHEET_CENTER = C

export function field(x: number, y: number, poles = SPHERES) {
  let bx = 0, by = 0
  for (const p of poles) {
    const dx = x - p.x, dy = y - p.y
    const d2 = dx * dx + dy * dy
    const d = Math.sqrt(d2)
    if (d < 1e-3) continue
    const nx = dx / d, ny = dy / d
    const mn = p.mx * nx + p.my * ny
    const k = 1e6 / (d2 * d)
    bx += (3 * mn * nx - p.mx) * k
    by += (3 * mn * ny - p.my) * k
  }
  return { bx, by }
}

function nearest(x: number, y: number) {
  let best = Infinity
  for (const p of SPHERES) best = Math.min(best, Math.hypot(x - p.x, y - p.y))
  return best
}

const inSheet = (x: number, y: number, m = 6) => x > m && y > m && x < SHEET_MM.w - m && y < SHEET_MM.h - m

/** Follow the field from (x, y). dir = +1 along B, -1 against. */
export function trace(x: number, y: number, dir: 1 | -1, maxLen: number, minStep = 0.35) {
  const pts = [{ x, y }]
  let len = 0
  for (let i = 0; i < 4000 && len < maxLen; i++) {
    const dn = nearest(x, y)
    const h = Math.min(2.2, Math.max(minStep, (dn - SPHERE_R) * 0.08)) * dir
    const f = (px: number, py: number) => { const b = field(px, py); const m = Math.hypot(b.bx, b.by) || 1; return { x: b.bx / m, y: b.by / m } }
    const k1 = f(x, y), k2 = f(x + k1.x * h / 2, y + k1.y * h / 2)
    const k3 = f(x + k2.x * h / 2, y + k2.y * h / 2), k4 = f(x + k3.x * h, y + k3.y * h)
    const nx = x + (h / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x)
    const ny = y + (h / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y)
    len += Math.hypot(nx - x, ny - y)
    x = nx; y = ny
    if (nearest(x, y) < SPHERE_R * 0.98 || !inSheet(x, y)) { pts.push({ x, y }); break }
    pts.push({ x, y })
  }
  return pts
}

export interface Line { pts: { x: number; y: number }[]; len: number; cum: number[]; from: number }

const withLength = (pts: { x: number; y: number }[], from: number): Line => {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  return { pts, len: cum[cum.length - 1], cum, from }
}

/** The principal field lines: leaving each north pole, fanned evenly. */
export const MAIN_LINES: Line[] = (() => {
  const t0 = performance.now()
  const out: Line[] = []
  SPHERES.forEach((p, si) => {
    const n = 14
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.11
      const x = p.x + Math.cos(a) * SPHERE_R * 1.08, y = p.y + Math.sin(a) * SPHERE_R * 1.08
      const b = field(x, y)
      // Only start where the field leaves the sphere (its north side).
      if (b.bx * Math.cos(a) + b.by * Math.sin(a) <= 0) continue
      const pts = trace(x, y, 1, 900, 0.3)
      if (pts.length > 8) out.push(withLength(pts, si))
    }
  })
  console.log(`[perf] main lines ${(performance.now() - t0).toFixed(0)}ms`)
  return out
})()

export interface Filing { x: number; y: number; a: number; l: number; w: number; tone: number; reveal: number }

/**
 * Iron filings: short chains that follow the field, denser where it is
 * strong, as real filings clump into whiskers along the lines.
 */
export const FILINGS: Filing[] = (() => {
  const t0 = performance.now()
  const r = rng(3301)
  const out: Filing[] = []
  for (let tries = 0; out.length < 62000 && tries < 400000; tries++) {
    const x = 10 + r() * (SHEET_MM.w - 20), y = 10 + r() * (SHEET_MM.h - 20)
    const dn = nearest(x, y)
    if (dn < SPHERE_R * 1.02) continue
    const b = field(x, y)
    const m = Math.hypot(b.bx, b.by)
    const p = Math.min(1, Math.pow(m / 2.2, 0.55))
    if (r() > p * 0.9 + 0.015) continue
    const chain = trace(x, y, r() < 0.5 ? 1 : -1, 1.5 + r() * (3 + p * 11), 0.25)
    if (chain.length < 2) continue
    // Filings sit about one filing-length apart along the chain.
    const n = Math.max(2, Math.round(withLength(chain, 0).len / (0.7 + r() * 0.25)))
    const pts = resample(chain, n)
    const reveal = Math.min(1, (dn - SPHERE_R) / 120) * 0.8 + r() * 0.2
    for (let i = 0; i < pts.length; i++) {
      if (r() < 0.12) continue
      const q = pts[i], q2 = pts[Math.min(pts.length - 1, i + 1)], q0 = pts[Math.max(0, i - 1)]
      out.push({
        x: q.x + (r() - 0.5) * 0.3, y: q.y + (r() - 0.5) * 0.3,
        a: Math.atan2(q2.y - q0.y, q2.x - q0.x) + (r() - 0.5) * 0.3,
        l: 0.45 + r() * (0.6 + p * 0.8), w: 0.13 + r() * 0.11, tone: r(), reveal,
      })
    }
  }
  // Loose filings that never lined up.
  for (let i = 0; i < 1600; i++) {
    const x = 14 + r() * (SHEET_MM.w - 28), y = 14 + r() * (SHEET_MM.h - 28)
    if (nearest(x, y) < SPHERE_R * 1.3) continue
    out.push({ x, y, a: r() * Math.PI, l: 0.4 + r() * 0.8, w: 0.13 + r() * 0.1, tone: r(), reveal: 0.3 + r() * 0.7 })
  }
  console.log(`[perf] filings ${out.length} in ${(performance.now() - t0).toFixed(0)}ms`)
  return out
})()

/** Resample a polyline to n points evenly along its length. */
export function resample(pts: { x: number; y: number }[], n: number) {
  const L = withLength(pts, 0)
  const out: { x: number; y: number }[] = []
  let j = 1
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * L.len
    while (j < L.cum.length - 1 && L.cum[j] < s) j++
    const a = pts[j - 1], b = pts[j]
    const seg = L.cum[j] - L.cum[j - 1] || 1
    const t = (s - L.cum[j - 1]) / seg
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  }
  return out
}

/** Points of a line up to fraction f of its length. */
export function partial(l: Line, f: number) {
  if (f >= 1) return l.pts
  const s = f * l.len
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < l.pts.length; i++) {
    if (l.cum[i] > s) {
      const a = l.pts[i - 1], b = l.pts[i]
      const t = (s - l.cum[i - 1]) / (l.cum[i] - l.cum[i - 1] || 1)
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
      break
    }
    out.push(l.pts[i])
  }
  return out
}
