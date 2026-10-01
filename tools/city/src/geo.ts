// Geography of the view: looking south-southeast from a high floor beside the
// Red Line near Belmont, Chicago, at 8:41 PM on Saturday, July 8, 2034.
// Units are meters. +x is west (screen right), -x is east (the lake), -z is south.

export const LOOP = 16 // seconds; every animated element is periodic in LOOP
export const FPS = 30

export const CAMERA = {
  pos: [-60, 150, 0] as const,
  yawDeg: 14, // turned from due south toward the lake
  pitchDeg: -4.2,
  vfovDeg: 34,
}

// Sun 12 minutes after sunset, west-northwest. Azimuth from north, clockwise.
const SUN_AZ = 302
const SUN_EL = -2.6
const rad = Math.PI / 180
export const SUN_DIR: [number, number, number] = [
  -Math.sin(SUN_AZ * rad) * Math.cos(SUN_EL * rad),
  Math.sin(SUN_EL * rad),
  Math.cos(SUN_AZ * rad) * Math.cos(SUN_EL * rad),
]

// ---------- deterministic randomness ----------
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- coastline and roads ----------
type P = [number, number] // [z, x]
function interp(pts: P[], z: number): number {
  if (z >= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    const [z0, x0] = pts[i - 1]
    const [z1, x1] = pts[i]
    if (z >= z1) return x0 + ((z - z0) / (z1 - z0)) * (x1 - x0)
  }
  return pts[pts.length - 1][1]
}

const SHORE: P[] = [
  [3000, -1500], [0, -1600], [-1600, -1660], [-3200, -1860], [-4000, -2300],
  [-4420, -2620], [-5000, -2880], [-5180, -3120], [-5600, -3090], [-6500, -3160],
  [-8000, -3220], [-12000, -3300], [-30000, -3500],
]
export const shoreX = (z: number) => interp(SHORE, z)

const LSD: P[] = [
  [800, -960], [0, -1000], [-1600, -1220], [-3200, -1600], [-4000, -2080],
  [-4420, -2440], [-5000, -2740], [-5180, -2960], [-6000, -2980], [-8000, -3060], [-12000, -3140],
]
export const lsdX = (z: number) => interp(LSD, z)

// Lincoln Park: between the drive and the park's west edge.
export function inPark(x: number, z: number) {
  if (z > -1650 || z < -4250) return false
  const l = lsdX(z)
  return x > l - 40 && x < l + 760
}

// Chicago River: main branch east-west, north branch north-south.
export function inRiver(x: number, z: number) {
  if (z < -5790 && z > -5860 && x < -1180) return true
  if (x > -1235 && x < -1175 && z < -3400 && z > -5860) return true
  return false
}

// Clark Street runs diagonally southeast toward downtown.
export const CLARK: [number, number][] = [[400, -260], [-3300, -1820]] // [z, x] endpoints
export function clarkDist(x: number, z: number) {
  const [[z0, x0], [z1, x1]] = CLARK
  const dx = x1 - x0, dz = z1 - z0
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(x - (x0 + t * dx), z - (z0 + t * dz))
}

// The Kennedy Expressway: a diagonal from the far right toward the Loop.
export const KENNEDY: [number, number][] = [[-200, 3400], [-1800, 2300], [-3400, 1200], [-5000, 200], [-6200, -760], [-9000, -900]]

// The Red Line runs south along an alley at x = 45.
export const TRACK_X = 45
export const TRACK_Y = 7.5

// ---------- view culling ----------
const yaw = CAMERA.yawDeg * rad
const fwd = [-Math.sin(yaw), -Math.cos(yaw)] // in (x, z)
const right = [Math.cos(yaw), -Math.sin(yaw)]
export function viewAngleDeg(x: number, z: number) {
  const dx = x - CAMERA.pos[0], dz = z - CAMERA.pos[2]
  const f = dx * fwd[0] + dz * fwd[1]
  const r = dx * right[0] + dz * right[1]
  return { f, deg: (Math.atan2(r, f) * 180) / Math.PI }
}
export function inView(x: number, z: number, margin = 4) {
  const { f, deg } = viewAngleDeg(x, z)
  return f > 40 && Math.abs(deg) < 31 + margin
}

// ---------- buildings ----------
export const STYLE = { RES: 0, OFFICE: 1, RESTOWER: 2, AON: 3, HANCOCK: 4, DARKGLASS: 5, PLAIN: 6 } as const

export interface Building {
  x: number; z: number; w: number; d: number; h: number
  style: number; seed: number; lit: number; taper: number
  tint: [number, number, number]; shop: number; rotY: number
}

