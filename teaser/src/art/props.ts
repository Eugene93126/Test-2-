import { canvas, ctx2d, cached, copyInto } from './canvas'
import { paperBase } from './paper'
import { fbm, rng } from '../lib/rand'

// Surfaces for the table and the props.

export const TABLE_MM = { w: 1600, h: 1000 }

/** A matte grey-green work surface, faintly mottled. */
export function tableTexture() {
  return paperBase('table', TABLE_MM.w, TABLE_MM.h, { base: '#A3AFAA', mottle: 0.5, fibers: 0.004, grain: 4, ppmm: 2.4 }, 19)
}

/** 1nm-class wafer: a die grid with scribe lanes and dense array blocks. */
export function waferTexture() {
  return cached('wafer', () => {
    const S = 2048, mm = 130, P = S / mm
    const c = canvas(S, S), g = ctx2d(c)
    g.fillStyle = '#B4BEC6'
    g.fillRect(0, 0, S, S)
    const dw = 11.2, dh = 13.4, lane = 0.22
    const r = rng(1)
    for (let y = -dh; y < mm + dh; y += dh) for (let x = -dw; x < mm + dw; x += dw) {
      const X = x * P, Y = y * P
      g.fillStyle = '#98A3AC'
      g.fillRect(X, Y, dw * P, dh * P)
      // Array blocks inside the die.
      for (let by = 0; by < 4; by++) for (let bx = 0; bx < 3; bx++) {
        const v = 150 + Math.round(r() * 30)
        g.fillStyle = `rgb(${v},${v + 8},${v + 16})`
        g.fillRect(X + (0.8 + bx * 3.4) * P, Y + (0.9 + by * 3.1) * P, 2.9 * P, 2.5 * P)
      }
      g.fillStyle = '#A8B2BA'
      g.fillRect(X + 0.8 * P, Y + (dh - 1.0) * P, (dw - 1.6) * P, 0.25 * P)
      g.fillStyle = '#C9D2D8'
      g.fillRect(X, Y, dw * P, lane * P)
      g.fillRect(X, Y, lane * P, dh * P)
    }
    return c
  })
}

/** Steel-blue bookcloth with a paper label. */
export function logbookCover() {
  return cached('logbook', () => {
    const W = 148, H = 210, P = 6
    const c = canvas(W * P, H * P), g = ctx2d(c)
    g.fillStyle = '#56656F'
    g.fillRect(0, 0, W * P, H * P)
    // Weave.
    const img = g.getImageData(0, 0, W * P, H * P), d = img.data
    for (let y = 0; y < H * P; y++) for (let x = 0; x < W * P; x++) {
      const k = (y * W * P + x) * 4
      const weave = ((x % 2 === 0 ? 1 : 0) + (y % 2 === 0 ? 1 : 0)) * 2.5
      const n = (fbm(x / 90, y / 90, 3, 3) - 0.5) * 9 - weave
      d[k] += n; d[k + 1] += n; d[k + 2] += n
    }
    g.putImageData(img, 0, 0)
    // Worn edges.
    g.strokeStyle = 'rgba(200,210,214,0.18)'
    g.lineWidth = 2.2 * P
    g.strokeRect(0, 0, W * P, H * P)
    const label = paperBase('label', 70, 40, { base: '#E2E5E3', mottle: 0.4, fibers: 0.3, grain: 5, ppmm: P }, 5)
    g.save()
    g.translate(39 * P, 30 * P)
    g.drawImage(label, 0, 0)
    g.fillStyle = '#1E252B'
    g.font = `700 ${5 * P}px "Courier Prime"`
    g.fillText('DOCK LOG', 7 * P, 14 * P)
    g.font = `400 ${4 * P}px "Courier Prime"`
    g.fillText('CHI-07 / Reflex', 7 * P, 23 * P)
    g.fillText('2033 – 2034', 7 * P, 31 * P)
    g.restore()
    // Elastic band.
    g.fillStyle = '#1F252A'
    g.fillRect((W - 22) * P, 0, 5 * P, H * P)
    return c
  })
}

export { copyInto }
