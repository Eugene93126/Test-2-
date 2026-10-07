import { canvas, copyInto, cached, ctx2d } from './canvas'
import { paperBase } from './paper'
import { type Model, MODELS } from './sketch/robots'
import { type V3, add, bounds, perspective } from './sketch/geom'
import { INKS, letter, Pen } from './sketch/pen'
import type { View } from './sketch/geom'
import type { Solid } from './sketch/solids'
import { LIGHT, type Style, p2, renderSolids } from './sketch/solids'
import { dims, drawPerson, notes, paths, person, rings, turns } from './sketch/annotate'

// CrossBody-12 cards: body studies on dot-grid sketch card. Each robot is
// drawn in perspective in fine-liner over blue ballpoint construction, with
// hatched tone, a scribbled ground shadow and the designer's callouts.

export const CARD_MM = { w: 152, h: 102 }
const P = 8

export const CARD_STYLE: Style = {
  line: INKS.black,
  hatch: INKS.blue,
  build: { color: '#3B57A8', alpha: 0.4 },
  dark: { color: '#14181D', alpha: 0.93 },
  k: 1.05,
  gap: 3.0,
  build01: 1,
}

function template() {
  return cached('card-template', () => {
    const base = paperBase('sketch-card', CARD_MM.w, CARD_MM.h, { base: '#E9ECEB', mottle: 0.35, fibers: 0.3, grain: 5, ppmm: P }, 11)
    const c = canvas(base.width, base.height)
    const g = copyInto(c, base)
    // Printed: a faint 5 mm dot grid, a border and a title strip.
    g.fillStyle = 'rgba(64, 96, 168, 0.26)'
    for (let x = 10; x < 147; x += 5) for (let y = 10; y < 86; y += 5) { g.beginPath(); g.arc(x * P, y * P, 0.17 * P, 0, Math.PI * 2); g.fill() }
    g.strokeStyle = 'rgba(52, 62, 72, 0.6)'
    g.lineWidth = 0.2 * P
    g.strokeRect(5 * P, 5 * P, 142 * P, 92 * P)
    g.beginPath(); g.moveTo(5 * P, 87 * P); g.lineTo(147 * P, 87 * P); g.stroke()
    g.beginPath(); g.moveTo(96 * P, 87 * P); g.lineTo(96 * P, 97 * P); g.stroke()
    // The model's mark: the original lens glyph.
    const gx = 100.5 * P, gy = 92 * P
    g.lineWidth = 0.32 * P
    g.strokeStyle = g.fillStyle = '#2B3238'
    g.beginPath(); g.arc(gx, gy, 1.9 * P, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.arc(gx + 0.55 * P, gy - 0.4 * P, 0.65 * P, 0, Math.PI * 2); g.fill()
    g.font = `500 ${1.9 * P}px "JetBrains Mono"`
    g.letterSpacing = `${0.25 * P}px`
    g.fillText('PANTHEON 2.0 · BODY STUDIES', 104 * P, 91.4 * P)
    g.fillStyle = '#5E6B73'
    g.fillText('KEYSTONE FRONTIER · CHI-07', 104 * P, 94.6 * P)
    g.letterSpacing = '0px'
    return c
  })
}

/** A camera that frames the body, its shadow and its notes' anchors in the area. */
export function frameModel(m: Model, area: { x: number; y: number; w: number; h: number }) {
  const pts = m.parts.flatMap(s => s.samples())
  const L = LIGHT
  // Shadow points count toward the framing, but only near the body.
  let mx = 0, mz = 0
  for (const p of pts) { mx += p[0]; mz += p[2] }
  mx /= pts.length; mz /= pts.length
  const reach = Math.max(...pts.map(p => Math.hypot(p[0] - mx, p[2] - mz))) * 1.15
  const extra: V3[] = pts.filter((_, i) => i % 3 === 0).map(p => [p[0] - (L[0] * p[1]) / L[1], 0, p[2] - (L[2] * p[1]) / L[1]] as V3)
    .filter(p => Math.hypot(p[0] - mx, p[2] - mz) < reach)
  if (m.figure) extra.push(m.figure.at, add(m.figure.at, [0, m.figure.h ?? 1.72, 0]))
  m.rings?.forEach(r => { for (let a = 0; a < 6.28; a += 0.4) extra.push([r.c[0] + Math.cos(a) * r.r, 0, r.c[2] + Math.sin(a) * r.r]) })
  m.dims?.forEach(d => extra.push(d.a, d.b))
  m.paths?.forEach(p => extra.push(...p.pts))
  const all = [...pts, ...extra]
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity
  for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); z0 = Math.min(z0, p[2]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); z1 = Math.max(z1, p[2]) }
  const c: V3 = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]
  const size = Math.max(x1 - x0, y1 - y0, z1 - z0)
  const { az, el, dist = 2.4 } = m.view
  const eye: V3 = add(c, [Math.sin(az) * Math.cos(el) * size * dist, Math.sin(el) * size * dist, Math.cos(az) * Math.cos(el) * size * dist])
  const v0 = perspective(eye, c, 1, 0, 0)
  const b = bounds(all.map(p => p2(v0, p)))
  const f = Math.min(area.w / b.w, area.h / b.h)
  return perspective(eye, c, f, area.x + area.w / 2 - b.cx * f, area.y + area.h / 2 - b.cy * f)
}

