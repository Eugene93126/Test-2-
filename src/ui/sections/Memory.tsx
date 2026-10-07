import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MEMORIES, QUARANTINE, type Memory as Mem } from '../../data/memory'
import { SPRING } from '../motion'

// Memory: what Claude knows about you and where it learned it. Open a memory
// to see its provenance; forget it and everything learned only from it goes too.

const Warn = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3.5l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
const Seal = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
const Chevron = ({ open }: { open: boolean }) => <motion.svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" animate={{ rotate: open ? 180 : 0 }} transition={SPRING}><path d="M6 9l6 6 6-6" /></motion.svg>

export function Memory() {
  const [quarantine, setQuarantine] = useState<'flagged' | 'review' | 'kept'>('flagged')
  const [gone, setGone] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [undo, setUndo] = useState<Mem | null>(null)
  const list = MEMORIES.filter(m => !gone.includes(m.id))

  // The undo offer lasts a few seconds, then the forgetting is final.
  useEffect(() => {
    if (!undo) return
    const id = window.setTimeout(() => setUndo(null), 6000)
    return () => window.clearTimeout(id)
  }, [undo])

  const forget = (m: Mem) => { setGone(g => [...g, m.id]); setOpen(null); setUndo(m) }

  return (
    <div className="memory">
      <motion.div layout="position" transition={SPRING} className={`quarantine is-${quarantine}`} role="status">
        <span className="q-icon"><Warn /></span>
        <div className="q-body">
          {quarantine === 'kept'
            ? <p className="q-text">Kept in quarantine. {QUARANTINE.agent} won’t learn it, and the feed is marked untrusted for every agent in your Circle.</p>
            : <p className="q-text"><b>1 write quarantined.</b> A public legal feed claimed “{QUARANTINE.claim}” It conflicts with 3 signed sources, so {QUARANTINE.agent} didn’t learn it.</p>}
          <AnimatePresence initial={false}>
            {quarantine === 'review' && (
              <motion.div key="review" className="q-review" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING}>
                <span className="q-from">From: {QUARANTINE.from}</span>
                <ul className="q-sources">
                  {QUARANTINE.conflicts.map((c, i) => (
                    <motion.li key={c} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: 0.05 + i * 0.05 }}><Seal />{c}</motion.li>
                  ))}
                </ul>
                <div className="q-actions">
                  <button className="pill-btn" onClick={() => setQuarantine('kept')}>Keep quarantined</button>
                  <button className="ghost-btn" disabled title="Release needs at least one signed source">Release to {QUARANTINE.agent}</button>
                  <span className="fine">Release needs a signed source</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {quarantine !== 'kept' && (
          <button className="ghost-btn" aria-expanded={quarantine === 'review'} onClick={() => setQuarantine(q => (q === 'review' ? 'flagged' : 'review'))}>
            {quarantine === 'review' ? 'Close' : 'Review'}
          </button>
        )}
      </motion.div>

      <ul className="mem-list" data-scroll>
        <AnimatePresence initial={false} mode="popLayout">
          {list.map(m => {
            const isOpen = open === m.id
            return (
              <motion.li key={m.id} layout="position" className={`mem${isOpen ? ' open' : ''}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, scale: 0.98 }} transition={SPRING}>
                <button className="mem-main card-hit" aria-expanded={isOpen} onClick={() => setOpen(o => (o === m.id ? null : m.id))}>
                  <span className="mem-text">{m.text}</span>
                  <span className="mem-source">{m.signed && <span className="mem-signed"><Seal />Signed</span>}{m.source}</span>
                </button>
                <span className="mem-tools">
                  <Chevron open={isOpen} />
                  <button className="ghost-btn" onClick={() => forget(m)} aria-label={`Forget: ${m.text}`}>Forget</button>
                </span>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.dl key="prov" className="mem-prov" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING}>
                      <div><dt>Learned</dt><dd>{m.learned}</dd></div>
                      <div><dt>Used</dt><dd>{m.used}</dd></div>
                      <div><dt>Forgetting also removes</dt><dd>{m.derived.length ? m.derived.join(' · ') : 'Nothing else was learned only from this'}</dd></div>
                    </motion.dl>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      <div className="mem-foot">
        <AnimatePresence mode="popLayout" initial={false}>
          {undo ? (
            <motion.div key="undo" className="undo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={SPRING} role="status">
              <span>Forgot “{undo.text.split(/[;:(]/)[0].trim()}”{undo.derived.length ? ` and ${undo.derived.length} thing${undo.derived.length > 1 ? 's' : ''} learned only from it` : ''}.</span>
              <button className="ghost-btn" onClick={() => { setGone(g => g.filter(id => id !== undo.id)); setUndo(null) }}>Undo</button>
            </motion.div>
          ) : (
            <motion.span key="count" className="fine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SPRING}>
              {list.length} memories · every write signed with its source · writes land in minutes, and nothing on your devices changes the model itself
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
