import { useRef } from 'react'
import { AnimatePresence, motion, useSpring, type MotionValue } from 'motion/react'
import { GlassPanel } from '../glass/GlassPanel'
import { addRipple, panels } from '../glass/registry'
import { SECTION_ORDER, useApp, type SectionId } from '../state/store'
import { SECTIONS } from '../data/sections'
import { SECTION_ICONS, SlidersIcon } from './icons'
import { SPRING } from './motion'

// The Claude Dock: a launcher you can customize. Icons lean toward the pointer
// like a magnet; the current-section highlight slides between them.

const MAGNET_RADIUS = 90 // px
const MAGNET_PULL = 0.28
const MAGNET_MAX = 9 // px

interface Magnet { x: MotionValue<number>; y: MotionValue<number>; s: MotionValue<number>; el: HTMLElement | null }

export function goToSection(id: SectionId) {
  const { section, setSection, setModal } = useApp.getState()
  setModal(null)
  if (id === section) return
  setSection(id)
  // A ripple rolls up through the main window from the Dock.
  const main = panels.get('main')
  if (main) addRipple(main, 0, -main.world.h / 2 + 0.04, 0.75)
}

export function Dock() {
  const pinned = useApp(s => s.pinned)
  const section = useApp(s => s.section)
  const labels = useApp(s => s.dockLabels)
  const modal = useApp(s => s.modal)
  const setModal = useApp(s => s.setModal)
  const reduced = useApp(s => s.reducedMotion)
  const magnets = useRef(new Map<string, Magnet>())

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType === 'touch') return
    for (const m of magnets.current.values()) {
      if (!m.el) continue
      const r = m.el.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
      const pull = Math.max(0, 1 - Math.hypot(dx, dy) / MAGNET_RADIUS)
      const clamp = (v: number) => Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, v))
      m.x.set(clamp(dx * MAGNET_PULL * pull))
      m.y.set(clamp(dy * MAGNET_PULL * pull))
      m.s.set(1 + 0.12 * pull)
    }
  }
  const onLeave = () => { for (const m of magnets.current.values()) { m.x.set(0); m.y.set(0); m.s.set(1) } }

  return (
    <>
      <GlassPanel id="dock" depth="near" radius={28} delay={0.4} className={`dock${labels ? '' : ' no-labels'}`} as="nav" label="Dock">
        <div className="dock-row" onPointerMove={onMove} onPointerLeave={onLeave}>
          <AnimatePresence initial={false} mode="popLayout">
            {pinned.map(id => (
              <DockItem key={id} id={id} current={id === section} labels={labels} magnets={magnets.current} />
            ))}
          </AnimatePresence>
          <motion.span layout="position" className="dock-rule" aria-hidden="true" transition={SPRING} />
          <motion.button
            layout="position"
            transition={SPRING}
            className="dock-item dock-edit"
            aria-label="Customize Dock"
            aria-pressed={modal === 'dock'}
            onClick={() => setModal(modal === 'dock' ? null : 'dock')}
          >
            <span className="dock-icon dashed"><SlidersIcon /></span>
            {labels && <span className="dock-label">{modal === 'dock' ? 'Done' : 'Customize'}</span>}
          </motion.button>
        </div>
      </GlassPanel>

      <AnimatePresence>{modal === 'dock' && <DockSettings key="dock-settings" />}</AnimatePresence>
    </>
  )
}

function DockItem({ id, current, labels, magnets }: { id: SectionId; current: boolean; labels: boolean; magnets: Map<string, Magnet> }) {
  const x = useSpring(0, SPRING), y = useSpring(0, SPRING), s = useSpring(1, SPRING)
  const ref = (el: HTMLButtonElement | null) => {
    if (el) magnets.set(id, { x, y, s, el })
    else magnets.delete(id)
  }
  return (
    <motion.button
      ref={ref}
      layout="position"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={SPRING}
      className={`dock-item${current ? ' current' : ''}`}
      aria-label={SECTIONS[id].title}
      aria-current={current ? 'page' : undefined}
      onClick={() => goToSection(id)}
    >
      <motion.span className="dock-icon" style={{ x, y, scale: s }}>
        {current && <motion.span layoutId="dock-active" className="dock-active" transition={SPRING} />}
        <span className="dock-glyph">{SECTION_ICONS[id]}</span>
      </motion.span>
      {labels && <span className="dock-label">{SECTIONS[id].label}</span>}
    </motion.button>
  )
}

function DockSettings() {
  const pinned = useApp(s => s.pinned)
  const togglePin = useApp(s => s.togglePin)
  const labels = useApp(s => s.dockLabels)
  const setLabels = useApp(s => s.setDockLabels)
  return (
    <GlassPanel id="dock-settings" depth="sheet" overlay radius={22} className="dock-settings" label="Customize Dock" role="dialog">
      <span className="sheet-label">Pin to Dock</span>
      <div className="pin-row">
        {SECTION_ORDER.map(id => {
          const on = pinned.includes(id)
          return (
            <button key={id} className="pin" aria-pressed={on} onClick={() => togglePin(id)} disabled={on && pinned.length === 1}>
              {on && <motion.span layoutId={`pin-${id}`} className="pin-fill" transition={SPRING} />}
              <span className="pin-content">{SECTION_ICONS[id]}{SECTIONS[id].label}</span>
            </button>
          )
        })}
      </div>
      <button className="pin quiet" aria-pressed={labels} onClick={() => setLabels(!labels)}>
        <span className="pin-content">{labels ? 'Hide labels' : 'Show labels'}</span>
      </button>
    </GlassPanel>
  )
}
