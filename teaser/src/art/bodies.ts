import type { Ctx } from './canvas'

// Robot bodies as technical line art, one stroke weight throughout. Each is
// drawn in a 200 × 130 unit box (ground at y = 122 for grounded bodies).
// The caller sets the transform, colour and line width.

type P = [number, number]

const line = (g: Ctx, ...pts: P[]) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke() }
const circ = (g: Ctx, x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke() }
const dot = (g: Ctx, x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
const rrect = (g: Ctx, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.stroke() }
const joint = (g: Ctx, x: number, y: number, r: number) => { circ(g, x, y, r); dot(g, x, y, Math.max(0.9, r * 0.22)) }
/** The outline of a rounded link between two joints. */
function link(g: Ctx, a: P, b: P, r: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const ang = Math.atan2(dy, dx)
  g.beginPath()
  g.arc(a[0], a[1], r, ang + Math.PI / 2, ang - Math.PI / 2)
  g.arc(b[0], b[1], r, ang - Math.PI / 2, ang + Math.PI / 2)
  g.closePath()
  g.stroke()
}
const thin = (g: Ctx, f: () => void) => { const w = g.lineWidth; g.lineWidth = w * 0.55; f(); g.lineWidth = w }
const ground = (g: Ctx, x0 = 24, x1 = 176, y = 122) => thin(g, () => { line(g, [x0, y], [x1, y]); for (let x = x0 + 6; x < x1; x += 9) line(g, [x, y], [x - 4, y + 4]) })

export const BODY_DRAW: Record<string, (g: Ctx) => void> = {
  'industrial arm': g => {
    ground(g)
    rrect(g, 64, 112, 52, 10, 2)
    rrect(g, 76, 96, 28, 16, 4)
    joint(g, 90, 92, 9)
    link(g, [90, 92], [118, 46], 7)
    joint(g, 118, 46, 7)
    link(g, [118, 46], [154, 58], 5.5)
    joint(g, 154, 58, 4.5)
    line(g, [154, 62.5], [154, 72])
    rrect(g, 146, 72, 16, 5, 1.5)
    line(g, [148, 77], [148, 88]); line(g, [160, 77], [160, 88])
    thin(g, () => { line(g, [80, 104], [100, 104]); circ(g, 118, 46, 3) })
  },
  humanoid: g => {
    ground(g)
    rrect(g, 89, 6, 22, 22, 7)
    thin(g, () => line(g, [93, 16], [107, 16]))
    line(g, [100, 28], [100, 33])
    rrect(g, 80, 33, 40, 38, 9)
    thin(g, () => { line(g, [86, 50], [114, 50]); rrect(g, 94, 38, 12, 8, 2) })
    joint(g, 76, 39, 5); joint(g, 124, 39, 5)
    link(g, [76, 39], [70, 62], 3.5); joint(g, 70, 62, 3.5)
    link(g, [70, 62], [74, 82], 3); circ(g, 75, 86, 3.5)
    link(g, [124, 39], [132, 60], 3.5); joint(g, 132, 60, 3.5)
    link(g, [132, 60], [128, 80], 3); circ(g, 127, 84, 3.5)
    rrect(g, 86, 71, 28, 11, 4)
    joint(g, 93, 86, 4); joint(g, 107, 86, 4)
    link(g, [93, 86], [90, 104], 3.5); joint(g, 90, 104, 3.5)
    link(g, [90, 104], [92, 118], 3); rrect(g, 84, 118, 14, 4, 1.5)
    link(g, [107, 86], [111, 103], 3.5); joint(g, 111, 103, 3.5)
    link(g, [111, 103], [109, 118], 3); rrect(g, 104, 118, 14, 4, 1.5)
  },
  quadruped: g => drawQuad(g, QUAD_STAND),
  quadcopter: g => drawDrone(g, { x: 100, y: 65, roll: 0, spin: 0.4 }, 1),
  'wheeled carrier': g => {
    ground(g)
    rrect(g, 40, 76, 120, 24, 6)
    thin(g, () => { line(g, [52, 88], [148, 88]); rrect(g, 150, 66, 14, 10, 3); circ(g, 157, 71, 2) })
    rrect(g, 62, 44, 76, 32, 3)
    thin(g, () => { rrect(g, 88, 50, 24, 5, 2.5); line(g, [62, 64], [138, 64]) })
    circ(g, 64, 108, 14); joint(g, 64, 108, 4)
    circ(g, 136, 108, 14); joint(g, 136, 108, 4)
  },
  'gantry crane': g => {
    ground(g, 20, 180)
    rrect(g, 30, 12, 140, 10, 2)
    line(g, [40, 22], [40, 122]); line(g, [160, 22], [160, 122])
    thin(g, () => { line(g, [40, 40], [160, 22]); line(g, [40, 22], [56, 40]); line(g, [160, 22], [144, 40]); line(g, [32, 122], [48, 122]); line(g, [152, 122], [168, 122]) })
    rrect(g, 90, 22, 22, 8, 2)
    line(g, [97, 30], [97, 66]); line(g, [105, 30], [105, 66])
    rrect(g, 93, 66, 16, 8, 2)
    g.beginPath(); g.arc(101, 79, 4, -Math.PI * 0.1, Math.PI * 1.1); g.stroke()
    thin(g, () => { line(g, [101, 83], [80, 92]); line(g, [101, 83], [122, 92]) })
    rrect(g, 76, 92, 50, 28, 2)
    thin(g, () => { line(g, [76, 106], [126, 106]); line(g, [101, 92], [101, 120]) })
  },
  hexapod: g => {
    g.beginPath(); g.ellipse(100, 65, 30, 17, 0, 0, Math.PI * 2); g.stroke()
    thin(g, () => { g.beginPath(); g.ellipse(100, 65, 18, 9, 0, 0, Math.PI * 2); g.stroke() })
    circ(g, 136, 65, 6); dot(g, 139, 62, 1.2); dot(g, 139, 68, 1.2)
    const legs: [number, number, number][] = [[-0.55, 78, 1], [0, 100, 1], [0.55, 122, 1]]
    for (const [tilt, x] of legs) for (const s of [-1, 1]) {
      const hip: P = [x, 65 + s * 14]
      const knee: P = [x + tilt * 18 + (x - 100) * 0.12, 65 + s * 34]
      const foot: P = [knee[0] + tilt * 22 + (x - 100) * 0.25, 65 + s * 54]
      joint(g, ...hip, 3); line(g, hip, knee); joint(g, ...knee, 3); line(g, knee, foot); dot(g, ...foot, 2)
    }
  },
  'snake arm': g => {
    ground(g)
    rrect(g, 18, 98, 32, 24, 3)
    const pts: P[] = []
    for (let i = 0; i <= 11; i++) {
      const t = i / 11
      pts.push([34 + t * 132, 96 - Math.sin(t * Math.PI * 1.35) * 46 - t * 18])
    }
    for (let i = 0; i < pts.length - 1; i++) link(g, pts[i], pts[i + 1], 4.6 - i * 0.18)
    pts.forEach((p, i) => i > 0 && joint(g, ...p, 2.6))
    const e = pts[pts.length - 1]
    circ(g, e[0] + 7, e[1], 4); thin(g, () => { line(g, [e[0] + 2, e[1]], [e[0] + 12, e[1]]); line(g, [e[0] + 7, e[1] - 5], [e[0] + 7, e[1] + 5]) })
  },
  'dual-arm torso': g => {
    ground(g)
    rrect(g, 72, 116, 56, 6, 2)
    rrect(g, 92, 92, 16, 24, 2)
    rrect(g, 78, 46, 44, 46, 8)
    thin(g, () => { line(g, [86, 62], [114, 62]); line(g, [86, 76], [114, 76]) })
    rrect(g, 88, 20, 24, 20, 6); dot(g, 95, 30, 1.8); dot(g, 105, 30, 1.8)
    line(g, [100, 40], [100, 46])
    for (const s of [-1, 1]) {
      const sh: P = [100 + s * 27, 54], el: P = [100 + s * 50, 78], wr: P = [100 + s * 38, 98]
      joint(g, ...sh, 5); link(g, sh, el, 4); joint(g, ...el, 4); link(g, el, wr, 3.4); joint(g, ...wr, 3)
      line(g, [wr[0] - 4, wr[1] + 3], [wr[0] - 6, wr[1] + 11]); line(g, [wr[0] + 4, wr[1] + 3], [wr[0] + 6, wr[1] + 11])
    }
  },
  'forklift unit': g => {
    ground(g)
    rrect(g, 72, 58, 82, 44, 6)
    rrect(g, 128, 36, 18, 22, 3)
    thin(g, () => { circ(g, 137, 45, 3); line(g, [84, 80], [142, 80]) })
    circ(g, 92, 108, 13); joint(g, 92, 108, 3.5)
    circ(g, 138, 108, 13); joint(g, 138, 108, 3.5)
    line(g, [66, 20], [66, 116]); line(g, [60, 20], [60, 116])
    thin(g, () => { for (let y = 30; y < 110; y += 16) line(g, [60, y], [66, y]) })
    line(g, [60, 116], [22, 116]); line(g, [60, 100], [60, 116])
    rrect(g, 22, 106, 34, 8, 1)
    rrect(g, 26, 80, 26, 26, 2); thin(g, () => line(g, [26, 93], [52, 93]))
  },
  'dexterous hand': g => {
    rrect(g, 84, 106, 32, 18, 4)
    rrect(g, 76, 56, 48, 50, 11)
    thin(g, () => { circ(g, 100, 82, 7); line(g, [84, 100], [116, 100]) })
    const fingers: [number, number[]][] = [[83, [15, 11, 9]], [95, [17, 13, 10]], [107, [16, 12, 9]], [119, [13, 10, 8]]]
    for (const [x, segs] of fingers) {
      let y = 56
      joint(g, x, y, 3.6)
      for (const L of segs) { link(g, [x, y], [x, y - L], 3.2); y -= L; joint(g, x, y, 2.8) }
    }
    let p: P = [76, 86]
    joint(g, ...p, 4)
    for (const [dx, dy] of [[-14, -10], [-10, -12], [-6, -10]] as P[]) { const q: P = [p[0] + dx, p[1] + dy]; link(g, p, q, 3.3); joint(g, ...q, 2.8); p = q }
  },
  rover: g => {
    ground(g)
    rrect(g, 56, 52, 88, 22, 4)
    line(g, [50, 47], [150, 47]); thin(g, () => { for (let x = 58; x < 146; x += 10) line(g, [x, 47], [x, 52]) })
    line(g, [128, 47], [128, 22]); rrect(g, 117, 10, 24, 12, 3); dot(g, 134, 16, 1.8)
    thin(g, () => line(g, [70, 47], [64, 30]))
    for (const x of [52, 100, 148]) { circ(g, x, 110, 11); joint(g, x, 110, 3) }
    line(g, [72, 74], [52, 110]); line(g, [72, 74], [112, 92]); joint(g, 72, 74, 3)
    line(g, [112, 92], [100, 110]); line(g, [112, 92], [148, 110]); joint(g, 112, 92, 3)
  },
}

/* ---------- Bodies that move (S3) ---------- */

export interface ArmPose { base: P; a1: number; a2: number; a3: number }
const L1 = 50, L2 = 36

export function armJoints(p: ArmPose) {
  const sh: P = [p.base[0], p.base[1] - 22]
  const el: P = [sh[0] + Math.cos(p.a1) * L1, sh[1] + Math.sin(p.a1) * L1]
  const a12 = p.a1 + p.a2
  const wr: P = [el[0] + Math.cos(a12) * L2, el[1] + Math.sin(a12) * L2]
  const a123 = a12 + p.a3
  const tip: P = [wr[0] + Math.cos(a123) * 16, wr[1] + Math.sin(a123) * 16]
  return { sh, el, wr, tip, a123 }
}

export function drawArm(g: Ctx, p: ArmPose) {
  const j = armJoints(p)
  const [bx, by] = p.base
  rrect(g, bx - 26, by + 6, 52, 10, 2)
  rrect(g, bx - 14, by - 10, 28, 16, 4)
  joint(g, ...j.sh, 9)
  link(g, j.sh, j.el, 7); joint(g, ...j.el, 7)
  link(g, j.el, j.wr, 5.5); joint(g, ...j.wr, 4.5)
  const n: P = [Math.cos(j.a123), Math.sin(j.a123)], s: P = [-n[1], n[0]]
  const m: P = [j.wr[0] + n[0] * 9, j.wr[1] + n[1] * 9]
  line(g, j.wr, m)
  line(g, [m[0] - s[0] * 7, m[1] - s[1] * 7], [m[0] + s[0] * 7, m[1] + s[1] * 7])
  for (const k of [-6, 6]) line(g, [m[0] + s[0] * k, m[1] + s[1] * k], [m[0] + s[0] * k + n[0] * 9, m[1] + s[1] * k + n[1] * 9])
}

/** A pick-and-place loop. */
export function armPoseAt(t: number, base: P): ArmPose {
  const u = t * 0.62 * Math.PI * 2
  return {
    base,
    a1: -1.95 + 0.62 * Math.sin(u) + 0.12 * Math.sin(u * 2 + 0.6),
    a2: 1.25 + 0.55 * Math.sin(u + 1.1),
    a3: 0.85 - 0.35 * Math.sin(u + 2.1),
  }
}

export interface QuadPose { x: number; y: number; feet: P[]; pitch: number }
const QUAD_HIPS = [-30, -24, 26, 32]
export const QUAD_STAND: QuadPose = { x: 100, y: 66, feet: QUAD_HIPS.map(h => [100 + h + (h < 0 ? 2 : -2), 120] as P), pitch: 0 }

export function quadPoseAt(t: number, x0: number, groundY: number, speed = 26): QuadPose {
  const x = x0 + t * speed
  const cycle = 0.72
  const stride = speed * cycle
  const phases = [0, 0.5, 0.5, 0]
  const feet = QUAD_HIPS.map((h, i) => {
    const ph = ((t / cycle + phases[i]) % 1 + 1) % 1
    const base = x + h
    let fx: number, fy: number
    if (ph < 0.65) { const k = ph / 0.65; fx = base + stride * (0.35 - k * 0.65); fy = groundY }
    else { const k = (ph - 0.65) / 0.35; fx = base + stride * (-0.3 + k * 0.65); fy = groundY - Math.sin(k * Math.PI) * 9 }
    return [fx, fy] as P
  })
  return { x, y: groundY - 54 + Math.sin(t / cycle * Math.PI * 4) * 1.2, feet, pitch: 0 }
}

export function drawQuad(g: Ctx, q: QuadPose, groundLine = true) {
  if (groundLine) ground(g)
  const { x, y } = q
  rrect(g, x - 40, y - 16, 80, 26, 10)
  thin(g, () => { line(g, [x - 28, y - 3], [x + 28, y - 3]); rrect(g, x - 16, y - 24, 32, 8, 2) })
  rrect(g, x + 40, y - 20, 22, 16, 5); dot(g, x + 56, y - 12, 1.6)
  QUAD_HIPS.forEach((h, i) => {
    const hip: P = [x + h, y + 6]
    const foot = q.feet[i]
    const front = h > 0
    // Two-link leg with the knee bending the natural way for each end.
    const mx = (hip[0] + foot[0]) / 2, my = (hip[1] + foot[1]) / 2
    const d = Math.hypot(foot[0] - hip[0], foot[1] - hip[1])
    const bend = Math.sqrt(Math.max(0, 27 * 27 - (d / 2) ** 2))
    const nx = -(foot[1] - hip[1]) / d, ny = (foot[0] - hip[0]) / d
    const k = front ? -1 : 1
    const knee: P = [mx + nx * bend * k, my + ny * bend * k]
    const far = i === 1 || i === 2
    const w = g.lineWidth
    if (far) g.lineWidth = w * 0.7
    joint(g, ...hip, 4.5); link(g, hip, knee, 3.4); joint(g, ...knee, 3.4); link(g, knee, foot, 2.6); dot(g, ...foot, 2.4)
    g.lineWidth = w
  })
}

export interface DronePose { x: number; y: number; roll: number; spin: number }
export function dronePoseAt(t: number, cx: number, cy: number): DronePose {
  const u = t * 0.55 * Math.PI * 2
  const s = Math.sin(u), c = Math.cos(u)
  // A lemniscate: the aerial unit's figure-of-eight survey pattern.
  return { x: cx + 42 * c / (1 + s * s), y: cy + 30 * s * c / (1 + s * s), roll: Math.atan2(30 * Math.cos(2 * u), -42 * s), spin: t * 9 }
}

export function drawDrone(g: Ctx, d: DronePose, scale = 0.62) {
  g.save()
  g.translate(d.x, d.y)
  g.rotate(d.roll * 0.15)
  g.scale(scale, scale)
  rrect(g, -15, -15, 30, 30, 7)
  thin(g, () => { circ(g, 0, 0, 6); dot(g, 0, -9, 1.5) })
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as P[]) {
    const rx = sx * 38, ry = sy * 36
    line(g, [sx * 12, sy * 12], [rx - sx * 6, ry - sy * 6])
    circ(g, rx, ry, 22)
    joint(g, rx, ry, 4)
    thin(g, () => { const a = d.spin * sx; line(g, [rx + Math.cos(a) * 19, ry + Math.sin(a) * 19], [rx - Math.cos(a) * 19, ry - Math.sin(a) * 19]) })
  }
  g.restore()
}
