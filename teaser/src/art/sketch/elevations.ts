import type { Ctx } from '../canvas'
import { type ArmPose, type DronePose, type QuadPose, armJoints } from '../bodies'
import { type V3, IDENT, euler, norm, oblique } from './geom'
import { INKS } from './pen'
import { type Solid, type Style, bar, box, cap, cyl, disc, hoop, joint, renderSolids, sph, treads } from './solids'

// The three S3 bodies as white-ink elevations on the cyanotype: the same
// kinematics as the motion paths, drawn as solids in an oblique projection so
// they keep their exact positions on the sheet while gaining depth and tone.

type P = [number, number]
const Z: V3 = [0, 0, 1]
const V = (q: P, z = 0): V3 => [q[0], -q[1], z]

export const S3_STYLE: Style = {
  line: INKS.white,
  hatch: INKS.paleWhite,
  build: { color: '#E6F2F8', alpha: 0.3 },
  dark: { color: '#F2F8FB', alpha: 0.85 },
  // A photogram's body is lighter than the open sky around it: forms read solid.
  fill: 'rgba(40, 88, 134, 0.7)',
  k: 0.78,
  gap: 2.4,
  build01: 0.7,
}
const LIGHT: V3 = norm([-0.55, 0.75, 0.4])

export function armParts(p: ArmPose): Solid[] {
  const j = armJoints(p)
  const [bx, by] = p.base
  const n: P = [Math.cos(j.a123), Math.sin(j.a123)], s: P = [-n[1], n[0]]
  const m: P = [j.wr[0] + n[0] * 9, j.wr[1] + n[1] * 9]
  const at = (a: P, k: number, b: P, l = 0): P => [a[0] + b[0] * k + n[0] * l, a[1] + b[1] * k + n[1] * l]
  return [
    box([bx, -(by + 11), 0], [52, 10, 34], IDENT, 2.5),
    box([bx, -(by - 2), 0], [28, 16, 26], IDENT, 4).on(disc([bx + 6, -(by - 2), 13.1], Z, 2.2, { fill: true, ring: 1.6 })),
    joint(V(j.sh), Z, 9, 22),
    cap(V(j.sh, 0), V(j.el, 0), 7, 6.4),
    joint(V(j.el), Z, 7, 18),
    cap(V(j.el), V(j.wr), 5.5, 4.8),
    joint(V(j.wr), Z, 4.5, 12),
    cap(V(j.wr), V(m), 2.6),
    bar(V(at(m, -7, s)), V(at(m, 7, s)), 3, 10, 1),
    bar(V(at(m, -6, s)), V(at(m, -6, s, 9)), 2.4, 8, 0.8),
    bar(V(at(m, 6, s)), V(at(m, 6, s, 9)), 2.4, 8, 0.8),
  ]
}

const HIPS = [-30, -24, 26, 32]
export function quadParts(q: QuadPose): Solid[] {
  const { x, y } = q
  const parts: Solid[] = [
    box([x, -(y - 3), 0], [80, 26, 36], IDENT, 9).on(disc([x + 18, -(y - 1), 18.1], Z, 2, { fill: true, ring: 1.6 })),
    box([x, -(y - 20), 0], [32, 8, 20], IDENT, 2),
    box([x + 51, -(y - 12), 0], [22, 16, 22], IDENT, 5).on(disc([x + 62.1, -(y - 12), 5], [1, 0, 0], 2.6, { fill: true }), disc([x + 62.1, -(y - 12), -5], [1, 0, 0], 2.6, { fill: true })),
  ]
  HIPS.forEach((h, i) => {
    const hip: P = [x + h, y + 6]
    const foot = q.feet[i]
    const front = h > 0
    const mx = (hip[0] + foot[0]) / 2, my = (hip[1] + foot[1]) / 2
    const d = Math.hypot(foot[0] - hip[0], foot[1] - hip[1])
    const bend = Math.sqrt(Math.max(0, 27 * 27 - (d / 2) ** 2))
    const nx = -(foot[1] - hip[1]) / d, ny = (foot[0] - hip[0]) / d
    const k = front ? -1 : 1
    const knee: P = [mx + nx * bend * k, my + ny * bend * k]
    const z = i === 1 || i === 2 ? -15 : 15
    parts.push(joint(V(hip, z), Z, 4.6, 9), cap(V(hip, z), V(knee, z), 3.4, 3.1), sph(V(knee, z), 3.5), cap(V(knee, z), V(foot, z), 2.6, 2.1), sph(V(foot, z), 2.5).rubber(0.85))
  })
  return parts
}

export function droneParts(d: DronePose, scale = 0.62): Solid[] {
  const c = Math.cos(-d.roll * 0.15), s = Math.sin(-d.roll * 0.15)
  const R = (u: number, v: number, z = 0): V3 => [d.x + (u * c - -v * s) * scale, -d.y + (u * s + -v * c) * scale, z * scale]
  const B = euler(0, 0, -d.roll * 0.15)
  const parts: Solid[] = [box(R(0, 0, 0), [30 * scale, 30 * scale, 12 * scale], B, 7 * scale).on(disc(R(0, 0, 6.1), Z, 6 * scale, { ring: 0.55 }), disc(R(0, -9, 6.1), Z, 1.6 * scale, { fill: true }))]
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as P[]) {
    const rx = sx * 38, ry = sy * 36
    parts.push(cap(R(sx * 12, sy * 12), R(rx - sx * 15, ry - sy * 14), 2.2 * scale))
    const duct = cyl(R(rx, ry, -3), R(rx, ry, 3), 22 * scale, 22 * scale, true, 19.5 * scale)
    parts.push(duct.on(hoop(R(rx, ry, 0), Z, 22.2 * scale, 1)))
    parts.push(cyl(R(rx, ry, -2), R(rx, ry, 4), 4 * scale))
    const a = d.spin * sx
    parts.push(box(R(rx, ry, 4.2), [38 * scale, 3 * scale, 0.8 * scale], euler(0, 0, -d.roll * 0.15 + a), 0.8 * scale))
  }
  void treads
  return parts
}

/** Render one body's solids in white onto a transparent layer. */
export function drawElevation(g: Ctx, parts: Solid[], map: (u: number, v: number) => [number, number], pxPerUnit: number, groundV: number | null, seed: number) {
  const view = oblique(-0.36, -0.26, (X, Y) => map(X, -Y), pxPerUnit)
  renderSolids(g, view, parts, S3_STYLE, seed, { L: LIGHT, shadow: groundV != null, ground: groundV != null ? -groundV : 0 })
}
