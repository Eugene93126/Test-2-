import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial, useFBO } from '@react-three/drei'
import { KawaseBlurPass, KernelSize } from 'postprocessing'
import * as THREE from 'three'
import { panels, usePanelIds, type PanelEntry } from './registry'
import { slabGeometry } from './geometry'
import { GLASS_LOOKS, patchGlass, sharedGlass, slabUniforms, type SlabUniforms } from './material'
import { head } from '../head/headPose'
import { focus, stepFocus } from '../scene/focus'
import { useApp } from '../state/store'

const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
const SAMPLES = coarse ? 3 : 5
const BUFFER_SCALE = coarse ? 0.6 : 0.85

interface Slab { mesh: THREE.Mesh; mat: THREE.MeshPhysicalMaterial & { uniforms: Record<string, THREE.IUniform> }; u: SlabUniforms; geo: { w: number; h: number; r: number; at: number } }
const slabs = new Map<string, Slab>()

function GlassSlab({ id, buffer }: { id: string; buffer: THREE.Texture }) {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<Slab['mat']>(null)
  const u = useMemo(() => slabUniforms(), [])
  const look = GLASS_LOOKS[useApp.getState().theme]

  // Child refs are attached before this runs, and before the first frame renders.
  useLayoutEffect(() => {
    if (!mesh.current || !mat.current) return
    patchGlass(mat.current, u)
    slabs.set(id, { mesh: mesh.current, mat: mat.current, u, geo: { w: 0, h: 0, r: 0, at: -1 } })
    return () => {
      slabs.get(id)?.mesh.geometry.dispose()
      slabs.delete(id)
    }
  }, [id, u])

  return (
    <mesh ref={mesh} renderOrder={2}>
      <boxGeometry args={[0.001, 0.001, 0.001]} />
      <MeshTransmissionMaterial
        ref={mat as never}
        buffer={buffer}
        resolution={1}
        backsideResolution={1}
        samples={SAMPLES}
        transmission={1}
        thickness={0.4}
        ior={1.46}
        chromaticAberration={0.045}
        anisotropicBlur={0.03}
        roughness={0}
        distortion={0}
        clearcoat={0.25}
        clearcoatRoughness={0.08}
        envMapIntensity={0.2}
        color={new THREE.Color(...look.color)}
        attenuationColor={new THREE.Color(...look.attenuation)}
        attenuationDistance={1.4}
        toneMapped={false}
      />
    </mesh>
  )
}

const tmp = new THREE.Vector3()
const tmpC = new THREE.Color()

export function GlassLayer() {
  const ids = usePanelIds(s => s.ids)
  const group = useRef<THREE.Group>(null)
  const gl = useThree(s => s.gl)
  const size = useThree(s => s.size)
  const dpr = useThree(s => s.viewport.dpr)
  const bw = Math.max(2, Math.round(size.width * dpr * BUFFER_SCALE))
  const bh = Math.max(2, Math.round(size.height * dpr * BUFFER_SCALE))
  const sharp = useFBO(bw, bh, { type: THREE.HalfFloatType, samples: 0, depthBuffer: true })
  const blurred = useFBO(bw, bh, { type: THREE.HalfFloatType, samples: 0, depthBuffer: false })
  const kawase = useMemo(() => new KawaseBlurPass({ kernelSize: KernelSize.LARGE, resolutionScale: 0.5 }), [])
  useEffect(() => { kawase.setSize(bw, bh) }, [kawase, bw, bh])
  useEffect(() => () => kawase.dispose(), [kawase])

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera
    const W = state.size.width, H = state.size.height
    const dpx = state.viewport.dpr
    const now = performance.now() / 1000
    stepFocus(dt)

    // Theme: ease shared glass uniforms toward the current look.
    const { theme, reducedMotion } = useApp.getState()
    const look = GLASS_LOOKS[theme]
    const k = 1 - Math.exp(-dt * 3.2)
    sharedGlass.uMilk.value.lerp(tmp.set(...look.milk), k)
    sharedGlass.uMilkAmt.value += (look.milkAmt - sharedGlass.uMilkAmt.value) * k
    sharedGlass.uRim.value.lerp(tmp.set(...look.rim), k)
    sharedGlass.uRimAmt.value += (look.rimAmt - sharedGlass.uRimAmt.value) * k
    sharedGlass.uSheen.value += (look.sheen - sharedGlass.uSheen.value) * k
    sharedGlass.uEdgeDark.value += (look.edgeDark - sharedGlass.uEdgeDark.value) * k
    sharedGlass.uHead.value.set(head.x * head.amount, head.y * head.amount)
    sharedGlass.uResolution.value.set(W * dpx, H * dpx)
    sharedGlass.uNow.value = now

    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    for (const [id, s] of slabs) {
      const e = panels.get(id)
      if (!e || e.rest.w === 0) { s.mesh.visible = false; continue }
      placeSlab(e, s, cam, W, H, dpx, tanHalf, now, dt, reducedMotion)
      s.mat.color.lerp(tmpC.setRGB(...look.color), k)
      ;(s.mat.uniforms.attenuationColor.value as THREE.Color).lerp(tmpC.setRGB(...look.attenuation), k)
    }

    // Shared refraction buffer: the world without the glass, blurred when a panel has focus.
    const g = group.current
    if (!g || slabs.size === 0) return
    g.visible = false
    gl.setRenderTarget(sharp)
    gl.clear()
    gl.render(state.scene, cam)
    let tex: THREE.Texture = sharp.texture
    const blur = Math.min(1, focus.x)
    if (blur > 0.02) {
      kawase.scale = blur * 1.6
      kawase.render(gl, sharp, blurred)
      tex = blurred.texture
    }
    gl.setRenderTarget(null)
    g.visible = true
    for (const s of slabs.values()) s.mat.uniforms.buffer.value = tex
  }, -100)

  return (
    <group ref={group}>
      {ids.map(id => <GlassSlab key={id} id={id} buffer={sharp.texture} />)}
    </group>
  )
}

