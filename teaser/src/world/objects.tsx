import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshTransmissionMaterial, RoundedBox } from '@react-three/drei'
import { GLASS_R, type GripPose } from './choreo'
import { canvas, ctx2d, cached } from '../art/canvas'
import { grainTile } from '../art/paper'
import { logbookCover, tableTexture, TABLE_MM, waferTexture } from '../art/props'
import { softRect, textureFor } from './Paper'

/* ---------- Materials ---------- */

export const MAT = {
  // Anodised silver: the robots read as instruments, not toys.
  shell: new THREE.MeshPhysicalMaterial({ color: '#BDC6CB', metalness: 0.62, roughness: 0.34, clearcoat: 0.25, clearcoatRoughness: 0.3 }),
  graphite: new THREE.MeshStandardMaterial({ color: '#363E45', roughness: 0.36, metalness: 0.55 }),
  silicone: new THREE.MeshStandardMaterial({ color: '#1B2025', roughness: 0.82 }),
  steel: new THREE.MeshPhysicalMaterial({ color: '#D3DADF', metalness: 1, roughness: 0.055, envMapIntensity: 1.25 }),
  brushed: new THREE.MeshPhysicalMaterial({ color: '#C6CDD2', metalness: 1, roughness: 0.3 }),
  lacquer: new THREE.MeshPhysicalMaterial({ color: '#161B20', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 }),
}

/* ---------- Contact shadows (soft decals) ---------- */

function radial(key: string, inner: number) {
  return cached(`radial:${key}`, () => {
    const S = 256, c = canvas(S, S), g = ctx2d(c)
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    grd.addColorStop(0, 'rgba(0,0,0,1)')
    grd.addColorStop(inner, 'rgba(0,0,0,0.55)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, S, S)
    return c
  })
}

export function Decal({ x, z, y = 0.00008, w, h, rot = 0, opacity, tex, additive = false }: { x: number; z: number; y?: number; w: number; h: number; rot?: number; opacity: number; tex: HTMLCanvasElement; additive?: boolean }) {
  const t = textureFor(tex, false)
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, rot]} renderOrder={2}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={t} transparent opacity={opacity} depthWrite={false} blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending} color={additive ? '#ffffff' : '#000000'} toneMapped={!additive} />
    </mesh>
  )
}

/* ---------- Table ---------- */

export function Table({ dusk }: { dusk: number }) {
  const map = textureFor(tableTexture())
  const bump = useMemo(() => {
    const t = new THREE.CanvasTexture(grainTile('table', 512, 4, 1.4))
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(16, 10)
    return t
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[-0.2, 0, 0]}>
      <planeGeometry args={[TABLE_MM.w / 1000, TABLE_MM.h / 1000]} />
      <meshStandardMaterial map={map} bumpMap={bump} bumpScale={0.0006} roughness={0.88 - dusk * 0.1} />
    </mesh>
  )
}

/* ---------- Steel sphere ---------- */

export function Sphere({ x, y, z, r, roll, ux, uz, scale }: { x: number; y: number; z: number; r: number; roll: number; ux: number; uz: number; scale: number }) {
  const q = useMemo(() => new THREE.Quaternion(), [])
  q.setFromAxisAngle(new THREE.Vector3(uz, 0, -ux).normalize(), -roll)
  return (
    <group position={[x, 0, z]} scale={scale}>
      <Decal x={0} z={0} w={r * 2.4} h={r * 2.4} opacity={0.85} tex={radial('contact', 0.25)} />
      <Decal x={r * 0.55} z={r * 0.7} w={r * 4.2} h={r * 3.1} rot={-0.6} opacity={0.32} tex={radial('soft', 0.4)} />
      <mesh position={[0, y, 0]} quaternion={q} castShadow material={MAT.steel}>
        <sphereGeometry args={[r, 96, 64]} />
      </mesh>
    </group>
  )
}

/* ---------- Glass (S4): a thick optical disc, very slightly convex ---------- */

const GLASS_H = 0.03

function glassGeometry() {
  // Lathe profile from the axis outwards over the top, down the side, back under.
  const R = GLASS_R, H = GLASS_H, sag = 0.0045, c = 0.0028
  const pts: THREE.Vector2[] = []
  const N = 28
  for (let i = 0; i <= N; i++) {
    const r = (R - c) * (i / N)
    pts.push(new THREE.Vector2(r, H - sag * (r / (R - c)) ** 2))
  }
  pts.push(new THREE.Vector2(R - c * 0.35, H - sag - c * 0.65))
  pts.push(new THREE.Vector2(R, H - sag - c))
  pts.push(new THREE.Vector2(R, c))
  pts.push(new THREE.Vector2(R - c * 0.35, c * 0.35))
  pts.push(new THREE.Vector2(R - c, 0))
  pts.push(new THREE.Vector2(0, 0))
  // Lathe sweeps the profile around y; reverse so faces point outward.
  return new THREE.LatheGeometry(pts.reverse(), 128)
}

