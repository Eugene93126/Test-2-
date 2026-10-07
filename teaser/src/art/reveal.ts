import { canvas, cached, ctx2d, type Ctx } from './canvas'
import { rng } from '../lib/rand'
import { Pen, type Ink } from './sketch/pen'
import { TEXT } from '../lib/timeline'

// S7: the reveal, as an engraved title page. Flemish strapwork (the cartouche
// of the ornament prints) holds the date; chinoiserie lives in the border and
// at the sides (a key-fret band, a prunus branch, a pagoda, cloud scrolls, a
// bird); the type is Italian (Bodoni's italic, Roman capitals); and where a
// coat of arms would sit, a cyberpunk sigil built round the lens glyph, its
// traces running into the straps. The date carries a digital slice; its full
// stop is the clay node.

type P = [number, number]
const INK = { color: '#0B0E12', alpha: 1 }
const SILVER: Ink = { color: '#C9D2D8', alpha: 0.92 }
const STEEL: Ink = { color: '#7D8B94', alpha: 0.85 }
const COBALT: Ink = { color: '#4F6FB8', alpha: 0.72 }
const COBALT_DIM: Ink = { color: '#3E5A9C', alpha: 0.45 }
const CYAN: Ink = { color: '#BDE7F4', alpha: 0.9 }
const CLAY = '#D97757'
void INK

/* ---------- ornament pieces ---------- */

function bez(p0: P, p1: P, p2: P, p3: P, n = 40): P[] {
  const out: P[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, d = t ** 3
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]])
  }
  return out
}

/**
 * A strap, as in the Antwerp ornament prints: two parallel edges and, on the
 * side away from the light (lower right), engraved hatching across the band.
 */
function strap(pen: Pen, pts: P[], w: number, ink: Ink, hatch: Ink, lw: number) {
  const n = pts.length
  const nrm = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l] as P
  })
  const A = pts.map((p, i): P => [p[0] + nrm[i][0] * w / 2, p[1] + nrm[i][1] * w / 2])
  const B = pts.map((p, i): P => [p[0] - nrm[i][0] * w / 2, p[1] - nrm[i][1] * w / 2])
  pen.stroke(A, { w: lw, ink, wobble: 0.05, taper: 0.2 })
  pen.stroke(B, { w: lw, ink, wobble: 0.05, taper: 0.2 })
  // Light from the upper left: shade where the band's normal faces down-right.
  let acc = 0
  for (let i = 1; i < n; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    const facing = nrm[i][0] * 0.6 + nrm[i][1] * 0.8
    if (acc < 3.2 || Math.abs(facing) < 0.25) continue
    acc = 0
    const k = Math.min(1, Math.abs(facing))
    const from = facing > 0 ? A[i] : B[i], to = facing > 0 ? B[i] : A[i]
    pen.line(from, [from[0] + (to[0] - from[0]) * (0.35 + 0.6 * k), from[1] + (to[1] - from[1]) * (0.35 + 0.6 * k)], { w: 0.75, ink: hatch, wobble: 0, taper: 1 })
  }
}

/** An acanthus run: an S-curve with leaf curls budding off one side. */
function acanthus(pen: Pen, pts: P[], ink: Ink, s: number) {
  pen.stroke(pts, { w: 1.6 * s, ink, wobble: 0.1, taper: 0.6 })
  for (let i = 6; i < pts.length - 4; i += 7) {
    const a = pts[i - 1], b = pts[i + 1]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const tx = (b[0] - a[0]) / l, ty = (b[1] - a[1]) / l
    const side = (i / 7) % 2 ? 1 : -1
    const nx = -ty * side, ny = tx * side
    const L = (16 + (i % 3) * 5) * s
    const tip: P = [pts[i][0] + nx * L + tx * L * 0.7, pts[i][1] + ny * L + ty * L * 0.7]
    const leaf = bez(pts[i], [pts[i][0] + nx * L * 0.9, pts[i][1] + ny * L * 0.9], [tip[0] - tx * L * 0.2, tip[1] - ty * L * 0.2], tip, 14)
    pen.stroke(leaf, { w: 1.1 * s, ink, wobble: 0.05, taper: 0.7 })
    const curl: P[] = []
    for (let j = 0; j <= 14; j++) { const t = (j / 14) * Math.PI * 1.5; const rr = 5 * s * (1 - j / 22); curl.push([tip[0] + Math.cos(t + Math.atan2(ny, nx)) * rr - nx * 5 * s, tip[1] + Math.sin(t + Math.atan2(ny, nx)) * rr - ny * 5 * s]) }
    pen.stroke(curl, { w: 0.9 * s, ink, wobble: 0.05, taper: 0.8 })
  }
}