const BRICKS: [number, number, number][] = [
  [0.30, 0.17, 0.12], [0.24, 0.15, 0.11], [0.36, 0.26, 0.18], [0.20, 0.18, 0.17], [0.42, 0.36, 0.30],
]
const CONCRETE: [number, number, number][] = [[0.34, 0.33, 0.31], [0.26, 0.26, 0.27], [0.44, 0.42, 0.38]]
const GLASS: [number, number, number][] = [[0.10, 0.14, 0.17], [0.08, 0.10, 0.12], [0.16, 0.20, 0.22], [0.12, 0.12, 0.13]]

export function generateBuildings(): Building[] {
  const r = rng(20340708)
  const out: Building[] = []
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  let seedCounter = 1
  const push = (b: Omit<Building, 'seed'>) => {
    if (!inView(b.x, b.z, 6)) return
    out.push({ ...b, seed: (seedCounter++ * 0.6180339) % 1 * 1000 })
  }

  const blocked = (x: number, z: number, pad = 0) =>
    x < lsdX(z) + 60 + pad || inPark(x, z) || inRiver(x, z) || clarkDist(x, z) < 14 + pad ||
    (Math.abs(x - TRACK_X) < 7 && z > -2600)

  // 1) Low-rise neighborhoods on the grid: Lakeview, Lincoln Park, west side.
  const nearLimitZ = -4300
  for (let k = -22; k <= 40; k++) {
    for (let j = 0; j < 60; j++) {
      const z0 = -200 * j - 10, z1 = -200 * (j + 1) + 10
      if (z1 < -16000) break
      const far = -z0 > 4500 || k * 100 > 1800
      if (z0 < nearLimitZ && k * 100 < -600) continue // downtown handled separately
      if (z0 < -5400 && k * 100 < 1500) continue // west loop handled separately
      for (const half of [0, 1]) {
        const xa = 100 * k + (half ? 53 : 10), xb = 100 * k + (half ? 90 : 47)
        const cx = (xa + xb) / 2
        if (!inView(cx, (z0 + z1) / 2, 8)) continue
        if (far) {
          // Coarse lots far away: one or two masses per half-block.
          const n = 1 + Math.floor(r() * 3)
          for (let i = 0; i < n; i++) {
            const lz0 = z0 - ((z0 - z1) * i) / n, lz1 = z0 - ((z0 - z1) * (i + 1)) / n
            const z = (lz0 + lz1) / 2
            if (blocked(cx, z)) continue
            const tall = r() < 0.06
            push({ x: cx, z, w: xb - xa - 2, d: Math.abs(lz1 - lz0) - 6, h: tall ? 25 + r() * 50 : 9 + r() * 9,
              style: tall ? STYLE.RESTOWER : STYLE.RES, lit: 0.16 + r() * 0.2, taper: 1, tint: tall ? pick(CONCRETE) : pick(BRICKS), shop: 0, rotY: 0 })
          }
          continue
        }
        let z = z0
        while (z > z1 + 6) {
          const len = Math.min(z - z1, 7 + r() * 18)
          const zc = z - len / 2
          const depth = 22 + r() * 14
          const bx = half ? xb - depth / 2 : xa + depth / 2
          const nearTrack = Math.abs(bx - TRACK_X) < depth / 2 + 16 && zc > -2700
          if (!blocked(bx, zc) && !nearTrack) {
            const roll = r()
            const major = k === -4 || k === 4 || k === 12 || Math.abs(z0 + 800) < 30 || Math.abs(z0 + 1600) < 30
            let h = 9 + r() * 6, style: number = STYLE.RES, tint = pick(BRICKS)
            if (roll < 0.16) { h = 18 + r() * 14; tint = r() < 0.5 ? pick(BRICKS) : pick(CONCRETE) }
            if (roll < 0.035) { h = 36 + r() * 40; style = STYLE.RESTOWER; tint = pick(CONCRETE) }
            push({ x: bx, z: zc, w: depth, d: len - 1.2, h, style, lit: 0.16 + r() * 0.24, taper: 1, tint, shop: major && r() < 0.8 ? 1 : 0, rotY: 0 })
          }
          z -= len + (r() < 0.25 ? 3 : 0.6)
        }
      }
    }
  }

  // 2) The tower between the camera and the track (hides the train at the loop seam).
  out.push({ x: 6, z: -640, w: 72, d: 80, h: 114, style: STYLE.OFFICE, seed: 4242, lit: 0.2, taper: 1, tint: [0.09, 0.11, 0.13], shop: 0, rotY: 0 })

  // 3) Lakefront wall of towers along Lake Shore Drive and Lincoln Park West.
  for (let z = 300; z > -4300; z -= 40 + r() * 45) {
    const inLp = z < -1650
    const base = inLp ? lsdX(z) + 800 : lsdX(z) + 110
    for (let row = 0; row < (inLp ? 1 : 2); row++) {
      const x = base + row * 90 + r() * 40
      if (inRiver(x, z) || clarkDist(x, z) < 20) continue
      const h = (inLp ? 45 : 35) + Math.pow(r(), 1.6) * (inLp ? 140 : 80)
      const w = 26 + r() * 20, d = 26 + r() * 24
      push({ x, z, w, d, h, style: r() < 0.7 ? STYLE.RESTOWER : STYLE.OFFICE, lit: 0.22 + r() * 0.22, taper: 1,
        tint: r() < 0.6 ? pick(CONCRETE) : pick(GLASS), shop: 0, rotY: 0 })
    }
  }

  // 4) Downtown clusters: Gold Coast, Streeterville, River North, Loop, West Loop, South Loop.
  const cluster = (x0: number, x1: number, z0: number, z1: number, n: number, hMin: number, hMax: number, officeShare: number) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0)
      if (x < shoreX(z) + 40 || inRiver(x, z) || inPark(x, z)) continue
      const h = hMin + Math.pow(r(), 2.2) * (hMax - hMin)
      const office = r() < officeShare
      const w = 24 + r() * 34, d = 24 + r() * 34
      push({ x, z, w, d, h, style: office ? (r() < 0.5 ? STYLE.OFFICE : STYLE.DARKGLASS) : STYLE.RESTOWER,
        lit: office ? 0.06 + r() * 0.14 : 0.2 + r() * 0.24, taper: r() < 0.12 ? 0.75 : 1,
        tint: office ? pick(GLASS) : pick(CONCRETE), shop: 0, rotY: 0 })
    }
  }
  cluster(-2700, -1300, -4300, -5200, 150, 25, 220, 0.25) // Gold Coast + Streeterville
  cluster(-2400, -1200, -5200, -5780, 120, 30, 210, 0.45) // River North
  cluster(-3000, -1250, -5870, -7500, 230, 60, 290, 0.75) // Loop
  cluster(-1150, 600, -5400, -7200, 140, 20, 150, 0.5) // West Loop
  cluster(-3000, -900, -7500, -9800, 160, 30, 230, 0.4) // South Loop
  cluster(-2900, -800, -9800, -14000, 120, 15, 90, 0.3) // farther south

  // Rooftop bulkheads and penthouses break up the flat roofs.
  for (const b of out.slice()) {
    if (b.style === STYLE.PLAIN || r() > (b.h < 40 ? 0.38 : 0.7)) continue
    const big = b.h >= 40
    const w = big ? b.w * (0.35 + r() * 0.25) : 3 + r() * 3, d = big ? b.d * (0.35 + r() * 0.25) : 3 + r() * 3
    out.push({ x: b.x + (r() - 0.5) * (b.w - w) * 0.8, z: b.z + (r() - 0.5) * (b.d - d) * 0.8, w, d, h: b.h * (b.taper < 1 ? 0.6 : 1) + (big ? 5 + r() * 4 : 2.4 + r() * 1.2),
      style: STYLE.PLAIN, seed: b.seed + 0.5, lit: 0, taper: 1, tint: [0.16, 0.15, 0.15], shop: 0, rotY: 0 })
  }

  // 5) Landmarks (simplified silhouettes).
  const lm = (b: Partial<Building> & { x: number; z: number; w: number; d: number; h: number }) =>
    out.push({ style: STYLE.OFFICE, lit: 0.18, taper: 1, tint: [0.1, 0.1, 0.11], shop: 0, rotY: 0, seed: (seedCounter++ * 0.618) % 1 * 1000, ...b })

  // Willis Tower: nine bundled tubes stepping back at 50, 66 and 90 floors.
  {
    const cx = -1347, cz = -6900, t = 22.9
    const H = [[270, 368, 205], [442, 442, 368], [205, 368, 270]]
    for (let r0 = 0; r0 < 3; r0++) for (let c = 0; c < 3; c++)
      lm({ x: cx + (1 - c) * t, z: cz + (1 - r0) * t, w: t, d: t, h: H[r0][c], style: STYLE.DARKGLASS, tint: [0.05, 0.05, 0.055], lit: 0.2 })
  }
  // John Hancock Center: tapered, X-braced.
  lm({ x: -2211, z: -4673, w: 80, d: 50, h: 344, style: STYLE.HANCOCK, taper: 0.6, tint: [0.06, 0.06, 0.065], lit: 0.32 })
  // Trump Tower: stepped setbacks.
  lm({ x: -2100, z: -5628, w: 44, d: 60, h: 120, tint: [0.22, 0.26, 0.3] })
  lm({ x: -2100, z: -5628, w: 38, d: 52, h: 200, tint: [0.22, 0.26, 0.3] })
  lm({ x: -2100, z: -5628, w: 30, d: 40, h: 360, tint: [0.22, 0.26, 0.3], lit: 0.25 })
  // Aon Center: white stone, narrow windows.
  lm({ x: -2412, z: -6130, w: 58, d: 58, h: 346, style: STYLE.AON, tint: [0.62, 0.6, 0.56], lit: 0.12 })
  // St. Regis: three stacked frustums.
  lm({ x: -2713, z: -5729, w: 30, d: 36, h: 363, tint: [0.12, 0.2, 0.2], taper: 0.85 })
  lm({ x: -2713, z: -5770, w: 28, d: 34, h: 300, tint: [0.12, 0.2, 0.2], taper: 0.85 })
  lm({ x: -2713, z: -5805, w: 26, d: 30, h: 210, tint: [0.12, 0.2, 0.2], taper: 0.85 })
  // Two Prudential: tapered crown.
  lm({ x: -2311, z: -6070, w: 40, d: 40, h: 250, tint: [0.32, 0.31, 0.3] })
  lm({ x: -2311, z: -6070, w: 40, d: 40, h: 300, taper: 0.1, tint: [0.32, 0.31, 0.3] })
  // Franklin Center and 311 South Wacker.
  lm({ x: -1548, z: -6633, w: 52, d: 52, h: 270, style: STYLE.DARKGLASS, tint: [0.16, 0.12, 0.1] })
  lm({ x: -1548, z: -6633, w: 36, d: 36, h: 307, style: STYLE.DARKGLASS, tint: [0.16, 0.12, 0.1] })
  lm({ x: -1407, z: -7057, w: 48, d: 48, h: 280, tint: [0.36, 0.33, 0.3] })
  // Lake Point Tower near Navy Pier.
  lm({ x: -3216, z: -5427, w: 48, d: 48, h: 197, style: STYLE.DARKGLASS, tint: [0.06, 0.07, 0.07], lit: 0.4 })
  // A 2030s supertall at the river (fictional), slender and tapered.
  lm({ x: -2614, z: -5900, w: 42, d: 42, h: 470, taper: 0.55, tint: [0.2, 0.24, 0.27], lit: 0.22 })
  // Navy Pier as a long low mass.
  lm({ x: -4200, z: -5230, w: 2000, d: 110, h: 9, style: STYLE.PLAIN, tint: [0.2, 0.19, 0.18], lit: 0 })

  return out
}

