import { canvas, ctx2d, cached, copyInto } from './canvas'
import { paperBase } from './paper'
import { fbm, rng } from '../lib/rand'
import { FILINGS, MAIN_LINES, SHEET_CENTER, SHEET_MM, partial, resample } from './field'
import { armJoints, armPoseAt, drawArm, drawDrone, drawQuad, dronePoseAt, quadPoseAt } from './bodies'
import type { Ctx } from './canvas'

// The A3 sheet under the spheres. In S2 it is plain paper and the filings
// gather; at 6.0 a band of sunlight sweeps across and it develops as a
// cyanotype, the filings left white; the white lines then become the motion
// paths of three bodies.

export const SHEET_PPMM = 6
const P = SHEET_PPMM
const GRAPHITE = '#262C31'
const CYAN_WHITE = '#EEF4F6'

export function sheetPaper() {
  return paperBase('sheet', SHEET_MM.w, SHEET_MM.h, { base: '#D7DED2', mottle: 0.45, fibers: 0.3, grain: 5, ppmm: P }, 7)
}

/** A real cyanotype: Prussian blue brushed on, ragged at the edges. */
export function cyanBase() {
  return cached('cyan-base', () => {
    const paper = sheetPaper()
    const W = paper.width, H = paper.height
    const c = canvas(W, H)
    const g = copyInto(c, paper)
    // Emulsion mask: brushed horizontally, so the left and right edges end in strokes.
    const m = canvas(W, H), mg = ctx2d(m)
    mg.fillStyle = '#fff'
    const inset = 13 * P
    const r = rng(77)
    for (let y = inset * 0.8; y < H - inset * 0.8; y += 0.9 * P) {
      const e1 = inset + (fbm(y / (9 * P), 1, 5, 3) - 0.5) * 16 * P + (r() - 0.5) * 3 * P
      const e2 = W - inset + (fbm(y / (9 * P), 7, 5, 3) - 0.5) * 16 * P + (r() - 0.5) * 3 * P
      const topFade = Math.min(1, (y - inset * 0.8) / (5 * P)), botFade = Math.min(1, (H - inset * 0.8 - y) / (5 * P))
      mg.globalAlpha = Math.min(topFade, botFade) * (0.85 + r() * 0.15)
      mg.fillRect(e1, y, e2 - e1, 1.2 * P)
    }
    // Density: deep Prussian blue, streaky along the brush direction.
    const col = canvas(W, H), cg = ctx2d(col)
    const sw = Math.round(W / 6), sh = Math.round(H / 6)
    const small = canvas(sw, sh), sg = ctx2d(small)
    const img = sg.createImageData(sw, sh)
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const streak = fbm(x / 70, y / 4, 21, 4)
      const cloud = fbm(x / 22, y / 22, 23, 4)
      const v = 0.55 * streak + 0.45 * cloud
      const k = (y * sw + x) * 4
      img.data[k] = 16 + v * 26
      img.data[k + 1] = 50 + v * 40
      img.data[k + 2] = 84 + v * 52
      img.data[k + 3] = 255
    }
    sg.putImageData(img, 0, 0)
    cg.imageSmoothingQuality = 'high'
    cg.drawImage(small, 0, 0, W, H)
    cg.globalCompositeOperation = 'destination-in'
    cg.drawImage(m, 0, 0)
    // Multiply so the paper's fibre still shows through the blue.
    g.globalCompositeOperation = 'multiply'
    g.drawImage(col, 0, 0)
    g.globalCompositeOperation = 'source-over'
    return c
  })
}

/* ---------- Where the lines go: the three bodies' motion paths ---------- */

type Pt = { x: number; y: number }
const K = 0.62 // mm per body unit
export const COLUMNS = [75, SHEET_CENTER.x, 345]
const ROW_Y = 156
const toSheet = (col: number, u: number, v: number): Pt => ({ x: COLUMNS[col] + (u - 100) * K, y: ROW_Y + (v - 65) * K })
const ARM_BASE: [number, number] = [74, 104]
const QUAD_X0 = 58, QUAD_GROUND = 120
const S3_T0 = 6.8

function path(n: number, f: (k: number) => Pt) { return Array.from({ length: n }, (_, i) => f(i / (n - 1))) }

