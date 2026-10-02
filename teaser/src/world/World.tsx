import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { BloomEffect, DepthOfFieldEffect, EdgeDetectionMode, EffectComposer as PPComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode } from 'postprocessing'
import { N8AOPostPass } from 'n8ao'
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

const EXPOSURE = 0.64
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
      <hemisphereLight args={['#EEF2F5', '#8F969B', lerp(0.5, 0.08, dusk)]} />
      {/* A warm pool around the point (three clamps falloff inside 10 cm, so the cutoff shapes it);
          the rest of the table stays at dusk. */}
      <pointLight position={[POINT.x, 0.03, POINT.z]} color="#E0784A" intensity={ignite * 0.03} distance={0.16} decay={2} />
      <Environment resolution={256} frames={1} environmentIntensity={lerp(0.85, 0.1, dusk)}>
        {/* The room the steel reflects: a soft grey studio, bright paper below, a dark lens above. */}
        <mesh scale={8}><sphereGeometry args={[1, 32, 16]} /><meshBasicMaterial color="#6E767C" side={THREE.BackSide} /></mesh>
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[6, 48]} /><meshBasicMaterial color="#D2D7DA" /></mesh>
        <mesh position={[0, 4.6, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.55, 48]} /><meshBasicMaterial color="#141A20" side={THREE.DoubleSide} /></mesh>
        <Lightformer form="rect" intensity={6} position={[-1.7, 2.0, -1.3]} scale={[1.5, 1.0, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} position={[1.9, 0.3, 1.1]} scale={[0.12, 0.8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.35} color="#C4C9CD" position={[0, -1.2, 0]} scale={[6, 6, 1]} target={[0, 0, 0]} />
        {/* Overhead diffusion, round so the spheres read as polished, not faceted. */}
        <Lightformer form="ring" intensity={0.5} position={[0, 4, 0]} scale={[2.6, 2.6, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  )
}

/**
 * Dust: a few hundred motes drifting through the daylight, soft and out of
 * focus away from the page. In S6 the same motes are pulled into the point and
 * pick up its clay light as they arrive.
 */
const DUST_N = 900
const dustVert = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
uniform float uScale;
uniform float uFocus;
uniform float uRange;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  float sharp = aSize * uScale / d;
  float coc = min(36.0, abs(d - uFocus) / uRange * 3.0);
  float px = max(1.5, sharp + coc);
  gl_PointSize = px;
  // The same light spread over a wider disc when out of focus.
  vColor = aColor * clamp((sharp * sharp + 2.0) / (px * px), 0.03, 1.0);
}
`
const dustFrag = /* glsl */ `
varying vec3 vColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  gl_FragColor = vec4(vColor * smoothstep(1.0, 0.5, r), 1.0);
}
`

function Dust({ t, h }: { t: number; h: number }) {
  const height = useThree(s => s.size.height)
  const { geo, mat, seeds } = useMemo(() => {
    const r = rng(616)
    const seeds = Array.from({ length: DUST_N }, () => ({
      x: -0.62 + r() * 1.24, z: -0.42 + r() * 0.84, y: 0.004 + Math.pow(r(), 1.5) * 0.14,
      ph: r() * 100, sp: 0.5 + r() * 0.9, size: 0.0002 + Math.pow(r(), 3) * 0.001, delay: r() * 0.3, b: r(),
    }))
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(seeds.map(s => s.size)), 1))
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 }, uFocus: { value: 1 }, uRange: { value: 0.02 } },
      vertexShader: dustVert, fragmentShader: dustFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
    return { geo, mat, seeds }
  }, [])
  const L = light(t)
  const c = span(t, ev('converge'))
  const day = 1 - L.dusk
  const H = h / TAN
  mat.uniforms.uScale.value = height / TAN
  mat.uniforms.uFocus.value = H
  mat.uniforms.uRange.value = Math.max(0.012, H * 0.05)
  const pos = geo.attributes.position as THREE.BufferAttribute, col = geo.attributes.aColor as THREE.BufferAttribute
  const clay = [0.85, 0.47, 0.34]
  seeds.forEach((s, i) => {
    // Drift: slow, mostly sideways, with a faint draft toward the window's far side.
    let x = s.x + Math.sin(t * 0.13 * s.sp + s.ph) * 0.006 + t * 0.0012
    let y = s.y + Math.sin(t * 0.21 * s.sp + s.ph * 1.3) * 0.004
    let z = s.z + Math.cos(t * 0.11 * s.sp + s.ph * 0.7) * 0.005
    let glow = 0
    if (c > 0) {
      const e = inQuart(clamp((c - s.delay) / (1 - s.delay)))
      const dx = x - POINT.x, dz = z - POINT.z, sw = e * 2.4
      x = POINT.x + (dx * Math.cos(sw) - dz * Math.sin(sw)) * (1 - e)
      z = POINT.z + (dx * Math.sin(sw) + dz * Math.cos(sw)) * (1 - e)
      y = lerp(y, 0.006, e)
      const d = Math.hypot(x - POINT.x, z - POINT.z)
      glow = (L.ignite * 1.0 + 0.06 * c) / (1 + (d / 0.035) ** 2) * (0.4 + s.b)
    }
    pos.setXYZ(i, x, y, z)
    const w = day * 0.22 * (0.25 + s.b)
    col.setXYZ(i, w * 0.86 + glow * clay[0], w * 0.92 + glow * clay[1], w * 0.98 + glow * clay[2])
  })
  pos.needsUpdate = true
  col.needsUpdate = true
  return <points geometry={geo} material={mat} renderOrder={5} frustumCulled={false} />
}

function ClayPoint({ ignite }: { ignite: number }) {
  if (ignite <= 0) return null
  const r = 0.0022 + ignite * 0.004
  return (
    <mesh position={[POINT.x, 0.016, POINT.z]}>
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
    // Ambient occlusion: the darkening in creases and contacts a path tracer
    // would give for free (paper on table, steel on paper, fingers on a page).
    const ao = new N8AOPostPass(scene, cam, size.width, size.height)
    ao.autosetGamma = false
    Object.assign(ao.configuration, { aoRadius: 0.018, distanceFalloff: 0.5, intensity: 2.4, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 8, halfRes: true, gammaCorrection: false })
    composer.addPass(ao)
    composer.addPass(new EffectPass(cam, new SMAAEffect({ preset: SMAAPreset.HIGH, edgeDetectionMode: EdgeDetectionMode.COLOR })))
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
  pipe.dof.cocMaterial.worldFocusRange = Math.max(0.012, H * 0.085)
  pipe.bloom.intensity = 0.25 + L.ignite * 0.8
  // Chromatic aberration only at transitions.
  const transitions = [[0.95, 1.55], [2.7, 3.3], [5.85, 6.55], [9.0, 10.6], [10.8, 10.9], [11.85, 12.1], [17.9, 18.6]]
  let ca = 0
  for (const [a, b] of transitions) { const k = prog(t, a, b); if (k > 0 && k < 1) ca = Math.max(ca, Math.sin(k * Math.PI)) }
  const g = pipe.grade
  g.set('uCA', ca * 0.006)
  g.set('uSeed', ((frame * 0.618) % 1) * 100)
  // Exposure before tone mapping: paper sits at cool paper, not at white.
  gl.toneMappingExposure = EXPOSURE
  g.set('uExposure', lerp(1, 0.86, L.dusk))
  // The clay is the one warm thing: as it ignites the cool grade lets go.
  g.set('uSat', lerp(lerp(0.86, 0.8, L.dusk), 1.0, L.ignite))
  g.tint(lerp(0.985, 1.0, L.ignite), 1.0, lerp(1.02, 0.99, L.ignite))
  g.set('uVignette', lerp(0.2, 0.4, L.dusk))
  g.set('uFlare', L.flare ? 0.88 : 0)

  // Shadows first, before any transmission material renders its buffer, so the
  // glass refracts a lit scene; then once per frame only.
  useFrame(() => { gl.shadowMap.needsUpdate = true }, -1)

  useFrame((_, dt) => {
    const a = performance.now()
    if (perf) {
      // Time the scene's own passes (shadows, transmission) separately from the post chain.
      const ctx = gl.getContext() as WebGL2RenderingContext
      const px = new Uint8Array(4)
      ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px)
    }
    const b = performance.now()
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

      <Paper pose={sheet} wm={SHEET_MM.w / 1000} hm={SHEET_MM.h / 1000} map={sheetPaint.canvas} version={sheetPaint.version} seed={2} shadow={0.28} mips={false} />
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

      <Dust t={t} h={cam.h} />
      <ClayPoint ignite={L.ignite} />
      {post && <Post t={t} frame={frame} h={cam.h} perf={perf} />}
    </>
  )
}