/** A key-fret (回) band along a straight edge, one unit per band height. */
function fret(pen: Pen, x0: number, y0: number, len: number, h: number, dir: 'h' | 'v', ink: Ink, w: number) {
  const n = Math.floor(len / h)
  const off = (len - n * h) / 2
  const unit: P[] = [[0, 1], [0, 0], [1, 0], [1, 0.78], [0.22, 0.78], [0.22, 0.22], [0.78, 0.22], [0.78, 0.55], [0.48, 0.55]]
  for (let i = 0; i < n; i++) {
    const pts = unit.map(([u, v]): P => dir === 'h' ? [x0 + off + (i + u) * h, y0 + v * h] : [x0 + v * h, y0 + off + (i + u) * h])
    pen.stroke(pts, { w, ink, wobble: 0.05, taper: 0 })
  }
  const a: P = dir === 'h' ? [x0 + off, y0 + h] : [x0 + h, y0 + off]
  const b: P = dir === 'h' ? [x0 + off + n * h, y0 + h] : [x0 + h, y0 + off + n * h]
  pen.line(a, b, { w, ink, wobble: 0.05, taper: 0 })
}

/** A volute: a strap rolled into a spiral, engraved with shading inside the roll. */
function volute(pen: Pen, g: Ctx, cx: number, cy: number, r: number, turns: number, sgn: number, rot: number, ink: Ink, hatch: Ink, w: number) {
  const outer: P[] = [], inner: P[] = []
  const N = 120
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * turns * Math.PI * 2
    const rr = r * Math.exp(-0.21 * th)
    const a = rot + sgn * th
    outer.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
    const ri = rr * 0.72
    inner.push([cx + Math.cos(a) * ri, cy + Math.sin(a) * ri])
  }
  pen.stroke(outer, { w, ink, wobble: 0.1, taper: 0.4 })
  pen.stroke(inner, { w: w * 0.7, ink, wobble: 0.1, taper: 0.6 })
  // Shade the band between the two spirals on its far side: short engraved strokes.
  for (let i = 4; i < N; i += 3) {
    const th = (i / N) * turns * Math.PI * 2
    const shade = Math.sin(rot + sgn * th + 0.8)
    if (shade < 0.1) continue
    pen.line(outer[i], inner[i], { w: 0.8, ink: hatch, wobble: 0.05, taper: 1 })
  }
  void g
}

/** A five-petalled plum blossom. */
function blossom(pen: Pen, x: number, y: number, r: number, rot: number, ink: Ink) {
  for (let k = 0; k < 5; k++) {
    const a = rot + (k / 5) * Math.PI * 2
    const pts: P[] = []
    for (let j = 0; j <= 16; j++) {
      const s = j / 16
      const ang = a + (s - 0.5) * 1.15
      const rr = r * Math.sin(Math.PI * s) * (0.95 + 0.1 * Math.sin(s * 9))
      pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr])
    }
    pen.stroke(pts, { w: 1.1, ink, wobble: 0.1, taper: 0.3 })
  }
  for (let k = 0; k < 7; k++) {
    const a = rot + k * 0.9
    pen.line([x, y], [x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42], { w: 0.7, ink, wobble: 0, taper: 1 })
    pen.dot(x + Math.cos(a) * r * 0.46, y + Math.sin(a) * r * 0.46, 1.1, ink)
  }
}

/** A gnarled prunus branch: tapering strokes that fork, blossoms and buds along it. */
function branch(pen: Pen, r: () => number, x: number, y: number, ang: number, len: number, w: number, depth: number, ink: Ink, flowers: P[]) {
  const pts: P[] = [[x, y]]
  let cx = x, cy = y, a = ang
  const steps = 14
  for (let i = 0; i < steps; i++) {
    // Plum wood zigzags: it grows, stops, turns.
    a += (r() - 0.5) * 0.5 + (i % 3 === 0 ? (r() - 0.5) * 0.9 : 0)
    cx += Math.cos(a) * len / steps
    cy += Math.sin(a) * len / steps
    pts.push([cx, cy])
  }
  // Drawn as an engraved limb: two edges and bark strokes between them.
  const nrm = pts.map((_, i) => { const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)]; const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [-(q[1] - p[1]) / l, (q[0] - p[0]) / l] as P })
  const half = (i: number) => w * (1 - (i / pts.length) * 0.8) / 2
  pen.stroke(pts.map((p, i): P => [p[0] + nrm[i][0] * half(i), p[1] + nrm[i][1] * half(i)]), { w: 1.2, ink, wobble: 0.3, taper: 0.5 })
  pen.stroke(pts.map((p, i): P => [p[0] - nrm[i][0] * half(i), p[1] - nrm[i][1] * half(i)]), { w: 1.2, ink, wobble: 0.3, taper: 0.5 })
  for (let i = 1; i < pts.length - 1; i++) {
    if (half(i) < 2) break
    if (r() < 0.6) pen.line([pts[i][0] - nrm[i][0] * half(i) * 0.9, pts[i][1] - nrm[i][1] * half(i) * 0.9], [pts[i][0] + nrm[i][0] * half(i) * 0.1, pts[i][1] + nrm[i][1] * half(i) * 0.1], { w: 0.8, ink, wobble: 0.1, taper: 1 })
  }
  if (depth > 0) {
    for (let k = 0; k < 3; k++) {
      const i = 3 + Math.floor(r() * (steps - 5))
      branch(pen, r, pts[i][0], pts[i][1], a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), len * 0.5, w * 0.5, depth - 1, ink, flowers)
    }
  }
  flowers.push(pts[pts.length - 1], pts[Math.floor(steps * 0.8)], pts[Math.floor(steps * 0.55)])
}