/** Eight target paths per body, in sheet mm (sphere 0 → middle, 1 → right, 2 → left). */
export const TARGETS: Pt[][][] = (() => {
  const arm: Pt[][] = []
  const per = 1 / 0.62
  for (const key of ['tip', 'wr', 'el'] as const) arm.push(path(90, k => { const j = armJoints(armPoseAt(k * per, ARM_BASE)); const p = key === 'tip' ? j.tip : j[key]; return toSheet(0, p[0], p[1]) }))
  const sh = armJoints(armPoseAt(0, ARM_BASE)).sh
  for (const rad of [30, 46, 62, 78, 92]) arm.push(path(90, k => { const a = -Math.PI * (1.12 - k * 0.98); return toSheet(0, sh[0] + Math.cos(a) * rad, sh[1] + Math.sin(a) * rad) }))

  const quad: Pt[][] = []
  const dur = 2.6
  for (let f = 0; f < 4; f++) quad.push(path(90, k => { const q = quadPoseAt(k * dur, QUAD_X0, QUAD_GROUND); return toSheet(1, q.feet[f][0], q.feet[f][1]) }))
  quad.push(path(90, k => { const q = quadPoseAt(k * dur, QUAD_X0, QUAD_GROUND); return toSheet(1, q.x, q.y) }))
  quad.push(path(90, k => { const q = quadPoseAt(k * dur, QUAD_X0, QUAD_GROUND); return toSheet(1, q.x + 51, q.y - 12) }))
  quad.push(path(90, k => { const q = quadPoseAt(k * dur, QUAD_X0, QUAD_GROUND); return toSheet(1, q.x - 30, q.y + 6) }))
  quad.push(path(90, k => { const q = quadPoseAt(k * dur, QUAD_X0, QUAD_GROUND); return toSheet(1, q.x + 30, q.y + 6) }))

  const drone: Pt[][] = []
  const period = 1 / 0.55
  drone.push(path(120, k => { const d = dronePoseAt(k * period, 100, 65); return toSheet(2, d.x, d.y) }))
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) drone.push(path(120, k => { const d = dronePoseAt(k * period, 100, 65); return toSheet(2, d.x + sx * 23, d.y + sy * 22) }))
  for (const s of [0.55, 0.78, 1.25]) drone.push(path(120, k => { const d = dronePoseAt(k * period, 100, 65); return toSheet(2, 100 + (d.x - 100) * s, 65 + (d.y - 65) * s) }))

  // Sphere 0 is the top one (middle column), 1 bottom-right (right), 2 bottom-left (left).
  return [quad, drone, arm]
})()

/** Each principal field line with its target path, both as 90 points. */
const MORPHS = (() => {
  const count = [0, 0, 0]
  const r = rng(5)
  return MAIN_LINES.map(l => {
    const j = count[l.from]++
    const tgt = TARGETS[l.from][j % 8]
    // The filings that make up this line on paper, fixed once.
    const chain: { x: number; y: number; ang: number; L: number; a: number; w: number; at: number }[] = []
    for (let i = 1; i < l.pts.length; i++) {
      const a = l.pts[i - 1], b = l.pts[i]
      const seg = Math.hypot(b.x - a.x, b.y - a.y)
      const n = Math.max(1, Math.round(seg / 0.55))
      for (let k = 0; k < n; k++) {
        const t = k / n
        chain.push({
          x: a.x + (b.x - a.x) * t + (r() - 0.5) * 0.5, y: a.y + (b.y - a.y) * t + (r() - 0.5) * 0.5,
          ang: Math.atan2(b.y - a.y, b.x - a.x) + (r() - 0.5) * 0.25, L: 0.6 + r() * 0.9,
          a: 0.6 + r() * 0.35, w: 0.16 + r() * 0.12, at: (l.cum[i - 1] + seg * t) / l.len,
        })
      }
    }
    return { line: l, src: resample(l.pts, tgt.length), tgt, j, chain }
  })
})()

/* ---------- Painting ---------- */

export interface SheetState {
  t: number
  /** 0..1: the principal lines growing along their length. */
  lines: number
  /** 0..1: filings gathering (by their reveal order). */
  filings: number
  /** 0..1: the spheres rolling apart, stretching everything outward. */
  stretch: number
  /** Exposure front, in sheet mm from the left edge (-∞ = none, +∞ = done). */
  front: number
  /** 0..1: lines becoming motion paths. */
  morph: number
  /** 0..1: bodies drawing in. */
  bodies: number
}

