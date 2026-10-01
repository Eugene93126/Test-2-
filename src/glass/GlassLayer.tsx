import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial, useFBO } from '@react-three/drei'
import { KawaseBlurPass, KernelSize } from 'postprocessing'
import * as THREE from 'three'
import { DEPTH, panels, usePanelIds, type PanelEntry } from './registry'
import { slabGeometry } from './geometry'
import { GLASS_LOOKS, patchGlass, sharedGlass, slabUniforms, type SlabUniforms } from './material'
import { head, walk } from '../head/headPose'
import { focus, stepFocus } from '../scene/focus'
import { mergeAmount } from '../scene/transitions'
import { commitWells, gravity, massOf, pullOn } from '../scene/gravity'
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
        iridescence={0.9}
        iridescenceIOR={1.32}
        iridescenceThicknessRange={[180, 560]}
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
const raster = { z: 0 }

/** Objects in front of the glass (the voice orb): left out of what the glass refracts. */
export const foreground = new Set<THREE.Object3D>()

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
  // Second buffer for overlay glass: the world plus the panels behind the overlay.
  const sharpB = useFBO(bw, bh, { type: THREE.HalfFloatType, samples: 0, depthBuffer: true })
  const blurredB = useFBO(bw, bh, { type: THREE.HalfFloatType, samples: 0, depthBuffer: false })
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
    commitWells()

    // Panels keep one raster while you walk so the ride stays smooth; once you
    // stop, redraw them sharp at their new size.
    if (walk.settledFor > 0.25 && Math.abs(walk.z - raster.z) > 0.03) {
      raster.z = walk.z
      panels.forEach(p => { p.el.style.willChange = 'auto' })
      requestAnimationFrame(() => panels.forEach(p => { p.el.style.willChange = '' }))
    }

    // Shared refraction buffer: the world without the glass, blurred when a panel has focus.
    const g = group.current
    if (!g || slabs.size === 0) return
    g.visible = false
    const fgVisible = [...foreground].map(o => { const v = o.visible; o.visible = false; return v })
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
    g.visible = true
    for (const s of slabs.values()) s.mat.uniforms.buffer.value = tex

    // Overlay glass sees the base panels through it: render them into a second buffer.
    let overlays = 0
    for (const [id, s] of slabs) if (s.mesh.visible && panels.get(id)?.layer === 1) { s.mesh.visible = false; overlays++ }
    if (overlays) {
      gl.setRenderTarget(sharpB)
      gl.clear()
      gl.render(state.scene, cam)
      let texB: THREE.Texture = sharpB.texture
      if (blur > 0.02) { kawase.render(gl, sharpB, blurredB); texB = blurredB.texture }
      for (const [id, s] of slabs) {
        if (panels.get(id)?.layer !== 1) continue
        s.mesh.visible = (panels.get(id)?.presence.get() ?? 0) > 0.001
        s.mat.uniforms.buffer.value = texB
      }
    }
    gl.setRenderTarget(null)
    ;[...foreground].forEach((o, i) => { o.visible = fgVisible[i] })
  }, -100)

  return (
    <group ref={group}>
      {ids.map(id => <GlassSlab key={id} id={id} buffer={sharp.texture} />)}
    </group>
  )
}