/** A three-tier pagoda with upturned eaves, far off. */
function pagoda(pen: Pen, x: number, y: number, s: number, ink: Ink) {
  let w = 34 * s, yy = y
  for (let i = 0; i < 3; i++) {
    const h = 12 * s
    pen.stroke([[x - w * 0.36, yy], [x - w * 0.36, yy - h], [x + w * 0.36, yy - h], [x + w * 0.36, yy]], { w: 1, ink, wobble: 0.05, taper: 0 })
    const ry = yy - h
    pen.stroke([[x - w * 0.62, ry + 2 * s], [x - w * 0.52, ry], [x - w * 0.2, ry - 6 * s], [x + w * 0.2, ry - 6 * s], [x + w * 0.52, ry], [x + w * 0.62, ry + 2 * s]], { w: 1.2, ink, wobble: 0.1, taper: 0.2 })
    for (let k = -2; k <= 2; k++) pen.line([x + k * w * 0.1, ry - 6 * s], [x + k * w * 0.13, ry], { w: 0.6, ink, wobble: 0, taper: 1 })
    yy = ry - 6 * s
    w *= 0.78
  }
  pen.line([x, yy], [x, yy - 14 * s], { w: 1, ink, wobble: 0, taper: 0 })
}

/** A ruyi cloud: a lobed scroll that curls back into itself. */
function cloud(pen: Pen, x: number, y: number, s: number, ink: Ink) {
  const pts: P[] = []
  const lobes: [number, number, number][] = [[-26, 0, 12], [-8, -9, 13], [12, -6, 12], [27, 2, 9]]
  for (const [lx, ly, lr] of lobes) for (let j = 0; j <= 14; j++) {
    const a = Math.PI * (1 + j / 14)
    pts.push([x + (lx + Math.cos(a) * lr) * s, y + (ly + Math.sin(a) * lr) * s])
  }
  pen.stroke(pts, { w: 1.2, ink, wobble: 0.15, taper: 0.3 })
  pen.stroke([[x - 38 * s, y + 2 * s], [x + 36 * s, y + 2 * s]], { w: 1, ink, wobble: 0.1, taper: 0.8 })
  // The curl at the end, the ruyi head.
  const curl: P[] = []
  for (let j = 0; j <= 24; j++) { const a = (j / 24) * Math.PI * 1.7; const rr = 9 * s * (1 - j / 34); curl.push([x - 30 * s + Math.cos(a + 2.4) * rr, y + 6 * s + Math.sin(a + 2.4) * rr]) }
  pen.stroke(curl, { w: 1.1, ink, wobble: 0.1, taper: 0.5 })
}

/** A small bird on a twig, in profile, facing right: engraved, feathers hatched. */
function bird(pen: Pen, x: number, y: number, s: number, ink: Ink) {
  const S = (px: number, py: number): P => [x + px * s, y + py * s]
  // Body: breast, back and tail as one curve; head and beak.
  const back = bez(S(14, -8), S(4, -16), S(-18, -12), S(-30, -4), 24)
  const tail = bez(S(-30, -4), S(-40, 0), S(-52, 4), S(-58, 8), 12)
  const under = bez(S(-56, 10), S(-40, 10), S(-18, 12), S(-4, 10), 20)
  const breast = bez(S(-4, 10), S(10, 8), S(18, 2), S(18, -6), 16)
  pen.stroke([...back, ...tail], { w: 1.5, ink, wobble: 0.08, taper: 0.4 })
  pen.stroke([...under, ...breast], { w: 1.5, ink, wobble: 0.08, taper: 0.4 })
  const head: P[] = []
  for (let k = 0; k <= 32; k++) { const a = (k / 32) * Math.PI * 2; head.push(S(16 + Math.cos(a) * 8, -12 + Math.sin(a) * 7.5)) }
  pen.stroke(head, { w: 1.4, ink, wobble: 0.05, closed: true })
  pen.stroke([S(23, -15), S(32, -12), S(23, -9)], { w: 1.3, ink, wobble: 0, taper: 0.2 })
  pen.dot(x + 18 * s, y - 13.5 * s, 1.6 * s, ink)
  // Wing: a long curve with feather tips, hatched toward the back.
  const wing = bez(S(6, -6), S(-6, -10), S(-24, -6), S(-40, 2), 20)
  pen.stroke(wing, { w: 1.2, ink, wobble: 0.05, taper: 0.5 })
  for (let k = 0; k < 6; k++) pen.line(S(-10 - k * 5, -6 + k * 0.9), S(-14 - k * 5, 2 + k * 0.6), { w: 0.75, ink, wobble: 0, taper: 1 })
  for (let k = 0; k < 4; k++) pen.line(S(-44 - k * 3.5, 2 + k), S(-50 - k * 3.5, 9 + k * 0.4), { w: 0.7, ink, wobble: 0, taper: 1 })
  // Legs gripping the twig; the twig with two leaves.
  pen.line(S(-4, 11), S(-6, 19), { w: 1.1, ink, wobble: 0, taper: 0 })
  pen.line(S(4, 10), S(5, 19), { w: 1.1, ink, wobble: 0, taper: 0 })
  pen.stroke(bez(S(-46, 22), S(-20, 17), S(14, 21), S(46, 15), 24), { w: 2.2, ink, wobble: 0.3, taper: 0.7 })
  for (const [lx, ly, d] of [[34, 16, -1], [-34, 20, 1]] as [number, number, number][]) {
    pen.stroke(bez(S(lx, ly), S(lx + 6, ly + 8 * d), S(lx + 16, ly + 8 * d), S(lx + 20, ly + 2 * d), 12), { w: 1, ink, wobble: 0.05, taper: 0.5 })
    pen.stroke(bez(S(lx, ly), S(lx + 8, ly + 1 * d), S(lx + 15, ly + 1 * d), S(lx + 20, ly + 2 * d), 12), { w: 0.9, ink, wobble: 0.05, taper: 0.5 })
  }
}