const stretchPt = (x: number, y: number, s: number) => {
  const dx = x - SHEET_CENTER.x, dy = y - SHEET_CENTER.y
  const d = Math.hypot(dx, dy)
  // Stretch more near the spheres, as if the field is being pulled apart.
  const k = 1 + s * 0.75 * Math.exp(-d / 150)
  return { x: SHEET_CENTER.x + dx * k, y: SHEET_CENTER.y + dy * k }
}

function drawFilings(g: Ctx, s: SheetState, color: string, white: boolean) {
  g.strokeStyle = color
  g.lineCap = 'round'
  const fade = white ? 1 - s.morph * 0.72 : 1
  for (const f of FILINGS) {
    const shown = (s.filings - f.reveal * 0.85) / 0.15
    if (shown <= 0) continue
    const a = Math.min(1, shown) * fade
    const p = s.stretch > 0 ? stretchPt(f.x, f.y, s.stretch) : f
    const ca = Math.cos(f.a) * f.l * 0.5, sa = Math.sin(f.a) * f.l * 0.5
    g.globalAlpha = a * (white ? 0.62 + f.tone * 0.3 : 0.5 + f.tone * 0.42)
    g.lineWidth = f.w * P
    g.beginPath()
    g.moveTo((p.x - ca) * P, (p.y - sa) * P)
    g.lineTo((p.x + ca) * P, (p.y + sa) * P)
    g.stroke()
  }
  g.globalAlpha = 1
}

/** Principal lines: filing chains on paper, light on the cyanotype. */
function drawLines(g: Ctx, s: SheetState, white: boolean) {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (const m of MORPHS) {
    const stagger = m.j * 0.035 + m.line.from * 0.02
    const e = Math.min(1, Math.max(0, (s.morph - stagger) / (1 - 0.3)))
    const ee = e * e * (3 - 2 * e)
    const grown = Math.min(1, s.lines * (1.15 - m.j * 0.02))
    if (ee <= 0) {
      // Still a field line: grow it along its length.
      if (grown <= 0) continue
      if (white) {
        const pts = partial(m.line, grown)
        if (pts.length < 2) continue
        g.strokeStyle = CYAN_WHITE
        g.globalAlpha = 0.85
        g.lineWidth = 0.55 * P
        g.beginPath()
        pts.forEach((q, i) => { const p = stretchPt(q.x, q.y, s.stretch); if (i) g.lineTo(p.x * P, p.y * P); else g.moveTo(p.x * P, p.y * P) })
        g.stroke()
      } else {
        // Dense filings stacked along the line.
        g.strokeStyle = GRAPHITE
        for (const f of m.chain) {
          if (f.at > grown) break
          const q = s.stretch > 0 ? stretchPt(f.x, f.y, s.stretch) : f
          const ca = Math.cos(f.ang) * f.L / 2, sa = Math.sin(f.ang) * f.L / 2
          g.globalAlpha = f.a
          g.lineWidth = f.w * P
          g.beginPath()
          g.moveTo((q.x - ca) * P, (q.y - sa) * P)
          g.lineTo((q.x + ca) * P, (q.y + sa) * P)
          g.stroke()
        }
      }
      continue
    }
    // Becoming a motion path.
    g.strokeStyle = white ? CYAN_WHITE : GRAPHITE
    g.globalAlpha = white ? 0.9 - ee * 0.45 : 0.8
    g.lineWidth = (0.55 - ee * 0.2) * P
    g.beginPath()
    for (let i = 0; i < m.src.length; i++) {
      const a = stretchPt(m.src[i].x, m.src[i].y, s.stretch), b = m.tgt[i]
      const x = a.x + (b.x - a.x) * ee, y = a.y + (b.y - a.y) * ee
      if (i) g.lineTo(x * P, y * P); else g.moveTo(x * P, y * P)
    }
    g.stroke()
  }
  g.globalAlpha = 1
}

