import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, DepthOfField, Bloom } from '@react-three/postprocessing'
import type { BloomEffect, DepthOfFieldEffect } from 'postprocessing'
import { HalfFloatType } from 'three'
import { LensEffect } from './effects/LensEffect'
import { TransitionEffect, KIND_INDEX } from './effects/TransitionEffect'
import { stepTransition, transition } from './transitions'
import { gravity } from './gravity'
import { walk } from '../head/headPose'
import type { Vector2, Vector4 } from 'three'
import { useApp } from '../state/store'
import { useTier } from '../perf/quality'
import { THEMES } from '../theme/themes'
import { focus } from './focus'

// The lens stack, in order: depth of field (the world falls away when a panel
// has focus), bloom on bright highlights, then the lens itself.

// Focus sits on the panels (2.4 to 4.2 m); the range keeps all three depths
// sharp while the window frame and the city fall away.
const FOCUS_DISTANCE = 3.3
const MAX_BOKEH = 7

export function Lens() {
  const size = useThree(s => s.size)
  const tier = useTier()
  const dof = useRef<DepthOfFieldEffect>(null)
  const bloom = useRef<BloomEffect>(null)
  const lens = useMemo(() => new LensEffect(), [])
  const trans = useMemo(() => new TransitionEffect(), [])

  useFrame((state, dt) => {
    const { theme, reducedMotion } = useApp.getState()
    const g = THEMES[theme].lens
    // The shared focus spring (stepped by the glass layer) drives the blur.
    if (dof.current) {
      dof.current.bokehScale = Math.max(0, focus.x) * MAX_BOKEH
      // Focal depth follows you as you walk toward or away from the panels.
      dof.current.cocMaterial.worldFocusDistance = FOCUS_DISTANCE - walk.z
    }
    const k = 1 - Math.exp(-dt * 3.2)
    if (bloom.current) bloom.current.intensity += (g.bloom - bloom.current.intensity) * k
    const u = lens.uniforms
    u.get('uVignette')!.value += (g.vignette - u.get('uVignette')!.value) * k
    u.get('uGrain')!.value += (g.grain - u.get('uGrain')!.value) * k
    lens.set('uSeed', reducedMotion ? 0.5 : (state.clock.elapsedTime * 24) % 1000)
    lens.setAspect(size.width, size.height)

    stepTransition()
    const tu = trans.uniforms
    tu.get('uKind')!.value = transition.kind ? KIND_INDEX[transition.kind] : 0
    tu.get('uT')!.value = transition.t
    ;(tu.get('uOrigin')!.value as { set: (x: number, y: number) => void }).set(...transition.origin)
    ;(tu.get('uTint')!.value as { set: (x: number, y: number, z: number) => void }).set(...transition.tint)
    const a = size.width / size.height
    ;(tu.get('uAspect')!.value as { set: (x: number, y: number) => void }).set(a, 1)

    // Gravity wells (CSS px) to uv: y flips, sizes divide by the viewport.
    const W = size.width, H = size.height
    ;(['A', 'B'] as const).forEach((n, i) => {
      const w = gravity.wells[i]
      const v = tu.get(`uWell${n}`)!.value as Vector4
      const r = tu.get(`uWell${n}R`)!.value as Vector2
      if (!w) { r.set(0, 0); return }
      v.set(w.cx / W, 1 - w.cy / H, w.hw / W, w.hh / H)
      r.set(w.r / H, w.mass)
    })
  })

  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType} enableNormalPass={false}>
      {/* Low quality drops depth of field (the glass still blurs what it shows) and bloom. */}
      {tier.dof && <DepthOfField ref={dof} worldFocusDistance={FOCUS_DISTANCE} worldFocusRange={8} bokehScale={0} resolutionScale={0.5} />}
      {tier.bloom && <Bloom ref={bloom} mipmapBlur intensity={0.4} luminanceThreshold={0.78} luminanceSmoothing={0.22} radius={0.72} />}
      <primitive object={trans} dispose={null} />
      <primitive object={lens} dispose={null} />
    </EffectComposer>
  )
}
