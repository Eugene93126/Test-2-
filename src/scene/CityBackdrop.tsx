import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { head } from '../head/headPose'
import { useApp } from '../state/store'
import { THEMES } from '../theme/themes'

// The real world: a looping video of the city with a matching depth map. The
// depth map lets a flat video shift with head motion as if it had depth, and
// the shader applies the lens tint of the current theme.

const BASE = import.meta.env.BASE_URL
export const BACKDROP_DISTANCE = 40
const OVERSCAN = 1.12

const vertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const fragment = /* glsl */ `
uniform sampler2D uVideo;
uniform sampler2D uPoster;
uniform sampler2D uDepth;
uniform float uVideoReady;
uniform vec2 uHead;
uniform float uParallax;
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uTint;
uniform vec3 uLift;
varying vec2 vUv;

vec3 sampleWorld(vec2 uv){
  vec3 a = texture2D(uPoster, uv).rgb;
  if (uVideoReady < 0.5) return a;
  return texture2D(uVideo, uv).rgb;
}

void main(){
  // Two-step parallax: near rooftops lag behind the skyline as the head moves.
  vec2 off = uHead * uParallax;
  float d = texture2D(uDepth, vUv).r; d *= d;
  vec2 uv = vUv + off * d;
  d = texture2D(uDepth, uv).r; d *= d;
  uv = clamp(vUv + off * d, 0.001, 0.999);
  vec3 c = sampleWorld(uv);

  // Lens grade (linear light in, linear out).
  c *= uExposure;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  vec3 p = pow(max(c, 0.0), vec3(1.0 / 2.2));
  p = (p - 0.42) * uContrast + 0.42;
  c = pow(max(p, 0.0), vec3(2.2));
  c = c * uTint;
  c = c + uLift * (1.0 - c);
  gl_FragColor = vec4(c, 1.0);
}`

function makeVideo(src: string) {
  const v = document.createElement('video')
  v.src = src
  v.crossOrigin = 'anonymous'
  v.loop = true
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  v.setAttribute('playsinline', '')
  v.setAttribute('aria-hidden', 'true')
  return v
}

export function CityBackdrop() {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const mesh = useRef<THREE.Mesh>(null)
  const videoPlaying = useApp(s => s.videoPlaying)

  const { video, uniforms } = useMemo(() => {
    const video = makeVideo(`${BASE}media/city-loop.mp4`)
    const loader = new THREE.TextureLoader()
    const poster = loader.load(`${BASE}media/city-poster.jpg`)
    poster.colorSpace = THREE.SRGBColorSpace
    const depth = loader.load(`${BASE}media/city-depth.png`)
    depth.colorSpace = THREE.NoColorSpace
    const vt = new THREE.VideoTexture(video)
    vt.colorSpace = THREE.SRGBColorSpace
    vt.generateMipmaps = false
    const g = THEMES[useApp.getState().theme].lens
    const uniforms = {
      uVideo: { value: vt },
      uPoster: { value: poster },
      uDepth: { value: depth },
      uVideoReady: { value: 0 },
      uHead: { value: new THREE.Vector2() },
      uParallax: { value: 0.014 },
      uExposure: { value: g.exposure },
      uContrast: { value: g.contrast },
      uSaturation: { value: g.saturation },
      uTint: { value: new THREE.Vector3(...g.tint) },
      uLift: { value: new THREE.Vector3(...g.lift) },
    }
    return { video, uniforms }
  }, [])

  useEffect(() => {
    const ready = () => { uniforms.uVideoReady.value = 1 }
    video.addEventListener('playing', ready)
    if (videoPlaying) {
      video.play().catch(() => {
        // Autoplay blocked: start on the first interaction.
        const start = () => { video.play().catch(() => {}); window.removeEventListener('pointerdown', start) }
        window.addEventListener('pointerdown', start)
      })
    } else {
      video.pause()
    }
    return () => video.removeEventListener('playing', ready)
  }, [video, videoPlaying, uniforms])

  useEffect(() => () => { video.pause(); video.removeAttribute('src'); video.load() }, [video])

  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    // Cover the view at the backdrop distance, with overscan for head motion.
    const h = 2 * BACKDROP_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * OVERSCAN
    const w = h * camera.aspect
    const videoAspect = 16 / 9
    const sw = Math.max(w, h * videoAspect), sh = sw / videoAspect
    m.scale.set(sw, Math.max(sh, h), 1)
    // Stay centered on the eye's forward axis at rest, but don't follow head translation.
    m.position.set(0, 0, -BACKDROP_DISTANCE)
    uniforms.uHead.value.set(head.x * head.amount, head.y * head.amount)

    // Ease the lens grade toward the current theme.
    const g = THEMES[useApp.getState().theme].lens
    const k = 1 - Math.exp(-dt * 3.2)
    uniforms.uExposure.value += (g.exposure - uniforms.uExposure.value) * k
    uniforms.uContrast.value += (g.contrast - uniforms.uContrast.value) * k
    uniforms.uSaturation.value += (g.saturation - uniforms.uSaturation.value) * k
    uniforms.uTint.value.lerp(tmp.set(...g.tint), k)
    uniforms.uLift.value.lerp(tmp.set(...g.lift), k)
  })

  return (
    <mesh ref={mesh} renderOrder={-10}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} depthWrite toneMapped={false} />
    </mesh>
  )
}