/** Wave crests, as on the foot of a porcelain bowl. */
function waves(pen: Pen, x0: number, x1: number, y: number, r: number, rows: number, ink: Ink) {
  for (let row = 0; row < rows; row++) {
    const yy = y + row * r * 0.55
    const shift = row % 2 ? r : 0
    for (let x = x0 - shift; x < x1; x += r * 2) {
      for (let k = 0; k < 3; k++) {
        const rr = r * (1 - k * 0.28)
        const pts: P[] = []
        for (let j = 0; j <= 16; j++) { const a = Math.PI + (j / 16) * Math.PI; pts.push([x + r + Math.cos(a) * rr, yy + Math.sin(a) * rr]) }
        pen.stroke(pts, { w: 0.9, ink, wobble: 0.05, taper: 0.3 })
      }
    }
  }
}

/* ---------- the sigil ---------- */

export function drawSigil(g: Ctx, cx: number, cy: number, R: number, seed: number, glitch = 0) {
  const pen = new Pen(g, seed)
  const r = rng(seed)
  // Segmented outer ring.
  let a = -Math.PI / 2
  while (a < Math.PI * 1.5 - 0.05) {
    const len = 0.12 + r() * 0.55
    const pts: P[] = []
    for (let j = 0; j <= 16; j++) { const t = a + (len * j) / 16; pts.push([cx + Math.cos(t) * R, cy + Math.sin(t) * R]) }
    pen.stroke(pts, { w: 2, ink: CYAN, wobble: 0, taper: 0 })
    a += len + 0.05 + r() * 0.12
  }
  // Tick ring.
  for (let k = 0; k < 72; k++) {
    const t = (k / 72) * Math.PI * 2
    const L = k % 6 === 0 ? 10 : 4
    pen.line([cx + Math.cos(t) * (R + 7), cy + Math.sin(t) * (R + 7)], [cx + Math.cos(t) * (R + 7 + L), cy + Math.sin(t) * (R + 7 + L)], { w: k % 6 === 0 ? 1.4 : 0.8, ink: STEEL, wobble: 0, taper: 0 })
  }
  // Inner ring and cardinal notches.
  pen.ellipse(cx, cy, R * 0.66, R * 0.66, 0, { w: 1.3, ink: STEEL, wobble: 0 })
  for (let k = 0; k < 4; k++) {
    const t = (k / 4) * Math.PI * 2
    pen.line([cx + Math.cos(t) * R * 0.66, cy + Math.sin(t) * R * 0.66], [cx + Math.cos(t) * R * 0.86, cy + Math.sin(t) * R * 0.86], { w: 1.4, ink: CYAN, wobble: 0, taper: 0 })
  }
  // The lens glyph at the heart, its dot the clay node.
  const gr = R * 0.4
  pen.ellipse(cx, cy, gr, gr, 0, { w: 3.2, ink: SILVER, wobble: 0 })
  const dx = cx + gr * 0.29, dy = cy - gr * 0.19
  g.save()
  g.shadowColor = 'rgba(217,119,87,0.9)'
  g.shadowBlur = 16
  g.fillStyle = CLAY
  g.beginPath(); g.arc(dx, dy, gr * 0.34, 0, Math.PI * 2); g.fill()
  g.restore()
  // Tiny readouts.
  g.save()
  g.font = `500 ${Math.round(R * 0.13)}px "JetBrains Mono"`
  g.fillStyle = 'rgba(189,231,244,0.75)'
  g.fillText('GP·07', cx + R * 1.18, cy - R * 0.55)
  g.fillText('0708', cx - R * 1.62, cy - R * 0.55)
  g.restore()
  void glitch
}

