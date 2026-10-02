import raw from '../timeline.json'

// The timeline drives picture and sound. Times are seconds.
export const TL = raw
export const FPS = raw.meta.fps
export const DURATION = raw.meta.duration
export const FRAMES = Math.round(DURATION * FPS)
export const E = raw.events as unknown as Record<string, number[] | number>
export const PALETTE = raw.palette
export const TEXT = raw.text

export const ev = (name: string) => E[name] as number[]
export const at = (name: string) => E[name] as number

/** Start time of each card flash in S5, and its length in seconds. */
export const FLASHES = (() => {
  let t = raw.flashes.start
  return raw.flashes.frames.map((f, i) => {
    const s = { i, start: t, len: f / FPS, body: raw.flashes.bodies[i] }
    t += f / FPS
    return s
  })
})()

export type ShotId = 'C0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'BLACK' | 'S7'
export const shotAt = (t: number): ShotId => {
  for (const s of raw.shots) if (t >= s.start && t < s.end) return s.id as ShotId
  return 'S7'
}
