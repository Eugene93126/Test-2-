import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import {
  CAMERA, CLARK, FPS, KENNEDY, LOOP, SPIRES, CROWNS, SUN_DIR, TRACK_X, TRACK_Y,
  generateBuildings, generateTrees, inPark, inRiver, inView, lsdX, rng, shoreX,
} from './geo'
import * as S from './shaders'

const params = new URLSearchParams(location.search)
const W = Number(params.get('w') ?? 1280)
const H = Number(params.get('h') ?? 720)

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(1)
renderer.setSize(W, H)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(CAMERA.vfovDeg, W / H, 20, 60000)
camera.position.set(...CAMERA.pos)
camera.rotation.set((CAMERA.pitchDeg * Math.PI) / 180, (CAMERA.yawDeg * Math.PI) / 180, 0, 'YXZ')
camera.updateMatrixWorld()

const G = {
  uTime: { value: 0 },
  uLoop: { value: LOOP },
  uSunDir: { value: new THREE.Vector3(...SUN_DIR).normalize() },
  uDepthMode: { value: 0 },
}
const mat = (vertexShader: string, fragmentShader: string, extra: Record<string, THREE.IUniform> = {}, opts: Partial<THREE.ShaderMaterialParameters> = {}) =>
  new THREE.ShaderMaterial({ uniforms: { ...G, ...extra }, vertexShader, fragmentShader, ...opts })

// ---------- sky ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 64, 32), mat(S.SKY_VERT, S.SKY_FRAG, {}, { side: THREE.BackSide, depthWrite: false }))
sky.renderOrder = -1
scene.add(sky)

// ---------- ground, park, river ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), mat(S.GROUND_VERT, S.GROUND_FRAG, {
  uClarkA: { value: new THREE.Vector2(CLARK[0][1], CLARK[0][0]) },
  uClarkB: { value: new THREE.Vector2(CLARK[1][1], CLARK[1][0]) },
}))
ground.rotation.x = -Math.PI / 2
scene.add(ground)

function polyXZ(pts: [number, number][], y: number, material: THREE.Material) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), material)
  m.rotation.x = -Math.PI / 2
  m.position.y = y
  scene.add(m)
  return m
}

{
  const left: [number, number][] = [], rightSide: [number, number][] = []
  for (let z = 1200; z >= -14000; z -= 50) {
    left.push([shoreX(z), z])
    const lp = z < -1650 && z > -4250
    rightSide.push([lsdX(z) + (lp ? 760 : 40), z])
  }
  polyXZ([...left, ...rightSide.reverse()], 0.1, mat(S.GROUND_VERT, S.PARK_FRAG))
}

const riverMat = mat(S.GROUND_VERT, S.FLAT_FRAG, { uColor: { value: new THREE.Color(0.012, 0.016, 0.024) }, uEmissive: { value: 0 } })
polyXZ([[-3150, -5790], [-1180, -5790], [-1180, -5860], [-3150, -5860]], 0.2, riverMat)
polyXZ([[-1235, -3400], [-1175, -3400], [-1175, -5860], [-1235, -5860]], 0.2, riverMat)

// ---------- lake (planar reflection) ----------
{
  const pts: THREE.Vector2[] = []
  for (let z = 3000; z >= -30000; z -= 50) pts.push(new THREE.Vector2(shoreX(z), -z))
  pts.push(new THREE.Vector2(-40000, 30000), new THREE.Vector2(-40000, -3000))
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts))
  const lake = new Reflector(geo, {
    textureWidth: W, textureHeight: H, clipBias: 0.002, multisample: 4,
    shader: {
      name: 'LakeShader',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, ...G },
      vertexShader: S.WATER_VERT,
      fragmentShader: S.WATER_FRAG,
    },
  })
  lake.rotation.x = -Math.PI / 2
  lake.position.y = 0.3
  scene.add(lake)
}

// ---------- buildings ----------
const buildings = generateBuildings()
{
  const n = buildings.length
  const geo = new THREE.BoxGeometry(1, 1, 1)
  const aSize = new Float32Array(n * 3), aParams = new Float32Array(n * 4), aTint = new Float32Array(n * 4)
  const im = new THREE.InstancedMesh(geo, mat(S.BLD_VERT, S.BLD_FRAG), n)
  const m4 = new THREE.Matrix4()
  buildings.forEach((b, i) => {
    m4.makeRotationY(b.rotY).setPosition(b.x, 0, b.z)
    im.setMatrixAt(i, m4)
    aSize.set([b.w, b.h, b.d], i * 3)
    aParams.set([b.seed, b.style, b.lit, b.taper], i * 4)
    aTint.set([...b.tint, b.shop], i * 4)
  })
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 3))
  geo.setAttribute('aParams', new THREE.InstancedBufferAttribute(aParams, 4))
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(aTint, 4))
  im.frustumCulled = false
  scene.add(im)
  console.log('buildings', n)
}

