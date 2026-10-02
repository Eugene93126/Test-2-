import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { BloomEffect, DepthOfFieldEffect, EffectComposer as PPComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { FLASHES, ev } from '../lib/timeline'
import { clamp, inQuart, lerp, prog, smoother, span } from '../lib/ease'
import { rng, hash2 } from '../lib/rand'
import { paintReport, REPORT_MM } from '../art/report'
import { paintSheet } from '../art/sheet'
import { SHEET_MM } from '../art/field'
import { paintCard, CARD_MM } from '../art/cards'
import { paintPrompt } from '../art/prompt'
import { Paper } from './Paper'
import {
  POINT, PROPS, SHEET_POS, camera, cardPose, cardStackPose, converge, glassPose, glovePose, gripperA, gripperB,
  light, reportPose, spherePose, stampPose,
} from './choreo'
import { GlassBlock, Glove, Gripper, Logbook, Pen, PromptCard, Ruler, Sphere, Stamp, Table, Wafer } from './objects'
import { GradeEffect } from '../post/Grade'

/**
 * Repaint a canvas only when its inputs change; the version bumps so the
 * texture re-uploads only then (uploads with mipmaps are slow without a GPU).
 */
const paintCache = new Map<string, { key: string; canvas: HTMLCanvasElement; version: number }>()
function painted(name: string, key: string, paint: () => HTMLCanvasElement) {
  const hit = paintCache.get(name)
  if (hit && hit.key === key) return hit
  const next = { key, canvas: paint(), version: (hit?.version ?? 0) + 1 }
  paintCache.set(name, next)
  return next
}

const FOV = 20
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * 2

function Rig({ t, frame }: { t: number; frame: number }) {
  const cam = useThree(s => s.camera) as THREE.PerspectiveCamera
  const c = camera(t)
  const H = c.h / TAN
  const sx = c.shake ? (hash2(frame, 1) - 0.5) * c.h * 0.03 : 0
  const sz = c.shake ? (hash2(frame, 2) - 0.5) * c.h * 0.03 : 0
  cam.fov = FOV
  cam.near = 0.01
  cam.far = 6
  cam.position.set(c.x + sx, H, c.z + sz)
  cam.rotation.set(-Math.PI / 2, 0, c.roll)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  return null
}

function Lights({ dusk, ignite }: { dusk: number; ignite: number }) {
  const key = useRef<THREE.DirectionalLight>(null)
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-0.15, 0, 0); return o }, [])
  const keyColor = new THREE.Color('#F2F5F6').lerp(new THREE.Color('#6C83AA'), dusk)
  return (
    <>
      <primitive object={target} />
      <directionalLight ref={key} position={[-0.75, 1.5, -0.9]} target={target} intensity={lerp(3.0, 0.22, dusk)} color={keyColor} castShadow
        shadow-mapSize={[2048, 2048]} shadow-radius={6} shadow-blurSamples={12} shadow-bias={-0.0004} shadow-normalBias={0.0015} shadow-intensity={0.78}
        shadow-camera-left={-0.8} shadow-camera-right={0.8} shadow-camera-top={0.6} shadow-camera-bottom={-0.6} shadow-camera-near={0.5} shadow-camera-far={3.5} />
      <hemisphereLight args={['#EEF3F5', '#8E9A95', lerp(0.5, 0.08, dusk)]} />
      <pointLight position={[POINT.x, 0.02, POINT.z]} color="#D97757" intensity={ignite * 0.9} distance={0.5} decay={2} />
      <Environment resolution={256} frames={1} environmentIntensity={lerp(0.7, 0.1, dusk)}>
        <Lightformer form="rect" intensity={3.2} position={[-1.6, 2.2, -1.2]} scale={[3.2, 1.8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.1} position={[0.6, 3, 0.8]} scale={[1.6, 1.6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4} position={[1.4, 1.5, -0.4]} scale={[0.14, 2.6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.35} color="#C3CCC8" position={[0, -1.2, 0]} scale={[6, 6, 1]} target={[0, 0, 0]} />
        {/* Overhead diffusion: flat steel, glass and the wafer catch it. */}
        <Lightformer form="rect" intensity={0.8} position={[0.2, 4, 0.3]} scale={[6, 5, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  )
}

/** Fragments of line pulled into the point in S6. */
function Motes({ t }: { t: number }) {
  const N = 2600
  const geo = useMemo(() => new THREE.BufferGeometry(), [])
  const seeds = useMemo(() => {
    const r = rng(616)
    return Array.from({ length: N }, () => {
      const a = r() * Math.PI * 2, d = 0.03 + Math.sqrt(r()) * 0.5
      return { x: POINT.x + Math.cos(a) * d * 1.4, z: POINT.z + Math.sin(a) * d * 0.8, delay: r() * 0.25, size: r() }
    })
  }, [])
  const c = span(t, ev('converge'))
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3)
  const clay = new THREE.Color('#E08A68'), white = new THREE.Color('#EAF2F6')
  seeds.forEach((s, i) => {
    const e = inQuart(clamp((c - s.delay) / (1 - s.delay)))
    const sw = e * 2.2
    const dx = s.x - POINT.x, dz = s.z - POINT.z
    const x = POINT.x + (dx * Math.cos(sw) - dz * Math.sin(sw)) * (1 - e)
    const z = POINT.z + (dx * Math.sin(sw) + dz * Math.cos(sw)) * (1 - e)
    pos.set([x, 0.004 + e * 0.01, z], i * 3)
    const k = smoother(e)
    const cc = white.clone().lerp(clay, k)
    const a = clamp(c * 4) * (0.35 + s.size * 0.65)
    col.set([cc.r * a, cc.g * a, cc.b * a], i * 3)
  })
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  if (c <= 0) return null
  return (
    <points geometry={geo} renderOrder={5}>
      <pointsMaterial size={0.0016} vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation toneMapped={false} />
    </points>
  )
}

function ClayPoint({ ignite }: { ignite: number }) {
  if (ignite <= 0) return null
  const r = 0.0022 + ignite * 0.004
  return (
    <mesh position={[POINT.x, 0.006, POINT.z]}>
      <sphereGeometry args={[r, 32, 24]} />
      <meshBasicMaterial color={new THREE.Color('#D97757').multiplyScalar(2 + ignite * 26)} toneMapped={false} />
    </mesh>
  )
}

/**
 * The post chain, built synchronously so Remotion's single render per frame
 * already goes through it: depth of field, bloom, AgX tone mapping, grade.
 */
function Post({ t, frame, h, perf = false }: { t: number; frame: number; h: number; perf?: boolean }) {
  const gl = useThree(s => s.gl), scene = useThree(s => s.scene), cam = useThree(s => s.camera), size = useThree(s => s.size)
  const pipe = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping
    // Shadow maps render once per frame, not again for every transmission pass.
    gl.shadowMap.autoUpdate = false
    const composer = new PPComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 })
    composer.addPass(new RenderPass(scene, cam))
    const dof = new DepthOfFieldEffect(cam, { worldFocusDistance: 1, worldFocusRange: 0.05, bokehScale: 2.4, resolutionScale: 0.5 })
    const bloom = new BloomEffect({ mipmapBlur: true, intensity: 0.25, luminanceThreshold: 0.92, luminanceSmoothing: 0.2, radius: 0.7, levels: 5 })
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })
    const grade = new GradeEffect()
    composer.addPass(new EffectPass(cam, dof))
    composer.addPass(new EffectPass(cam, bloom, tone))
    composer.addPass(new EffectPass(cam, grade))
    return { composer, dof, bloom, grade }
  }, [gl, scene, cam])
  useMemo(() => pipe.composer.setSize(size.width, size.height), [pipe, size.width, size.height])
  useEffect(() => () => pipe.composer.dispose(), [pipe])

  const L = light(t)
  const H = h / TAN
  pipe.dof.cocMaterial.worldFocusDistance = H
  pipe.dof.cocMaterial.worldFocusRange = Math.max(0.012, H * 0.05)
  pipe.bloom.intensity = 0.25 + L.ignite * 1.2
  // Chromatic aberration only at transitions.
  const transitions = [[0.95, 1.55], [2.7, 3.3], [5.85, 6.55], [9.0, 10.6], [10.8, 10.9], [11.85, 12.1], [17.9, 18.6]]
  let ca = 0
  for (const [a, b] of transitions) { const k = prog(t, a, b); if (k > 0 && k < 1) ca = Math.max(ca, Math.sin(k * Math.PI)) }
  const g = pipe.grade
  g.set('uCA', ca * 0.006)
  g.set('uSeed', ((frame * 0.618) % 1) * 100)
  g.set('uExposure', lerp(1, 0.78, L.dusk))
  g.set('uSat', lerp(0.86, 0.78, L.dusk))
  g.set('uVignette', lerp(0.2, 0.42, L.dusk))
  g.set('uFlare', L.flare ? 0.88 : 0)

  useFrame((_, dt) => {
    const a = performance.now()
    if (perf) {
      // Time the scene's own passes (shadows, transmission) separately from the post chain.
      const ctx = gl.getContext() as WebGL2RenderingContext
      const px = new Uint8Array(4)
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px)
    }
    const b = performance.now()
    gl.shadowMap.needsUpdate = true
    pipe.composer.render(dt)
    if (perf) {
      const ctx = gl.getContext() as WebGL2RenderingContext
      const px = new Uint8Array(4)
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px)
      console.log(`[perf] frame ${frame} pre ${(b - a).toFixed(0)}ms composer ${(performance.now() - b).toFixed(0)}ms`)
    }
  }, 1)
  return null
}

