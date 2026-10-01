import { Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Environment, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { CityBackdrop } from './CityBackdrop'
import { WindowFrame } from './WindowFrame'
import { Lens } from './Lens'
import { GlassLayer } from '../glass/GlassLayer'
import { VoiceOrb } from '../voice/VoiceOrb'
import { PerfProbe } from '../perf/perf'
import { Base64HDRLoader } from './hdri'
import { head, stepHead, walk } from '../head/headPose'
import { stepGaze } from '../gaze/quantum'
import { useApp } from '../state/store'
import { TIERS, stepTier } from '../perf/quality'

const BASE = import.meta.env.BASE_URL

/** Where the eye rests: the main panel's depth. Panels stay steady, the world slides. */
export const FIXATION = 3.2
const HEAD_TRAVEL_X = 0.1 // meters at full mouse travel
const HEAD_TRAVEL_Y = 0.06

function HeadRig() {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const size = useThree(s => s.size)

  useEffect(() => {
    // Keep roughly the same horizontal field of view on tall screens.
    const a = size.width / size.height
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(19)) * Math.max(a, 1.6))
    camera.fov = a >= 1.6 ? 38 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / a))
    camera.fov = Math.min(camera.fov, 72)
    camera.updateProjectionMatrix()
  }, [camera, size])

  useFrame((state, dt) => {
    const { headMotion, reducedMotion } = useApp.getState()
    stepHead(dt, headMotion, reducedMotion, state.clock.elapsedTime)
    const a = head.amount
    camera.position.set(head.x * HEAD_TRAVEL_X * a, head.y * HEAD_TRAVEL_Y * a, walk.z)
    camera.lookAt(0, 0, -FIXATION)
    stepGaze()
  }, -500)
  return null
}

/** Dusk HDRI (Venice Sunset, Poly Haven, CC0) lights the frame and, later, the glass. */
function DuskEnvironment() {
  const map = useLoader(Base64HDRLoader, `${BASE}hdri/venice_sunset_1k.hdr.b64.txt`)
  return <Environment map={map} environmentIntensity={0.55} />
}

export function Stage() {
  const tier = useApp(s => s.tier)
  const cap = Math.min(window.devicePixelRatio, TIERS[tier].dpr)
  const [dpr, setDpr] = useState(cap)
  const [visible, setVisible] = useState(!document.hidden)
  useEffect(() => setDpr(d => Math.min(d, cap)), [cap])
  // Nothing renders in a background tab.
  useEffect(() => {
    const on = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return (
    <Canvas
      className="stage"
      dpr={Math.min(dpr, cap)}
      frameloop={visible ? 'always' : 'never'}
      flat
      gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 200, position: [0, 0, 0] }}
      aria-hidden="true"
    >
      {/* Long frames lower the resolution first, then (in Auto) the quality tier. */}
      <PerformanceMonitor
        onDecline={() => setDpr(d => { if (d > 1) return Math.max(1, d - 0.25); stepTier(-1); return d })}
        onIncline={() => setDpr(d => { if (d < cap) return Math.min(cap, d + 0.25); stepTier(1); return d })}
        flipflops={4}
      />
      <HeadRig />
      <ambientLight intensity={0.35} color="#ffd8b0" />
      <Suspense fallback={null}>
        <DuskEnvironment />
      </Suspense>
      <CityBackdrop />
      <WindowFrame />
      <GlassLayer />
      <VoiceOrb />
      <Lens />
      <PerfProbe />
    </Canvas>
  )
}