// Trees: low-poly canopies, dark with a warm underside near streetlights.
{
  const trees = generateTrees()
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat(S.TREE_VERT, S.TREE_FRAG), trees.length)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
  const r = rng(271)
  trees.forEach(([x, z, rad, h], i) => {
    q.setFromEuler(e.set((r() - 0.5) * 0.5, r() * 6.28, (r() - 0.5) * 0.5))
    m4.compose(new THREE.Vector3(x, h - rad * 0.7, z), q, new THREE.Vector3(rad * (0.85 + r() * 0.3), rad * (0.65 + r() * 0.25), rad * (0.85 + r() * 0.3)))
    im.setMatrixAt(i, m4)
  })
  im.frustumCulled = false
  scene.add(im)
  console.log('trees', trees.length)
}

// Spires and antennas (plain dark), crowns (emissive).
const darkMat = mat(S.GROUND_VERT, S.FLAT_FRAG, { uColor: { value: new THREE.Color(0.05, 0.05, 0.055) }, uEmissive: { value: 0 } })
for (const [x, z, y, h, w] of SPIRES) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), darkMat)
  m.position.set(x, y + h / 2, z)
  scene.add(m)
}
for (const [x, z, y, h, r] of CROWNS) {
  const warm = x < -2500
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true),
    mat(S.GROUND_VERT, S.FLAT_FRAG, { uColor: { value: warm ? new THREE.Color(2.4, 1.6, 1.0) : new THREE.Color(1.8, 2.0, 2.2) }, uEmissive: { value: 1 } }))
  m.position.set(x, y + h / 2, z)
  scene.add(m)
}

// ---------- the L structure and the Red Line train ----------
const trackMat = mat(S.GROUND_VERT, S.FLAT_FRAG, { uColor: { value: new THREE.Color(0.08, 0.075, 0.07) }, uEmissive: { value: 0 } })
{
  const len = 2600
  const deck = new THREE.Mesh(new THREE.BoxGeometry(9, 1.4, len), trackMat)
  deck.position.set(TRACK_X, TRACK_Y - 0.7, -120 - len / 2)
  scene.add(deck)
  for (let z = -130; z > -120 - len; z -= 16) {
    for (const dx of [-3.6, 3.6]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.6, TRACK_Y - 1.4, 0.6), trackMat)
      c.position.set(TRACK_X + dx, (TRACK_Y - 1.4) / 2, z)
      scene.add(c)
    }
  }
}
const TRAIN = { cars: 8, carLen: 14.6, gap: 0.9, speed: 28, startFront: -330 }
const trainCars: THREE.Object3D[] = []
{
  const bodyMat = mat(S.GROUND_VERT, S.FLAT_FRAG, { uColor: { value: new THREE.Color(0.9, 0.92, 0.96) }, uEmissive: { value: 0 } })
  const winMat = mat(S.GROUND_VERT, S.FLAT_FRAG, { uColor: { value: new THREE.Color(1.05, 1.12, 1.2) }, uEmissive: { value: 1 } })
  const bodyGeo = new THREE.BoxGeometry(2.9, 3.4, TRAIN.carLen)
  const winGeo = new THREE.BoxGeometry(0.08, 0.9, 0.95)
  for (let i = 0; i < TRAIN.cars; i++) {
    const g = new THREE.Group()
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 1.9
    g.add(body)
    for (let k = 0; k < 9; k++) for (const side of [-1, 1]) {
      const w = new THREE.Mesh(winGeo, winMat)
      w.position.set(side * 1.48, 2.3, -TRAIN.carLen / 2 + 1.0 + k * 1.58)
      g.add(w)
    }
    scene.add(g)
    trainCars.push(g)
  }
}
function trainFront(t: number) { return TRAIN.startFront - TRAIN.speed * t }

