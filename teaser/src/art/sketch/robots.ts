import { type V3, IDENT, add, euler, lerp3, madd, mul, norm, sub } from './geom'
import { type Solid, Box, Cyl, bar, bolts, box, cap, cyl, disc, ell, hoop, joint, seam, slots, sph, treads } from './solids'
import type { Dim, Note, Path, Ring, Turn } from './annotate'

// The CrossBody-12: twelve bodies one model drives. Drawn as a designer would
// pitch them: soft covers, hands where you can see them, a light that says
// what it is about to do, and a clear ring it keeps around people.

export interface Model {
  code: string
  name: string
  parts: Solid[]
  notes: Note[]
  turns?: Turn[]
  paths?: Path[]
  dims?: Dim[]
  rings?: Ring[]
  figure?: { at: V3; h?: number; yaw?: number }
  view: { az: number; el: number; dist?: number }
}

const deg = (d: number) => (d * Math.PI) / 180
const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1]

/** Two-finger gripper hanging from p, fingers along −y, opening along z. */
function gripper(p: V3, open = 0.04, s = 1): Solid[] {
  return [
    box(add(p, [0, -0.035 * s, 0]), [0.1 * s, 0.07 * s, 0.13 * s], IDENT, 0.016 * s),
    box(add(p, [0, -0.11 * s, open / 2 + 0.01 * s]), [0.032 * s, 0.09 * s, 0.018 * s], IDENT, 0.006 * s),
    box(add(p, [0, -0.11 * s, -open / 2 - 0.01 * s]), [0.032 * s, 0.09 * s, 0.018 * s], IDENT, 0.006 * s),
  ]
}

/** A hose or cable: a thin tube through points, with a clip at each bend. */
function tube(pts: V3[], r: number): Solid[] {
  const out: Solid[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const c = cap(pts[i], pts[i + 1], r)
    c.build = false
    out.push(c)
  }
  return out
}

/** A tyre along z at hub, outward side sgn: dark rubber, treads, a hub face. */
function tyre(hub: V3, r: number, w: number, sgn: number): Solid {
  const t = new Cyl(hub, add(hub, [0, 0, sgn * w]), r)
  t.rubber(0.8)
  return t.on(treads(t, 30), disc(add(hub, [0, 0, sgn * (w + 0.001)]), [0, 0, sgn], r * 0.55, { ring: 0.45 }), bolts(add(hub, [0, 0, sgn * (w + 0.001)]), [0, 0, sgn], r * 0.3, 5, r * 0.04))
}

/** A curled finger: segments from base, bending toward +z. */
function finger(base: V3, lens: number[], curls: number[], r: number, side: V3 = X): Solid[] {
  const out: Solid[] = []
  let p = base, a = 0
  out.push(sph(p, r * 1.12))
  lens.forEach((L, i) => {
    a += curls[i]
    const d: V3 = add(mul(Y, Math.cos(a)), mul(Z, Math.sin(a)))
    const q = madd(p, d, L)
    out.push(cap(p, q, r * (1 - i * 0.07), r * (1 - (i + 1) * 0.07)))
    if (i < lens.length - 1) out.push(sph(q, r * (1.08 - i * 0.07)))
    p = q
  })
  void side
  return out
}

