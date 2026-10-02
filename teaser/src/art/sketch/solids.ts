import type { Ctx } from '../canvas'
import {
  type Basis, type P2, type V3, type View, IDENT, add, alongY, bounds, cross, dot, hull, inBasis, len, lerp3, madd,
  mul, norm, perp, sphereDirs, sub,
} from './geom'
import { type Ink, Pen } from './pen'

// Solids drawn the way an industrial designer sketches them: a confident
// outline, lighter creases, tone laid in with hatching that follows the form,
// and the construction (axes, hidden rims, sections) left showing.

export interface Style {
  line: Ink
  hatch: Ink
  build: Ink
  dark: Ink
  /** Optional tint laid inside each form (a photogram's exposure shadow). */
  fill?: string
  /** Line weight scale. */
  k: number
  /** Hatch spacing at full tone, px. */
  gap: number
  /** Construction density 0..1. */
  build01?: number
}

export interface DC { g: Ctx; v: View; pen: Pen; L: V3; st: Style }

export const p2 = (v: View, p: V3): P2 => { const q = v.project(p); return [q[0], q[1]] }

/** Shade → tone: 0 where the light hits square on, 1 deep in shadow. */
export function tone(n: V3, L: V3) {
  const d = dot(n, L)
  return d >= 0 ? 0.74 * (1 - d) ** 1.25 : 0.74 + 0.26 * Math.min(1, -d * 1.7)
}
const gapFor = (dc: DC, t: number) => dc.st.gap * (1 + 2.1 * Math.max(0, (0.95 - t) / 0.65))
/** Deep tone gets a second, darker layer in fine-liner. */
const deepInk = (dc: DC): Ink => ({ color: dc.st.line.color, alpha: dc.st.line.alpha * 0.62 })

export interface Detail { draw(dc: DC): void }

let nextId = 1
export abstract class Solid {
  id = nextId++
  dark = false
  hatchable = true
  build = true
  /** Outline weight multiplier. */
  weight = 1
  /** Tone floor: rubber and tyres hatch dark even in light. */
  toneMin = 0
  details: Detail[] = []
  abstract center(): V3
  abstract samples(): V3[]
  outline(v: View): P2[] { return hull(this.samples().map(p => p2(v, p))) }
  hatch(_dc: DC) {}
  creases(_dc: DC) {}
  construct(_dc: DC) {}
  on(...d: Detail[]) { this.details.push(...d); return this }
  asDark() { this.dark = true; return this }
  noBuild() { this.build = false; return this }
  heavy(w: number) { this.weight = w; return this }
  rubber(t = 0.82) { this.toneMin = t; return this }
  tone(n: V3, L: V3) { return Math.max(this.toneMin, tone(n, L)) }
}

const SPH = sphereDirs(120)
const OCT = sphereDirs(60).map(d => [Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2])] as V3)

/* ---------- Strokes in 3D ---------- */

export function stroke3(dc: DC, pts: V3[], w: number, ink: Ink, o: { wobble?: number; over?: number; alpha?: number; taper?: number; flick?: boolean } = {}) {
  dc.pen.stroke(pts.map(p => p2(dc.v, p)), { w: w * dc.st.k, ink, ...o })
}

/** A centre line: long dash, dot, long dash. */
export function dashDot(dc: DC, a: V3, b: V3, ink: Ink, w = 0.8) {
  const A = p2(dc.v, a), B = p2(dc.v, b)
  const L = Math.hypot(B[0] - A[0], B[1] - A[1])
  const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L
  const k = dc.st.k
  let s = 0
  while (s < L) {
    const e = Math.min(L, s + 16 * k)
    dc.pen.line([A[0] + ux * s, A[1] + uy * s], [A[0] + ux * e, A[1] + uy * e], { w: w * k, ink, wobble: 0.2 })
    const d = e + 4.5 * k
    if (d < L) dc.pen.dot(A[0] + ux * d, A[1] + uy * d, 0.55 * k, ink)
    s = d + 4.5 * k
  }
}