// ---------- light points ----------
interface PointBuf { pos: number[]; col: number[]; size: number[] }
const newBuf = (): PointBuf => ({ pos: [], col: [], size: [] })
const add = (b: PointBuf, x: number, y: number, z: number, c: [number, number, number], s: number) => {
  b.pos.push(x, y, z); b.col.push(...c); b.size.push(s)
}
const pxPerRad = { value: H / ((CAMERA.vfovDeg * Math.PI) / 180) }
function pointsMesh(b: PointBuf, dynamic = false) {
  const geo = new THREE.BufferGeometry()
  const mk = (a: number[], n: number) => {
    const attr = new THREE.BufferAttribute(new Float32Array(a), n)
    if (dynamic) attr.setUsage(THREE.DynamicDrawUsage)
    return attr
  }
  geo.setAttribute('position', mk(b.pos, 3))
  geo.setAttribute('aColor', mk(b.col, 3))
  geo.setAttribute('aSize', mk(b.size, 1))
  const p = new THREE.Points(geo, mat(S.POINTS_VERT, S.POINTS_FRAG, { uPxPerRad: pxPerRad }, {
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }))
  p.frustumCulled = false
  scene.add(p)
  return p
}

// Static: streetlights, roof-deck string lights, Navy Pier lights.
{
  const b = newBuf()
  const r = rng(7)
  const LED: [number, number, number] = [0.85, 0.66, 0.46]
  const OLD: [number, number, number] = [0.95, 0.52, 0.22]
  const spacingAt = (z: number) => (z > -3000 ? 34 : z > -8000 ? 70 : 130)
  const ok = (x: number, z: number) => x > shoreX(z) + 25 && !inPark(x, z) && !inRiver(x, z) && inView(x, z, 2)
  for (let k = -40; k <= 60; k++) {
    const x = 100 * k
    for (let z = -60; z > -16000; z -= spacingAt(z)) if (ok(x + 8, z)) add(b, x + (r() < 0.5 ? 8 : -8), 8, z, r() < 0.12 ? OLD : LED, 3.2)
  }
  for (let j = 1; j < 80; j++) {
    const z = -200 * j
    const sp = spacingAt(z)
    for (let x = -4000; x < 6000; x += sp) if (ok(x, z + 9)) add(b, x, 8, z + (r() < 0.5 ? 9 : -9), r() < 0.12 ? OLD : LED, 3.2)
  }
  // Clark Street and Lake Shore Drive lamps
  const [[z0, x0], [z1, x1]] = CLARK
  for (let t = 0; t <= 1; t += 1 / 130) { const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; if (inView(x, z, 2)) add(b, x + 10, 8, z, LED, 3.4) }
  for (let z = 600; z > -12000; z -= z > -4000 ? 40 : 80) { const x = lsdX(z); if (inView(x, z, 2)) { add(b, x - 14, 10, z, LED, 3.6); add(b, x + 14, 10, z, LED, 3.6) } }
  // Lincoln Park path lights, sparse and warm
  for (let i = 0; i < 700; i++) { const z = -1700 - r() * 2500; const x = lsdX(z) + 40 + r() * 680; if (inView(x, z)) add(b, x, 4, z, [1.0, 0.72, 0.45], 2.2) }
  // the zoo and the conservatory glow softly inside the park
  for (let i = 0; i < 120; i++) { const z = -2350 - r() * 500, x = lsdX(z) + 260 + r() * 260; if (inView(x, z)) add(b, x, 3 + r() * 6, z, [1.2, 0.95, 0.7], 2.6) }
  // Roof-deck string lights on nearby low-rises (it's a Saturday in July).
  const decks = buildings.filter(bd => bd.z < -160 && bd.z > -1200 && bd.h < 16 && bd.style === 0)
  for (let i = 0; i < 60 && decks.length; i++) {
    const bd = decks[Math.floor(r() * decks.length)]
    const y = bd.h + 2.4
    for (let s = 0; s < 2; s++) {
      const zz = bd.z - bd.d * 0.3 + s * bd.d * 0.6
      for (let q = 0; q < 10; q++) add(b, bd.x - bd.w * 0.4 + (q / 9) * bd.w * 0.8, y - Math.sin((q / 9) * Math.PI) * 0.5, zz, [1.5, 1.05, 0.6], 0.55)
    }
  }
  // Navy Pier edge lights
  for (let x = -3200; x > -5200; x -= 25) { add(b, x, 10, -5175, [1.6, 1.3, 1.0], 2.6); add(b, x, 10, -5285, [1.6, 1.3, 1.0], 2.6) }
  pointsMesh(b)
}