export function World({ t, frame, post = true, perf = false }: { t: number; frame: number; post?: boolean; perf?: boolean }) {
  const T0 = performance.now()
  const L = light(t)
  const cam = camera(t)

  // Report: ellipse, then (later) the seal. Repainted only when it changes.
  const [e0, e1] = ev('ellipse')
  const q = (v: number) => Math.round(v * 480) / 480
  const reportState = {
    ellipse: q(smoother(prog(t, e0, e1))),
    bleed: q(smoother(prog(t, e1, e1 + 0.8))),
    seal: t >= 10.8 ? q(smoother(prog(t, 10.8, 11.4))) : -1,
  }
  const report = painted('report', JSON.stringify(reportState), () => paintReport(reportState))
  const rp = reportPose(t)
  const T1 = performance.now()

  // Sheet: filings, exposure, morph, bodies. The bodies stop once the sheet
  // leaves the frame (10.6), so it isn't repainted for the rest of the film.
  const ts = Math.min(t, 10.6)
  const sheetState = {
    t: q(ts),
    lines: q(smoother(span(ts, ev('fieldLines')))),
    filings: q(smoother(span(ts, ev('filings')))),
    stretch: q(inQuart(span(ts, ev('spheresApart'))) * 0.9 + smoother(span(ts, ev('spheresApart'))) * 0.1),
    front: ts < ev('exposure')[0] ? -1e3 : q(lerp(-60, SHEET_MM.w + 120, smoother(span(ts, ev('exposure'))))),
    morph: q(smoother(span(ts, ev('pathsResolve')))),
    bodies: q(smoother(span(ts, ev('bodiesDraw')))),
  }
  // Before the bodies appear, time itself doesn't change the sheet.
  const sheetKey = JSON.stringify({ ...sheetState, t: sheetState.bodies > 0 ? sheetState.t : 0 })
  const sheetPaint = painted('sheet', sheetKey, () => paintSheet(sheetState))
  const sheet = converge(t, SHEET_POS, 3)
  const T2 = performance.now()
  if (perf) console.log(`[perf] frame ${frame} report ${(T1 - T0).toFixed(0)}ms sheet ${(T2 - T1).toFixed(0)}ms`)

  const card = cardPose(t)
  const [p0, p1] = ev('promptType')
  const typed = smoother(prog(t, p0, p1))
  const caret = Math.floor(t * 3.2) % 2 === 0 || typed < 1
  const prompt = card.visible ? painted('prompt', `${q(typed)}:${caret}`, () => paintPrompt(typed, caret)) : null

  const gA = gripperA(t), gB = gripperB(t)
  const glass = glassPose(t)
  const stamp = stampPose(t)
  const glove = glovePose(t)

  return (
    <>
      <Rig t={t} frame={frame} />
      <color attach="background" args={['#0B0E12']} />
      <Lights dusk={L.dusk} ignite={L.ignite} />
      <Table dusk={L.dusk} />

      <Paper pose={sheet} wm={SHEET_MM.w / 1000} hm={SHEET_MM.h / 1000} map={sheetPaint.canvas} version={sheetPaint.version} seed={2} shadow={0.28} />
      <Paper pose={rp} wm={REPORT_MM.w / 1000} hm={REPORT_MM.h / 1000} map={report.canvas} version={report.version} seed={3} shadow={0.34}
        lift={Math.sin(span(t, ev('reportOut')) * Math.PI) * 0.0015} />

      {FLASHES.map((f, i) => {
        const p = cardStackPose(t, i)
        if (!p.visible) return null
        return <Paper key={i} pose={p} wm={CARD_MM.w / 1000} hm={CARD_MM.h / 1000} map={paintCard(i, f.body)} seed={10 + i} shadow={0.42} curl={0.6}
          lift={Math.max(0, p.y - 0.0012 - i * 0.0003) * 0.4} roughness={0.8} />
      })}

      {[0, 1, 2].map(i => { const s = spherePose(t, i); return s.visible ? <Sphere key={i} {...s} /> : null })}

      {card.visible && prompt && <PromptCard x={card.x} y={card.y} z={card.z} rot={card.rot} tilt={card.tilt} screen={prompt.canvas} version={prompt.version} />}
      {glass.visible && <GlassBlock x={glass.x} z={glass.z} rot={glass.rot} />}
      {stamp.visible && <Stamp x={stamp.x} y={stamp.y} z={stamp.z} />}
      {glove.visible && <Glove x={glove.x} y={glove.y} z={glove.z} rot={glove.rot} />}
      <Gripper p={gA} />
      {gB.visible && <><Gripper p={gB} /><Pen x={gB.pen.x} y={gB.pen.y} z={gB.pen.z} /></>}

      {(() => { const p = converge(t, PROPS.wafer, 4); return <Wafer x={p.x} z={p.z} rot={p.rot} scale={p.scale} /> })()}
      {(() => { const p = converge(t, PROPS.logbook, 5); return <Logbook x={p.x} z={p.z} rot={p.rot} scale={p.scale} /> })()}
      {(() => { const p = converge(t, PROPS.ruler, 6); return <Ruler x={p.x} z={p.z} rot={p.rot} scale={p.scale} /> })()}

      <Motes t={t} />
      <ClayPoint ignite={L.ignite} />
      {post && <Post t={t} frame={frame} h={cam.h} perf={perf} />}
    </>
  )
}