/** The three bodies, live, with bright trails of where they just were. */
function drawBodies(g: Ctx, s: SheetState) {
  if (s.bodies <= 0) return
  const t = Math.max(0, s.t - S3_T0)
  g.strokeStyle = g.fillStyle = CYAN_WHITE
  g.lineCap = 'round'
  g.lineJoin = 'round'
  // Trails first, fading with age.
  const trail = (pt: (tt: number) => Pt, span = 0.9, steps = 40) => {
    for (let i = 1; i < steps; i++) {
      const t0 = t - (span * (i - 1)) / steps, t1 = t - (span * i) / steps
      if (t1 < -0.4) break
      const a = pt(t0), b = pt(t1)
      g.globalAlpha = s.bodies * (1 - i / steps) ** 1.6 * 0.95
      g.lineWidth = (0.9 - (i / steps) * 0.6) * P
      g.beginPath(); g.moveTo(a.x * P, a.y * P); g.lineTo(b.x * P, b.y * P); g.stroke()
    }
  }
  g.save()
  g.shadowColor = 'rgba(220,240,255,0.55)'
  g.shadowBlur = 1.6 * P
  trail(tt => { const j = armJoints(armPoseAt(tt, ARM_BASE)); return toSheet(0, j.tip[0], j.tip[1]) })
  for (let f = 0; f < 4; f++) trail(tt => { const q = quadPoseAt(tt, QUAD_X0, QUAD_GROUND); return toSheet(1, q.feet[f][0], q.feet[f][1]) }, 0.5, 24)
  trail(tt => { const d = dronePoseAt(tt, 100, 65); return toSheet(2, d.x, d.y) }, 1.1, 50)
  g.restore()

  // The bodies, drawn in as if traced by light.
  g.globalAlpha = 1
  const reveal = s.bodies
  const body = (col: number, draw: () => void) => {
    g.save()
    g.translate((COLUMNS[col] - 100 * K) * P, (ROW_Y - 65 * K) * P)
    g.scale(K * P, K * P)
    g.lineWidth = 1.5
    g.setLineDash(reveal < 1 ? [reveal * 260, 400] : [])
    draw()
    g.restore()
  }
  body(0, () => drawArm(g, armPoseAt(t, ARM_BASE)))
  body(1, () => drawQuad(g, quadPoseAt(t, QUAD_X0, QUAD_GROUND), false))
  body(2, () => drawDrone(g, dronePoseAt(t, 100, 65)))
  // Ground lines and column folds, printed faint.
  g.globalAlpha = 0.35 * reveal
  g.lineWidth = 0.3 * P
  for (const x of [142, 278]) { g.beginPath(); g.moveTo(x * P, 40 * P); g.lineTo(x * P, (SHEET_MM.h - 40) * P); g.stroke() }
  for (const col of [0, 1]) {
    const a = toSheet(col, 20, col ? QUAD_GROUND + 2 : 122), b = toSheet(col, 180, col ? QUAD_GROUND + 2 : 122)
    g.beginPath(); g.moveTo(a.x * P, a.y * P); g.lineTo(b.x * P, b.y * P); g.stroke()
  }
  g.globalAlpha = 1
}

const work = new Map<string, HTMLCanvasElement>()
const scratch = (k: string, w: number, h: number) => { let c = work.get(k); if (!c) { c = canvas(w, h); work.set(k, c) } return c }

export function paintSheet(s: SheetState) {
  const paper = sheetPaper()
  const W = paper.width, H = paper.height
  const out = scratch('sheet', W, H)
  const g = copyInto(out, paper)
  const exposing = s.front > -100
  if (s.front < SHEET_MM.w + 100) {
    drawFilings(g, s, GRAPHITE, false)
    drawLines(g, s, false)
  }
  if (exposing) {
    const cy = scratch('cyan', W, H)
    const cg = copyInto(cy, cyanBase())
    drawFilings(cg, s, CYAN_WHITE, true)
    drawLines(cg, s, true)
    drawBodies(cg, s)
    if (s.front < SHEET_MM.w + 100) {
      // Only what the light has crossed has developed.
      const grad = cg.createLinearGradient((s.front - 40) * P, 0, (s.front + 10) * P, 0)
      grad.addColorStop(0, 'rgba(0,0,0,1)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      cg.globalCompositeOperation = 'destination-in'
      cg.fillStyle = grad
      cg.fillRect(0, 0, W, H)
      cg.globalCompositeOperation = 'source-over'
    }
    g.drawImage(cy, 0, 0)
    if (s.front < SHEET_MM.w + 100) {
      // The band of sunlight itself.
      const band = g.createLinearGradient((s.front - 70) * P, 0, (s.front + 50) * P, 0)
      band.addColorStop(0, 'rgba(255,255,255,0)')
      band.addColorStop(0.6, 'rgba(255,255,255,0.55)')
      band.addColorStop(1, 'rgba(255,255,255,0)')
      g.globalCompositeOperation = 'screen'
      g.fillStyle = band
      g.fillRect(0, 0, W, H)
      g.globalCompositeOperation = 'source-over'
    }
  }
  return out
}
