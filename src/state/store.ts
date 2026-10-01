import { create } from 'zustand'
import { THEME_ORDER, type ThemeId } from '../theme/themes'

export type GyroState = 'unsupported' | 'available' | 'needs-permission' | 'on' | 'denied'

const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
// Review links can set the starting state: ?theme=dusk&focus=1&perf
const q = new URLSearchParams(location.search)
const qTheme = q.get('theme') as ThemeId | null
const startTheme: ThemeId = qTheme && THEME_ORDER.includes(qTheme) ? qTheme : 'glass'

interface AppState {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
  /** A panel has focus: the world behind it falls out of focus. */
  focused: boolean
  setFocused: (f: boolean) => void
  reducedMotion: boolean
  setReducedMotion: (r: boolean) => void
  headMotion: boolean
  setHeadMotion: (h: boolean) => void
  gyro: GyroState
  setGyro: (g: GyroState) => void
  videoPlaying: boolean
  setVideoPlaying: (p: boolean) => void
  perfOpen: boolean
  setPerfOpen: (p: boolean) => void
}

export const useApp = create<AppState>()(set => ({
  theme: startTheme,
  setTheme: theme => set({ theme }),
  focused: q.get('focus') === '1',
  setFocused: focused => set({ focused }),
  reducedMotion: !!prefersReduced,
  setReducedMotion: reducedMotion => set({ reducedMotion }),
  headMotion: true,
  setHeadMotion: headMotion => set({ headMotion }),
  gyro: 'unsupported',
  setGyro: gyro => set({ gyro }),
  videoPlaying: !prefersReduced,
  setVideoPlaying: videoPlaying => set({ videoPlaying }),
  perfOpen: q.has('perf'),
  setPerfOpen: perfOpen => set({ perfOpen }),
}))