function runs(n: number, pred: (i: number) => boolean) {
  // Contiguous index runs (wrapping) where pred holds.
  const ok = Array.from({ length: n }, (_, i) => pred(i))
  if (ok.every(Boolean)) return [Array.from({ length: n + 1 }, (_, i) => i % n)]
  const start = ok.findIndex(v => !v)
  const out: number[][] = []
  let cur: number[] = []
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n
    if (ok[i]) cur.push(i)
    else if (cur.length) { out.push(cur); cur = [] }
  }
  if (cur.length) out.push(cur)
  return out
}

/* ---------- Box (optionally rounded) ---------- */

export class Box extends Solid {
  readonly h: V3
  constructor(public c: V3, size: V3, public b: Basis = IDENT, public r = 0) {
    super()
    this.h = [size[0] / 2, size[1] / 2, size[2] / 2]
    this.r = Math.min(r, this.h[0], this.h[1], this.h[2])
  }
  center() { return this.c }
  at(sx: number, sy: number, sz: number, inset = 0): V3 {
    let p = madd(this.c, this.b.x, sx * (this.h[0] - inset))
    p = madd(p, this.b.y, sy * (this.h[1] - inset))
    return madd(p, this.b.z, sz * (this.h[2] - inset))
  }
  /** A point on a face: axis 0/1/2, side ±1, u and v in −1..1 across it. */
  face(axis: 0 | 1 | 2, side: number, u: number, v: number): V3 {
    const s = [0, 0, 0]; s[axis] = side
    const o = [1, 2, 0][axis], q = [2, 0, 1][axis]
    s[o] = u; s[q] = v
    return this.at(s[0], s[1], s[2])
  }
  axis(i: number) { return [this.b.x, this.b.y, this.b.z][i] }
  samples() {
    if (this.r <= 0) { const o: V3[] = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) o.push(this.at(sx, sy, sz)); return o }
    const o: V3[] = []
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const k = this.at(sx, sy, sz, this.r)
      for (const d of OCT) o.push(madd(k, inBasis(this.b, [sx * d[0], sy * d[1], sz * d[2]]), this.r))
    }
    return o
  }
  faces() {
    const out: { n: V3; q: [V3, V3, V3, V3]; axis: 0 | 1 | 2; side: number }[] = []
    for (const axis of [0, 1, 2] as const) for (const side of [-1, 1]) {
      const n = mul(this.axis(axis), side)
      const o = [1, 2, 0][axis], q = [2, 0, 1][axis]
      const P = (u: number, v: number) => { const s = [0, 0, 0]; s[axis] = side; s[o] = u; s[q] = v; return this.atFace(s, axis) }
      out.push({ n, q: [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)], axis, side })
    }
    return out
  }
  private atFace(s: number[], axis: number): V3 {
    // The flat part of a face: corners pulled in by the radius within its plane.
    let p = this.c
    for (let i = 0; i < 3; i++) p = madd(p, this.axis(i), s[i] * Math.max(0, this.h[i] - (i === axis ? 0 : this.r)))
    return p
  }
  visible(dc: DC, n: V3, at: V3) { return dot(n, dc.v.toEye(at)) > 1e-4 }
  edges() {
    const out: { a: V3; b: V3; f1: [number, number]; f2: [number, number] }[] = []
    for (const axis of [0, 1, 2]) {
      const o = [1, 2, 0][axis], q = [2, 0, 1][axis]
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const s0 = [0, 0, 0], s1 = [0, 0, 0]
        s0[axis] = -1; s1[axis] = 1; s0[o] = s1[o] = su; s0[q] = s1[q] = sv
        // On a rounded edge the crease sits on the radius, not the sharp corner.
        const inset = this.r * 0.29
        const pull = (s: number[]) => {
          let p = this.c
          for (let i = 0; i < 3; i++) p = madd(p, this.axis(i), s[i] * (this.h[i] - (i === axis ? this.r : inset)))
          return p
        }
        out.push({ a: pull(s0), b: pull(s1), f1: [o, su], f2: [q, sv] })
      }
    }
    return out
  }
  faceVis(dc: DC, axis: number, side: number) {
    const n = mul(this.axis(axis), side)
    return this.visible(dc, n, madd(this.c, n, this.h[axis]))
  }
  hatch(dc: DC) {
    for (const f of this.faces()) {
      if (!this.visible(dc, f.n, lerp3(f.q[0], f.q[2], 0.5))) continue
      const t = this.tone(f.n, dc.L)
      if (t < 0.3) continue
      hatchQuad(dc, f.q, t)
    }
  }
  creases(dc: DC) {
    for (const e of this.edges()) {
      if (this.faceVis(dc, ...e.f1) && this.faceVis(dc, ...e.f2)) stroke3(dc, [e.a, e.b], 1.45 * this.weight, dc.st.line, { over: 3 })
    }
  }
  construct(dc: DC) {
    const k = dc.st.build01 ?? 1
    for (const e of this.edges()) {
      const v1 = this.faceVis(dc, ...e.f1), v2 = this.faceVis(dc, ...e.f2)
      if (!v1 && !v2) stroke3(dc, [e.a, e.b], 0.75, dc.st.build, { wobble: 0.3 })
      else if (dc.pen.rand() < 0.55 * k) {
        // Perspective guides running on past the corners.
        const d = sub(e.b, e.a), x0 = dc.pen.rand(0.08, 0.22), x1 = dc.pen.rand(0.08, 0.22)
        stroke3(dc, [madd(e.a, d, -x0), e.a], 0.75, dc.st.build, { wobble: 0.2 })
        stroke3(dc, [e.b, madd(e.b, d, x1)], 0.75, dc.st.build, { wobble: 0.2 })
      }
    }
  }
}

