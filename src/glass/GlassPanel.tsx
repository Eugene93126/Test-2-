import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { animate, usePresence } from 'motion/react'
import { addRipple, createEntry, DEPTH, localPointer, measureRest, panels, usePanelIds, type DepthName } from './registry'
import { gazeEnter, gazeLeave, gazeTouch } from './gaze'
import { useApp } from '../state/store'
import { SPRING } from '../ui/motion'

interface Props {
  id: string
  depth?: DepthName
  /** Corner radius, CSS px. */
  radius?: number
  /** Looking at this panel brings it into focus and blurs the world. */
  focusable?: boolean
  /** Entrance delay, seconds (staggered entrances). */
  delay?: number
  className?: string
  style?: CSSProperties
  label?: string
  as?: 'div' | 'section' | 'aside' | 'header' | 'nav'
  /** Overlay glass refracts the panels behind it, not just the world. */
  overlay?: boolean
  role?: string
  children: ReactNode
}

// The DOM half of a glass panel. It lays out with plain CSS and holds the
// content; GlassLayer draws the glass slab behind it and moves this element
// to stay glued to the slab as the head moves.
export function GlassPanel({ id, depth = 'mid', radius = 24, focusable = false, delay = 0, className = '', style, label, as = 'div', overlay = false, role, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Inside AnimatePresence, sink back into the world before unmounting.
  const [isPresent, safeToRemove] = usePresence()
  const exiting = useRef(false)

  useLayoutEffect(() => {
    const el = ref.current!
    const entry = createEntry(id, el, DEPTH[depth], radius, overlay ? 1 : 0)
    panels.set(id, entry)
    measureRest(entry)
    usePanelIds.getState().add(id)
    const ro = new ResizeObserver(() => measureRest(entry))
    ro.observe(el)
    const unsub = entry.presence.on('change', v => { el.style.opacity = String(Math.min(1, v * 1.4)) })
    el.style.opacity = '0'
    const reduced = useApp.getState().reducedMotion
    const ctrl = animate(entry.presence, 1, reduced ? { duration: 0.35, delay: delay * 0.5 } : { ...SPRING, delay })
    return () => {
      ro.disconnect()
      unsub()
      ctrl.stop()
      panels.delete(id)
      usePanelIds.getState().remove(id)
    }
  }, [id, depth, radius, delay, overlay])

  useEffect(() => {
    const p = panels.get(id)
    if (isPresent) {
      // Reopened while sinking away: rise again.
      if (p && exiting.current) {
        exiting.current = false
        p.el.style.pointerEvents = ''
        animate(p.presence, 1, SPRING)
      }
      return
    }
    if (!p) { safeToRemove?.(); return }
    exiting.current = true
    p.el.style.pointerEvents = 'none'
    p.hoverTarget = 0
    const reduced = useApp.getState().reducedMotion
    const c = animate(p.presence, 0, reduced ? { duration: 0.18 } : { type: 'spring', stiffness: 420, damping: 38 })
    c.then(() => safeToRemove?.())
    return () => c.stop()
  }, [isPresent, safeToRemove, id])

  const entry = () => panels.get(id)
  const Tag = as
  return (
    <Tag
      ref={ref as never}
      data-panel={id}
      aria-label={label}
      role={role}
      className={`panel ${className}`}
      style={{ borderRadius: radius, ...style }}
      onPointerEnter={e => {
        const p = entry(); if (!p) return
        p.hoverTarget = 1
        p.pointer = localPointer(p, e.clientX, e.clientY)
        if (e.pointerType !== 'touch') gazeEnter(id, focusable)
      }}
      onPointerMove={e => { const p = entry(); if (p) p.pointer = localPointer(p, e.clientX, e.clientY) }}
      onPointerLeave={e => {
        const p = entry(); if (!p) return
        p.hoverTarget = 0
        if (e.pointerType !== 'touch') gazeLeave(id)
      }}
      onPointerDown={e => {
        const p = entry(); if (!p) return
        const lp = localPointer(p, e.clientX, e.clientY)
        p.pointer = lp
        addRipple(p, lp.x, lp.y, e.pointerType === 'touch' ? 1.1 : 0.9)
        if (e.pointerType === 'touch') { p.hoverTarget = 1; gazeTouch(id, focusable) }
      }}
      onPointerUp={e => { if (e.pointerType === 'touch') { const p = entry(); if (p) p.hoverTarget = 0 } }}
    >
      {children}
    </Tag>
  )
}