/* ---------- the page ---------- */

/**
 * In a square frame the cartouche group (sigil to caption, about 1460 × 600
 * at 1080 lines) is scaled to fit the width and centred on the page.
 */
function groupFrame(g: Ctx, W: number, H: number) {
  if (W / H >= 1.3) return
  const u = H / 1080, k = 0.7
  g.translate(W / 2, H / 2)
  g.scale(k, k)
  g.translate(-W / 2, -506 * u)
}

export function paintReveal(W: number, H: number) {
  return cached(`reveal:${W}x${H}`, () => {
    const c = canvas(W, H), g = ctx2d(c)
    const u = H / 1080
    const r = rng(708)
    const pen = new Pen(g, 708)
    // Ground: ink, a little light in the middle.
    g.fillStyle = '#0B0E12'
    g.fillRect(0, 0, W, H)
    const grd = g.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, H * 0.75)
    grd.addColorStop(0, 'rgba(36,48,62,0.55)')
    grd.addColorStop(1, 'rgba(11,14,18,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, W, H)


    // Border: key-fret band between two rules, rosettes in the corners.
    const m = 46 * u, fh = 20 * u
    g.strokeStyle = STEEL.color
    g.globalAlpha = 0.7
    g.lineWidth = 1.2
    g.strokeRect(m, m, W - 2 * m, H - 2 * m)
    g.strokeRect(m + fh + 10 * u, m + fh + 10 * u, W - 2 * (m + fh + 10 * u), H - 2 * (m + fh + 10 * u))
    g.globalAlpha = 1
    const fx0 = m + 5 * u, fy0 = m + 5 * u, cs = fh + 10 * u
    fret(pen, fx0 + cs, fy0, W - 2 * fx0 - 2 * cs, fh, 'h', COBALT, 1.3)
    fret(pen, fx0 + cs, H - fy0 - fh, W - 2 * fx0 - 2 * cs, fh, 'h', COBALT, 1.3)
    fret(pen, fx0, fy0 + cs, H - 2 * fy0 - 2 * cs, fh, 'v', COBALT, 1.3)
    fret(pen, W - fx0 - fh, fy0 + cs, H - 2 * fy0 - 2 * cs, fh, 'v', COBALT, 1.3)
    for (const [x, y] of [[fx0 + cs / 2 - 2, fy0 + cs / 2 - 2], [W - fx0 - cs / 2 + 2, fy0 + cs / 2 - 2], [fx0 + cs / 2 - 2, H - fy0 - cs / 2 + 2], [W - fx0 - cs / 2 + 2, H - fy0 - cs / 2 + 2]]) {
      blossom(pen, x, y, cs * 0.42, r() * 6, COBALT)
    }

    // Chinoiserie stays inside the frame. Wide: beside the cartouche. Square:
    // above and below it, since the cartouche takes the full width.
    const inner = m + fh + 10 * u
    const sq = W / H < 1.3
    g.save()
    g.beginPath(); g.rect(inner + 2, inner + 2, W - 2 * inner - 4, H - 2 * inner - 4); g.clip()
    const flowers: P[] = [], hang: P[] = []
    const bloom = (pts: P[], r0: number, r1: number) => pts.forEach(([x, y], i) => i % 3 === 2 ? pen.dot(x, y, 3.5 * u, COBALT) : blossom(pen, x, y, (r0 + r() * r1) * u, r() * 6, COBALT))
    const hills = (x0: number, x1: number, y0: number) => {
      for (let k = 0; k < 3; k++) {
        const pts: P[] = []
        for (let x = x0; x < x1; x += 6 * u) pts.push([x, y0 + k * 18 * u - Math.sin((x - x0) / u * 0.012 + k) * 26 * u * (1 - k * 0.25)])
        pen.stroke(pts, { w: 1, ink: COBALT_DIM, wobble: 0.3, taper: 0.8 })
      }
    }
    if (!sq) {
      // Left: a prunus branch over distant hills and a pagoda.
      branch(pen, r, 112 * u, 960 * u, -0.95, 560 * u, 15 * u, 2, COBALT, flowers)
      bloom(flowers, 11, 7)
      pagoda(pen, 330 * u, 860 * u, 1.3 * u, COBALT_DIM)
      hills(140 * u, 520 * u, 880 * u)
      // Right: a plum branch hanging in from the top, a bird, clouds, waves.
      branch(pen, r, W - 70 * u, 150 * u, 2.25, 420 * u, 11 * u, 2, COBALT, hang)
      bloom(hang, 10, 6)
      cloud(pen, W - 360 * u, 300 * u, 1.5 * u, COBALT_DIM)
      bird(pen, W - 330 * u, 770 * u, 2.1 * u, COBALT)
      waves(pen, W - 520 * u, W - 110 * u, 930 * u, 22 * u, 3, COBALT_DIM)
      cloud(pen, 300 * u, 230 * u, 1.2 * u, COBALT_DIM)
    } else {
      // Above: the plum hangs in from the top right, under drifting clouds.
      branch(pen, r, W - 84 * u, 96 * u, 2.5, 330 * u, 10 * u, 2, COBALT, hang)
      bloom(hang, 9, 6)
      cloud(pen, 420 * u, 168 * u, 1.15 * u, COBALT_DIM)
      cloud(pen, 214 * u, 262 * u, 0.95 * u, COBALT_DIM)
      cloud(pen, W - 330 * u, 250 * u, 0.85 * u, COBALT_DIM)
      // Below: a prunus limb runs along the foot with the bird on its twig;
      // hills, the pagoda and waves to the right.
      branch(pen, r, 84 * u, H - 120 * u, -0.22, 430 * u, 13 * u, 2, COBALT, flowers)
      bloom(flowers, 10, 6)
      bird(pen, 236 * u, H - 196 * u, 1.75 * u, COBALT)
      hills(W * 0.5, W - 100 * u, H - 150 * u)
      pagoda(pen, W - 250 * u, H - 156 * u, 1.15 * u, COBALT_DIM)
      waves(pen, W * 0.42, W - 90 * u, H - 104 * u, 18 * u, 2, COBALT_DIM)
    }
    g.restore()

    // Square: the whole cartouche group, scaled to the width and centred.
    g.save()
    groupFrame(g, W, H)
    const ac = sq ? 0.6 : 1

    // The cartouche: a plate with cut corners, strap volutes at the ends,
    // a pendant below, a pediment strap above holding the sigil.
    const cx = W / 2, cy = 560 * u, pw = 430 * u, ph = 132 * u, cut = 26 * u
    const plate = () => {
      g.beginPath()
      g.moveTo(cx - pw + cut, cy - ph)
      g.lineTo(cx + pw - cut, cy - ph)
      g.arc(cx + pw, cy - ph, cut, Math.PI, Math.PI / 2, true)
      g.lineTo(cx + pw, cy + ph - cut)
      g.arc(cx + pw, cy + ph, cut, -Math.PI / 2, Math.PI, true)
      g.lineTo(cx - pw + cut, cy + ph)
      g.arc(cx - pw, cy + ph, cut, 0, -Math.PI / 2, true)
      g.lineTo(cx - pw, cy - ph + cut)
      g.arc(cx - pw, cy - ph, cut, Math.PI / 2, 0, true)
      g.closePath()
    }
    g.save(); plate(); g.fillStyle = 'rgba(16,21,28,0.92)'; g.fill(); g.restore()
    // The frame: a strap band round the plate, hatched on its lower-right faces.
    {
      const ring: P[] = []
      const push = (x: number, y: number) => ring.push([x, y])
      const arc = (ax: number, ay: number, rr: number, a0: number, a1: number) => { for (let j = 0; j <= 10; j++) { const t = a0 + (a1 - a0) * (j / 10); push(ax + Math.cos(t) * rr, ay + Math.sin(t) * rr) } }
      const inset = 8 * u, X0 = cx - pw + inset, X1 = cx + pw - inset, Y0 = cy - ph + inset, Y1 = cy + ph - inset, cc = cut + inset
      push(X0 + cc, Y0); push(X1 - cc, Y0)
      arc(X1 + inset, Y0 - inset, cc, Math.PI, Math.PI / 2)
      push(X1, Y1 - cc)
      arc(X1 + inset, Y1 + inset, cc, -Math.PI / 2, -Math.PI)
      push(X0 + cc, Y1)
      arc(X0 - inset, Y1 + inset, cc, 0, -Math.PI / 2)
      push(X0, Y0 + cc)
      arc(X0 - inset, Y0 - inset, cc, Math.PI / 2, 0)
      ring.push(ring[0])
      const dense: P[] = []
      for (let i = 0; i < ring.length - 1; i++) { const a = ring[i], b = ring[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.max(1, Math.ceil(L / (4 * u))); for (let j = 0; j < n; j++) dense.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]) }
      dense.push(dense[0])
      strap(pen, dense, 14 * u, SILVER, STEEL, 1.5 * u)
      // Rivets where the straps would be pinned.
      for (const [x, y] of [[cx - pw * 0.5, Y0], [cx + pw * 0.5, Y0], [cx - pw * 0.5, Y1], [cx + pw * 0.5, Y1]] as P[]) pen.ellipse(x, y, 3.2 * u, 3.2 * u, 0, { w: 1.1 * u, ink: SILVER, wobble: 0 })
    }
    // Strap volutes at the ends, rolled outward.
    volute(pen, g, cx - pw - 40 * u, cy, 52 * u, 1.6, 1, 0, SILVER, STEEL, 2 * u)
    volute(pen, g, cx + pw + 40 * u, cy, 52 * u, 1.6, -1, Math.PI, SILVER, STEEL, 2 * u)
    for (const s of [-1, 1]) {
      // Straps roll out of the plate's ends into the volutes.
      strap(pen, bez([cx + s * pw, cy - 40 * u], [cx + s * (pw + 40 * u), cy - 70 * u], [cx + s * (pw + 96 * u), cy - 46 * u], [cx + s * (pw + 92 * u), cy - 8 * u]), 10 * u, SILVER, STEEL, 1.3 * u)
      strap(pen, bez([cx + s * pw, cy + 40 * u], [cx + s * (pw + 30 * u), cy + 66 * u], [cx + s * (pw + 70 * u), cy + 62 * u], [cx + s * (pw + 80 * u), cy + 36 * u]), 8 * u, SILVER, STEEL, 1.2 * u)
      // Acanthus running out toward the border.
      acanthus(pen, bez([cx + s * (pw + 96 * u), cy + 6 * u], [cx + s * (pw + 96 * u + 74 * u * ac), cy + 70 * u], [cx + s * (pw + 96 * u + 134 * u * ac), cy - 60 * u], [cx + s * (pw + 96 * u + 204 * u * ac), cy - 10 * u], 70), STEEL, u)
    }
    // Pendant below, with the year in Roman capitals.
    pen.stroke([[cx - 150 * u, cy + ph], [cx - 120 * u, cy + ph + 44 * u], [cx + 120 * u, cy + ph + 44 * u], [cx + 150 * u, cy + ph]], { w: 1.8 * u, ink: SILVER, wobble: 0.1, taper: 0.2 })
    volute(pen, g, cx - 132 * u, cy + ph + 52 * u, 16 * u, 1.3, -1, -Math.PI / 2, SILVER, STEEL, 1.4 * u)
    volute(pen, g, cx + 132 * u, cy + ph + 52 * u, 16 * u, 1.3, 1, -Math.PI / 2, SILVER, STEEL, 1.4 * u)
    g.save()
    g.font = `600 ${22 * u}px Cinzel`
    g.letterSpacing = `${7 * u}px`
    g.fillStyle = 'rgba(201,210,216,0.85)'
    g.textAlign = 'center'
    g.fillText('ANNO · MMXXXIV', cx + 3.5 * u, cy + ph + 32 * u)
    g.restore()

    // Pediment: two S-straps rising to the sigil; circuit traces run out of
    // the sigil and become the straps.
    const sy = cy - ph - 118 * u, R = 66 * u
    // The medallion that frames the sigil: a hatched ring band.
    strap(pen, Array.from({ length: 97 }, (_, i) => { const t = (i / 96) * Math.PI * 2; return [cx + Math.cos(t) * (R + 30 * u), sy + Math.sin(t) * (R + 30 * u)] as P }), 12 * u, SILVER, STEEL, 1.4 * u)
    for (const s of [-1, 1]) {
      // C-scroll straps rise from the plate to carry the medallion.
      strap(pen, bez([cx + s * 250 * u, cy - ph + 4 * u], [cx + s * 250 * u, cy - ph - 70 * u], [cx + s * (R + 110 * u), sy + 70 * u], [cx + s * (R + 40 * u), sy + 40 * u]), 11 * u, SILVER, STEEL, 1.4 * u)
      volute(pen, g, cx + s * 262 * u, cy - ph - 14 * u, 15 * u, 1.3, s, s > 0 ? Math.PI : 0, SILVER, STEEL, 1.4 * u)
      // Traces: orthogonal, with pads, running from the sigil into the strapwork.
      const t0: P = [cx + s * (R + 18 * u), sy]
      pen.stroke([t0, [cx + s * (R + 70 * u), sy], [cx + s * (R + 98 * u), sy + 28 * u], [cx + s * 310 * u, sy + 28 * u]], { w: 1.4 * u, ink: CYAN, wobble: 0, taper: 0 })
      pen.ellipse(cx + s * 310 * u, sy + 28 * u, 4 * u, 4 * u, 0, { w: 1.2 * u, ink: CYAN, wobble: 0 })
      pen.stroke([[cx + s * (R + 18 * u), sy - 18 * u], [cx + s * (R + 44 * u), sy - 44 * u], [cx + s * 230 * u, sy - 44 * u]], { w: 1.1 * u, ink: CYAN, wobble: 0, taper: 0 })
      pen.dot(cx + s * 230 * u, sy - 44 * u, 3 * u, CYAN)
    }
    drawSigil(g, cx, sy, R, 41)

    // The date: Bodoni's italic, sliced once like a scan line, its full stop
    // the clay node.
    const title = TEXT.revealTitle.replace(/\.$/, '')
    const size = 148 * u * (sq ? 1.2 : 1)
    const tc = canvas(W, Math.ceil(size * 1.6)), tg = ctx2d(tc)
    tg.font = `italic 500 ${size}px "Bodoni Moda"`
    tg.textBaseline = 'alphabetic'
    tg.fillStyle = '#E6EAEC'
    const tw = tg.measureText(title).width
    const digit = title.slice(title.lastIndexOf(' ') + 1)
    const dx0 = tg.measureText(title.slice(0, title.length - digit.length)).width
    const base = size * 1.15
    const tx = cx - (tw + 34 * u) / 2
    tg.fillText(title, tx, base)
    // Only the numeral is cut: a band of the 8 slips sideways like a bad scan
    // line, a cyan hairline on one edge of the cut and clay on the other.
    const sx0 = tx + dx0 - 12 * u, sx1 = tx + tw + 14 * u
    const sliceY = base - size * 0.36, sliceH = size * 0.085
    const slice = canvas(Math.ceil(sx1 - sx0), Math.ceil(sliceH)), sg = ctx2d(slice)
    sg.drawImage(tc, sx0, sliceY, sx1 - sx0, sliceH, 0, 0, sx1 - sx0, sliceH)
    tg.clearRect(sx0, sliceY - 0.8 * u, sx1 - sx0, sliceH + 1.6 * u)
    tg.drawImage(slice, sx0 + 8 * u, sliceY)
    tg.save()
    tg.beginPath(); tg.rect(sx0, sliceY - 2 * u, sx1 - sx0 + 10 * u, sliceH + 4 * u); tg.clip()
    tg.globalCompositeOperation = 'source-atop'
    tg.fillStyle = 'rgba(189,231,244,0.7)'
    tg.fillRect(sx0, sliceY, sx1 - sx0 + 10 * u, 1.6 * u)
    tg.fillStyle = 'rgba(217,119,87,0.65)'
    tg.fillRect(sx0, sliceY + sliceH - 1.6 * u, sx1 - sx0 + 10 * u, 1.6 * u)
    tg.restore()
    // Two faint scan hairlines run on past the numeral, then fade.
    for (const [yy, a] of [[sliceY - 1.2 * u, 0.35], [sliceY + sliceH + 1.2 * u, 0.25]] as P[]) {
      const lg = tg.createLinearGradient(sx0 - 40 * u, 0, sx1 + 90 * u, 0)
      lg.addColorStop(0, 'rgba(189,231,244,0)'); lg.addColorStop(0.5, `rgba(189,231,244,${a})`); lg.addColorStop(1, 'rgba(189,231,244,0)')
      tg.fillStyle = lg
      tg.fillRect(sx0 - 40 * u, yy, sx1 - sx0 + 130 * u, 1 * u)
    }
    g.drawImage(tc, 0, cy - base + size * 0.33)
    // Full stop: a clay node in a ring.
    const nx = tx + tw + 20 * u, ny = cy + size * 0.33 - 8 * u
    g.save()
    g.shadowColor = 'rgba(217,119,87,0.85)'
    g.shadowBlur = 12 * u
    g.fillStyle = CLAY
    g.fillRect(nx - 6.5 * u, ny - 6.5 * u, 13 * u, 13 * u)
    g.restore()
    pen.ellipse(nx, ny, 15 * u, 15 * u, 0, { w: 1.2 * u, ink: CYAN, wobble: 0 })

    // Caption: the machine's voice, between two hairline ticks.
    g.save()
    g.font = `400 ${20 * u}px "JetBrains Mono"`
    g.letterSpacing = `${3.6 * u}px`
    g.fillStyle = '#8695A0'
    g.textAlign = 'center'
    const cyCap = cy + ph + 112 * u
    g.fillText(TEXT.revealCaption, cx + 1.8 * u, cyCap)
    const cw = g.measureText(TEXT.revealCaption).width
    g.restore()
    for (const s of [-1, 1]) pen.line([cx + s * (cw / 2 + 28 * u), cyCap - 7 * u], [cx + s * (cw / 2 + 90 * u), cyCap - 7 * u], { w: 1, ink: STEEL, wobble: 0, taper: 0 })
    g.restore()
    return c
  })
}

