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
}

/** Wires pointer and device-orientation input to the head target. */
export function useHeadInput() {
  const setGyro = useApp(s => s.setGyro)

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      head.tx = (e.clientX / window.innerWidth) * 2 - 1
      head.ty = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    const onLeave = () => { head.tx = 0; head.ty = 0 }
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (DOE && coarse) setGyro(typeof DOE.requestPermission === 'function' ? 'needs-permission' : 'available')

    return () => {
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('pointerleave', onLeave)
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
