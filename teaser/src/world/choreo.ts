import { ev, at, FLASHES } from '../lib/timeline'
import { clamp, deg, inCubic, inOutCubic, inOutSine, inQuart, lerp, outCubic, outQuart, prog, smoother, span, wobble } from '../lib/ease'
import { SPHERES, SHEET_MM, SPHERE_R } from '../art/field'
import { ELLIPSE, ellipseTip, REPORT_MM, SEAL } from '../art/report'
import { rng } from '../lib/rand'

// Where everything is at time t. World units are metres; the table is y = 0,
// x is screen-right and z is screen-down (the camera looks straight down).

export interface Pose { x: number; z: number; y: number; rot: number; scale: number }
const pose = (x: number, z: number, y = 0, rot = 0, scale = 1): Pose => ({ x, z, y, rot, scale })

/* ---------- Layout ---------- */

export const SHEET_POS = pose(0, 0, 0.0002, deg(0.6))
const sheetToWorld = (mx: number, my: number) => ({ x: (mx - SHEET_MM.w / 2) / 1000, z: (my - SHEET_MM.h / 2) / 1000 })

/** The report's resting place after it is dragged aside. */
const REPORT_ASIDE = { x: -0.46, z: 0.035, rot: deg(6) }

/** Page-mm to world, for a page posed at p. */
export function pageToWorld(p: Pose, mx: number, my: number) {
  const lx = (mx - REPORT_MM.w / 2) / 1000, lz = (my - REPORT_MM.h / 2) / 1000
  const c = Math.cos(p.rot), s = Math.sin(p.rot)
  // Positive rot turns the page counter-clockwise on screen.
  return { x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c }
}

/** Where everything converges in S6: the middle of the card stack. */
export const POINT = (() => {
  const p = pose(REPORT_ASIDE.x, REPORT_ASIDE.z, 0, REPORT_ASIDE.rot)
  return pageToWorld(p, SEAL.x - 4, SEAL.y - 14)
})()

export const PROPS = {
  logbook: pose(0.335, -0.06, 0, deg(-10)),
  wafer: pose(-0.275, -0.165, 0, deg(18)),
  ruler: pose(-0.19, 0.192, 0, deg(-4)),
}

/* ---------- S6: everything is pulled into one point ---------- */

export function converge(t: number, p: Pose, k = 0): Pose {
  const c = span(t, ev('converge'))
  if (c <= 0) return p
  // A slow drift as dusk falls, then the rush; a touch staggered so things
  // don't arrive as one block.
  const u = clamp((c - k * 0.04) / (1 - k * 0.04))
  const e = 0.18 * inOutSine(u) + 0.82 * inQuart(u)
  const swirl = e * e * 0.9
  const dx = p.x - POINT.x, dz = p.z - POINT.z
  const cs = Math.cos(swirl), sn = Math.sin(swirl)
  const rx = dx * cs - dz * sn, rz = dx * sn + dz * cs
  return {
    x: POINT.x + rx * (1 - e), z: POINT.z + rz * (1 - e),
    y: p.y + e * 0.004 * (k + 1),
    rot: p.rot + swirl * 1.4,
    scale: p.scale * (1 - e * 0.97),
  }
}

/* ---------- C0 / S1: card, report, grippers ---------- */

export function reportPose(t: number): Pose {
  const out = span(t, ev('reportOut'))
  // On the sheet: drifts up into frame and straightens (−3° → −1°).
  const [r0, r1, a0, a1] = ev('reportRotate')
  const settleIn = smoother(prog(t, 1.15, 2.4))
  const base = pose(0, 0.014 * (1 - settleIn) - 0.002, 0.0006, deg(lerp(a0, a1, smoother(prog(t, r0, r1)))))
  if (out <= 0) return base
  const e = inOutCubic(out)
  const p = pose(lerp(base.x, REPORT_ASIDE.x, e), lerp(base.z, REPORT_ASIDE.z, e), 0.0006 + Math.sin(e * Math.PI) * 0.0008, lerp(base.rot, REPORT_ASIDE.rot, e))
  return converge(t, p, 0)
}