function placeSlab(e: PanelEntry, s: Slab, cam: THREE.PerspectiveCamera, W: number, H: number, dpx: number,
  tanHalf: number, now: number, dt: number, reduced: boolean) {
  const d = e.depth
  const perPx = (2 * d * tanHalf) / H
  const w = e.rest.w * perPx, h = e.rest.h * perPx
  const cx = (e.rest.x + e.rest.w / 2 - W / 2) * perPx
  const cy = (H / 2 - (e.rest.y + e.rest.h / 2)) * perPx
  const r = e.radius * perPx
  e.world = { w, h, cx, cy }

  // Rebuild the slab when its size changes (resizes are rare; throttled).
  const gg = s.geo
  if ((Math.abs(w - gg.w) > gg.w * 0.004 || Math.abs(h - gg.h) > gg.h * 0.004 || Math.abs(r - gg.r) > 0.002) && now - gg.at > 0.12) {
    const old = s.mesh.geometry
    s.mesh.geometry = slabGeometry(w, h, r)
    old.dispose()
    s.geo = { w, h, r, at: now }
  }
  // Between rebuilds, stretch the current slab to the new size.
  const sx = s.geo.w > 0 ? w / s.geo.w : 1, sy = s.geo.h > 0 ? h / s.geo.h : 1

  // Presence: the slab rises a little toward you as it appears.
  const p = e.presence.get()
  const lift = reduced ? 0 : (1 - p) * 0.18
  const grow = reduced ? 1 : 0.94 + 0.06 * p
  s.mesh.visible = p > 0.001
  s.mesh.position.set(cx, cy, -d - lift)
  s.mesh.scale.set(sx * grow, sy * grow, 1)
  s.u.uPresence.value = p
  s.u.uSlabSize.value.set(w, h)

  // Hover spring (300 / 30) and pointer.
  const hh = Math.min(dt, 1 / 30)
  e.hoverV += (300 * (e.hoverTarget - e.hover) - 30 * e.hoverV) * hh
  e.hover += e.hoverV * hh
  s.u.uHover.value = reduced ? e.hoverTarget * 0.5 : Math.max(0, e.hover)
  s.u.uPointer.value.set(e.pointer.x, e.pointer.y)

  // Ripples: age in seconds, dropped after they fade. (window.__rippleAge pins
  // the age for screenshots on slow software renderers.)
  const pinned = (window as unknown as { __rippleAge?: number }).__rippleAge
  if (pinned == null) e.ripples = e.ripples.filter(rp => now - rp.t < 2.4)
  s.u.uRipples.value.forEach((v, i) => {
    const rp = e.ripples[i]
    if (rp && !reduced) v.set(rp.x, rp.y, pinned ?? now - rp.t, rp.strength)
    else v.set(0, 0, 0, 0)
  })

  // Glue the DOM to the slab: project its center and edge, then translate and scale.
  const pc = tmp.set(cx, cy, -d - lift).project(cam)
  const px = (pc.x + 1) * 0.5 * W, py = (1 - pc.y) * 0.5 * H
  const pe = tmp.set(cx + (w / 2) * grow, cy, -d - lift).project(cam)
  const ex = (pe.x + 1) * 0.5 * W
  let scale = ((ex - px) * 2) / e.rest.w
  if (Math.abs(scale - 1) < 0.0015) scale = 1
  const q = 1 / dpx
  const dx = Math.round((px - (e.rest.x + e.rest.w / 2)) / q) * q
  const dy = Math.round((py - (e.rest.y + e.rest.h / 2)) / q) * q
  const t = `translate3d(${dx}px, ${dy}px, 0) scale(${scale.toFixed(4)})`
  if (t !== e.lastTransform) {
    e.el.style.transform = t
    e.lastTransform = t
  }
}
