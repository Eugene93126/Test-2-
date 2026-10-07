import { canvas, ctx2d, cached } from './canvas'
import { fbm, rng } from '../lib/rand'

// Paper you could touch: a cool base, slow mottling, fibres and fine grain.

export interface PaperOpts {
  base: string
  /** 0..1 strength of the cloudy density variation. */
  mottle?: number
  /** Fibres per square millimetre. */
  fibers?: number
  /** Pixel grain amplitude (0..255). */
  grain?: number
  /** Pixels per millimetre. */
  ppmm: number
}

export function paperBase(key: string, wmm: number, hmm: number, o: PaperOpts, seed = 1) {
  return cached(`paper:${key}`, () => {
    const W = Math.round(wmm * o.ppmm), H = Math.round(hmm * o.ppmm)
    const c = canvas(W, H)
    const g = ctx2d(c)
    g.fillStyle = o.base
    g.fillRect(0, 0, W, H)

    // Cloudy formation: low-frequency density, laid in with overlay.
    const mw = Math.max(8, Math.round(wmm / 3)), mh = Math.max(8, Math.round(hmm / 3))
    const m = canvas(mw, mh), mg = ctx2d(m)
    const id = mg.createImageData(mw, mh)
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const v = fbm(x / 9, y / 9, seed, 5)
      const k = (y * mw + x) * 4
      const L = Math.round(128 + (v - 0.5) * 255 * (o.mottle ?? 0.5))
      id.data[k] = id.data[k + 1] = id.data[k + 2] = L
      id.data[k + 3] = 255
    }
    mg.putImageData(id, 0, 0)
    g.save()
    g.globalCompositeOperation = 'overlay'
    g.globalAlpha = 0.35
    g.imageSmoothingQuality = 'high'
    g.drawImage(m, 0, 0, W, H)
    g.restore()

    // Fibres: short curved strokes, some lighter, some darker.
    const r = rng(seed * 31 + 7)
    const n = Math.round(wmm * hmm * (o.fibers ?? 0.25))
    g.lineCap = 'round'
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H
      const len = (0.4 + r() * 2.4) * o.ppmm
      const a = r() * Math.PI * 2, bend = (r() - 0.5) * 0.9
      const light = r() < 0.55
      g.strokeStyle = light ? `rgba(255,255,255,${0.05 + r() * 0.07})` : `rgba(20,28,34,${0.02 + r() * 0.035})`
      g.lineWidth = Math.max(0.35, (0.03 + r() * 0.05) * o.ppmm)
      g.beginPath()
      g.moveTo(x, y)
      const mx = x + Math.cos(a) * len * 0.5 + Math.cos(a + 1.57) * len * bend * 0.3
      const my = y + Math.sin(a) * len * 0.5 + Math.sin(a + 1.57) * len * bend * 0.3
      g.quadraticCurveTo(mx, my, x + Math.cos(a + bend * 0.4) * len, y + Math.sin(a + bend * 0.4) * len)
      g.stroke()
    }

    // Fine grain.
    const amp = o.grain ?? 5
    if (amp > 0) {
      const img = g.getImageData(0, 0, W, H)
      const d = img.data
      let s = (seed * 2654435761) >>> 0
      for (let i = 0; i < d.length; i += 4) {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5
        const n2 = (((s >>> 0) / 4294967296) - 0.5) * amp
        d[i] += n2; d[i + 1] += n2; d[i + 2] += n2
      }
      g.putImageData(img, 0, 0)
    }
    return c
  })
}

/** A fine repeating tile for surface relief (bump) and roughness variation. */
export function grainTile(key: string, size: number, seed: number, scale = 1) {
  return cached(`tile:${key}`, () => {
    const c = canvas(size, size)
    const g = ctx2d(c)
    const img = g.createImageData(size, size)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      // Tileable by sampling noise on a torus.
      const u = x / size, v = y / size
      const a = Math.cos(u * 2 * Math.PI), b = Math.sin(u * 2 * Math.PI)
      const cc = Math.cos(v * 2 * Math.PI), dd = Math.sin(v * 2 * Math.PI)
      const n = fbm((a + 2) * 8 * scale + cc * 3, (b + 2) * 8 * scale + dd * 3, seed, 4) * 0.6
        + fbm((cc + 2) * 24 * scale, (dd + 2) * 24 * scale + a, seed + 5, 3) * 0.4
      const L = Math.round(n * 255)
      const k = (y * size + x) * 4
      img.data[k] = img.data[k + 1] = img.data[k + 2] = L
      img.data[k + 3] = 255
    }
    g.putImageData(img, 0, 0)
    return c
  })
}
