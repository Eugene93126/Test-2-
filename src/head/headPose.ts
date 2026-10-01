// Head pose driven by the mouse (or the gyroscope on phones), smoothed by a
// spring. Kept outside React so the render loop can read it every frame
// without re-rendering anything.

import { useEffect } from 'react'
import { useApp } from '../state/store'

export interface HeadPose {
  /** Normalized head offset, -1..1 on each axis (x right, y up). */
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  /** 0..1 scale applied to the whole effect (reduced motion fades it out). */
  amount: number
}

export const head: HeadPose = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, amount: 1 }

/** Walking toward (negative) or away from (positive) the interface, meters. */
export const walk = { z: 0, v: 0, target: 0, settledFor: 0 }
const WALK_MIN = -0.9, WALK_MAX = 1.1
export function nudgeWalk(dz: number) { walk.target = Math.max(WALK_MIN, Math.min(WALK_MAX, walk.target + dz)) }
export function resetWalk() { walk.target = 0 }

// A slightly underdamped spring: weighty, settles without wobble.
const STIFFNESS = 90
const DAMPING = 17

export function stepHead(dt: number, enabled: boolean, reduced: boolean, time: number) {
  const target = enabled ? (reduced ? 0.15 : 1) : 0
  head.amount += (target - head.amount) * (1 - Math.exp(-dt * 4))
  // A barely-there idle sway so the world never looks like a still image.
  const idle = reduced ? 0 : 1
  const sx = Math.sin(time * 0.31) * 0.035 * idle
  const sy = Math.sin(time * 0.23 + 1.3) * 0.025 * idle
  const tx = head.tx + sx, ty = head.ty + sy
  const h = Math.min(dt, 1 / 30)
  head.vx += (STIFFNESS * (tx - head.x) - DAMPING * head.vx) * h
  head.vy += (STIFFNESS * (ty - head.y) - DAMPING * head.vy) * h
  head.x += head.vx * h
  head.y += head.vy * h
  // Walking has weight too: a slower spring.
  walk.v += (60 * (walk.target - walk.z) - 14 * walk.v) * h
  walk.z += walk.v * h
  walk.settledFor = Math.abs(walk.v) < 0.004 && Math.abs(walk.target - walk.z) < 0.002 ? walk.settledFor + dt : 0
}

/** Wires pointer and device-orientation input to the head target. */
export function useHeadInput() {
  const setGyro = useApp(s => s.setGyro)

  useEffect(() => {
    // While the pointer is over a panel the head steadies (30% of the motion),
    // so the panel you are reading doesn't slide under your cursor.
    let lock: { x: number; y: number } | null = null
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const rx = (e.clientX / window.innerWidth) * 2 - 1
      const ry = -((e.clientY / window.innerHeight) * 2 - 1)
      const inPanel = (e.target as Element | null)?.closest?.('[data-panel]')
      if (inPanel) {
        lock ??= { x: head.tx, y: head.ty }
        head.tx = lock.x + (rx - lock.x) * 0.3
        head.ty = lock.y + (ry - lock.y) * 0.3
      } else {
        lock = null
        head.tx = rx
        head.ty = ry
      }
    }
    const onLeave = () => { head.tx = 0; head.ty = 0; lock = null }
    // Scroll or pinch to walk closer to the interface or step back.
    const onWheel = (e: WheelEvent) => {
      const t = e.target as Element | null
      if (t?.closest('[data-review]')) return
      // Lists that scroll keep the wheel for themselves.
      const sc = t?.closest<HTMLElement>('[data-scroll]')
      if (sc && sc.scrollHeight > sc.clientHeight + 1) return
      nudgeWalk(e.deltaY * 0.0012)
    }
    let pinch = 0
    const touches = (e: TouchEvent) => e.touches.length === 2 ? Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY) : 0
    const onTouchStart = (e: TouchEvent) => { pinch = touches(e) }
    const onTouchMove = (e: TouchEvent) => {
      const d = touches(e)
      if (!d || !pinch) return
      nudgeWalk((pinch - d) * 0.004)
      pinch = d
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (DOE && coarse) setGyro(typeof DOE.requestPermission === 'function' ? 'needs-permission' : 'available')

    return () => {
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [setGyro])
}

let base: { x: number; y: number } | null = null

// Tilt in screen axes: gamma and beta swap when the phone is held sideways.
function screenTilt(beta: number, gamma: number) {
  const angle = screen.orientation?.angle ?? 0
  if (angle === 90) return { x: beta, y: -gamma }
  if (angle === 270 || angle === -90) return { x: -beta, y: gamma }
  if (angle === 180) return { x: -gamma, y: -beta }
  return { x: gamma, y: beta }
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return
  const t = screenTilt(e.beta, e.gamma)
  if (!base) base = t
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  head.tx = clamp((t.x - base.x) / 14)
  head.ty = clamp(-(t.y - base.y) / 12)
}

/** Must run inside a user gesture on iOS. */
export async function enableGyro() {
  const { setGyro } = useApp.getState()
  const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
  try {
    if (typeof DOE.requestPermission === 'function') {
      const res = await DOE.requestPermission()
      if (res !== 'granted') { setGyro('denied'); return }
    }
    base = null
    window.addEventListener('deviceorientation', onOrientation)
    screen.orientation?.addEventListener('change', recenterGyro)
    setGyro('on')
  } catch {
    setGyro('denied')
  }
}

export function recenterGyro() { base = null }