function placeSlab(e: PanelEntry, s: Slab, cam: THREE.PerspectiveCamera, W: number, H: number, dpx: number,
  tanHalf: number, now: number, dt: number, reduced: boolean) {
  // During Odyssey's merge every layer flows toward the main window's plane.
  const m = mergeAmount()
  const d = e.depth + (DEPTH.mid - e.depth) * m * 0.8
  // World size comes from the panel's home depth, so moving it in depth changes
  // how big it looks: far cards swell forward, near chrome settles back.
  const perPx = (2 * e.depth * tanHalf) / H
  const w = e.rest.w * perPx, h = e.rest.h * perPx
  const cx = (e.rest.x + e.rest.w / 2 - W / 2) * perPx
  const cy = (H / 2 - (e.rest.y + e.rest.h / 2)) * perPx
  const r = e.radius * perPx
  e.world = { w, h, cx, cy }

  // Moving windows bend space: neighbors lean toward them and stretch along the pull.
  const pull = reduced ? { dx: 0, dy: 0, sx: 1, sy: 1 } : pullOn(e.id, e.rest.x + e.rest.w / 2, e.rest.y + e.rest.h / 2)
  const pcx = cx + pull.dx * perPx, pcy = cy - pull.dy * perPx

  // The glass eases to a new size (Dock pins, sheets); the text lays out at once.
  const z = e.size
  if (z.w === 0 || reduced) { z.w = w; z.h = h; z.vw = 0; z.vh = 0 }
  else {
    const hs = Math.min(dt, 1 / 30)
    z.vw += (300 * (w - z.w) - 30 * z.vw) * hs; z.w += z.vw * hs
    z.vh += (300 * (h - z.h) - 30 * z.vh) * hs; z.h += z.vh * hs
  }
  const gw = z.w, gh = z.h

  // Rebuild the slab when its size changes (resizes are rare; throttled).
  const gg = s.geo
  if ((Math.abs(gw - gg.w) > gg.w * 0.004 || Math.abs(gh - gg.h) > gg.h * 0.004 || Math.abs(r - gg.r) > 0.002) && now - gg.at > 0.12) {
    const old = s.mesh.geometry
    s.mesh.geometry = slabGeometry(gw, gh, r)
    old.dispose()
    s.geo = { w: gw, h: gh, r, at: now }
  }
  // Between rebuilds, stretch the current slab to the new size.
  const sx = s.geo.w > 0 ? gw / s.geo.w : 1, sy = s.geo.h > 0 ? gh / s.geo.h : 1

  // Presence: the slab rises a little toward you as it appears. Flight: it
  // travels in from deeper space and overshoots toward you before settling.
  const p = e.presence.get()
  const lift = reduced ? 0 : (1 - p) * 0.18
  const grow = reduced ? 1 : 0.94 + 0.06 * p
  const flight = reduced ? 0 : (1 - e.fly.get()) * 2.0
  const pz = -d - lift - flight
  s.mesh.visible = p > 0.001
  s.mesh.position.set(pcx, pcy, pz)
  s.mesh.scale.set(sx * grow * pull.sx, sy * grow * pull.sy, 1)
  s.u.uPresence.value = p
  s.u.uSlabSize.value.set(gw, gh)

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
  const pc = tmp.set(pcx, pcy, pz).project(cam)
  const px = (pc.x + 1) * 0.5 * W, py = (1 - pc.y) * 0.5 * H
  const pe = tmp.set(pcx + (w / 2) * grow, pcy, pz).project(cam)
  const ex = (pe.x + 1) * 0.5 * W
  let scale = ((ex - px) * 2) / e.rest.w
  if (Math.abs(scale - 1) < 0.0015) scale = 1
  e.apparentScale = scale

  // A window moving through depth carries mass: record it as a gravity well.
  const mass = reduced ? 0 : massOf(e)
  if (mass > 0.01) gravity.next.push({ id: e.id, cx: px, cy: py, hw: (e.rest.w / 2) * scale, hh: (e.rest.h / 2) * scale, r: e.radius * scale, mass })

  const q = 1 / dpx
  const dx = Math.round((px - (e.rest.x + e.rest.w / 2)) / q) * q
  const dy = Math.round((py - (e.rest.y + e.rest.h / 2)) / q) * q
  const ssx = (scale * pull.sx).toFixed(4), ssy = (scale * pull.sy).toFixed(4)
  const t = `translate3d(${dx}px, ${dy}px, 0) scale(${ssx}, ${ssy})`
  if (t !== e.lastTransform) {
    e.el.style.transform = t
    e.lastTransform = t
  }

  // Distance mapping: stepping back makes type smaller and thinner on the
  // display, so strokes thicken a touch to hold its weight. Keyed to where you
  // are walking to, not to flights, so text isn't redrawn mid-animation.
  const far = e.depth / Math.max(0.5, e.depth + walk.target)
  const stroke = far < 1 ? Math.min(0.55, (1 / far - 1) * 0.9) : 0
  const sq = Math.round(stroke * 20) / 20
  if (sq !== e.stroke) {
    e.el.style.setProperty('--q-stroke', `${sq}px`)
    e.stroke = sq
  }
}