export function cardPose(t: number) {
  // Lying on the report, then lifted by its left edge and carried up out of frame.
  const lift = span(t, ev('cardLift'))
  const tilt = smoother(prog(lift, 0, 0.45)) * deg(24)
  const rise = inCubic(prog(lift, 0.25, 1))
  return { x: 0.004 - rise * 0.28, z: -0.012 - rise * 0.05, y: 0.0042 + rise * 0.24, rot: deg(-1.5), tilt, visible: t < 1.75 }
}

export interface GripPose { x: number; y: number; z: number; yaw: number; pitch: number; open: number; visible: boolean }
const hidden: GripPose = { x: 0, y: 0.3, z: 0, yaw: 0, pitch: 0, open: 0.03, visible: false }

/** Gripper A: lifts the card (C0), drags the report (S1→S2), pushes the glass (S4). */
export function gripperA(t: number): GripPose {
  if (t < 1.75) {
    // Reach in from the left to the card's left edge, close, lift with it.
    const reach = outQuart(span(t, ev('gripperIn')))
    const c = cardPose(t)
    const edge = { x: c.x - 0.15 * Math.cos(c.tilt), y: c.y + 0.15 * Math.sin(c.tilt) + 0.002 }
    const close = smoother(prog(t, 0.86, 0.96))
    return {
      x: lerp(-0.5, edge.x + 0.004, reach), y: lerp(0.09, edge.y + 0.004, reach), z: c.z,
      yaw: deg(0), pitch: deg(lerp(30, 22, reach) + c.tilt * 40), open: lerp(0.034, 0.008, close), visible: t > 0.62,
    }
  }
  if (t > 2.45 && t < 3.6) {
    // Hook the report's left edge and drag it off to the left.
    const rp = reportPose(t)
    const edge = pageToWorld(rp, 10, REPORT_MM.h * 0.45)
    const inn = outQuart(prog(t, 2.45, 2.7)), away = inCubic(prog(t, 3.3, 3.6))
    return { x: lerp(-0.62, edge.x, inn) - away * 0.25, y: lerp(0.08, 0.012, inn) + away * 0.06, z: edge.z, yaw: deg(-4), pitch: deg(26), open: 0.012, visible: true }
  }
  if (t > 8.75 && t < 10.75) {
    const g = glassPose(t)
    const inn = outQuart(prog(t, 8.75, 9.0))
    // Both fingertips on the disc's rim, pushing it through the frame.
    return { x: g.x - GLASS_R * 0.98 - 0.0012 - (1 - inn) * 0.2, y: 0.02 + (1 - inn) * 0.05, z: g.z, yaw: 0, pitch: deg(18), open: 0.03, visible: true }
  }
  return hidden
}

/** Gripper B holds the pen that circles "desync". */
export function gripperB(t: number): GripPose & { pen: { x: number; z: number; y: number } } {
  const [i0, i1] = ev('penIn'), [d0, d1] = ev('ellipse'), [o0, o1] = ev('penOut')
  const rp = reportPose(t)
  const tipLocal = ellipseTip(clamp((t - d0) / (d1 - d0)))
  const tip = pageToWorld(rp, tipLocal.x, tipLocal.y)
  const inn = outQuart(prog(t, i0, i1)), out = inCubic(prog(t, o0, o1))
  const lifted = 0.018 * (1 - smoother(prog(t, i0 + 0.12, d0))) + 0.03 * out
  const pen = { x: tip.x + (1 - inn) * 0.3 + out * 0.32, z: tip.z - (1 - inn) * 0.08, y: lifted }
  return { x: pen.x + 0.05, y: pen.y + 0.075, z: pen.z - 0.012, yaw: deg(180), pitch: deg(52), open: 0.011, visible: t > i0 - 0.05 && t < o1 + 0.05, pen }
}
export const ellipseLen = ELLIPSE.length

