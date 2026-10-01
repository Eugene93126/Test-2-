import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GlassPanel } from '../glass/GlassPanel'
import { SECTION_ORDER, useApp, type SectionId } from '../state/store'
import { SECTIONS } from '../data/sections'
import { modelById } from '../data/models'
import { Chat } from './sections/Chat'
import { Resting } from './sections/Resting'
import { SPRING } from './motion'

// The main window at the mid depth, where your eyes rest. Switching sections
// morphs the title and slides the content in the direction you moved along
// the Dock; only transforms and opacity animate.

const content = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -36 }),
}

export function MainWindow() {
  const section = useApp(s => s.section)
  const modal = useApp(s => s.modal)
  const setModal = useApp(s => s.setModal)
  const model = modelById(useApp(s => s.model))
  // Direction of travel along the Dock (derived state, updated during render).
  const [nav, setNav] = useState<{ from: SectionId; dir: number }>({ from: section, dir: 1 })
  if (nav.from !== section) setNav({ from: section, dir: Math.sign(SECTION_ORDER.indexOf(section) - SECTION_ORDER.indexOf(nav.from)) || 1 })
  const dir = nav.dir
  const s = SECTIONS[section]

  return (
    <GlassPanel id="main" depth="mid" radius={30} delay={0.12} focusable className={`main${modal ? ' dimmed' : ''}`} as="section" label={s.title}>
      <div className="main-head">
        <div className="title-stack">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.h2 key={s.title} className="main-title" custom={dir} variants={content} initial="enter" animate="center" exit="exit" transition={SPRING}>
              {s.title}
            </motion.h2>
          </AnimatePresence>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={s.subtitle} className="main-sub" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING}>
              {s.subtitle}
            </motion.span>
          </AnimatePresence>
        </div>
        <motion.button
          layout
          transition={SPRING}
          className="model-chip"
          aria-haspopup="dialog"
          aria-expanded={modal === 'models'}
          onClick={() => setModal(modal === 'models' ? null : 'models')}
          id="model-chip"
        >
          <span className="dot" style={{ background: model.dot }} />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={model.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING}>
              {model.name}
            </motion.span>
          </AnimatePresence>
          <span className="tag">{model.cls}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </motion.button>
      </div>
      <div className="main-content">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div key={section} className="section" custom={dir} variants={content} initial="enter" animate="center" exit="exit" transition={SPRING}>
            {section === 'chat' ? <Chat /> : <Resting id={section} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </GlassPanel>
  )
}
