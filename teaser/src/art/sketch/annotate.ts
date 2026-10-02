import type { Ctx } from '../canvas'
import { type P2, type V3, type View, add, euler, inBasis, madd, mul, norm, perp, sub } from './geom'
import { letter, type Ink, Pen } from './pen'
import { type Solid, type Style, box, cap, cyl, ell, p2, renderSolids } from './solids'

// What a designer writes around a sketch: callouts with leaders, turn arrows,
// dimensions, the ground ring a robot keeps clear, a person for scale.

export interface Note { at: V3; text: string }
export interface Turn { c: V3; axis: V3; r: number; a0: number; a1: number }
export interface Path { pts: V3[] }
export interface Dim { a: V3; b: V3; text: string; off?: V3 }
export interface Ring { c: V3; r: number; text?: string }

export interface Box2 { x0: number; y0: number; x1: number; y1: number }

function arrowHead(pen: Pen, tip: P2, from: P2, size: number, w: number, ink: Ink) {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0])
  for (const s of [-1, 1]) {
    const b = a + Math.PI + s * 0.42
    pen.line(tip, [tip[0] + Math.cos(b) * size, tip[1] + Math.sin(b) * size], { w, ink, wobble: 0.2 })
  }
}

/** Callouts in a column beside the drawing, each with a leader to its part. */
export function notes(g: Ctx, v: View, list: Note[], col: Box2, st: Style, seed: number, size: number) {
  const pen = new Pen(g, seed)
  const k = st.k
  const items = list.map(n => ({ n, p: p2(v, n.at) })).sort((a, b) => a.p[1] - b.p[1])
  const gap = size * 1.9
  // Spread labels down the column, close to their anchors' heights.
  let y = col.y0 + size
  const ys = items.map(it => { const yy = Math.max(y, Math.min(col.y1, it.p[1])); y = yy + gap; return yy })
  // If the last ran off the bottom, push everything up.
  const over = ys.length ? ys[ys.length - 1] - col.y1 : 0
  if (over > 0) for (let i = 0; i < ys.length; i++) ys[i] = Math.max(col.y0 + size, ys[i] - over)
  items.forEach((it, i) => {
    const ly = ys[i]
    const lx = col.x0
    pen.dot(it.p[0], it.p[1], 2.6 * k, st.line)
    const elbow: P2 = [lx - 14 * k, ly]
    pen.stroke([it.p, elbow, [lx - 2 * k, ly]], { w: 1.15 * k, ink: st.line, wobble: 0.4 })
    const tw = letter(g, it.n.text, lx + 4 * k, ly + size * 0.36, size, st.line, seed + i * 31)
    pen.line([lx - 2 * k, ly + size * 0.62], [lx + tw + 8 * k, ly + size * 0.62], { w: 0.9 * k, ink: st.build, wobble: 0.3 })
  })
}

export function turns(g: Ctx, v: View, list: Turn[], st: Style, seed: number) {
  const pen = new Pen(g, seed)
  for (const t of list) {
    const [e1, e2] = perp(norm(t.axis))
    const n = 40
    const pts = Array.from({ length: n + 1 }, (_, i) => { const a = t.a0 + ((t.a1 - t.a0) * i) / n; return p2(v, madd(t.c, add(mul(e1, Math.cos(a)), mul(e2, Math.sin(a))), t.r)) })
    pen.stroke(pts, { w: 1.6 * st.k, ink: st.line, wobble: 0.5 })
    arrowHead(pen, pts[n], pts[n - 3], 13 * st.k, 1.5 * st.k, st.line)
  }
}

export function paths(g: Ctx, v: View, list: Path[], st: Style, seed: number) {
  const pen = new Pen(g, seed)
  for (const p of list) {
    const pts = p.pts.map(q => p2(v, q))
    pen.stroke(pts, { w: 1.6 * st.k, ink: st.line, wobble: 0.6 })
    arrowHead(pen, pts[pts.length - 1], pts[Math.max(0, pts.length - 2)], 13 * st.k, 1.5 * st.k, st.line)
  }
}

