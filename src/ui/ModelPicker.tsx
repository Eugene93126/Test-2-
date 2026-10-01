import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GlassPanel } from '../glass/GlassPanel'
import { useApp, type ModelId } from '../state/store'
import { MODELS, modelById } from '../data/models'
import { LockIcon } from './icons'
import { SPRING } from './motion'

// Model picker: a glass sheet over the main window. Peek at any model; use the
// ones your plan allows. Mythos Duo needs a verified organization.

export function ModelPicker() {
  const modal = useApp(s => s.modal)
  return <AnimatePresence>{modal === 'models' && <Sheet key="models" />}</AnimatePresence>
}

function Sheet() {
  const current = useApp(s => s.model)
  const setModel = useApp(s => s.setModel)
  const setModal = useApp(s => s.setModal)
  const [peek, setPeek] = useState<ModelId>(current)
  const first = useRef<HTMLButtonElement>(null)
  const m = modelById(peek)
  const inUse = peek === current

  useEffect(() => {
    first.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.getElementById('model-chip')?.focus({ preventScroll: true })
    }
  }, [setModal])

  return (
    <GlassPanel id="model-sheet" depth="sheet" overlay radius={28} className="model-sheet" label="Choose a model" role="dialog">
      <div className="model-list" role="listbox" aria-label="Models">
        {MODELS.map((d, i) => {
          const on = d.id === peek
          return (
            <button
              key={d.id}
              ref={i === 0 ? first : undefined}
              role="option"
              aria-selected={on}
              className="model-row"
              onClick={() => setPeek(d.id)}
              onDoubleClick={() => { if (!d.locked) { setModel(d.id); setModal(null) } }}
            >
              {on && <motion.span layoutId="model-peek" className="model-row-fill" transition={SPRING} />}
              <span className="dot" style={{ background: d.dot }} />
              <span className="model-row-text">
                <span className="model-row-name">{d.name}</span>
                <span className="model-row-meta">{d.cls} · {d.tag}</span>
              </span>
              <span className="model-row-state">
                {d.locked ? <><LockIcon />Locked</> : d.id === current ? 'In use' : ''}
              </span>
            </button>
          )
        })}
      </div>

      <div className="model-detail">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={m.id} className="model-detail-inner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={SPRING}>
            <div className="model-name-row">
              <h3 className="model-name">{m.name}</h3>
              <span className="model-cls">{m.cls} model</span>
            </div>
            <p className="model-note">{m.note}</p>
            <dl className="model-facts">
              <div><dt>Best for</dt><dd>{m.best}</dd></div>
              <div><dt>Energy</dt><dd>{m.energy}</dd></div>
              <div><dt>Safeguards</dt><dd>{m.safeguards}</dd></div>
              <div><dt>Availability · plan</dt><dd>{m.availability}</dd></div>
            </dl>
          </motion.div>
        </AnimatePresence>
        <div className="model-actions">
          <button
            className={`model-use${m.locked ? ' locked' : ''}`}
            disabled={m.locked || inUse}
            onClick={() => { setModel(m.id); setModal(null) }}
          >
            {m.locked ? 'Requires verification' : inUse ? 'In use' : `Use ${m.name}`}
          </button>
          <button className="model-close" onClick={() => setModal(null)}>Close</button>
          <span className="model-hint">Same chat, any model. Claude picks effort on its own.</span>
        </div>
      </div>
    </GlassPanel>
  )
}