/** Hatching laid along a quad face, in perspective, denser where darker. */
export function hatchQuad(dc: DC, q: [V3, V3, V3, V3], t: number, cross2 = true) {
  const P = q.map(p => p2(dc.v, p))
  const ang = (a: P2, b: P2) => Math.atan2(b[1] - a[1], b[0] - a[0])
  const pref = -1.05
  const da = (x: number) => { let d = Math.abs(((x - pref) % Math.PI) + Math.PI) % Math.PI; return Math.min(d, Math.PI - d) }
  const useU = da(ang(P[0], P[1])) <= da(ang(P[0], P[3]))
  const [A, B, C, D] = useU ? q : [q[0], q[3], q[2], q[1]]
  const pa = p2(dc.v, A), pb = p2(dc.v, B), pc = p2(dc.v, C), pd = p2(dc.v, D)
  const across = Math.max(Math.hypot(pd[0] - pa[0], pd[1] - pa[1]), Math.hypot(pc[0] - pb[0], pc[1] - pb[1]))
  const lay = (A: V3, B: V3, C: V3, D: V3, gap: number, ink: Ink) => {
    const n = Math.floor(across / gap)
    for (let i = 1; i < n; i++) {
      const v = (i + dc.pen.rand(-0.25, 0.25)) / n
      const p0 = lerp3(A, D, v), p1 = lerp3(B, C, v)
      const s0 = lerp3(p0, p1, dc.pen.rand(0, 0.1)), s1 = lerp3(p1, p0, dc.pen.rand(0, 0.14))
      stroke3(dc, [s0, s1], 1.15, ink, { wobble: 0.35, taper: 0.5, flick: true })
    }
  }
  const gap = gapFor(dc, t)
  lay(A, B, C, D, gap, dc.st.hatch)
  if (cross2 && t > 0.78) lay(A, D, C, B, gap * 1.35, deepInk(dc))
}

/* ---------- Cylinder / cone, optionally a ring (hole) ---------- */

