import * as THREE from 'three'
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js'

// A glass slab: a rounded rectangle extruded with a rounded bevel, like the
// polished edge of a thick pane. Normals are smoothed across the bevel so the
// edge catches light in one continuous highlight.

export const SLAB_THICKNESS = 0.05
export const BEVEL = 0.018

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  r = Math.max(0.0005, Math.min(r, w / 2, h / 2))
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

export function slabGeometry(w: number, h: number, cornerRadius: number, segments = 6) {
  const b = Math.min(BEVEL, w / 4, h / 4)
  const shape = roundedRect(w - 2 * b, h - 2 * b, Math.max(cornerRadius - b, 0.001))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: SLAB_THICKNESS - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: segments,
    curveSegments: 10,
  })
  geo.translate(0, 0, -(SLAB_THICKNESS - 2 * b) / 2)
  const smooth = toCreasedNormals(geo, 0.5)
  geo.dispose()
  smooth.computeBoundingSphere()
  return smooth
}