function causticTex() {
  return cached('caustic-disc', () => {
    const S = 512, c = canvas(S, S), g = ctx2d(c)
    // The disc gathers light into a soft bright pool, brightest near the rim.
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    grd.addColorStop(0, 'rgba(255,255,255,0.35)')
    grd.addColorStop(0.62, 'rgba(255,255,255,0.55)')
    grd.addColorStop(0.8, 'rgba(255,255,255,0.95)')
    grd.addColorStop(0.9, 'rgba(255,255,255,0.15)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.filter = 'blur(6px)'
    g.fillStyle = grd
    g.fillRect(0, 0, S, S)
    return c
  })
}

function roundShadow() {
  return cached('round-shadow', () => {
    const S = 256, c = canvas(S, S), g = ctx2d(c)
    const grd = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2)
    grd.addColorStop(0, 'rgba(0,0,0,0.0)')
    grd.addColorStop(0.75, 'rgba(0,0,0,0.9)')
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, S, S)
    return c
  })
}

export function GlassBlock({ x, z, rot }: { x: number; z: number; rot: number }) {
  const geo = useMemo(glassGeometry, [])
  const R = GLASS_R
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <Decal x={0.004} z={0.005} w={R * 2.3} h={R * 2.3} opacity={0.32} tex={roundShadow()} />
      <Decal x={0.014} z={0.017} w={R * 1.9} h={R * 1.9} opacity={0.38} tex={causticTex()} additive />
      <mesh geometry={geo} position={[0, 0.0004, 0]}>
        <MeshTransmissionMaterial transmission={1} thickness={GLASS_H} roughness={0.015} ior={1.52} chromaticAberration={0.06} anisotropicBlur={0.02}
          distortion={0} samples={8} resolution={1024} backside backsideThickness={GLASS_H} color="#FBFDFC" attenuationColor="#D4E8E1" attenuationDistance={0.35} envMapIntensity={1} />
      </mesh>
    </group>
  )
}

/* ---------- The glass prompt card (C0) ---------- */

export function PromptCard({ x, y, z, rot, tilt, screen, version }: { x: number; y: number; z: number; rot: number; tilt: number; screen: HTMLCanvasElement; version: number }) {
  const W = 0.3, H = 0.006, D = 0.112
  const tex = textureFor(screen)
  useMemo(() => { tex.needsUpdate = true }, [tex, version])
  // Hinged on its right edge while the left edge lifts.
  return (
    <group position={[x + W / 2, y, z]} rotation={[0, rot, 0]}>
      {tilt < 0.02 && <Decal x={-W / 2 + 0.002} z={0.003} y={-y + 0.0007} w={W * 1.06} h={D * 1.12} opacity={0.3} tex={softRect(W / D, 0.05)} />}
      <group rotation={[0, 0, -tilt]}>
        <RoundedBox args={[W, H, D]} radius={0.0028} smoothness={4} position={[-W / 2, 0, 0]}>
          <MeshTransmissionMaterial transmission={1} thickness={H} roughness={0.22} ior={1.5} chromaticAberration={0.03} anisotropicBlur={0.2}
            distortion={0} samples={6} resolution={1024} color="#F4F8F8" attenuationColor="#C3DADA" attenuationDistance={0.03} envMapIntensity={0.9} />
        </RoundedBox>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-W / 2, H / 2 + 0.0002, 0]}>
          <planeGeometry args={[W, D]} />
          <meshStandardMaterial map={tex} transparent roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

/* ---------- Robot gripper ---------- */