export const MODELS: Record<string, () => Model> = {
  'industrial arm': () => {
    const S: V3 = [0, 0.34, 0.15]
    const E = madd(S, [Math.cos(deg(64)), Math.sin(deg(64)), 0], 0.56)
    const W = madd(E, [Math.cos(deg(-26)), Math.sin(deg(-26)), 0], 0.46)
    const W2: V3 = [W[0], W[1] - 0.13, W[2]]
    const parts: Solid[] = [
      cyl([0, 0, 0], [0, 0.045, 0], 0.21),
      cyl([0, 0.045, 0], [0, 0.2, 0], 0.15, 0.135).on(seam([[-0.15, 0.12, 0.03], [0.15, 0.12, 0.03]].map(p => p as V3))),
      box([0, 0.3, 0], [0.24, 0.2, 0.26], IDENT, 0.06).on(slots([0.121, 0.25, -0.08], Z, Y, 6, 0.028, 0.09, X), disc([0.05, 0.3, 0.131], Z, 0.014, { fill: true, ring: 1.6 })),
      cyl([0.09, 0.14, 0.12], [0.11, 0.15, 0.135], 0.022).on(disc([0.11, 0.15, 0.136], norm([0.4, 0.2, 0.9]), 0.014, { fill: true })),
      ...tube([[-0.1, 0.36, 0.1], [-0.05, 0.48, 0.24], lerp3(S, E, 0.45).map((v, i) => v + [0.0, 0.0, 0.085][i]) as V3, lerp3(S, E, 0.85).map((v, i) => v + [-0.04, 0, 0.08][i]) as V3], 0.012),
      joint(S, Z, 0.105, 0.09).on(disc(add(S, [0, 0, 0.046]), Z, 0.05, { ring: 0.4 })),
      cap(S, E, 0.072, 0.066).on(seam([lerp3(S, E, 0.25), lerp3(S, E, 0.75)].map(p => add(p, [0, 0, 0.072])))),
      joint(E, Z, 0.088, 0.13).on(disc(add(E, [0, 0, 0.066]), Z, 0.045, { ring: 0.45 })),
      cap(E, W, 0.06, 0.052),
      joint(W, Z, 0.062, 0.1),
      cyl(add(W, [0, -0.01, 0]), W2, 0.055).on(hoop(add(W, [0, -0.07, 0]), Y, 0.057, 2.2, true)),
      cyl(W2, add(W2, [0, -0.025, 0]), 0.046),
      ...gripper(add(W2, [0, -0.025, 0]), 0.05),
      box([W[0], 0.05, W[2]], [0.17, 0.1, 0.17], IDENT, 0.01),
    ]
    return {
      code: 'CB-01', name: 'INDUSTRIAL ARM', parts,
      notes: [
        { at: lerp3(S, E, 0.5), text: 'SOFT COVER, NO PINCH POINTS' },
        { at: add(W, [0, -0.07, 0.057]), text: 'INTENT RING' },
        { at: lerp3(E, W, 0.55), text: 'FORCE-LIMITED 80 N' },
        { at: [0.15, 0.12, 0.04], text: 'J1 ±170°' },
        { at: [0.11, 0.15, 0.14], text: 'E-STOP, ALWAYS IN REACH' },
      ],
      turns: [{ c: [0, 0.2, 0], axis: Y, r: 0.27, a0: deg(-120), a1: deg(-30) }],
      dims: [{ a: [0, 0.01, 0.42], b: [W[0], 0.01, 0.42], text: 'REACH 0.66 m' }],
      view: { az: deg(36), el: deg(17) },
    }
  },

  humanoid: () => {
    const parts: Solid[] = [
      ...[-1, 1].flatMap(s => [
        box([s * 0.1, 0.035, 0.035], [0.1, 0.07, 0.25], IDENT, 0.03),
        sph([s * 0.1, 0.095, 0], 0.045),
        cap([s * 0.1, 0.11, 0], [s * 0.1, 0.45, 0.01], 0.052, 0.06),
        sph([s * 0.1, 0.47, 0.02], 0.066).on(disc([s * 0.1, 0.47, 0.087], Z, 0.028, { ring: 0.5 })),
        cap([s * 0.1, 0.5, 0.01], [s * 0.11, 0.84, 0], 0.07, 0.08),
        sph([s * 0.245, 1.32, 0], 0.07).on(disc([s * 0.27, 1.37, 0.03], norm([s * 0.4, 0.7, 0.5]), 0.012, { fill: true })),
        cap([s * 0.255, 1.3, 0], [s * 0.29, 1.03, 0.03], 0.052, 0.048),
        sph([s * 0.295, 1.01, 0.04], 0.052),
      ]),
      box([0, 0.9, 0], [0.34, 0.16, 0.2], IDENT, 0.07).on(seam([[-0.15, 0.93, 0.101], [0.15, 0.93, 0.101]], Z, 1.3), disc([0, 0.9, 0.101], Z, 0.02, { ring: 0.5 })),
      cyl([0, 0.97, 0], [0, 1.04, 0], 0.11),
      ell([0, 1.2, 0], [0.2, 0.22, 0.13]).on(seam([[-0.14, 1.26, 0.09], [-0.05, 1.22, 0.125], [0.05, 1.22, 0.125], [0.14, 1.26, 0.09]], Z), seam([[0, 1.04, 0.1], [0, 1.19, 0.13]], Z), slots([0.05, 1.12, 0.118], Y, X, 4, 0.022, 0.06, Z)),
      cyl([0, 1.4, 0], [0, 1.46, 0], 0.045),
      ell([0, 1.55, 0.005], [0.095, 0.118, 0.105]),
      ell([0, 1.56, 0.052], [0.082, 0.036, 0.06]).asDark(),
      // Right forearm up, palm out: hands where people can see them.
      cap([-0.295, 1.01, 0.04], [-0.3, 1.19, 0.21], 0.045, 0.04),
      new Box([-0.3, 1.27, 0.2], [0.09, 0.12, 0.034], { x: X, y: norm([0, 0.95, -0.3]), z: norm([0, 0.3, 0.95]) }, 0.016)
        .on(seam([[-0.33, 1.29, 0.22], [-0.33, 1.33, 0.205]], Z), seam([[-0.3, 1.3, 0.222], [-0.3, 1.345, 0.208]], Z), seam([[-0.27, 1.29, 0.22], [-0.27, 1.33, 0.205]], Z)),
      cap([0.295, 1.0, 0.04], [0.3, 0.78, 0.07], 0.045, 0.04),
      box([0.3, 0.71, 0.075], [0.045, 0.12, 0.085], IDENT, 0.02),
    ]
    return {
      code: 'CB-02', name: 'HUMANOID', parts,
      notes: [
        { at: [-0.3, 1.3, 0.21], text: 'HANDS VISIBLE' },
        { at: [0, 1.56, 0.11], text: 'VISOR = INTENT LIGHT' },
        { at: [0.19, 1.2, 0.05], text: 'SOFT SHELL' },
        { at: [0.1, 0.47, 0.08], text: 'REFLEX 1 kHz BALANCE' },
      ],
      dims: [{ a: [0.4, 0, 0], b: [0.4, 1.67, 0], text: '1.67 m' }],
      view: { az: deg(26), el: deg(7) },
    }
  },

  quadruped: () => {
    const parts: Solid[] = [
      box([0, 0.52, 0], [0.8, 0.19, 0.32], IDENT, 0.075).on(seam([[-0.3, 0.52, 0.161], [0.3, 0.52, 0.161]], Z), slots([-0.2, 0.47, 0.161], X, Y, 9, 0.035, 0.035, Z), disc([0.2, 0.47, 0.161], Z, 0.016, { fill: true, ring: 1.6 })),
      bar([-0.12, 0.66, 0], [0.12, 0.66, 0], 0.02, 0.02, 0.008, Z),
      ...[-0.12, 0.12].map(x => cyl([x, 0.636, 0], [x, 0.66, 0], 0.008)),
      ...[-1, 1].map(s => box([0, 0.625, s * 0.1], [0.52, 0.022, 0.026], IDENT, 0.006)),
      box([0.47, 0.53, 0], [0.15, 0.13, 0.22], IDENT, 0.045).on(disc([0.546, 0.54, 0.05], X, 0.022, { fill: true }), disc([0.546, 0.54, -0.05], X, 0.022, { fill: true })),
    ]
    for (const fx of [-1, 1]) for (const s of [-1, 1]) {
      const H: V3 = [fx * 0.3, 0.47, s * 0.19]
      const lifted = fx === 1 && s === 1
      const K: V3 = lifted ? [H[0] - 0.05, 0.31, H[2] + s * 0.02] : [H[0] - 0.1, 0.27, H[2] + s * 0.02]
      const F: V3 = lifted ? [H[0] + 0.09, 0.13, H[2] + s * 0.03] : [H[0] - 0.01, 0.032, H[2] + s * 0.03]
      parts.push(joint(H, X, 0.06, 0.09), cap(H, K, 0.048, 0.042), sph(K, 0.046).on(disc(add(K, [0, 0, s * 0.047]), [0, 0, s], 0.02, { ring: 0.5 })), cap(K, F, 0.032, 0.025), sph(F, 0.032).rubber(0.85))
    }
    return {
      code: 'CB-03', name: 'QUADRUPED', parts,
      notes: [
        { at: [0.1, 0.636, 0.1], text: 'PAYLOAD RAIL 20 kg' },
        { at: [0.546, 0.54, 0.05], text: 'DEPTH CAMERAS' },
        { at: [0.39, 0.13, 0.22], text: 'MID-STRIDE, STAIRS OK' },
        { at: [-0.31, 0.032, 0.22], text: 'SOFT FEET' },
      ],
      rings: [{ c: [0, 0, 0], r: 0.8, text: 'KEEPS 0.5 m CLEAR' }],
      view: { az: deg(48), el: deg(22) },
    }
  },

  quadcopter: () => {
    // Built at its design height, then flown low so its shadow stays close.
    const T = (p: V3): V3 => [p[0], p[1] - 0.24, p[2]]
    const parts: Solid[] = [
      ell(T([0, 0.66, 0]), [0.12, 0.055, 0.17]).on(slots(T([-0.04, 0.705, -0.1]), X, Z, 5, 0.02, 0.06, Y)),
      ell(T([0, 0.7, 0.02]), [0.08, 0.035, 0.11]),
      sph(T([0, 0.6, 0.13]), 0.034).on(disc(T([0, 0.598, 0.162]), Z, 0.016, { fill: true })),
      ...[-1, 1].flatMap(s => [cap(T([s * 0.07, 0.62, -0.06]), T([s * 0.1, 0.5, -0.09]), 0.008), cap(T([s * 0.07, 0.62, 0.06]), T([s * 0.1, 0.5, 0.09]), 0.008), cap(T([s * 0.1, 0.5, -0.15]), T([s * 0.1, 0.5, 0.15]), 0.011)]),
    ]
    ;[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => {
      const R: V3 = T([sx * 0.27, 0.665, sz * 0.27])
      parts.push(
        cap(T([sx * 0.06, 0.665, sz * 0.08]), R, 0.016),
        cyl(add(R, [0, -0.028, 0]), add(R, [0, 0.028, 0]), 0.17, 0.17, true, 0.152).on(
          seam([add(R, [-0.15, 0.03, 0]), add(R, [0.15, 0.03, 0])], Y, 0.8),
          seam([add(R, [0, 0.03, -0.15]), add(R, [0, 0.03, 0.15])], Y, 0.8),
          disc(add(R, [sx * 0.12, -0.03, sz * 0.12]), [0, -1, 0], 0.01, { fill: true }),
        ),
        cyl(add(R, [0, -0.02, 0]), add(R, [0, 0.04, 0]), 0.024),
        box(add(R, [0, 0.043, 0]), [0.29, 0.004, 0.028], euler(deg(25 + i * 40)), 0.002),
      )
    })
    return {
      code: 'CB-04', name: 'QUADCOPTER', parts,
      notes: [
        { at: T([0.27 + 0.17, 0.665, 0.27]), text: 'DUCTED, QUIET 52 dB' },
        { at: T([0, 0.6, 0.164]), text: 'GIMBAL CAMERA' },
        { at: T([0.1, 0.5, 0.15]), text: 'SKIDS, LANDS ANYWHERE FLAT' },
      ],
      dims: [{ a: [0.62, 0, 0.3], b: [0.62, 0.26, 0.3], text: 'HOVERS 0.26 m' }],
      view: { az: deg(34), el: deg(27) },
    }
  },

  'wheeled carrier': () => {
    const parts: Solid[] = [
      box([0, 0.17, 0], [0.92, 0.2, 0.62], IDENT, 0.06).on(seam([[0.42, 0.27, -0.24], [0.42, 0.27, 0.24]]), disc([0.461, 0.2, 0.2], X, 0.018, { fill: true })),
      box([0.47, 0.11, 0], [0.04, 0.07, 0.58], IDENT, 0.015).asDark(),
      ...[-1, 1].flatMap(s => [-0.3, 0.3].map(x => tyre([x, 0.09, s * 0.31], 0.09, 0.05, s))),
      cyl([-0.38, 0.27, 0.22], [-0.38, 0.29, 0.22], 0.03).on(disc([-0.38, 0.291, 0.22], Y, 0.02, { fill: true })),
      cyl([0.36, 0.27, 0], [0.36, 0.33, 0], 0.045).on(hoop([0.36, 0.3, 0], Y, 0.046, 1.6, true)),
      box([-0.06, 0.4, 0], [0.62, 0.25, 0.42], IDENT, 0.018)
        .on(seam([[0.25, 0.46, -0.06], [0.25, 0.46, 0.06]], X, 2.2), ...[-0.25, -0.12, 0.01, 0.14].map(x => seam([[x, 0.3, 0.211], [x, 0.5, 0.211]], Z))),
      box([-0.06, 0.53, 0], [0.64, 0.025, 0.44], IDENT, 0.008),
    ]
    return {
      code: 'CB-05', name: 'WHEELED CARRIER', parts,
      notes: [
        { at: [-0.06, 0.45, 0.211], text: 'TOTE 600 × 400' },
        { at: [0.36, 0.33, 0.04], text: 'LIDAR 360°' },
        { at: [0.49, 0.11, 0.2], text: 'SOFT BUMPER' },
        { at: [0.3, 0.09, 0.36], text: 'FOLLOWS, NEVER CROWDS' },
        { at: [-0.38, 0.29, 0.22], text: 'E-STOP ON TOP' },
      ],
      rings: [{ c: [0, 0, 0], r: 0.95, text: 'YIELD ZONE' }],
      figure: { at: [-1.05, 0, 0.75], yaw: deg(30) },
      view: { az: deg(42), el: deg(20) },
    }
  },

  'gantry crane': () => {
    const parts: Solid[] = [
      ...[-1, 1].flatMap(sx => [-1, 1].flatMap(sz => [box([sx * 1.15, 1.0, sz * 0.7], [0.09, 2.0, 0.09]), box([sx * 1.15, 0.012, sz * 0.7], [0.22, 0.024, 0.22])])),
      ...[-1, 1].map(sz => box([0, 2.05, sz * 0.7], [2.5, 0.1, 0.11])),
      box([0.15, 2.17, 0], [0.16, 0.14, 1.62]),
      box([0.15, 2.07, 0.08], [0.28, 0.12, 0.26], IDENT, 0.02).on(disc([0.291, 2.07, 0.08], X, 0.02, { fill: true, ring: 1.5 })),
      cyl([0.15, 2.02, -0.06], [0.15, 2.02, 0.22], 0.045),
      box([0.15, 1.06, 0.08], [0.2, 0.12, 0.2], IDENT, 0.03).on(seam([[0.11, 2.0, 0.08], [0.11, 1.12, 0.08]]), seam([[0.19, 2.0, 0.08], [0.19, 1.12, 0.08]])),
      ...[-1, 1].map(s => box([0.15 + s * 0.08, 0.95, 0.08], [0.025, 0.14, 0.12], IDENT, 0.008)),
      box([0.15, 0.27, 0.08], [0.6, 0.54, 0.5], IDENT, 0.01).on(...[0.09, 0.18, 0.27, 0.36, 0.45].map(y => seam([[-0.15, y, 0.331], [0.45, y, 0.331]], Z, 0.8)), ...[0.09, 0.18, 0.27, 0.36, 0.45].map(y => seam([[0.451, y, -0.17], [0.451, y, 0.33]], X, 0.8))),
    ]
    return {
      code: 'CB-06', name: 'GANTRY CRANE', parts,
      notes: [
        { at: [0.15, 2.13, 0.21], text: 'TROLLEY' },
        { at: [0.15, 1.06, 0.18], text: 'SLOWS OVER PEOPLE' },
        { at: [0.45, 0.4, 0.33], text: 'LOAD 500 kg' },
        { at: [1.15, 1.2, 0.745], text: 'TWO SAFE STOPS PER POST' },
      ],
      dims: [{ a: [-1.15, 0, 1.05], b: [1.15, 0, 1.05], text: 'SPAN 2.4 m' }],
      figure: { at: [-0.6, 0, 0.35], yaw: deg(10) },
      view: { az: deg(30), el: deg(19), dist: 3.0 },
    }
  },

  hexapod: () => {
    const parts: Solid[] = [
      ell([0, 0.36, 0], [0.27, 0.105, 0.2]).on(seam([[-0.2, 0.38, 0.13], [0, 0.39, 0.15], [0.2, 0.38, 0.13]], Z)),
      ell([0, 0.43, 0], [0.17, 0.075, 0.13]).on(slots([-0.06, 0.505, -0.06], X, Z, 5, 0.03, 0.12, Y)),
      sph([0.29, 0.37, 0], 0.075).on(disc([0.36, 0.38, 0], norm([1, 0.12, 0]), 0.032, { fill: true, ring: 1.45 })),
    ]
    for (const i of [-1, 0, 1]) for (const s of [-1, 1]) {
      const H: V3 = [i * 0.16, 0.34, s * 0.165]
      const lift = i === 0 && s === 1
      const K: V3 = [H[0] + i * 0.07, 0.46, H[2] + s * 0.15]
      const F: V3 = [H[0] + i * 0.14, lift ? 0.1 : 0.028, H[2] + s * 0.3]
      parts.push(sph(H, 0.04), cap(H, K, 0.032, 0.028), sph(K, 0.036), cap(K, F, 0.026, 0.017).on(hoop(lerp3(K, F, 0.25), sub(F, K), 0.026, 1.4)), sph(F, 0.026).rubber(0.85))
    }
    return {
      code: 'CB-07', name: 'HEXAPOD', parts,
      notes: [
        { at: [0.39, 0.38, 0.01], text: 'EYE RING = INTENT' },
        { at: [0.0, 0.46, 0.315], text: '6 × 3 DOF' },
        { at: [0.0, 0.1, 0.465], text: 'TRIPOD GAIT' },
        { at: [0.3, 0.028, 0.465], text: 'SOFT FEET' },
      ],
      paths: [{ pts: [[0.36, 0, 0.5], [0.5, 0, 0.46], [0.62, 0, 0.38]] }],
      view: { az: deg(40), el: deg(28) },
    }
  },

  'snake arm': () => {
    const ctrl: V3[] = [[0, 0.29, 0], [0.02, 0.6, 0], [0.22, 0.86, 0.06], [0.52, 0.86, 0.16], [0.72, 0.62, 0.24], [0.8, 0.36, 0.3]]
    const C = (t: number): V3 => {
      const n = ctrl.length - 1, f = Math.min(n - 1e-6, t * n), i = Math.floor(f), u = f - i
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2_ = ctrl[i + 1], p3 = ctrl[Math.min(n, i + 2)]
      const q = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u)
      return [q(p0[0], p1[0], p2_[0], p3[0]), q(p0[1], p1[1], p2_[1], p3[1]), q(p0[2], p1[2], p2_[2], p3[2])]
    }
    const parts: Solid[] = [box([0, 0.12, 0], [0.38, 0.24, 0.38], IDENT, 0.04).on(slots([0.191, 0.08, -0.12], Z, Y, 6, 0.045, 0.08, X)), cyl([0, 0.24, 0], [0, 0.29, 0], 0.13)]
    const N = 12
    for (let k = 0; k < N; k++) {
      const a = C(k / N), b = C((k + 1) / N)
      const r = 0.06 - (k / N) * 0.024
      const d = norm(sub(b, a))
      parts.push(cyl(madd(a, d, 0.008), madd(b, d, -0.008), r, r * 0.97))
      parts.push(cyl(madd(b, d, -0.008), madd(b, d, 0.008), r * 1.12, r * 1.1))
    }
    const end = C(1), dir = norm(sub(C(1), C(0.97)))
    parts.push(cyl(end, madd(end, dir, 0.07), 0.036, 0.032).on(disc(madd(end, dir, 0.071), dir, 0.017, { fill: true, ring: 1.5 })))
    parts.push(cyl([0.55, 0.1, 0.62], [1.1, 0.1, 0.62], 0.1), cyl([0.8, 0.1, 0.62], [0.84, 0.1, 0.62], 0.135))
    return {
      code: 'CB-08', name: 'SNAKE ARM', parts,
      notes: [
        { at: C(0.45), text: '12 SEGMENTS, CABLE-DRIVEN' },
        { at: madd(end, dir, 0.07), text: 'INSPECTION HEAD' },
        { at: [0.84, 0.2, 0.62], text: 'GOES WHERE HANDS SHOULDN’T' },
      ],
      turns: [{ c: C(0.3), axis: norm([0, 0.3, 1]), r: 0.16, a0: deg(-40), a1: deg(60) }],
      view: { az: deg(34), el: deg(20) },
    }
  },

  'dual-arm torso': () => {
    const parts: Solid[] = [
      cyl([0, 0, 0], [0, 0.04, 0], 0.26),
      cyl([0, 0.04, 0], [0, 0.72, 0], 0.085, 0.075),
      cyl([0, 0.72, 0], [0, 0.8, 0], 0.13),
      box([0, 1.0, 0], [0.42, 0.4, 0.26], IDENT, 0.085).on(slots([-0.1, 0.93, 0.131], X, Y, 5, 0.05, 0.05, Z), seam([[-0.13, 1.1, 0.131], [0.13, 1.1, 0.131]], Z)),
      cyl([0, 1.2, 0], [0, 1.25, 0], 0.04),
      ell([0, 1.33, 0.01], [0.115, 0.095, 0.105]),
      ell([0, 1.34, 0.06], [0.095, 0.03, 0.055]).asDark(),
      box([0, 0.82, 0.43], [0.2, 0.13, 0.13], IDENT, 0.01),
    ]
    for (const s of [-1, 1]) {
      const sh: V3 = [s * 0.25, 1.12, 0], el: V3 = [s * 0.34, 0.87, 0.13], wr: V3 = [s * 0.17, 0.82, 0.37]
      parts.push(joint(sh, X, 0.075, 0.08), cap([s * 0.27, 1.1, 0], el, 0.05, 0.047), sph(el, 0.055), cap(el, wr, 0.042, 0.038).on(hoop(lerp3(el, wr, 0.8), sub(wr, el), 0.04, 2.0, true)))
      parts.push(box([s * 0.13, 0.82, 0.41], [0.05, 0.07, 0.08], IDENT, 0.012), box([s * 0.105, 0.82, 0.44], [0.012, 0.06, 0.07], IDENT, 0.004))
    }
    return {
      code: 'CB-09', name: 'DUAL-ARM TORSO', parts,
      notes: [
        { at: [0, 0.89, 0.495], text: 'TWO HANDS, ONE PLAN' },
        { at: [0, 1.34, 0.115], text: 'VISOR = INTENT' },
        { at: [0.34, 0.87, 0.185], text: 'REFLEX 1 kHz' },
        { at: [0, 0.4, 0.08], text: 'CORE PLANS, REFLEX ACTS' },
      ],
      turns: [{ c: [0, 0.76, 0], axis: Y, r: 0.22, a0: deg(-20), a1: deg(80) }],
      view: { az: deg(30), el: deg(13) },
    }
  },

  'forklift unit': () => {
    const parts: Solid[] = [
      box([-0.25, 0.43, 0], [1.05, 0.62, 0.82], IDENT, 0.09).on(seam([[0.27, 0.68, -0.32], [0.27, 0.68, 0.32]], X, 2.4), disc([0.276, 0.58, 0.3], X, 0.022, { fill: true }), disc([0.276, 0.58, -0.3], X, 0.022, { fill: true }), seam([[-0.6, 0.45, 0.411], [0.1, 0.45, 0.411]], Z)),
      cyl([-0.1, 0.74, 0], [-0.1, 0.8, 0], 0.05).on(hoop([-0.1, 0.77, 0], Y, 0.051, 1.6, true)),
      ...[-1, 1].flatMap(s => [tyre([0.12, 0.16, s * 0.41], 0.16, 0.06, s), tyre([-0.6, 0.13, s * 0.41], 0.13, 0.05, s)]),
      ...[-1, 1].map(s => box([0.34, 1.0, s * 0.27], [0.07, 1.95, 0.08]).on(seam([[0.376, 0.3, s * 0.25], [0.376, 1.85, s * 0.25]], X, 0.9), seam([[0.376, 0.3, s * 0.29], [0.376, 1.85, s * 0.29]], X, 0.9))),
      box([0.34, 1.9, 0], [0.07, 0.07, 0.62]),
      box([0.34, 0.25, 0], [0.07, 0.07, 0.62]),
      box([0.4, 0.55, 0], [0.05, 0.36, 0.7]),
      box([0.44, 0.65, 0], [0.05, 0.05, 0.08], IDENT, 0.01).on(disc([0.466, 0.65, 0], X, 0.014, { fill: true })),
      ...[-1, 1].flatMap(s => [box([0.82, 0.37, s * 0.2], [0.85, 0.04, 0.11]), box([0.43, 0.5, s * 0.2], [0.04, 0.3, 0.11])]),
      box([0.95, 0.44, 0], [0.8, 0.12, 0.8]).on(...[-0.3, -0.1, 0.1, 0.3].map(z => seam([[0.55, 0.47, z], [1.35, 0.47, z]], Y, 0.8))),
      box([0.95, 0.76, 0], [0.72, 0.52, 0.72], IDENT, 0.02).on(seam([[0.6, 1.02, 0], [1.3, 1.02, 0]], Y), seam([[0.95, 1.02, -0.36], [0.95, 1.02, 0.36]], Y)),
    ]
    return {
      code: 'CB-10', name: 'FORKLIFT UNIT', parts,
      notes: [
        { at: [0.95, 1.02, 0.2], text: 'LIFT 1.2 t' },
        { at: [0.466, 0.65, 0], text: 'FORK CAMERA' },
        { at: [-0.1, 0.8, 0.05], text: 'LIDAR 360°' },
        { at: [0.276, 0.58, 0.3], text: 'STOPS FOR PEOPLE' },
      ],
      dims: [{ a: [0.34, 0, -0.62], b: [0.34, 1.95, -0.62], text: 'MAST 2 m' }],
      figure: { at: [-1.2, 0, 0.9], yaw: deg(25) },
      view: { az: deg(40), el: deg(17) },
    }
  },

  'dexterous hand': () => {
    const parts: Solid[] = [
      cyl([0, 0, 0], [0, 0.02, 0], 0.062),
      cyl([0, 0.02, 0], [0, 0.12, 0], 0.045, 0.043).on(hoop([0, 0.1, 0], Y, 0.044, 1.8, true)),
      box([0, 0.19, 0], [0.1, 0.13, 0.036], IDENT, 0.016).on(seam([[-0.035, 0.14, 0.019], [0.035, 0.14, 0.019]], Z)),
    ]
    const xs = [-0.036, -0.012, 0.012, 0.036], sc = [0.88, 1.0, 1.04, 0.95]
    xs.forEach((x, i) => parts.push(...finger([x, 0.258, 0], [0.045 * sc[i], 0.03 * sc[i], 0.024 * sc[i]], [deg(16), deg(30), deg(28)], 0.0095)))
    parts[2].on(seam([[-0.045, 0.24, 0.019], [0.045, 0.24, 0.019]], Z, 0.9), bolts([0, 0.2, 0.019], Z, 0.03, 4, 0.003))
    // Thumb, opposed, curling in toward the fingers.
    const t0: V3 = [0.056, 0.16, 0.014]
    const t1 = madd(t0, norm([0.45, 0.75, 0.48]), 0.042), t2 = madd(t1, norm([0.12, 0.8, 0.6]), 0.032), t3 = madd(t2, norm([-0.2, 0.7, 0.68]), 0.026)
    parts.push(sph(t0, 0.014), cap(t0, t1, 0.012, 0.011), sph(t1, 0.0115), cap(t1, t2, 0.011, 0.0105), sph(t2, 0.011), cap(t2, t3, 0.0105, 0.0095))
    // The steel ball from the table, held gently.
    parts.push(sph([0.004, 0.33, 0.052], 0.03))
    return {
      code: 'CB-11', name: 'DEXTEROUS HAND', parts,
      notes: [
        { at: [0.036, 0.31, 0.03], text: '20 DOF' },
        { at: [0.012, 0.34, 0.07], text: 'TACTILE PADS' },
        { at: [0.004, 0.36, 0.08], text: 'HOLDS WHAT YOU HAND IT' },
        { at: [0, 0.1, 0.045], text: 'GRIP 2 N TO 40 N' },
      ],
      turns: [{ c: [0, 0.07, 0], axis: Y, r: 0.075, a0: deg(-150), a1: deg(-40) }],
      view: { az: deg(24), el: deg(12) },
    }
  },

  rover: () => {
    const parts: Solid[] = [
      box([0, 0.48, 0], [0.72, 0.18, 0.5], IDENT, 0.03),
      box([0, 0.585, 0], [0.84, 0.022, 0.6], IDENT, 0.004).on(...[-0.28, -0.14, 0, 0.14, 0.28].map(x => seam([[x, 0.597, -0.29], [x, 0.597, 0.29]], Y, 0.75)), ...[-0.15, 0, 0.15].map(z => seam([[-0.41, 0.597, z], [0.41, 0.597, z]], Y, 0.75))),
      cyl([0.24, 0.6, 0.15], [0.24, 1.02, 0.15], 0.024),
      box([0.24, 1.07, 0.15], [0.15, 0.08, 0.1], IDENT, 0.015).on(disc([0.316, 1.075, 0.12], X, 0.016, { fill: true }), disc([0.316, 1.075, 0.18], X, 0.016, { fill: true })),
      cyl([-0.26, 0.6, -0.17], [-0.26, 0.82, -0.17], 0.01),
      cyl([-0.26, 0.82, -0.17], [-0.26, 0.835, -0.17], 0.075, 0.08),
    ]
    for (const s of [-1, 1]) {
      const z = s * 0.33
      const P: V3 = [0.02, 0.44, z], Rr: V3 = [-0.38, 0.15, z], B: V3 = [0.2, 0.3, z], M: V3 = [0.04, 0.15, z], Fh: V3 = [0.4, 0.15, z]
      parts.push(cap(P, Rr, 0.022), cap(P, B, 0.022), cap(B, M, 0.019), cap(B, Fh, 0.019), sph(P, 0.032), sph(B, 0.026))
      for (const h of [Rr, M, Fh]) parts.push(tyre(add(h, [0, 0, s * 0.005]), 0.14, 0.09, s))
    }
    return {
      code: 'CB-12', name: 'ROVER', parts,
      notes: [
        { at: [0.316, 1.075, 0.15], text: 'MAST CAMERAS' },
        { at: [0.1, 0.597, 0.2], text: 'SOLAR DECK' },
        { at: [0.2, 0.3, 0.35], text: 'ROCKER-BOGIE' },
        { at: [0.4, 0.15, 0.43], text: 'SLOW AND STEADY 0.3 m/s' },
      ],
      paths: [{ pts: [[0.62, 0, 0.5], [0.82, 0, 0.42], [0.98, 0, 0.28]] }],
      view: { az: deg(38), el: deg(22) },
    }
  },
}

export const bodyNames = Object.keys(MODELS)
void bar
void lerp3
