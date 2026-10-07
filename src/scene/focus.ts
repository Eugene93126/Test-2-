import { useApp } from '../state/store'

// How far the world has fallen out of focus, 0..1. One spring drives both the
// depth of field around the panels and the blur of the city seen through them.
export const focus = { x: 0, v: 0 }

export function stepFocus(dt: number) {
  const { focused, focusPinned, modal, reducedMotion } = useApp.getState()
  const target = focused || focusPinned || modal ? 1 : 0
  const h = Math.min(dt, 1 / 30)
  if (reducedMotion) {
    focus.x += (target - focus.x) * (1 - Math.exp(-h * 10))
    focus.v = 0
  } else {
    focus.v += (300 * (target - focus.x) - 30 * focus.v) * h
    focus.x += focus.v * h
  }
  focus.x = Math.min(1.15, Math.max(0, focus.x))
}
