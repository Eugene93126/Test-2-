import { useMemo } from 'react'
import * as THREE from 'three'
import { grainTile } from '../art/paper'
import type { Pose } from './choreo'
import { canvas, ctx2d, cached } from '../art/canvas'

// A sheet of paper lying on the table: a finely subdivided plane with a little
// curl at the corners, its print as a canvas texture, and a soft shadow.

export function paperGeometry(wm: number, hm: number, curl = 1, seed = 1) {
  const g = new THREE.PlaneGeometry(wm, hm, 48, Math.round(48 * (hm / wm)))
  const pos = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (wm / 2), y = pos.getY(i) / (hm / 2)
    // Corners and edges lift a hair; one corner more than the others.
    const edge = Math.max(Math.abs(x), Math.abs(y)) ** 6
    const corner = Math.max(0, x * Math.sign(seed % 2 ? 1 : -1)) ** 4 * Math.max(0, -y) ** 4
    pos.setZ(i, (edge * 0.0007 + corner * 0.0022) * curl)
  }
  g.computeVertexNormals()
  return g
}

/** A blurred rounded rectangle, used under every flat thing. */
export function softRect(aspect: number, blurRel: number) {
  const key = `soft:${aspect.toFixed(2)}:${blurRel.toFixed(3)}`
  return cached(key, () => {
    const W = 512, H = Math.max(16, Math.round(512 / aspect))
    const c = canvas(W, H), g = ctx2d(c)
    const b = blurRel * W
    g.filter = `blur(${b}px)`
    g.fillStyle = '#000'
    g.fillRect(b * 2, b * 2, W - b * 4, H - b * 4)
    return c
  })
}

const texCache = new WeakMap<HTMLCanvasElement, THREE.CanvasTexture>()
export function textureFor(c: HTMLCanvasElement, srgb = true) {
  let t = texCache.get(c)
  if (!t) {
    t = new THREE.CanvasTexture(c)
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.anisotropy = 8
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
    texCache.set(c, t)
  }
  return t
}

interface Props {
  pose: Pose
  wm: number
  hm: number
  map: HTMLCanvasElement
  /** Bump the texture this frame (it was redrawn). */
  version?: number
  roughness?: number
  curl?: number
  seed?: number
  shadow?: number
  lift?: number
  visible?: boolean
}

export function Paper({ pose, wm, hm, map, version = 0, roughness = 0.92, curl = 1, seed = 1, shadow = 0.32, lift = 0, visible = true }: Props) {
  const geo = useMemo(() => paperGeometry(wm, hm, curl, seed), [wm, hm, curl, seed])
  const tex = textureFor(map)
  useMemo(() => { tex.needsUpdate = true }, [tex, version])
  // Paper tooth: a fine tiling bump, one tile per 4 cm, so raking light finds the fibres.
  const tooth = useMemo(() => {
    const t = new THREE.CanvasTexture(grainTile('tooth', 512, 21, 2.2))
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(wm / 0.04, hm / 0.04)
    t.colorSpace = THREE.NoColorSpace
    return t
  }, [wm, hm])
  const shadowTex = useMemo(() => {
    const t = new THREE.CanvasTexture(softRect(wm / hm, 0.035))
    return t
  }, [wm, hm])
  if (!visible || pose.scale <= 0.001) return null
  // The shadow drifts further and softens as the paper lifts.
  const off = 0.0012 + lift * 0.25
  return (
    <group position={[pose.x, pose.y, pose.z]} rotation={[0, pose.rot, 0]} scale={pose.scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[off, -Math.min(pose.y, 0.0002) + 0.00005, off * 1.2]} renderOrder={1}>
        <planeGeometry args={[wm * 1.06 + lift * 0.4, hm * 1.06 + lift * 0.4]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={shadow * (1 - Math.min(0.6, lift * 8))} depthWrite={false} />
      </mesh>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, lift, 0]}>
        <meshStandardMaterial map={tex} roughness={roughness} metalness={0} bumpMap={tooth} bumpScale={0.6} />
      </mesh>
    </group>
  )
}
