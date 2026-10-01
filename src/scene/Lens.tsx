import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, DepthOfField, Bloom } from '@react-three/postprocessing'
import type { BloomEffect, DepthOfFieldEffect } from 'postprocessing'
import { HalfFloatType } from 'three'
import { LensEffect } from './effects/LensEffect'
import { useApp } from '../state/store'
import { THEMES } from '../theme/themes'

// The lens stack, in order: depth of field (the world falls away when a panel
// has focus), bloom on bright highlights, then the lens itself.

// Panel focus distance; the city and the window frame sit well behind it.
const FOCUS_DISTANCE = 3.2
const MAX_BOKEH = 7

export function Lens() {
  const size = useThree(s => s.size)
  const dof = useRef<DepthOfFieldEffect>(null)
  const bloom = useRef<BloomEffect>(null)
  const lens = useMemo(() => new LensEffect(), [])
  const blur = useRef({ x: 0, v: 0 })

  useFrame((state, dt) => {
    const { focused, theme, reducedMotion } = useApp.getState()
    const g = THEMES[theme].lens
    // Spring (stiffness 300, damping 30) toward the focus blur.
    const s = blur.current
    const target = focused ? MAX_BOKEH : 0
    const h = Math.min(dt, 1 / 30)
    if (reducedMotion) { s.x += (target - s.x) * (1 - Math.exp(-h * 10)); s.v = 0 }
    else { s.v += (300 * (target - s.x) - 30 * s.v) * h; s.x += s.v * h }
    s.x = Math.max(0, s.x)
    if (dof.current) dof.current.bokehScale = s.x
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
      <DepthOfField ref={dof} worldFocusDistance={FOCUS_DISTANCE} worldFocusRange={1.0} bokehScale={0} resolutionScale={0.5} />
      <Bloom ref={bloom} mipmapBlur intensity={0.4} luminanceThreshold={0.78} luminanceSmoothing={0.22} radius={0.72} />
      <primitive object={lens} dispose={null} />
    </EffectComposer>
  )
}
