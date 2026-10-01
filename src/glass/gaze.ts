import { useApp } from '../state/store'

// Looking at a panel for a moment gives it focus and the world softens behind
// it; looking away lets the world come back. On touch, tapping a panel focuses
// it and tapping the world releases it.

const DWELL_MS = 350
const RELEASE_MS = 450
let dwell = 0
let release = 0
let current: string | null = null

export function gazeEnter(id: string, focusable: boolean) {
  current = id
  window.clearTimeout(release)
  window.clearTimeout(dwell)
  if (focusable) dwell = window.setTimeout(() => useApp.getState().setFocused(true), DWELL_MS)
  else release = window.setTimeout(() => useApp.getState().setFocused(false), RELEASE_MS)
}

export function gazeLeave(id: string) {
  if (current === id) current = null
  window.clearTimeout(dwell)
  window.clearTimeout(release)
  release = window.setTimeout(() => { if (!current) useApp.getState().setFocused(false) }, RELEASE_MS)
}

export function gazeTouch(_id: string, focusable: boolean) {
  window.clearTimeout(release)
  useApp.getState().setFocused(focusable)
}

/** Tap on the world (outside every panel) releases focus and closes any sheet. */
export function installWorldTap() {
  const onDown = (e: PointerEvent) => {
    const t = e.target as Element | null
    if (t?.closest('[data-panel], [data-review]')) return
    const s = useApp.getState()
    s.setFocused(false)
    if (s.modal) s.setModal(null)
  }
  window.addEventListener('pointerdown', onDown)
  return () => window.removeEventListener('pointerdown', onDown)
}