/* ---------- S2 / S3: spheres ---------- */

export function spherePose(t: number, i: number) {
  const s = SPHERES[i]
  const home = sheetToWorld(s.x, s.y)
  const dirx = home.x, dirz = home.z
  const dl = Math.hypot(dirx, dirz) || 1
  const ux = dirx / dl, uz = dirz / dl
  const [r0] = ev('sphereRoll')
  const arrive = (ev('sphereSettle') as number[])[i]
  // Roll in along a slight curve, decelerating, then a magnetic snap.
  const k = clamp((t - r0 - i * 0.06) / (arrive - r0 - i * 0.06))
  const e = outQuart(k)
  const snap = t > arrive ? wobble(t, arrive, 11, 12) * 0.0016 : 0
  const startD = 0.36 + i * 0.05
  let x = home.x + ux * startD * (1 - e) + uz * 0.05 * Math.sin(e * Math.PI) * (1 - e) + ux * snap
  let z = home.z + uz * startD * (1 - e) - ux * 0.05 * Math.sin(e * Math.PI) * (1 - e) + uz * snap
  // Then they roll apart, faster and faster, stretching the field.
  const apart = inCubic(span(t, ev('spheresApart')))
  x += ux * apart * 0.45
  z += uz * apart * 0.45
  const dist = startD * (1 - e) + apart * 0.45
  const r = SPHERE_R / 1000
  const p = converge(t, pose(x, z, r + 0.0002, 0), 2 + i)
  return { ...p, roll: dist / r, ux, uz, visible: t >= r0 - 0.01 && (apart < 1 || p.scale < 1), r }
}

/* ---------- S4: glass block ---------- */

/** The optical disc's radius (S4). */
export const GLASS_R = 0.078

export function glassPose(t: number) {
  const g = span(t, ev('glassSlide'))
  const e = inOutCubic(g)
  return { x: lerp(-0.36, 0.38, e), z: 0.004, rot: deg(2), visible: t >= 8.95 && t < 10.75 }
}

/* ---------- S4b: stamp and glove ---------- */

export function stampPose(t: number) {
  const t0 = at('stampImpact')
  const c = pageToWorld(reportPose(t), SEAL.x, SEAL.y)
  // Pulled straight up by the other hand, above the frame.
  const [l0, l1] = ev('stampLift')
  const lift = inCubic(prog(t, l0, l1))
  return { x: c.x + lift * 0.02, z: c.z - lift * 0.04, y: lift * 0.22, visible: t >= t0 - 0.001 && t < l1 }
}

/** A gloved hand holds the page flat at the lower left; only the fingertips are in frame. */
export function glovePose(t: number) {
  const rp = reportPose(t)
  const tip = pageToWorld(rp, SEAL.x - 51, SEAL.y + 15)
  const a = rp.rot + deg(36)
  const out = inCubic(span(t, ev('gloveOut')))
  const back = 0.085 + out * 0.11
  return {
    x: tip.x - Math.cos(a) * back, z: tip.z + Math.sin(a) * back, y: out * 0.02, rot: a,
    visible: t >= at('stampImpact') - 0.001 && t < ev('gloveOut')[1] + 0.02,
  }
}

/* ---------- S5: cards ---------- */

// Small jitter: a neat stack, edges just showing, the cards below never readable.
const CARD_JITTER = (() => { const r = rng(12); return FLASHES.map(() => ({ dx: (r() - 0.5) * 0.005, dz: (r() - 0.5) * 0.004, rot: (r() - 0.5) * deg(4.4), from: r() * Math.PI * 2 })) })()