export class Cyl extends Solid {
  readonly w: V3
  readonly e1: V3
  readonly e2: V3
  readonly L: number
  constructor(public a: V3, public b: V3, public ra: number, public rb = ra, public caps = true, public hole = 0) {
    super()
    const d = sub(b, a)
    this.L = len(d) || 1e-6
    this.w = norm(d)
    ;[this.e1, this.e2] = perp(this.w)
  }
  center() { return lerp3(this.a, this.b, 0.5) }
  rad(th: number): V3 { return add(mul(this.e1, Math.cos(th)), mul(this.e2, Math.sin(th))) }
  ringA(th: number, r = this.ra) { return madd(this.a, this.rad(th), r) }
  ringB(th: number, r = this.rb) { return madd(this.b, this.rad(th), r) }
  sideN(th: number) { return norm(madd(this.rad(th), this.w, (this.ra - this.rb) / this.L)) }
  samples() {
    const o: V3[] = []
    for (let i = 0; i < 40; i++) { const th = (i / 40) * Math.PI * 2; o.push(this.ringA(th), this.ringB(th)) }
    return o
  }
  sideVis(dc: DC, th: number) { return dot(this.sideN(th), dc.v.toEye(lerp3(this.ringA(th), this.ringB(th), 0.5))) > 0 }
  capVis(dc: DC, end: 0 | 1) { return end ? dot(this.w, dc.v.toEye(this.b)) > 0 : dot(mul(this.w, -1), dc.v.toEye(this.a)) > 0 }
  private ring(end: 0 | 1, r: number, n = 72) { return Array.from({ length: n }, (_, i) => (end ? this.ringB((i / n) * Math.PI * 2, r) : this.ringA((i / n) * Math.PI * 2, r))) }
  creases(dc: DC) {
    if (!this.caps) return
    const n = 72
    for (const end of [0, 1] as const) {
      if (!this.capVis(dc, end)) continue
      const R = this.ring(end, end ? this.rb : this.ra, n)
      for (const run of runs(n, i => this.sideVis(dc, (i / n) * Math.PI * 2))) stroke3(dc, run.map(i => R[i]), 1.4 * this.weight, dc.st.line, { over: 2 })
      if (this.hole > 0) {
        const H = this.ring(end, this.hole, n)
        const P = H.map(p => p2(dc.v, p))
        // Looking into the bore: dark inside.
        dc.g.save()
        dc.g.beginPath(); P.forEach((p, i) => (i ? dc.g.lineTo(p[0], p[1]) : dc.g.moveTo(p[0], p[1]))); dc.g.closePath(); dc.g.clip()
        const bb = bounds(P)
        dc.pen.hatchBox(bb.x0, bb.y0, bb.x1, bb.y1, -1.0, dc.st.gap * 0.9, { w: 1.0 * dc.st.k, ink: dc.st.hatch, wobble: 0.3, flick: true })
        dc.g.restore()
        dc.pen.stroke(P, { w: 1.4 * dc.st.k, ink: dc.st.line, closed: true })
      }
    }
  }
  hatch(dc: DC) {
    const N = 220
    let acc = 1e9, prev: P2 | null = null
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2
      if (!this.sideVis(dc, th)) { prev = null; continue }
      const t = this.tone(this.sideN(th), dc.L)
      const m = p2(dc.v, lerp3(this.ringA(th), this.ringB(th), 0.5))
      if (prev) acc += Math.hypot(m[0] - prev[0], m[1] - prev[1])
      prev = m
      if (t < 0.32) continue
      if (acc >= gapFor(dc, t)) {
        acc = 0
        const p0 = this.ringA(th), p1 = this.ringB(th)
        stroke3(dc, [lerp3(p0, p1, dc.pen.rand(0, 0.08)), lerp3(p1, p0, dc.pen.rand(0, 0.12))], 1.15, t > 0.8 ? deepInk(dc) : dc.st.hatch, { wobble: 0.3, taper: 0.5, flick: true })
      }
    }
    if (!this.caps) return
    for (const end of [0, 1] as const) {
      if (!this.capVis(dc, end)) continue
      const t = this.tone(end ? this.w : mul(this.w, -1), dc.L)
      if (t < 0.34) continue
      const P = this.ring(end, end ? this.rb : this.ra, 48).map(p => p2(dc.v, p))
      dc.g.save()
      dc.g.beginPath(); P.forEach((p, i) => (i ? dc.g.lineTo(p[0], p[1]) : dc.g.moveTo(p[0], p[1]))); dc.g.closePath(); dc.g.clip()
      const bb = bounds(P)
      dc.pen.hatchBox(bb.x0, bb.y0, bb.x1, bb.y1, -1.05, gapFor(dc, t), { w: 1.0 * dc.st.k, ink: dc.st.hatch, wobble: 0.3, flick: true })
      dc.g.restore()
    }
  }
  construct(dc: DC) {
    const n = 72
    for (const end of [0, 1] as const) {
      // The far half of each rim, which a hand draws anyway.
      const R = this.ring(end, end ? this.rb : this.ra, n)
      const hidden = runs(n, i => !this.sideVis(dc, (i / n) * Math.PI * 2) && !this.capVis(dc, end))
      for (const run of hidden) stroke3(dc, run.map(i => R[i]), 0.75, dc.st.build, { wobble: 0.3 })
    }
    if (this.L > 0.04 && (dc.st.build01 ?? 1) > 0.3) dashDot(dc, madd(this.a, this.w, -this.L * 0.22 - 0.02), madd(this.b, this.w, this.L * 0.22 + 0.02), dc.st.build, 0.7)
  }
}