export function Gripper({ p }: { p: GripPose }) {
  if (!p.visible) return null
  const o = p.open / 2
  // A slim two-finger hand: silver palm and forearm, graphite fingers, silicone pads.
  return (
    <group position={[p.x, p.y, p.z]} rotation={[0, p.yaw, 0]} scale={0.8}>
      <group rotation={[0, 0, -p.pitch]}>
        {[-1, 1].map(s => (
          <group key={s} position={[0, 0.006, s * (o + 0.0046)]}>
            <RoundedBox args={[0.046, 0.0102, 0.0084]} radius={0.0034} smoothness={4} position={[-0.027, 0, 0]} castShadow material={MAT.graphite} />
            <RoundedBox args={[0.012, 0.011, 0.0092]} radius={0.0036} smoothness={4} position={[-0.005, 0, 0]} castShadow material={MAT.silicone} />
          </group>
        ))}
        <RoundedBox args={[0.014, 0.012, 0.05]} radius={0.004} smoothness={3} position={[-0.055, 0.008, 0]} castShadow material={MAT.graphite} />
        <RoundedBox args={[0.056, 0.034, 0.054]} radius={0.012} smoothness={6} position={[-0.088, 0.014, 0]} castShadow material={MAT.shell} />
        <mesh position={[-0.119, 0.015, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.graphite}><cylinderGeometry args={[0.0205, 0.0205, 0.005, 48]} /></mesh>
        <mesh position={[-0.142, 0.015, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={MAT.shell}><cylinderGeometry args={[0.02, 0.0195, 0.04, 48]} /></mesh>
        <mesh position={[-0.1645, 0.015, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.graphite}><cylinderGeometry args={[0.0212, 0.0212, 0.0045, 48]} /></mesh>
        <mesh position={[-0.442, 0.015, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={MAT.shell}><cylinderGeometry args={[0.0212, 0.0188, 0.55, 48]} /></mesh>
      </group>
    </group>
  )
}

/* ---------- Fountain pen (held by gripper B) ---------- */

export function Pen({ x, y, z }: { x: number; y: number; z: number }) {
  const dir = useMemo(() => new THREE.Vector3(0.42, 0.9, -0.08).normalize(), [])
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), [dir])
  return (
    <group position={[x, y, z]} quaternion={q}>
      <mesh position={[0, 0.006, 0]} castShadow material={MAT.steel}><coneGeometry args={[0.0032, 0.012, 24]} /></mesh>
      <mesh position={[0, 0.026, 0]} castShadow material={MAT.lacquer}><cylinderGeometry args={[0.0048, 0.0042, 0.028, 32]} /></mesh>
      <mesh position={[0, 0.042, 0]} material={MAT.brushed}><cylinderGeometry args={[0.0054, 0.0054, 0.004, 32]} /></mesh>
      <mesh position={[0, 0.095, 0]} castShadow material={MAT.lacquer}><cylinderGeometry args={[0.0058, 0.0054, 0.1, 32]} /></mesh>
      <mesh position={[0.0062, 0.115, 0]} material={MAT.brushed}><boxGeometry args={[0.0016, 0.05, 0.003]} /></mesh>
    </group>
  )
}

/* ---------- A person's gloved hand (S4) ---------- */

/** A tube along a smooth path whose radius follows a profile; the tip closes round. */
function taperTube(path: [number, number, number][], radius: (s: number) => number, flat = 0.86) {
  const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(...p)), false, 'centripetal')
  const T = 56, R = 20
  const frames = curve.computeFrenetFrames(T, false)
  const len = curve.getLength()
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = []
  const e = 1 / T
  for (let i = 0; i <= T; i++) {
    const s = i / T
    const P = curve.getPointAt(s), tan = curve.getTangentAt(s)
    const N = frames.normals[i], B = frames.binormals[i]
    const r = radius(s)
    const slope = (radius(Math.min(1, s + e)) - radius(Math.max(0, s - e))) / (2 * e * len)
    for (let j = 0; j <= R; j++) {
      const v = (j / R) * Math.PI * 2
      // Fingers are a little flatter than they are wide.
      const d = new THREE.Vector3().addScaledVector(N, Math.cos(v) * flat).addScaledVector(B, Math.sin(v))
      pos.push(P.x + d.x * r, P.y + d.y * r, P.z + d.z * r)
      const n = new THREE.Vector3().addScaledVector(N, Math.cos(v) / flat).addScaledVector(B, Math.sin(v)).normalize()
      n.addScaledVector(tan, -Math.max(-6, Math.min(6, slope))).normalize()
      nor.push(n.x, n.y, n.z)
      uv.push(s * 3, j / R)
    }
  }
  for (let i = 0; i < T; i++) for (let j = 0; j < R; j++) {
    const a = i * (R + 1) + j, b = (i + 1) * (R + 1) + j
    idx.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/** Radius profile: r0 at the knuckle easing to r1, then a rounded tip of length r1. */
const fingerProfile = (r0: number, r1: number, L: number) => (s: number) => {
  const tip = 1 - r1 / L
  if (s <= tip) return lerpN(r0, r1, s / tip)
  const k = (s - tip) / (1 - tip)
  return r1 * Math.sqrt(Math.max(0, 1 - k * k)) + 0.0002
}
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k

function knitTexture() {
  return cached('knit', () => {
    // Fine jersey knit: rows of small V loops.
    const S = 256, c = canvas(S, S), g = ctx2d(c)
    g.fillStyle = '#808080'
    g.fillRect(0, 0, S, S)
    const n = 32, w = S / n
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const X = x * w, Y = y * w
      const grd = g.createLinearGradient(X, Y, X + w, Y)
      grd.addColorStop(0, '#5A5A5A'); grd.addColorStop(0.5, '#B4B4B4'); grd.addColorStop(1, '#5A5A5A')
      g.fillStyle = grd
      g.beginPath(); g.moveTo(X, Y); g.lineTo(X + w / 2, Y + w); g.lineTo(X + w, Y); g.lineTo(X + w / 2, Y + w * 0.45); g.closePath(); g.fill()
    }
    return c
  })
}

const cotton = new THREE.MeshPhysicalMaterial({ color: '#D0D4D1', roughness: 0.97, sheen: 1, sheenColor: new THREE.Color('#F4F6F4'), sheenRoughness: 0.55 })
const sleeve = new THREE.MeshPhysicalMaterial({ color: '#2A3138', roughness: 0.94, sheen: 0.6, sheenColor: new THREE.Color('#6E7A84'), sheenRoughness: 0.6 })

/** A gloved right hand, palm down, index and middle fingers pressing the page.
 *  Origin under the knuckles at paper level; fingertips toward local +x. */
export function Glove({ x, y, z, rot }: { x: number; y: number; z: number; rot: number }) {
  const parts = useMemo(() => {
    const knit = new THREE.CanvasTexture(knitTexture())
    knit.wrapS = knit.wrapT = THREE.RepeatWrapping
    knit.repeat.set(1, 6)
    cotton.bumpMap = knit
    cotton.bumpScale = 0.0006
    const F = (path: [number, number, number][], r0: number, r1: number) => {
      const L = path.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2]), 0)
      return taperTube(path, fingerProfile(r0, r1, L))
    }
    return [
      F([[-0.004, 0.024, -0.024], [0.03, 0.022, -0.026], [0.058, 0.0135, -0.028], [0.079, 0.0088, -0.029]], 0.0094, 0.0079),
      F([[-0.002, 0.025, -0.004], [0.036, 0.0235, -0.004], [0.066, 0.0145, -0.004], [0.088, 0.009, -0.0035]], 0.0097, 0.0081),
      F([[-0.006, 0.024, 0.0155], [0.026, 0.0235, 0.017], [0.046, 0.0165, 0.018], [0.054, 0.0092, 0.0175]], 0.0092, 0.0078),
      F([[-0.016, 0.022, 0.031], [0.008, 0.0215, 0.034], [0.024, 0.0145, 0.035], [0.029, 0.0082, 0.034]], 0.008, 0.0068),
      F([[-0.05, 0.017, -0.026], [-0.026, 0.0125, -0.042], [-0.002, 0.0096, -0.049], [0.014, 0.0088, -0.049]], 0.0118, 0.0092),
    ]
  }, [])
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <Decal x={0.01} z={0.004} y={0.0011 - y} w={0.2} h={0.1} opacity={0.3 * Math.max(0, 1 - y * 30)} tex={softRect(2, 0.1)} />
      {parts.map((g, i) => <mesh key={i} geometry={g} castShadow material={cotton} />)}
      {/* Back of the hand, the wrist, a knit cuff and the sleeve. */}
      <mesh position={[-0.038, 0.0215, 0.003]} rotation={[0, 0, -0.1]} scale={[0.05, 0.0145, 0.038]} castShadow material={cotton}><sphereGeometry args={[1, 48, 32]} /></mesh>
      <mesh position={[-0.095, 0.026, 0.002]} rotation={[0, 0, Math.PI / 2 - 0.1]} scale={[1, 1, 0.78]} castShadow material={cotton}><cylinderGeometry args={[0.029, 0.031, 0.05, 40]} /></mesh>
      <mesh position={[-0.2, 0.034, 0.002]} rotation={[0, 0, Math.PI / 2 - 0.08]} scale={[1, 1, 0.82]} castShadow material={sleeve}><cylinderGeometry args={[0.041, 0.043, 0.17, 40]} /></mesh>
    </group>
  )
}

