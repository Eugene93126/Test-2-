import { create } from 'zustand'
import { THEME_ORDER, type ThemeId } from '../theme/themes'

export type GyroState = 'unsupported' | 'available' | 'needs-permission' | 'on' | 'denied'
export type GlyphId = 'lens' | 'arc' | 'keystone'
export type TypePair = 'a' | 'b'
export type SectionId = 'chat' | 'circle' | 'world' | 'code' | 'home' | 'memory' | 'trust'
export type ModelId = 'fable' | 'mythos' | 'pantheon2' | 'odyssey' | 'pantheon1'
export type Modal = 'models' | 'dock' | null
/** Spatial: gravity lensing, flights, auras and per-model transitions. Standard: plain smooth fades and slides. */
export type Fx = 'spatial' | 'standard'
export const SECTION_ORDER: SectionId[] = ['chat', 'circle', 'world', 'code', 'home', 'memory', 'trust']

const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
// Review links can set the starting state: ?theme=dusk&focus=1&perf
const q = new URLSearchParams(location.search)
const qTheme = q.get('theme') as ThemeId | null
const startTheme: ThemeId = qTheme && THEME_ORDER.includes(qTheme) ? qTheme : 'glass'
const FX_KEY = 'claude2034.fx'
const storedFx = (() => { try { return localStorage.getItem(FX_KEY) } catch { return null } })()
const startFx: Fx = (q.get('fx') ?? storedFx) === 'standard' ? 'standard' : 'spatial'

interface AppState {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
  /** A panel has focus (you're looking at it): the world behind falls out of focus. */
  focused: boolean
  setFocused: (f: boolean) => void
  /** Focus held on from the review menu, regardless of gaze. */
  focusPinned: boolean
  setFocusPinned: (f: boolean) => void
  glyph: GlyphId
  setGlyph: (g: GlyphId) => void
  typePair: TypePair
  setTypePair: (t: TypePair) => void
  reducedMotion: boolean
  setReducedMotion: (r: boolean) => void
  fx: Fx
  setFx: (f: Fx) => void
  headMotion: boolean
  setHeadMotion: (h: boolean) => void
  gyro: GyroState
  setGyro: (g: GyroState) => void
  videoPlaying: boolean
  setVideoPlaying: (p: boolean) => void
  perfOpen: boolean
  setPerfOpen: (p: boolean) => void
  section: SectionId
  setSection: (s: SectionId) => void
  /** Pinned Dock apps, always in canonical order. */
  pinned: SectionId[]
  togglePin: (s: SectionId) => void
  dockLabels: boolean
  setDockLabels: (l: boolean) => void
  model: ModelId
  setModel: (m: ModelId) => void
  /** An overlay sheet that takes focus (the model picker, Dock customization). */
  modal: Modal
  setModal: (m: Modal) => void
}

export const useApp = create<AppState>()(set => ({
  theme: startTheme,
  setTheme: theme => set({ theme }),
  focused: false,
  setFocused: focused => set({ focused }),
  focusPinned: q.get('focus') === '1',
  setFocusPinned: focusPinned => set({ focusPinned }),
  glyph: (['lens', 'arc', 'keystone'] as const).find(g => g === q.get('glyph')) ?? 'lens',
  setGlyph: glyph => set({ glyph }),
  typePair: q.get('type') === 'b' ? 'b' : 'a',
  setTypePair: typePair => set({ typePair }),
  reducedMotion: !!prefersReduced,
  setReducedMotion: reducedMotion => set({ reducedMotion }),
  fx: startFx,
  setFx: fx => { try { localStorage.setItem(FX_KEY, fx) } catch { /* private mode */ } set({ fx }) },
  headMotion: true,
  setHeadMotion: headMotion => set({ headMotion }),
  gyro: 'unsupported',
  setGyro: gyro => set({ gyro }),
  videoPlaying: !prefersReduced,
  setVideoPlaying: videoPlaying => set({ videoPlaying }),
  perfOpen: q.has('perf'),
  setPerfOpen: perfOpen => set({ perfOpen }),
  section: SECTION_ORDER.find(id => id === q.get('section')) ?? 'chat',
  setSection: section => set({ section }),
  pinned: [...SECTION_ORDER],
  togglePin: id => set(s => {
    if (s.pinned.includes(id)) return s.pinned.length > 1 ? { pinned: s.pinned.filter(p => p !== id) } : s
    return { pinned: SECTION_ORDER.filter(p => p === id || s.pinned.includes(p)) }
  }),
  dockLabels: true,
  setDockLabels: dockLabels => set({ dockLabels }),
  model: 'fable',
  setModel: model => set({ model }),
  modal: q.get('modal') === 'models' ? 'models' : null,
  setModal: modal => set({ modal }),
}))

/** Spatial effects are on: not reduced motion, and not the Standard setting. */
export const spatialFx = () => { const s = useApp.getState(); return s.fx === 'spatial' && !s.reducedMotion }