/* ---------- Ellipsoid / sphere ---------- */

export class Ell extends Solid {
  constructor(public c: V3, public r: V3, public b: Basis = IDENT) { super() }
  center() { return this.c }
  M(q: V3): V3 { return add(this.c, inBasis(this.b, [q[0] * this.r[0], q[1] * this.r[1], q[2] * this.r[2]])) }
  nW(q: V3): V3 { return norm(inBasis(this.b, [q[0] / this.r[0], q[1] / this.r[1], q[2] / this.r[2]])) }
  samples() { return SPH.map(d => this.M(d)) }
  vis(dc: DC, q: V3) { return dot(this.nW(q), dc.v.toEye(this.M(q))) > 0.03 }
  hatch(dc: DC) {
    const L = norm([dot(dc.L, this.b.x) / this.r[0], dot(dc.L, this.b.y) / this.r[1], dot(dc.L, this.b.z) / this.r[2]])
    const [a1, a2] = perp(L)
    const Rpx = dc.v.px(this.c) * (this.r[0] + this.r[1] + this.r[2]) / 3
    if (Rpx < 4) return
    let s = 0.34
    const n = 96
    while (s > -0.97) {
      const t = s >= 0 ? 0.74 * (1 - s) ** 1.25 : 0.74 + 0.26 * Math.min(1, -s * 1.7)
      const rho = Math.sqrt(1 - s * s)
      const pts: V3[] = Array.from({ length: n }, (_, i) => { const f = (i / n) * Math.PI * 2; return add(mul(L, s), add(mul(a1, Math.cos(f) * rho), mul(a2, Math.sin(f) * rho))) })
      for (const run of runs(n, i => this.vis(dc, pts[i]))) {
        if (run.length < 4) continue
        const cut0 = Math.floor(run.length * dc.pen.rand(0, 0.12)), cut1 = Math.floor(run.length * dc.pen.rand(0, 0.12))
        const seg = run.slice(cut0, run.length - cut1)
        if (seg.length > 2) stroke3(dc, seg.map(i => this.M(pts[i])), 1.15, dc.st.hatch, { wobble: 0.3, taper: 0.6 })
      }
      s -= gapFor(dc, t) / Rpx
    }
    // Deep side: cross-contours (meridians round the light axis) in fine-liner.
    const steps = Math.max(6, Math.round((Rpx * Math.PI) / (dc.st.gap * 1.6)))
    for (let k = 0; k < steps; k++) {
      const psi = (k / steps) * Math.PI * 2 + dc.pen.rand(-0.05, 0.05)
      const m = add(mul(a1, Math.cos(psi)), mul(a2, Math.sin(psi)))
      const arc: V3[] = []
      for (let j = 0; j <= 24; j++) {
        const s2 = -0.3 - (j / 24) * 0.68
        const q = add(mul(L, s2), mul(m, Math.sqrt(1 - s2 * s2)))
        if (this.vis(dc, q)) arc.push(this.M(q)); else if (arc.length > 2) break
      }
      if (arc.length > 2) stroke3(dc, arc, 0.95, deepInk(dc), { wobble: 0.3, taper: 0.6 })
    }
  }
  construct(dc: DC) {
    if ((dc.st.build01 ?? 1) < 0.2) return
    const n = 72
    // Equator and one meridian, the sections a designer sketches to find the form.
    const eq = Array.from({ length: n + 1 }, (_, i) => { const f = (i / n) * Math.PI * 2; return this.M([Math.cos(f), 0, Math.sin(f)]) })
    const me = Array.from({ length: n + 1 }, (_, i) => { const f = (i / n) * Math.PI * 2; return this.M([0, Math.cos(f), Math.sin(f)]) })
    stroke3(dc, eq, 0.75, dc.st.build, { wobble: 0.4 })
    if (dc.pen.rand() < 0.7) stroke3(dc, me, 0.75, dc.st.build, { wobble: 0.4 })
  }
}

