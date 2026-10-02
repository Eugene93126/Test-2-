// Eased, physical curves. Nothing in the film moves linearly.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const mix = lerp
export const smooth = (t: number) => { t = clamp(t); return t * t * (3 - 2 * t) }
export const smoother = (t: number) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10) }
export const inCubic = (t: number) => clamp(t) ** 3
export const outCubic = (t: number) => 1 - (1 - clamp(t)) ** 3
export const inOutCubic = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2 }
export const outQuart = (t: number) => 1 - (1 - clamp(t)) ** 4
export const inQuart = (t: number) => clamp(t) ** 4
export const outQuint = (t: number) => 1 - (1 - clamp(t)) ** 5
export const inExpo = (t: number) => { t = clamp(t); return t === 0 ? 0 : 2 ** (10 * t - 10) }
export const outExpo = (t: number) => { t = clamp(t); return t === 1 ? 1 : 1 - 2 ** (-10 * t) }
export const inOutSine = (t: number) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2

/** Progress of t through [a, b], 0..1. */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
export const span = (t: number, s: number[]) => prog(t, s[0], s[1])

/**
 * A damped spring settling from 0 to 1 starting at t0: a real object
 * arriving, with a little overshoot (zeta < 1) and no linear segments.
 */
export function settle(t: number, t0: number, freq = 9, zeta = 0.45) {
  const x = t - t0
  if (x <= 0) return 0
  const w = 2 * Math.PI * freq
  const wd = w * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * w * x) * (Math.cos(wd * x) + (zeta * w / wd) * Math.sin(wd * x))
}

/** A decaying wobble (for things that have just landed). */
export const wobble = (t: number, t0: number, freq = 14, decay = 9) => {
  const x = t - t0
  return x <= 0 ? 0 : Math.sin(2 * Math.PI * freq * x) * Math.exp(-decay * x)
}

export const deg = (d: number) => (d * Math.PI) / 180
