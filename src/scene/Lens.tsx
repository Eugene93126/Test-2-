import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, DepthOfField, Bloom } from '@react-three/postprocessing'
import type { BloomEffect, DepthOfFieldEffect } from 'postprocessing'
import { HalfFloatType } from 'three'
import { LensEffect } from './effects/LensEffect'
import { useApp } from '../state/store'
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
  const dof = useRef<DepthOfFieldEffect>(null)
  const bloom = useRef<BloomEffect>(null)
  const lens = useMemo(() => new LensEffect(), [])

  useFrame((state, dt) => {
    const { theme, reducedMotion } = useApp.getState()
    const g = THEMES[theme].lens
    // The shared focus spring (stepped by the glass layer) drives the blur.
    if (dof.current) dof.current.bokehScale = Math.max(0, focus.x) * MAX_BOKEH
    const k = 1 - Math.exp(-dt * 3.2)
    if (bloom.current) bloom.current.intensity += (g.bloom - bloom.current.intensity) * k
    const u = lens.uniforms
    u.get('uVignette')!.value += (g.vignette - u.get('uVignette')!.value) * k
    u.get('uGrain')!.value += (g.grain - u.get('uGrain')!.value) * k
    lens.set('uSeed', reducedMotion ? 0.5 : (state.clock.elapsedTime * 24) % 1000)
    lens.setAspect(size.width, size.height)
  })

  return (
    <EffectComposer multisampling={0} frameBufferType={HalfFloatType} enableNormalPass={false}>
      <DepthOfField ref={dof} worldFocusDistance={FOCUS_DISTANCE} worldFocusRange={8} bokehScale={0} resolutionScale={0.5} />
      <Bloom ref={bloom} mipmapBlur intensity={0.4} luminanceThreshold={0.78} luminanceSmoothing={0.22} radius={0.72} />
      <primitive object={lens} dispose={null} />
    </EffectComposer>
  )
}