/* ---------- Capsule ---------- */

export class Cap extends Solid {
  private cyl: Cyl
  private e0: Ell
  private e1: Ell
  constructor(public a: V3, public b: V3, public r: number, public r2 = r) {
    super()
    this.cyl = new Cyl(a, b, r, r2, false)
    this.e0 = new Ell(a, [r, r, r])
    this.e1 = new Ell(b, [r2, r2, r2])
  }
  center() { return lerp3(this.a, this.b, 0.5) }
  samples() { return [...this.cyl.samples(), ...this.e0.samples(), ...this.e1.samples()] }
  hatch(dc: DC) { this.cyl.hatch(dc); this.e0.hatch(dc); this.e1.hatch(dc) }
  construct(dc: DC) { if ((dc.st.build01 ?? 1) > 0.3 && this.cyl.L > 0.05) dashDot(dc, madd(this.a, this.cyl.w, -this.r * 1.6), madd(this.b, this.cyl.w, this.r2 * 1.6), dc.st.build, 0.7) }
}

/* ---------- Details drawn on a part ---------- */

/** A seam or panel line; drawn only while its surface faces the viewer. */
export const seam = (pts: V3[], n?: V3, w = 1.05): Detail => ({
  draw(dc) { if (n && dot(n, dc.v.toEye(pts[0])) <= 0) return; stroke3(dc, pts, w, dc.st.line, { wobble: 0.35, over: 1.5 }) },
})
/** A circle on a surface (a lamp, a bolt, a lens rim). */
export const disc = (c: V3, n: V3, r: number, o: { fill?: boolean; w?: number; ring?: number } = {}): Detail => ({
  draw(dc) {
    if (dot(n, dc.v.toEye(c)) <= 0) return
    const [e1, e2] = perp(norm(n))
    const P = Array.from({ length: 36 }, (_, i) => { const f = (i / 36) * Math.PI * 2; return p2(dc.v, add(c, add(mul(e1, Math.cos(f) * r), mul(e2, Math.sin(f) * r)))) })
    if (o.fill) {
      dc.g.save(); dc.g.globalAlpha = dc.st.dark.alpha; dc.g.fillStyle = dc.st.dark.color
      dc.g.beginPath(); P.forEach((p, i) => (i ? dc.g.lineTo(p[0], p[1]) : dc.g.moveTo(p[0], p[1]))); dc.g.closePath(); dc.g.fill(); dc.g.restore()
    }
    dc.pen.stroke(P, { w: (o.w ?? 1.1) * dc.st.k, ink: dc.st.line, closed: true, wobble: 0.25 })
    if (o.ring) {
      const Q = Array.from({ length: 36 }, (_, i) => { const f = (i / 36) * Math.PI * 2; return p2(dc.v, add(c, add(mul(e1, Math.cos(f) * r * o.ring!), mul(e2, Math.sin(f) * r * o.ring!)))) })
      dc.pen.stroke(Q, { w: 0.9 * dc.st.k, ink: dc.st.line, closed: true, wobble: 0.25 })
    }
  },
})
/** Tread lines across a tyre: drawn where the running surface faces us. */
export const treads = (t: Cyl, n = 28): Detail => ({
  draw(dc) {
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2
      if (!t.sideVis(dc, th)) continue
      stroke3(dc, [t.ringA(th, t.ra * 1.001), t.ringB(th, t.rb * 1.001)], 1.2, dc.st.line, { wobble: 0.2 })
    }
  },
})