/* ---------- The stamp (lifting off at the start of S4b) ---------- */

export function Stamp({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.006, 0]} castShadow material={MAT.graphite}><cylinderGeometry args={[0.0238, 0.0238, 0.012, 64]} /></mesh>
      <mesh position={[0, 0.026, 0]} castShadow material={MAT.brushed}><cylinderGeometry args={[0.012, 0.016, 0.03, 48]} /></mesh>
      <mesh position={[0, 0.052, 0]} scale={[1, 0.82, 1]} castShadow material={MAT.lacquer}><sphereGeometry args={[0.019, 48, 32]} /></mesh>
    </group>
  )
}

/* ---------- Props around the edges ---------- */

export function Wafer({ x, z, rot, scale = 1 }: { x: number; z: number; rot: number; scale?: number }) {
  const geo = useMemo(() => {
    const R = 0.15, cy = -0.12
    const s = new THREE.Shape()
    const a0 = (62 * Math.PI) / 180, a1 = (112 * Math.PI) / 180
    s.moveTo(Math.cos(a0) * R, cy + Math.sin(a0) * R)
    for (let i = 1; i <= 40; i++) { const a = a0 + (a1 - a0) * (i / 40); s.lineTo(Math.cos(a) * R, cy + Math.sin(a) * R) }
    // Cleaved edges: straight, along the crystal.
    s.lineTo(-0.064, -0.018); s.lineTo(-0.02, -0.052); s.lineTo(0.03, -0.044); s.lineTo(0.07, 0.01)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.0008, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    const uv = g.attributes.uv as THREE.BufferAttribute, pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.065) / 0.13, (-pos.getZ(i) + 0.065) / 0.13)
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    map: textureFor(waferTexture()), metalness: 0.9, roughness: 0.1, iridescence: 0.5, iridescenceIOR: 1.45,
    iridescenceThicknessRange: [120, 331], envMapIntensity: 1.1,
  }), [])
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]} scale={scale}>
      <Decal x={0.002} z={0.004} y={0.0004} w={0.16} h={0.11} opacity={0.18} tex={softRect(1.4, 0.06)} />
      <mesh geometry={geo} material={mat} position={[0, 0.0001, 0]} castShadow />
    </group>
  )
}

