import { autoTier, coarsePointer, useApp, type Tier } from '../state/store'

// Quality tiers. Auto starts at High on a laptop and Balanced on a phone, then
// the performance monitor steps down when frames run long: resolution first,
// then the tier. High and Low can also be chosen in Review → Quality.

export interface TierSpec {
  /** Highest device-pixel ratio the canvas renders at. */
  dpr: number
  /** Refraction samples per pixel in the glass. */
  samples: number
  /** Size of the refraction buffer relative to the canvas. */
  buffer: number
  /** One backdrop tap instead of five for the adaptive rim. */
  liteRim: boolean
  dof: boolean
  bloom: boolean
  /** 720p city loop instead of 1080p. */
  video720: boolean
}

export const TIERS: Record<Tier, TierSpec> = {
  high: { dpr: 1.75, samples: 5, buffer: 0.85, liteRim: false, dof: true, bloom: true, video720: coarsePointer },
  balanced: { dpr: 1.5, samples: 3, buffer: 0.6, liteRim: false, dof: true, bloom: true, video720: true },
  low: { dpr: 1, samples: 2, buffer: 0.45, liteRim: true, dof: false, bloom: false, video720: true },
}

const ORDER: Tier[] = ['high', 'balanced', 'low']

export const useTier = () => TIERS[useApp(s => s.tier)]

/** Auto only: one step down (dir -1) or back up, never above where Auto started. */
export function stepTier(dir: 1 | -1) {
  const s = useApp.getState()
  if (s.quality !== 'auto') return false
  const i = ORDER.indexOf(s.tier) + (dir < 0 ? 1 : -1)
  if (i < ORDER.indexOf(autoTier) || i >= ORDER.length) return false
  s.setTier(ORDER[i])
  return true
}