/** Where a designer starts: the body's bounding box, a ground ellipse, the axis. */
function blockIn(g: CanvasRenderingContext2D, v: View, parts: Solid[], st: Style, seed: number) {
  const pen = new Pen(g, seed)
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity
  for (const p of parts.flatMap(s => s.samples())) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); z0 = Math.min(z0, p[2]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); z1 = Math.max(z1, p[2]) }
  const ink = { ...st.build, alpha: st.build.alpha * 0.8 }
  const C = (a: number, b: number, c: number): V3 => [a ? x1 : x0, b ? y1 : y0, c ? z1 : z0]
  const edges: [V3, V3][] = []
  for (const a of [0, 1]) for (const b of [0, 1]) { edges.push([C(0, a, b), C(1, a, b)], [C(a, 0, b), C(a, 1, b)], [C(a, b, 0), C(a, b, 1)]) }
  for (const [a, b] of edges) {
    const A = p2(v, a), B = p2(v, b)
    const dx = B[0] - A[0], dy = B[1] - A[1]
    const e0 = pen.rand(0.06, 0.2), e1 = pen.rand(0.06, 0.2)
    pen.line([A[0] - dx * e0, A[1] - dy * e0], [B[0] + dx * e1, B[1] + dy * e1], { w: 0.75 * st.k, ink, wobble: 0.4 })
  }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = Math.max(x1 - x0, z1 - z0) * 0.62
  const ring = Array.from({ length: 64 }, (_, i) => { const a = (i / 64) * Math.PI * 2; return p2(v, [cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R]) })
  pen.stroke(ring, { w: 0.8 * st.k, ink, closed: true, wobble: 0.6 })
  const a = p2(v, [cx, 0, cz]), b = p2(v, [cx, y1 * 1.12 + 0.02, cz])
  pen.line(a, b, { w: 0.7 * st.k, ink, wobble: 0.3 })
}

export function paintCard(i: number, body: string) {
  return cached(`card:${i}`, () => {
    const W = CARD_MM.w * P, H = CARD_MM.h * P
    const c = canvas(W, H)
    const g = copyInto(c, template())
    const m = MODELS[body]()
    const st = CARD_STYLE
    const seed = 100 + i * 17
    const v = frameModel(m, { x: 10 * P, y: 15 * P, w: 92 * P, h: 69 * P })
    const layer = canvas(W, H), lg = ctx2d(layer)
    blockIn(lg, v, m.parts, st, seed + 11)
    if (m.rings) rings(lg, v, m.rings, st, seed + 1, 2.4 * P)
    if (m.figure) drawPerson(lg, v, person(m.figure.at, m.figure.h, m.figure.yaw), st, seed + 2)
    renderSolids(lg, v, m.parts, st, seed, { clip: { x0: 6 * P, y0: 6 * P, x1: W - 6 * P, y1: 86 * P } })
    if (m.turns) turns(lg, v, m.turns, st, seed + 3)
    if (m.paths) paths(lg, v, m.paths, st, seed + 4)
    if (m.dims) dims(lg, v, m.dims, st, seed + 5, 2.3 * P)
    notes(lg, v, m.notes, { x0: 109 * P, y0: 17 * P, x1: 145 * P, y1: 83 * P }, st, seed + 6, 2.5 * P)
    g.drawImage(layer, 0, 0)

    // Title, by hand, with a quick underline.
    const tw = letter(g, `${m.code}  ${m.name}`, 9 * P, 11.5 * P, 4.2 * P, INKS.black, seed + 7, { weight: 640 })
    const pen = new Pen(g, seed + 8)
    pen.line([8.5 * P, 12.6 * P], [9 * P + tw + 3 * P, 12.4 * P], { w: 1.6, ink: INKS.black, over: 6 })
    letter(g, 'REV C', 9 * P + tw + 6 * P, 11.3 * P, 2.4 * P, INKS.blue, seed + 9)

    // Printed index.
    g.fillStyle = '#20272D'
    g.font = `500 ${3.6 * P}px "JetBrains Mono"`
    g.letterSpacing = `${0.3 * P}px`
    g.fillText(`${String(i + 1).padStart(2, '0')}/12`, 8 * P, 94.4 * P)
    g.font = `500 ${1.9 * P}px "JetBrains Mono"`
    g.fillStyle = '#5E6B73'
    g.letterSpacing = `${0.3 * P}px`
    g.fillText(`CROSSBODY-12 · ${m.code}`, 32 * P, 94 * P)
    g.letterSpacing = '0px'
    return c
  })
}