/** The sigil boots: a two-frame RGB split and slice, drawn over the page. */
export function paintRevealGlitch(g: Ctx, W: number, H: number, k: number) {
  if (k <= 0) return
  const u = H / 1080
  const cx = W / 2, sy = 560 * u - 132 * u - 118 * u, R = 66 * u
  const off = canvas(Math.ceil(R * 5), Math.ceil(R * 5)), og = ctx2d(off)
  drawSigil(og, off.width / 2, off.height / 2, R, 41)
  g.save()
  groupFrame(g, W, H)
  g.globalCompositeOperation = 'screen'
  g.globalAlpha = 0.8 * k
  g.filter = 'hue-rotate(160deg)'
  g.drawImage(off, cx - off.width / 2 - 7 * u * k, sy - off.height / 2)
  g.filter = 'hue-rotate(-60deg)'
  g.drawImage(off, cx - off.width / 2 + 7 * u * k, sy - off.height / 2 + 2 * u)
  g.restore()
  // A band of the page displaced sideways.
  const y0 = sy + R * 0.2, bh = 10 * u
  // (In the square layout the band sits where the scaled group puts it.)
  const sy0 = W / H < 1.3 ? H / 2 + (y0 - 506 * u) * 0.7 : y0, sbh = W / H < 1.3 ? bh * 0.7 : bh
  g.drawImage(g.canvas, 0, sy0, W, sbh, 14 * u * k, sy0, W, sbh)
}