export function Logbook({ x, z, rot, scale = 1 }: { x: number; z: number; rot: number; scale?: number }) {
  const cover = textureFor(logbookCover())
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]} scale={scale}>
      <Decal x={0.006} z={0.008} y={0.0003} w={0.17} h={0.235} opacity={0.4} tex={softRect(0.72, 0.05)} />
      <RoundedBox args={[0.148, 0.016, 0.21]} radius={0.0025} smoothness={3} position={[0, 0.008, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#4A5861" roughness={0.85} />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01605, 0]} receiveShadow>
        <planeGeometry args={[0.146, 0.208]} />
        <meshStandardMaterial map={cover} roughness={0.86} />
      </mesh>
    </group>
  )
}

function rulerTicks() {
  return cached('ruler', () => {
    const W = 300, H = 30, P = 8
    const c = canvas(W * P, H * P), g = ctx2d(c)
    g.fillStyle = '#20262B'
    for (let mm = 0; mm <= 290; mm++) {
      const L = mm % 10 === 0 ? 7 : mm % 5 === 0 ? 5 : 3
      g.fillRect((5 + mm) * P, 0, 0.18 * P, L * P)
      if (mm % 10 === 0) { g.font = `500 ${2.4 * P}px "JetBrains Mono"`; g.fillText(String(mm / 10), (5 + mm) * P + 0.6 * P, 10.5 * P) }
    }
    g.font = `500 ${1.9 * P}px "JetBrains Mono"`
    g.fillText('STAINLESS · MM', 230 * P, 25 * P)
    return c
  })
}

export function Ruler({ x, z, rot, scale = 1 }: { x: number; z: number; rot: number; scale?: number }) {
  const ticks = textureFor(rulerTicks())
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]} scale={scale}>
      <Decal x={0.002} z={0.003} y={0.0002} w={0.31} h={0.038} opacity={0.3} tex={softRect(8, 0.06)} />
      <mesh position={[0, 0.0007, 0]} castShadow receiveShadow material={MAT.brushed}><boxGeometry args={[0.3, 0.0012, 0.03]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.00132, 0]}>
        <planeGeometry args={[0.3, 0.03]} />
        <meshStandardMaterial map={ticks} transparent roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  )
}