// Dynamic: traffic, aircraft lights, the wheel, boats, train markers.
interface Road { pts: [number, number][]; lanes: { off: number; dir: 1 | -1 }[]; speed: number; perPattern: number; seed: number }
const lsdPts: [number, number][] = []
for (let z = 1200; z >= -12000; z -= 100) lsdPts.push([lsdX(z), z])
const roads: Road[] = [
  { pts: lsdPts, lanes: [{ off: -9, dir: 1 }, { off: -5, dir: 1 }, { off: 5, dir: -1 }, { off: 9, dir: -1 }], speed: 24, perPattern: 6, seed: 1 },
  { pts: KENNEDY.map(([z, x]) => [x, z]), lanes: [{ off: -10, dir: 1 }, { off: -6, dir: 1 }, { off: 6, dir: -1 }, { off: 10, dir: -1 }], speed: 26, perPattern: 6, seed: 2 },
  { pts: CLARK.map(([z, x]) => [x, z]), lanes: [{ off: -3, dir: 1 }, { off: 3, dir: -1 }], speed: 11, perPattern: 2, seed: 3 },
]
for (const z of [-800, -1600, -2400, -3200, -4000, -4800]) {
  const x0 = Math.max(shoreX(z) + 60, -4000)
  roads.push({ pts: [[x0, z], [5000, z]], lanes: [{ off: -3, dir: 1 }, { off: 3, dir: -1 }], speed: 12, perPattern: 2, seed: 10 + z })
}
for (const x of [-400, 400, 1200, 2000]) roads.push({ pts: [[x, 200], [x, -9000]], lanes: [{ off: -3, dir: 1 }, { off: 3, dir: -1 }], speed: 12, perPattern: 2, seed: 20 + x })

interface Car { road: Road; lane: { off: number; dir: 1 | -1 }; s0: number }
const cars: Car[] = []
const roadLen = new Map<Road, number[]>()
for (const road of roads) {
  const cum = [0]
  for (let i = 1; i < road.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(road.pts[i][0] - road.pts[i - 1][0], road.pts[i][1] - road.pts[i - 1][1]))
  roadLen.set(road, cum)
  const r = rng(road.seed * 977 + 13)
  const P = road.speed * LOOP
  const L = cum[cum.length - 1]
  for (const lane of road.lanes) {
    const offs = Array.from({ length: road.perPattern }, () => r() * P)
    for (let n = -1; n <= Math.ceil(L / P); n++) for (const o of offs) cars.push({ road, lane, s0: n * P + o })
  }
}
const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
function roadPoint(road: Road, s: number) {
  const cum = roadLen.get(road)!
  let i = 1
  while (i < cum.length - 1 && cum[i] < s) i++
  const [xa, za] = road.pts[i - 1], [xb, zb] = road.pts[i]
  const seg = cum[i] - cum[i - 1]
  const t = (s - cum[i - 1]) / seg
  const dx = (xb - xa) / seg, dz = (zb - za) / seg
  return { x: xa + (xb - xa) * t, z: za + (zb - za) * t, dx, dz }
}

const r2 = rng(99)
const tallOnes = buildings.filter(b => b.h > 110).map(b => ({ b, ph: r2() }))
const harborBoats = Array.from({ length: 70 }, (_, i) => {
  const monroe = i >= 30
  return { x: monroe ? -3330 - r2() * 380 : -1260 - r2() * 260, z: monroe ? -6250 - r2() * 520 : -650 - r2() * 260, ph: r2(), h: 6 + r2() * 9 }
})
const MAX_DYNAMIC = cars.length + 4000
const dyn = pointsMesh({ pos: new Array(MAX_DYNAMIC * 3).fill(0), col: new Array(MAX_DYNAMIC * 3).fill(0), size: new Array(MAX_DYNAMIC).fill(0) }, true)

