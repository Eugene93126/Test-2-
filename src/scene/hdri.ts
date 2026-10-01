import * as THREE from 'three'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'

// The artifact host doesn't serve .hdr files, so the HDRI ships as base64 text
// and is decoded here with three's own Radiance parser.
export class Base64HDRLoader extends THREE.Loader<THREE.DataTexture> {
  load(url: string, onLoad: (t: THREE.DataTexture) => void, _onProgress?: unknown, onError?: (e: unknown) => void) {
    fetch(this.manager.resolveURL(url))
      .then(r => { if (!r.ok) throw new Error(`HDRI ${r.status}`); return r.text() })
      .then(text => {
        const bin = atob(text.trim())
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const d = new HDRLoader().setDataType(THREE.HalfFloatType).parse(bytes.buffer)
        const tex = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type)
        tex.colorSpace = THREE.LinearSRGBColorSpace
        tex.minFilter = tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = false
        tex.flipY = true
        tex.mapping = THREE.EquirectangularReflectionMapping
        tex.needsUpdate = true
        onLoad(tex)
      })
      .catch(e => onError?.(e))
  }
}