export function dims(g: Ctx, v: View, list: Dim[], st: Style, seed: number, size: number) {
  const pen = new Pen(g, seed)
  list.forEach((d, i) => {
    const off = d.off ?? [0, 0, 0]
    const a = p2(v, add(d.a, off)), b = p2(v, add(d.b, off))
    const a0 = p2(v, d.a), b0 = p2(v, d.b)
    pen.line(a0, a, { w: 0.8 * st.k, ink: st.build, over: 6 * st.k })
    pen.line(b0, b, { w: 0.8 * st.k, ink: st.build, over: 6 * st.k })
    pen.line(a, b, { w: 1.1 * st.k, ink: st.line, wobble: 0.3 })
    arrowHead(pen, a, b, 10 * st.k, 1.2 * st.k, st.line)
    arrowHead(pen, b, a, 10 * st.k, 1.2 * st.k, st.line)
    const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    const vertical = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0])
    letter(g, d.text, m[0] + (vertical ? 8 * st.k : 0), m[1] + (vertical ? size * 0.35 : -8 * st.k), size, st.line, seed + i * 7, { align: vertical ? 'left' : 'center' })
  })
}

export function rings(g: Ctx, v: View, list: Ring[], st: Style, seed: number, size: number) {
  const pen = new Pen(g, seed)
  list.forEach((r, i) => {
    const n = 96
    const pts = Array.from({ length: n }, (_, j) => { const a = (j / n) * Math.PI * 2; return p2(v, [r.c[0] + Math.cos(a) * r.r, r.c[1], r.c[2] + Math.sin(a) * r.r]) })
    // Dashed, as a zone on the floor is.
    for (let j = 0; j < n; j += 4) pen.stroke(pts.slice(j, j + 3), { w: 1.0 * st.k, ink: st.hatch, wobble: 0.3 })
    if (r.text) {
      const p = pts[Math.round(n * 0.25)]
      letter(g, r.text, p[0], p[1] + size * 1.2, size * 0.86, st.hatch, seed + i * 13, { align: 'center' })
    }
  })
}

/** A person for scale, drawn as light construction. */
export function person(at: V3, h = 1.72, yaw = 0): Solid[] {
  const k = h / 1.72
  const B = euler(yaw)
  const P = (x: number, y: number, z: number): V3 => add(at, inBasis(B, [x * k, y * k, z * k]))
  return [
    ell(P(0, 1.6, 0), [0.085 * k, 0.11 * k, 0.095 * k], B),
    cyl(P(0, 1.46, 0), P(0, 1.52, 0), 0.04 * k),
    ell(P(0, 1.27, 0), [0.18 * k, 0.24 * k, 0.1 * k], B),
    ell(P(0, 0.96, 0), [0.155 * k, 0.11 * k, 0.1 * k], B),
    ...[-1, 1].flatMap(s => [
      cap(P(s * 0.09, 0.9, 0), P(s * 0.1, 0.49, 0.01), 0.068 * k, 0.05 * k),
      cap(P(s * 0.1, 0.48, 0.01), P(s * 0.1, 0.07, 0), 0.05 * k, 0.035 * k),
      box(P(s * 0.1, 0.035, 0.05), [0.09 * k, 0.07 * k, 0.24 * k], B, 0.025 * k),
      cap(P(s * 0.215, 1.42, 0), P(s * 0.25, 1.11, 0.0), 0.046 * k, 0.04 * k),
      cap(P(s * 0.25, 1.1, 0), P(s * 0.26, 0.83, 0.04), 0.038 * k, 0.03 * k),
    ]),
  ].map(s => { s.hatchable = false; s.build = false; return s })
}

/** Ghost style for the scale figure: thin ballpoint, no tone. */
export const ghost = (st: Style): Style => ({ ...st, line: { ...st.build, alpha: Math.min(1, st.build.alpha * 1.3) }, k: st.k * 0.55 })

export function drawPerson(g: Ctx, v: View, parts: Solid[], st: Style, seed: number) {
  renderSolids(g, v, parts, ghost(st), seed, { shadow: false })
}

export const lerpV = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t))
