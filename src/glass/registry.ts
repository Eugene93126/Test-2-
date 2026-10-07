import { create } from 'zustand'
import { motionValue, type MotionValue } from 'motion/react'

// Every glass panel is two things: a DOM element that lays out with CSS and
// holds the text, and a 3D glass slab at a chosen depth. The DOM layout is the
// source of truth; each frame the slab is placed to match it and the DOM gets a
// transform that follows the slab's projection as the head moves.

// sheet: overlays that float just in front of the main window (model picker, Dock settings).
export const DEPTH = { near: 2.4, sheet: 2.75, mid: 3.2, far: 4.2 } as const
export type DepthName = keyof typeof DEPTH

export const MAX_RIPPLES = 4

export interface Ripple { x: number; y: number; t: number; strength: number }

export interface PanelEntry {
  id: string
  depth: number
  /** Corner radius in CSS px. */
  radius: number
  /** 0: refracts the world. 1: an overlay that refracts the world and the glass behind it. */
  layer: 0 | 1
  el: HTMLElement
  /** Layout box at rest, CSS px from the viewport's top left. */
  rest: { x: number; y: number; w: number; h: number }
  /** 0..1, entrance and exit. */
  presence: MotionValue<number>
  /** Flight through depth: 0 is far behind its resting place, 1 at rest; a
   *  bouncy spring overshoots past 1 toward you. Its speed is the window's
   *  momentum, which bends space around it (scene/gravity.ts). */
  fly: MotionValue<number>
  /** Pointer over the panel, in panel-local meters (origin at center, y up). */
  pointer: { x: number; y: number }
  hoverTarget: number
  hover: number
  hoverV: number
  ripples: Ripple[]
  /** World size of the slab, meters; written by the 3D layer. */
  world: { w: number; h: number; cx: number; cy: number }
  /** Slab size spring (meters): the glass eases to a new layout size. */
  size: { w: number; h: number; vw: number; vh: number }
  /** Last DOM transform written, to skip redundant style writes. */
  lastTransform: string
  /** On-screen scale relative to the layout box (distance mapping reads it). */
  apparentScale: number
  /** Text stroke (CSS px) that keeps type weight steady as you step back. */
  stroke: number
}

interface Registry {
  ids: string[]
  add: (id: string) => void
  remove: (id: string) => void
}

export const panels = new Map<string, PanelEntry>()

export const usePanelIds = create<Registry>()(set => ({
  ids: [],
  add: id => set(s => (s.ids.includes(id) ? s : { ids: [...s.ids, id] })),
  remove: id => set(s => ({ ids: s.ids.filter(i => i !== id) })),
}))

export function measureRest(entry: PanelEntry) {
  // offset* ignore transforms, so this is the layout box at rest.
  let x = 0, y = 0
  let node: HTMLElement | null = entry.el
  while (node && !node.hasAttribute('data-overlay-root')) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  entry.rest = { x, y, w: entry.el.offsetWidth, h: entry.el.offsetHeight }
}

export function createEntry(id: string, el: HTMLElement, depth: number, radius: number, layer: 0 | 1 = 0): PanelEntry {
  return {
    id, depth, radius, el, layer,
    rest: { x: 0, y: 0, w: 0, h: 0 },
    presence: motionValue(0),
    fly: motionValue(1),
    pointer: { x: 0, y: 0 },
    hoverTarget: 0, hover: 0, hoverV: 0,
    ripples: [],
    world: { w: 0, h: 0, cx: 0, cy: 0 },
    size: { w: 0, h: 0, vw: 0, vh: 0 },
    lastTransform: '',
    apparentScale: 1,
    stroke: 0,
  }
}

/** Panel-local meters from a pointer event over the panel's DOM element. */
export function localPointer(entry: PanelEntry, clientX: number, clientY: number) {
  const r = entry.el.getBoundingClientRect()
  const u = (clientX - r.left) / r.width - 0.5
  const v = 0.5 - (clientY - r.top) / r.height
  return { x: u * entry.world.w, y: v * entry.world.h }
}

export function addRipple(entry: PanelEntry, x: number, y: number, strength = 1) {
  entry.ripples.push({ x, y, t: performance.now() / 1000, strength })
  if (entry.ripples.length > MAX_RIPPLES) entry.ripples.shift()
}