/** A circle of bolt heads on a face. */
export const bolts = (c: V3, n: V3, R: number, count: number, r: number): Detail => ({
  draw(dc) {
    if (dot(n, dc.v.toEye(c)) <= 0.05) return
    const [e1, e2] = perp(norm(n))
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.3
      const q = p2(dc.v, add(c, add(mul(e1, Math.cos(a) * R), mul(e2, Math.sin(a) * R))))
      dc.pen.dot(q[0], q[1], Math.max(0.9, dc.v.px(c) * r), dc.st.line)
    }
  },
})

/** A row of short slots (vents, grip ribs) across a face. */
export const slots = (a: V3, along: V3, across: V3, n: number, gap: number, length: number, normal: V3): Detail => ({
  draw(dc) {
    if (dot(normal, dc.v.toEye(a)) <= 0) return
    for (let i = 0; i < n; i++) {
      const p = madd(a, along, i * gap)
      stroke3(dc, [p, madd(p, across, length)], 1.2, dc.st.line, { wobble: 0.2 })
    }
  },
})

/** A band around a cylinder or limb (an intent light, a seam ring): its front half. */
export const hoop = (c: V3, axis: V3, r: number, w = 1.15, dark = false): Detail => ({
  draw(dc) {
    const [e1, e2] = perp(norm(axis))
    const n = 64
    const pts = Array.from({ length: n }, (_, i) => { const f = (i / n) * Math.PI * 2; const d = add(mul(e1, Math.cos(f)), mul(e2, Math.sin(f))); return { p: madd(c, d, r), d } })
    for (const run of runs(n, i => dot(pts[i].d, dc.v.toEye(pts[i].p)) > 0.05)) {
      stroke3(dc, run.map(i => pts[i].p), w, dark ? dc.st.dark : dc.st.line, { wobble: 0.25 })
    }
  },
})

/* ---------- Scene ---------- */

export interface RenderOpts { L?: V3; shadow?: boolean; ground?: number; clip?: { x0: number; y0: number; x1: number; y1: number } }

export const LIGHT: V3 = norm([-0.55, 0.75, 0.15])

/** Draw solids onto a transparent layer: shadow, then far to near, then construction. */
export function renderSolids(g: Ctx, v: View, parts: Solid[], st: Style, seed: number, o: RenderOpts = {}) {
  const pen = new Pen(g, seed)
  const dc: DC = { g, v, pen, L: o.L ?? LIGHT, st }
  if (o.shadow !== false) groundShadow(dc, parts, o.ground ?? 0, o.clip)
  const order = parts.map(s => ({ s, d: v.project(s.center())[2] })).sort((a, b) => b.d - a.d)
  for (const { s } of order) {
    const out = s.outline(v)
    if (out.length < 3) continue
    const path = () => { g.beginPath(); out.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath() }
    g.save(); g.globalCompositeOperation = 'destination-out'; path(); g.fill(); g.restore()
    if (st.fill) { g.save(); g.fillStyle = st.fill; path(); g.fill(); g.restore() }
    if (s.dark) {
      g.save(); g.globalAlpha = st.dark.alpha; g.fillStyle = st.dark.color; path(); g.fill(); g.restore()
    } else if (s.hatchable) {
      g.save(); path(); g.clip(); s.hatch(dc); g.restore()
    }
    s.creases(dc)
    pen.stroke(out, { w: 2.5 * st.k * s.weight, ink: st.line, closed: true, wobble: 0.7 })
    shadowSide(dc, s, out)
    for (const d of s.details) d.draw(dc)
  }
  for (const s of parts) if (s.build) s.construct(dc)
  return dc
}

