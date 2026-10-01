import { animate } from 'motion/react'
import { useApp, type ModelId } from '../state/store'
import { head } from '../head/headPose'
import type { TransitionKind } from './effects/TransitionEffect'

// Switching models is a moment, not a menu change. Each model has its own
// transition; the switch itself happens at the peak, hidden by the effect.
//   Fable Duo 4.1  warp     space bends toward the main window and relaxes
//   Pantheon 2.0   shatter  reality cracks from your press, shards part over
//                           molten light, then seal
//   Odyssey 3.2    merge    two offset realities slide into one; the three
//                           depth layers flow into a single plane and back
//   Pantheon 1.0   dip      a quiet power cycle

export const transition = {
  kind: null as TransitionKind | null,
  start: 0,
  duration: 1,
  origin: [0.5, 0.5] as [number, number],
  tint: [1, 0.7, 0.4] as [number, number, number],
  /** 0..1 progress, updated by the render loop. */
  t: 0,
}

const SPEC: Record<TransitionKind, { duration: number; cut: number }> = {
  warp: { duration: 1.35, cut: 0.48 },
  shatter: { duration: 1.75, cut: 0.42 },
  merge: { duration: 1.45, cut: 0.5 },
  dip: { duration: 0.9, cut: 0.5 },
}

const KIND_FOR: Partial<Record<ModelId, TransitionKind>> = {
  fable: 'warp',
  pantheon2: 'shatter',
  odyssey: 'merge',
  pantheon1: 'dip',
}

const TINT: Partial<Record<ModelId, [number, number, number]>> = {
  fable: [1.0, 0.55, 0.38],
  pantheon2: [1.0, 0.72, 0.28],
  odyssey: [0.42, 0.78, 0.6],
  pantheon1: [0.7, 0.7, 0.66],
}

function centerOf(selector: string): [number, number] {
  const el = document.querySelector(selector)
  if (!el) return [0.5, 0.5]
  const r = el.getBoundingClientRect()
  return [(r.left + r.width / 2) / window.innerWidth, 1 - (r.top + r.height / 2) / window.innerHeight]
}

/** 0..1 while the merge pulls the depth layers together. */
export function mergeAmount() {
  if (transition.kind !== 'merge') return 0
  const e = Math.sin(Math.PI * transition.t)
  return e * e * (3 - 2 * e)
}

export function switchModel(id: ModelId, from?: { x: number; y: number }) {
  const s = useApp.getState()
  s.setModal(null)
  if (id === s.model) return
  const reduced = s.reducedMotion
  const kind: TransitionKind = reduced ? 'dip' : KIND_FOR[id] ?? 'dip'
  const spec = SPEC[kind]
  transition.kind = kind
  transition.start = performance.now() / 1000
  transition.duration = reduced ? 0.6 : spec.duration
  transition.tint = TINT[id] ?? [1, 1, 1]
  transition.origin = kind === 'shatter' && from
    ? [from.x / window.innerWidth, 1 - from.y / window.innerHeight]
    : centerOf('[data-panel="main"]')
  transition.t = 0

  window.setTimeout(() => useApp.getState().setModel(id), transition.duration * spec.cut * 1000)

  // The DOM layer can't warp or shatter, so it moves with the effect instead.
  const root = document.querySelector<HTMLElement>('[data-overlay-root]')
  if (!root) return
  const D = transition.duration
  if (reduced) { animate(root, { opacity: [1, 0.4, 1] }, { duration: D }); return }
  if (kind === 'warp') {
    animate(root, { scale: [1, 0.972, 1], rotate: [0, -0.5, 0], opacity: [1, 0.35, 1] }, { duration: D, times: [0, 0.48, 1], ease: 'easeInOut' })
  } else if (kind === 'shatter') {
    head.vx += 3.2; head.vy -= 2.2 // the jolt
    animate(root, { x: [0, -8, 7, -5, 3, -1, 0] }, { duration: 0.32 })
    animate(root, { opacity: [1, 1, 0, 0, 1] }, { duration: D, times: [0, 0.18, 0.3, 0.62, 0.9] })
  } else if (kind === 'merge') {
    animate(root, { scale: [1, 0.985, 1], opacity: [1, 0.45, 1] }, { duration: D, times: [0, 0.5, 1], ease: 'easeInOut' })
  } else {
    animate(root, { opacity: [1, 0.25, 1] }, { duration: D })
  }
}

/** Called each frame by the lens. */
export function stepTransition() {
  // window.__transitionT pins progress for screenshots on slow software renderers.
  const pinned = (window as unknown as { __transitionT?: number }).__transitionT
  if (pinned != null && transition.kind) { transition.t = pinned; return }
  if (!transition.kind) { transition.t = 0; return }
  const t = (performance.now() / 1000 - transition.start) / transition.duration
  if (t >= 1) { transition.kind = null; transition.t = 0; return }
  transition.t = Math.max(0, t)
}
