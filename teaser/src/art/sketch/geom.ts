// Small 3D toolkit for the ink drawings: vectors, bases, views, a 2D hull.

export type V3 = [number, number, number]
export type P2 = [number, number]

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k]
/** a + b·k */
export const madd = (a: V3, b: V3, k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2])
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const dist2 = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1])
export const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/** Two unit vectors perpendicular to w and to each other. */
export function perp(w: V3): [V3, V3] {
  const a: V3 = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const e1 = norm(cross(w, a))
  return [e1, cross(w, e1)]
}

export interface Basis { x: V3; y: V3; z: V3 }
export const IDENT: Basis = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }

function rot(v: V3, axis: 0 | 1 | 2, a: number): V3 {
  const c = Math.cos(a), s = Math.sin(a)
  if (axis === 0) return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]
  if (axis === 1) return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]
}
/** A basis turned by roll (z), then pitch (x), then yaw (y). Radians. */
export function euler(yaw = 0, pitch = 0, roll = 0): Basis {
  const f = (v: V3) => rot(rot(rot(v, 2, roll), 0, pitch), 1, yaw)
  return { x: f([1, 0, 0]), y: f([0, 1, 0]), z: f([0, 0, 1]) }
}
/** A basis whose y axis points along dir. */
export function alongY(dir: V3): Basis {
  const y = norm(dir)
  const [x] = perp(y)
  return { x, y, z: cross(x, y) }
}
export const inBasis = (b: Basis, v: V3): V3 => [
  b.x[0] * v[0] + b.y[0] * v[1] + b.z[0] * v[2],
  b.x[1] * v[0] + b.y[1] * v[1] + b.z[1] * v[2],
  b.x[2] * v[0] + b.y[2] * v[1] + b.z[2] * v[2],
]

/* ---------- Views ---------- */

export interface View {
  /** Screen x, y in px and depth (larger is farther). */
  project(p: V3): [number, number, number]
  /** Unit vector from p toward the viewer. */
  toEye(p: V3): V3
  /** Screen px per world unit at p. */
  px(p: V3): number
}

export function perspective(eye: V3, target: V3, f: number, cx: number, cy: number, up: V3 = [0, 1, 0]): View & { eye: V3; f: number; fw: V3; rt: V3; up: V3; cx: number; cy: number } {
  const fw = norm(sub(target, eye)), rt = norm(cross(fw, up)), uu = cross(rt, fw)
  return {
    eye, f, fw, rt, up: uu, cx, cy,
    project(p) { const d = sub(p, eye); const z = dot(d, fw); return [cx + (f * dot(d, rt)) / z, cy - (f * dot(d, uu)) / z, z] },
    toEye(p) { return norm(sub(eye, p)) },
    px(p) { return f / dot(sub(p, eye), fw) },
  }
}

/**
 * Oblique (cabinet-style) elevation: x right, y up, z toward the viewer;
 * depth recedes up and to the right. `map` places the 2D result on the page.
 */
export function oblique(kx: number, ky: number, map: (u: number, v: number) => P2, scale: number): View {
  const e = norm([-kx, -ky, 1])
  return {
    project(p) { const [x, y] = map(p[0] + kx * p[2], p[1] + ky * p[2]); return [x, y, -p[2]] },
    toEye() { return e },
    px() { return scale },
  }
}

/* ---------- 2D ---------- */

/** Convex hull (monotone chain), counter-clockwise. */
export function hull(pts: P2[]): P2[] {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const cr = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo: P2[] = [], hi: P2[] = []
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q) }
  return lo.slice(0, -1).concat(hi.slice(0, -1))
}

export function inPoly(pt: P2, poly: P2[]) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c
  }
  return c
}

export function bounds(pts: P2[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
}

/** Fibonacci points on the unit sphere. */
export function sphereDirs(n: number): V3[] {
  const out: V3[] = []
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    out.push([Math.cos(ga * i) * r, y, Math.sin(ga * i) * r])
  }
  return out
}