/** Designers lean on the line where a form turns away from the light. */
function shadowSide(dc: DC, s: Solid, out: P2[]) {
  const c = p2(dc.v, s.center()), l = p2(dc.v, madd(s.center(), dc.L, 0.05))
  const lx = l[0] - c[0], ly = l[1] - c[1], ll = Math.hypot(lx, ly) || 1
  let cx = 0, cy = 0
  for (const p of out) { cx += p[0]; cy += p[1] }
  cx /= out.length; cy /= out.length
  const heavy = out.map((a, i) => {
    const b = out[(i + 1) % out.length]
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]
    const nl = Math.hypot(nx, ny) || 1
    nx /= nl; ny /= nl
    if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny }
    return (nx * lx + ny * ly) / ll < -0.3
  })
  for (const run of runs(out.length, i => heavy[i])) {
    if (run.length < 2) continue
    const pts = run.map(i => out[i])
    pts.push(out[(run[run.length - 1] + 1) % out.length])
    dc.pen.stroke(pts, { w: 2.2 * dc.st.k * s.weight, ink: dc.st.line, wobble: 0.5, taper: 0.9 })
  }
}

/** The shadow each part throws on the ground, scribbled in with dense hatching. */
export function groundShadow(dc: DC, parts: Solid[], y0: number, clip?: { x0: number; y0: number; x1: number; y1: number }) {
  const { g, v, L, pen, st } = dc
  const regions: P2[][] = []
  for (const s of parts) {
    const pts = s.samples().map(p => { const t = (p[1] - y0) / L[1]; return p2(v, [p[0] - L[0] * t, y0, p[2] - L[2] * t]) })
    regions.push(hull(pts))
  }
  const all = bounds(regions.flat())
  const bb = clip ? { x0: Math.max(all.x0, clip.x0), y0: Math.max(all.y0, clip.y0), x1: Math.min(all.x1, clip.x1), y1: Math.min(all.y1, clip.y1) } : all
  if (bb.x1 <= bb.x0 || bb.y1 <= bb.y0) return
  g.save()
  g.beginPath()
  for (const r of regions) { r.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath() }
  g.clip('nonzero')
  pen.hatchBox(bb.x0, bb.y0, bb.x1, bb.y1, -0.62, st.gap * 0.75, { w: 1.05 * st.k, ink: st.line, wobble: 0.5, alpha: 0.7, flick: true }, 0.5)
  pen.hatchBox(bb.x0, bb.y0, bb.x1, bb.y1, -0.42, st.gap * 1.6, { w: 0.9 * st.k, ink: st.hatch, wobble: 0.5, alpha: 0.6 }, 0.5)
  g.restore()
}

/* ---------- Builders ---------- */

export const box = (c: V3, size: V3, b: Basis = IDENT, r = 0) => new Box(c, size, b, r)
export const cyl = (a: V3, b: V3, r: number, r2 = r, caps = true, hole = 0) => new Cyl(a, b, r, r2, caps, hole)
/** A joint: a short cylinder centred on c along axis. */
export const joint = (c: V3, axis: V3, r: number, w: number) => {
  const n = norm(axis), d = mul(n, w / 2)
  const j = new Cyl(sub(c, d), add(c, d), r)
  for (const sgn of [-1, 1]) j.on(bolts(madd(c, n, (sgn * w) / 2), mul(n, sgn), r * 0.72, 6, r * 0.07), disc(madd(c, n, (sgn * w) / 2), mul(n, sgn), r * 0.42))
  return j
}
export const cap = (a: V3, b: V3, r: number, r2 = r) => new Cap(a, b, r, r2)
export const sph = (c: V3, r: number) => new Ell(c, [r, r, r])
export const ell = (c: V3, r: V3, b: Basis = IDENT) => new Ell(c, r, b)
/** A box whose long axis runs from a to b. */
export function bar(a: V3, b: V3, w: number, d: number, r = 0, up: V3 = [0, 1, 0]) {
  const y = norm(sub(b, a))
  let x = norm(cross(up, y))
  if (len(cross(up, y)) < 1e-3) x = perp(y)[0]
  const z = cross(x, y)
  return new Box(lerp3(a, b, 0.5), [w, len(sub(b, a)), d], { x, y, z }, r)
}
export { alongY }