function updateDynamic(t: number) {
  const pos = dyn.geometry.getAttribute('position') as THREE.BufferAttribute
  const col = dyn.geometry.getAttribute('aColor') as THREE.BufferAttribute
  const siz = dyn.geometry.getAttribute('aSize') as THREE.BufferAttribute
  let n = 0
  const put = (x: number, y: number, z: number, c: [number, number, number], s: number) => {
    if (n >= MAX_DYNAMIC) return
    pos.setXYZ(n, x, y, z); col.setXYZ(n, c[0], c[1], c[2]); siz.setX(n, s); n++
  }
  const ph = t / LOOP
  // traffic
  for (const c of cars) {
    const L = roadLen.get(c.road)!.at(-1)!
    const s = c.lane.dir > 0 ? c.s0 + c.road.speed * t : c.s0 - c.road.speed * t
    if (s < 0 || s > L) continue
    const fade = Math.min(1, s / 150, (L - s) / 150)
    const p = roadPoint(c.road, s)
    const x = p.x - p.dz * c.lane.off, z = p.z + p.dx * c.lane.off
    if (!inView(x, z, 2)) continue
    const vx = p.dx * c.lane.dir, vz = p.dz * c.lane.dir
    const away = vx * camFwd.x + vz * camFwd.z
    const head: [number, number, number] = [2.6 * fade, 2.4 * fade, 2.0 * fade]
    const tail: [number, number, number] = [2.2 * fade, 0.12 * fade, 0.05 * fade]
    if (away > 0.35) put(x, 1.2, z, tail, 1.7)
    else if (away < -0.35) put(x, 1.2, z, head, 2.1)
    else put(x, 1.2, z, [1.3 * fade, 0.9 * fade, 0.7 * fade], 1.6)
  }
  // aircraft warning lights (blink every 1.6 s, 10 times per loop)
  for (const { b, ph: p0 } of tallOnes) {
    const on = (t / 1.6 + p0) % 1 < 0.5 ? 1 : 0.08
    put(b.x, b.h + 1.5, b.z, [4 * on, 0.25 * on, 0.1 * on], 2.4)
  }
  for (const [x, z, y, h] of SPIRES) {
    const flash = (t / 1.6 + x * 0.001) % 1 < 0.07 ? 1 : 0
    put(x, y + h, z, [3.5, 0.2, 0.08], 2.6)
    if (flash) put(x, y + h + 1, z, [9, 9, 9], 3.4)
  }
  // Centennial Wheel at Navy Pier: rotates one gondola spacing per loop; colors drift.
  {
    const cx = -3750, cy = 38, cz = -5230, R = 30, N = 42
    const rot = (ph * Math.PI * 2) / N
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + rot
      const hue = (i / N + ph) % 1
      const c = new THREE.Color().setHSL(hue, 0.7, 0.62)
      put(cx + Math.cos(a) * R, cy + Math.sin(a) * R, cz, [c.r * 3, c.g * 3, c.b * 3], 2.4)
      for (let k = 1; k <= 3; k++) put(cx + Math.cos(a) * R * (k / 4), cy + Math.sin(a) * R * (k / 4), cz, [c.r * 1.4, c.g * 1.4, c.b * 1.4], 1.4)
    }
  }
  // moored boats bobbing
  for (const bt of harborBoats) {
    const bob = Math.sin((ph + bt.ph) * Math.PI * 2 * 2) * 0.4
    put(bt.x, bt.h + bob, bt.z, [1.6, 1.5, 1.3], 1.4)
  }
  // train markers: red tail lights on the last car, headlight pool ahead
  {
    const front = trainFront(t)
    const rear = front + TRAIN.cars * (TRAIN.carLen + TRAIN.gap)
    put(TRACK_X - 1.0, TRACK_Y + 1.2, rear, [3, 0.15, 0.08], 0.9)
    put(TRACK_X + 1.0, TRACK_Y + 1.2, rear, [3, 0.15, 0.08], 0.9)
    put(TRACK_X, TRACK_Y + 0.5, front - 14, [1.2, 1.15, 1.0], 6)
  }
  for (let i = n; i < MAX_DYNAMIC; i++) siz.setX(i, 0)
  pos.needsUpdate = col.needsUpdate = siz.needsUpdate = true
  dyn.geometry.setDrawRange(0, n)
}

function updateTrain(t: number) {
  const front = trainFront(t)
  trainCars.forEach((g, i) => {
    const zc = front + TRAIN.carLen / 2 + i * (TRAIN.carLen + TRAIN.gap)
    g.position.set(TRACK_X, TRACK_Y, zc)
  })
}

// ---------- composer ----------
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 })
const composer = new EffectComposer(renderer, rt)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.32, 0.45, 1.05)
composer.addPass(bloom)
composer.addPass(new OutputPass())

function render(t: number, mode: 'color' | 'depth' = 'color') {
  G.uTime.value = t
  updateTrain(t)
  updateDynamic(t)
  if (mode === 'depth') {
    G.uDepthMode.value = 1
    const tm = renderer.toneMapping
    renderer.toneMapping = THREE.NoToneMapping
    renderer.setRenderTarget(null)
    renderer.render(scene, camera)
    renderer.toneMapping = tm
    G.uDepthMode.value = 0
  } else {
    composer.render()
  }
}

declare global { interface Window { city: { render: typeof render; loop: number; fps: number; ready: boolean } } }
window.city = { render, loop: LOOP, fps: FPS, ready: true }

if (params.has('live')) {
  const t0 = performance.now()
  const tick = () => { render(((performance.now() - t0) / 1000) % LOOP); requestAnimationFrame(tick) }
  tick()
} else {
  render(Number(params.get('t') ?? 6), (params.get('mode') as 'color' | 'depth') ?? 'color')
}
