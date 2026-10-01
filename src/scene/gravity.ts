import type { PanelEntry } from '../glass/registry'

// Gravitational lensing for moving windows. A window's momentum is its mass;
// while it travels it bends the world and nudges its neighbors toward it, like
// a lens in space. Wells are measured in CSS px, center and half extents.

export interface Well { id: string; cx: number; cy: number; hw: number; hh: number; r: number; mass: number }

export const gravity = { wells: [] as Well[], next: [] as Well[] }

/** Mass from the window's speed through depth (fly spring velocity, 1/s). */
export function massOf(e: PanelEntry) {
  // window.__massPin pins an overlay's mass for screenshots on slow renderers.
  const pin = (window as unknown as { __massPin?: number }).__massPin
  if (pin != null && e.layer === 1) return pin
  const v = Math.abs(e.fly.getVelocity())
  return Math.min(1, v * 0.2) * Math.min(1, e.presence.get() * 1.5)
}

/** Called once per frame after every panel has been placed. */
export function commitWells() {
  gravity.wells = gravity.next.sort((a, b) => b.mass - a.mass).slice(0, 2)
  gravity.next = []
}

/**
 * Pull on a panel centered at (x, y) px from the current wells: weak-field
 * deflection falls off as 1 / distance, and the tidal stretch points along
 * the pull. Returns a px offset and axis-aligned stretch.
 */
export function pullOn(id: string, x: number, y: number) {
  let dx = 0, dy = 0, sx = 1, sy = 1
  for (const w of gravity.wells) {
    if (w.id === id || w.mass < 0.01) continue
    const vx = w.cx - x, vy = w.cy - y
    const d = Math.hypot(vx, vy) + 1
    const pull = Math.min(26, (w.mass * 9000) / (d + 180))
    dx += (vx / d) * pull
    dy += (vy / d) * pull
    const tide = (w.mass * 0.05 * 600) / (d + 300)
    sx += tide * (vx / d) ** 2
    sy += tide * (vy / d) ** 2
  }
  return { dx, dy, sx, sy }
}