export function cardStackPose(t: number, i: number): (Pose & { visible: boolean }) {
  const f = FLASHES[i]
  const j = CARD_JITTER[i]
  const fall = Math.min(0.12, f.len * 0.42)
  const k = prog(t, f.start - fall, f.start)
  // Drops from a few centimetres, lands on the flash, settles flat.
  const e = k * k
  const land = t > f.start ? wobble(t, f.start, 16, 22) * 0.0012 : 0
  const fromX = Math.cos(j.from) * 0.03, fromZ = Math.sin(j.from) * 0.02
  const p = pose(
    POINT.x + j.dx + fromX * (1 - e), POINT.z + j.dz + fromZ * (1 - e),
    0.0012 + i * 0.0003 + (1 - e) * 0.06 + Math.abs(land),
    j.rot + (1 - e) * deg(12) + REPORT_ASIDE.rot, 1)
  return { ...converge(t, p, 1), visible: t >= f.start - fall }
}

/* ---------- Light: daylight into dusk ---------- */

export function light(t: number) {
  const d = smoother(span(t, ev('dusk')))
  const ign = span(t, ev('ignite'))
  return { dusk: d, ignite: ign * ign, flare: t >= ev('flare')[0] && t < ev('flare')[1] ? 1 : 0 }
}

/* ---------- Camera ---------- */

export interface Cam { x: number; z: number; h: number; roll: number; shake: number }

export function camera(t: number): Cam {
  const breathe = (s: number) => ({ dx: Math.sin(t * 0.83 + s) * 0.00025, dz: Math.sin(t * 0.61 + s * 2) * 0.0002 })
  const b = breathe(0)
  let c: Cam
  if (t < 3.0) {
    // C0 drifts in; S1 pushes in 1.00 → 1.08 on the report.
    const h = t < 1.2 ? lerp(0.4, 0.36, smoother(t / 1.2)) : lerp(0.36, 0.36 / 1.08, inOutCubic(prog(t, 1.2, 3.0)))
    c = { x: 0, z: 0.002, h, roll: deg(-0.4), shake: 0 }
    // Into S2: keep pushing in toward the sheet.
    if (t > 2.7) c.h = lerp(c.h, 0.27, smoother(prog(t, 2.7, 3.0)) * 0.25)
  } else if (t < 9.0) {
    const into = smoother(prog(t, 3.0, 4.2))
    const pull = smoother(prog(t, 5.7, 6.6))
    const h = lerp(lerp(0.3, 0.255, into), 0.295, pull)
    c = { x: 0, z: 0.006, h, roll: deg(lerp(-0.4, 0.3, smoother(prog(t, 3, 9)))), shake: 0 }
  } else if (t < 10.8) {
    c = { x: lerp(-0.006, 0.006, smoother(prog(t, 9, 10.8))), z: 0.006, h: 0.296, roll: deg(0.3), shake: 0 }
  } else if (t < 16.0) {
    const [s0, s1, k0, k1] = ev('stampScale')
    const rp = reportPose(t)
    const focus = pageToWorld(rp, SEAL.x - 2, SEAL.y - 16)
    const sc = lerp(k0, k1, outCubic(prog(t, s0, s1)))
    const pull = smoother(prog(t, 11.72, 12.18))
    const h = lerp(0.105 / sc, lerp(0.2, 0.185, smoother(prog(t, 12.2, 16))), pull)
    c = { x: lerp(focus.x, POINT.x, pull), z: lerp(focus.z, POINT.z, pull), h, roll: deg(-0.6), shake: 0 }
    const [sh0, sh1] = ev('stampShake')
    if (t >= sh0 && t < sh1 + 1 / 60) c.shake = 1
  } else {
    const back = outCubic(prog(t, 16.0, 17.1))
    const inn = inCubic(prog(t, 17.2, 18.6))
    c = { x: POINT.x, z: POINT.z, h: lerp(lerp(0.185, 0.52, back), 0.16, inn), roll: deg(-0.6 + inn * 2), shake: 0 }
  }
  return { ...c, x: c.x + b.dx, z: c.z + b.dz }
}

