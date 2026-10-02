// Small canvas helpers shared by the painters.

export type Ctx = CanvasRenderingContext2D

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.round(w)
  c.height = Math.round(h)
  return c
}

export function ctx2d(c: HTMLCanvasElement) {
  return c.getContext('2d', { willReadFrequently: false })!
}

/** Copy a canvas (the static base) so a frame can draw on top of it. */
export function copyInto(dst: HTMLCanvasElement, src: HTMLCanvasElement) {
  const g = ctx2d(dst)
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'copy'
  g.drawImage(src, 0, 0)
  g.globalCompositeOperation = 'source-over'
  return g
}

const cache = new Map<string, HTMLCanvasElement>()
/** Build once per key (static textures). */
export function cached(key: string, make: () => HTMLCanvasElement) {
  let c = cache.get(key)
  if (!c) { c = make(); cache.set(key, c) }
  return c
}

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
