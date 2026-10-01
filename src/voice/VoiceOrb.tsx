import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sampleLevel, useVoice } from './voice'
import { useApp } from '../state/store'
import { DEPTH } from '../glass/registry'
import { foreground } from '../glass/GlassLayer'

// The voice orb: a small sphere of light in front of the main window, sitting
// exactly where the composer's orb button is. It breathes when idle, swells
// and wobbles with your voice, swirls while thinking and pulses as Claude talks.

export const orbAnchor = { el: null as HTMLElement | null }

const vertex = /* glsl */ `
uniform float uTime;
uniform float uLevel;
varying vec3 vN;
varying vec3 vP;
varying vec3 vView;
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  vec3 p = position;
  float n = noise(normal * 2.2 + uTime * 0.9) - 0.5;
  p += normal * n * (0.05 + uLevel * 0.28);
  vP = position;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`

const fragment = /* glsl */ `
uniform float uTime;
uniform float uLevel;
uniform float uThink;
uniform float uPresence;
uniform vec3 uCore;
uniform vec3 uRim;
varying vec3 vN;
varying vec3 vP;
varying vec3 vView;
void main(){
  float facing = clamp(dot(normalize(vN), vView), 0.0, 1.0);
  float rim = pow(1.0 - facing, 2.4);
  // Inner swirl: bands of light turning around the vertical axis.
  float a = atan(vP.z, vP.x) + uTime * (0.6 + uThink * 2.6);
  float swirl = 0.5 + 0.5 * sin(a * 3.0 + vP.y * 6.0 - uTime * 1.3);
  float core = pow(facing, 1.6);
  vec3 col = uCore * (0.55 + 0.9 * core) * (0.75 + 0.35 * swirl);
  col += uRim * rim * (1.1 + uLevel * 1.4);
  col *= 1.0 + uLevel * 1.1;
  float alpha = (0.55 + 0.45 * core + rim) * uPresence;
  gl_FragColor = vec4(col * uPresence, clamp(alpha, 0.0, 1.0));
}`

export function VoiceOrb() {
  const mesh = useRef<THREE.Mesh>(null)
  // The material is built once here and handed to the mesh as-is, so the
  // uniforms written each frame are the ones the GPU reads.
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTime: { value: 0 }, uLevel: { value: 0 }, uThink: { value: 0 }, uPresence: { value: 0 },
      uCore: { value: new THREE.Color('#D97757').multiplyScalar(1.15) }, uRim: { value: new THREE.Color('#FFE6D2') },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }), [])
  const uniforms = material.uniforms
  useEffect(() => {
    const m = mesh.current
    if (!m) return
    foreground.add(m)
    return () => { foreground.delete(m) }
  }, [])
  const state = useRef({ presence: 0, pv: 0, scale: 1, sv: 0, measuredAt: -1, rest: { x: 0, y: 0, w: 0, h: 0 } })

  useFrame((s, dt) => {
    const m = mesh.current
    if (!m) return
    const st = state.current
    const el = orbAnchor.el
    const { section, modal, glances } = useApp.getState()
    const phase = useVoice.getState().phase
    const show = !!el && el.isConnected && section === 'chat' && !modal && !glances
    const h = Math.min(dt, 1 / 30)
    st.pv += (300 * ((show ? 1 : 0) - st.presence) - 30 * st.pv) * h
    st.presence = Math.max(0, st.presence + st.pv * h)
    m.visible = st.presence > 0.01
    if (!m.visible || !el) return

    // Re-measure the anchor's layout box now and then (it only moves on resize).
    const t = s.clock.elapsedTime
    if (t - st.measuredAt > 0.5) {
      let x = 0, y = 0, n: HTMLElement | null = el
      while (n && !n.hasAttribute('data-overlay-root')) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null }
      st.rest = { x, y, w: el.offsetWidth, h: el.offsetHeight }
      st.measuredAt = t
    }
    const cam = s.camera as THREE.PerspectiveCamera
    const d = DEPTH.mid - 0.08
    const perPx = (2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / s.size.height
    const r = st.rest
    m.position.set((r.x + r.w / 2 - s.size.width / 2) * perPx, (s.size.height / 2 - (r.y + r.h / 2)) * perPx, -d)

    const level = sampleLevel(t)
    const target = phase === 'listening' ? 1.25 + level * 0.35 : phase === 'speaking' ? 1.1 + level * 0.2 : phase === 'thinking' ? 1.05 : 1 + Math.sin(t * 1.6) * 0.03
    st.sv += (300 * (target - st.scale) - 22 * st.sv) * h
    st.scale += st.sv * h
    const radius = (r.w / 2) * perPx * 0.82
    m.scale.setScalar(radius * st.scale * Math.min(1, st.presence))
    uniforms.uTime.value = t
    uniforms.uLevel.value = level
    uniforms.uThink.value += ((phase === 'thinking' ? 1 : 0) - uniforms.uThink.value) * 0.1
    uniforms.uPresence.value = Math.min(1, st.presence)
  })

  return (
    <mesh ref={mesh} renderOrder={6} material={material}>
      <sphereGeometry args={[1, 48, 32]} />
    </mesh>
  )
}
