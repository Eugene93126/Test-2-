import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// The apartment window: black steel mullions, a sill, and a faint reflection of
// the room on the glass. Real geometry, so it slides against the city when
// your head moves.

export const FRAME_DISTANCE = 6.5

const reflVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

// A warm lamp somewhere behind you, reflected low in the glass, plus a cool
// sheen from the sky near the top.
const reflFragment = /* glsl */ `
uniform float uStrength;
varying vec2 vUv;
void main(){
  vec2 p = vUv - vec2(0.12, 0.16);
  float lamp = exp(-dot(p * vec2(1.6, 2.4), p * vec2(1.6, 2.4)) * 9.0);
  float sheen = smoothstep(0.55, 1.0, vUv.y) * 0.35;
  vec3 c = vec3(1.0, 0.72, 0.45) * lamp * 0.9 + vec3(0.55, 0.62, 0.8) * sheen * 0.25;
  gl_FragColor = vec4(c * uStrength, 1.0);
}`

export function WindowFrame() {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const group = useRef<THREE.Group>(null)
  const parts = useRef<Record<string, THREE.Mesh | null>>({})
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0c0b', metalness: 0.6, roughness: 0.5, envMapIntensity: 0.28 }), [])
  const reflUniforms = useMemo(() => ({ uStrength: { value: 0.07 } }), [])

  useFrame(() => {
    const hh = FRAME_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const hw = hh * camera.aspect
    const p = parts.current
    // One mullion off to the left, one at the far right edge; on a phone both fall outside the view.
    const left = Math.min(-hw * 0.9, -3.0), right = Math.max(hw * 1.02, 3.4)
    p.left?.position.set(left, 0, 0)
    p.right?.position.set(right, 0, 0)
    p.sill?.position.set(0, -hh * 1.02, 0.12)
    p.sill?.scale.set(hw * 2.6, 1, 1)
    p.glass?.scale.set(hw * 2.2, hh * 2.2, 1)
  })

  return (
    <group ref={group} position={[0, 0, -FRAME_DISTANCE]}>
      <mesh ref={m => { parts.current.left = m }} material={steel}>
        <boxGeometry args={[0.05, 12, 0.14]} />
      </mesh>
      <mesh ref={m => { parts.current.right = m }} material={steel}>
        <boxGeometry args={[0.05, 12, 0.14]} />
      </mesh>
      <mesh ref={m => { parts.current.sill = m }} material={steel}>
        <boxGeometry args={[1, 0.16, 0.42]} />
      </mesh>
      <mesh ref={m => { parts.current.glass = m }} position={[0, 0, 0.02]} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial vertexShader={reflVertex} fragmentShader={reflFragment} uniforms={reflUniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  )
}