// Thin structures: antennas and spires. [x, z, baseY, height, width]
export const SPIRES: [number, number, number, number, number][] = [
  [-1347 + 11, -6900, 442, 87, 2.2], [-1347 - 11, -6900, 442, 70, 2.2], // Willis antennas
  [-2211 + 12, -4673 + 4, 344, 105, 2.4], [-2211 - 12, -4673 + 4, 344, 98, 2.4], // Hancock antennas
  [-2100, -5628, 360, 63, 1.6], // Trump spire
  [-2311, -6070, 300, 30, 1.4], // Prudential spire
  [-1548 + 8, -6633, 307, 48, 1.5], [-1548 - 8, -6633, 307, 40, 1.5], // Franklin spires
  [-2614, -5900, 470, 40, 1.2],
]

// Glowing crowns: [x, z, baseY, height, radius]
export const CROWNS: [number, number, number, number, number][] = [
  [-1407, -7057, 280, 14, 17], // 311 South Wacker's lit crown
  [-2614, -5900, 452, 16, 9], // the 2030s tower's warm crown
]

// Street and park trees near the camera. [x, z, radius, height]
export function generateTrees(): [number, number, number, number][] {
  const r = rng(3141)
  const out: [number, number, number, number][] = []
  const ok = (x: number, z: number) => x > lsdX(z) + 40 && !inRiver(x, z) && clarkDist(x, z) > 9 && Math.abs(x - TRACK_X) > 8 && inView(x, z, 3)
  for (let k = -16; k <= 26; k++) for (const side of [-12.5, 12.5]) {
    const x = 100 * k + side
    for (let z = -140; z > -2900; z -= 8 + r() * 6) if (r() > 0.18 && ok(x, z) && !inPark(x, z)) out.push([x, z, 3.2 + r() * 2.6, 9 + r() * 5])
  }
  for (let j = 1; j < 15; j++) for (const side of [-12.5, 12.5]) {
    const z = -200 * j + side
    for (let x = -1600; x < 2800; x += 8 + r() * 6) if (r() > 0.25 && ok(x, z) && !inPark(x, z)) out.push([x, z, 3.2 + r() * 2.4, 9 + r() * 5])
  }
  for (let i = 0; i < 9000; i++) {
    const z = -1660 - r() * 2580
    const x = lsdX(z) + 30 + r() * 720
    if (inPark(x, z) && inView(x, z, 3) && r() > 0.25) out.push([x, z, 5 + r() * 5, 10 + r() * 8])
  }
  return out
}
