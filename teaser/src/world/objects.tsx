import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshTransmissionMaterial, RoundedBox } from '@react-three/drei'
import type { GripPose } from './choreo'
import { canvas, ctx2d, cached } from '../art/canvas'
import { grainTile } from '../art/paper'
import { logbookCover, tableTexture, TABLE_MM, waferTexture } from '../art/props'
import { softRect, textureFor } from './Paper'

/* ---------- Materials ---------- */

export const MAT = {
  shell: new THREE.MeshPhysicalMaterial({ color: '#E6E9EA', roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.32 }),
  graphite: new THREE.MeshStandardMaterial({ color: '#2B3137', roughness: 0.34, metalness: 0.55 }),
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

/* ---------- Glass block (S4) ---------- */

function causticTex() {
  return cached('caustic', () => {
    const W = 512, H = 512, c = canvas(W, H), g = ctx2d(c)
    g.filter = 'blur(10px)'
    g.fillStyle = 'rgba(255,255,255,0.9)'
    g.fillRect(W * 0.86, H * 0.08, W * 0.06, H * 0.84)
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(W * 0.12, H * 0.9, W * 0.76, H * 0.05)
    return c
  })
}

export function GlassBlock({ x, z, rot }: { x: number; z: number; rot: number }) {
  const W = 0.12, H = 0.034, D = 0.22
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <Decal x={0.006} z={0.008} w={W * 1.25} h={D * 1.1} opacity={0.2} tex={softRect(W / D, 0.06)} />
      <Decal x={0.012} z={0.01} w={W * 1.1} h={D} opacity={0.6} tex={causticTex()} additive />
      <RoundedBox args={[W, H, D]} radius={0.006} smoothness={6} position={[0, H / 2 + 0.0004, 0]}>
        <MeshTransmissionMaterial transmission={1} thickness={H} roughness={0.02} ior={1.52} chromaticAberration={0.09} anisotropicBlur={0.05}
          distortion={0} samples={8} resolution={1024} backside backsideThickness={0.02} color="#F1F7F7" attenuationColor="#A6CFCB" attenuationDistance={0.09} envMapIntensity={1.1} />
      </RoundedBox>
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
  // A slim two-finger hand: ivory shell, graphite joints, silicone tips.
  return (
    <group position={[p.x, p.y, p.z]} rotation={[0, p.yaw, 0]} scale={0.88}>
      <group rotation={[0, 0, -p.pitch]}>
        {[-1, 1].map(s => (
          <group key={s} position={[0, 0.006, s * (o + 0.0046)]}>
            <RoundedBox args={[0.034, 0.0105, 0.0088]} radius={0.0038} smoothness={4} position={[-0.019, 0, 0]} castShadow material={MAT.shell} />
            <RoundedBox args={[0.0105, 0.0112, 0.0092]} radius={0.0036} smoothness={4} position={[-0.0048, 0, 0]} castShadow material={MAT.silicone} />
            <RoundedBox args={[0.022, 0.0118, 0.0094]} radius={0.002} smoothness={3} position={[-0.046, 0.0008, 0]} castShadow material={MAT.graphite} />
          </group>
        ))}
        <RoundedBox args={[0.016, 0.014, 0.046]} radius={0.004} smoothness={3} position={[-0.062, 0.009, 0]} castShadow material={MAT.graphite} />
        <RoundedBox args={[0.058, 0.04, 0.056]} radius={0.017} smoothness={6} position={[-0.096, 0.016, 0]} castShadow material={MAT.shell} />
        <mesh position={[-0.096, 0.0362, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.006, 40]} /><meshStandardMaterial color="#AEB8BF" roughness={0.35} metalness={0.4} /></mesh>
        <mesh position={[-0.128, 0.016, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.graphite}><cylinderGeometry args={[0.0215, 0.0215, 0.007, 48]} /></mesh>
        <mesh position={[-0.152, 0.016, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={MAT.shell}><cylinderGeometry args={[0.02, 0.0205, 0.042, 48]} /></mesh>
        <mesh position={[-0.181, 0.016, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow material={MAT.graphite}><cylinderGeometry args={[0.0235, 0.0235, 0.036, 48]} /></mesh>
        <mesh position={[-0.46, 0.016, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={MAT.shell}><cylinderGeometry args={[0.0185, 0.0185, 0.52, 48]} /></mesh>
        <mesh position={[-0.27, 0.016, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT.graphite}><cylinderGeometry args={[0.0192, 0.0192, 0.004, 48]} /></mesh>
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

/* ---------- A person's gloved fingers (S4) ---------- */

const cotton = (() => {
  const m = new THREE.MeshPhysicalMaterial({ color: '#E8ECEC', roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.7 })
  return m
})()

export function Glove({ x, y, z, rot }: { x: number; y: number; z: number; rot: number }) {
  const knit = useMemo(() => {
    const t = new THREE.CanvasTexture(grainTile('knit', 256, 9, 3))
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(10, 10)
    return t
  }, [])
  cotton.bumpMap = knit
  cotton.bumpScale = 0.0004
  const finger = (zz: number, len: number, key: string) => {
    const segs = [[0.03 * len, 0.0089, 0.0118, -0.03], [0.022 * len, 0.0083, 0.0098, 0.0], [0.016 * len, 0.0078, 0.0082, 0.021 * len]]
    return (
      <group key={key} position={[0, 0, zz]}>
        {segs.map(([L, r, yy, xx], i) => (
          <mesh key={i} position={[xx, yy, 0]} rotation={[0, 0, Math.PI / 2 + (i === 0 ? 0.18 : i === 1 ? -0.05 : -0.12)]} castShadow material={cotton}>
            <capsuleGeometry args={[r, L, 8, 24]} />
          </mesh>
        ))}
      </group>
    )
  }
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <Decal x={0.004} z={0.006} y={0.0011} w={0.15} h={0.06} opacity={0.35} tex={softRect(2.5, 0.08)} />
      {finger(-0.0105, 1, 'i')}
      {finger(0.0095, 1.06, 'm')}
      {finger(0.028, 0.88, 'r')}
      <RoundedBox args={[0.08, 0.03, 0.082]} radius={0.014} smoothness={5} position={[-0.085, 0.02, 0.008]} rotation={[0, 0, 0.22]} castShadow material={cotton} />
      <mesh position={[-0.14, 0.032, 0.008]} rotation={[0, 0, Math.PI / 2 + 0.22]} material={MAT.graphite}><cylinderGeometry args={[0.03, 0.03, 0.03, 32]} /></mesh>
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
    map: textureFor(waferTexture()), metalness: 0.88, roughness: 0.14, iridescence: 0.65, iridescenceIOR: 1.45,
    iridescenceThicknessRange: [300, 430], envMapIntensity: 1.1,
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
