import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ASSETS, KINDS, type AssetKind } from '../../data/assets'
import { Art } from './art'
import { SPRING } from '../motion'

// Claude World: shared assets from people you follow. Signed work is shown;
// unsigned uploads stay hidden unless you ask, and then they look unverified.

const ShieldOk = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
const ShieldNo = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" /></svg>

export function World() {
  const [kind, setKind] = useState<'All' | AssetKind>('All')
  const [unsigned, setUnsigned] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const list = ASSETS.filter(a => (kind === 'All' || a.kind === kind) && (unsigned || a.signed))
  const asset = ASSETS.find(a => a.id === picked)
  const hiddenCount = ASSETS.filter(a => !a.signed && (kind === 'All' || a.kind === kind)).length

  return (
    <div className="world">
      <div className="world-bar">
        <div className="chips" role="tablist" aria-label="Kind">
          {KINDS.map(k => (
            <button key={k} role="tab" aria-selected={k === kind} className="chip-btn" onClick={() => setKind(k)}>
              {k === kind && <motion.span layoutId="kind-pill" className="chip-fill" transition={SPRING} />}
              <span>{k}</span>
            </button>
          ))}
        </div>
        <button className="switch" role="switch" aria-checked={unsigned} onClick={() => setUnsigned(u => !u)}>
          <span className="switch-track"><motion.span className="switch-knob" animate={{ x: unsigned ? 16 : 0 }} transition={SPRING} /></span>
          {unsigned ? 'Showing unsigned' : hiddenCount ? `${hiddenCount} unsigned hidden` : 'Signed only'}
        </button>
      </div>

      <div className={`world-body${asset ? ' has-drawer' : ''}`}>
        <motion.div layout className="tiles" transition={SPRING}>
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map(a => (
              <motion.button
                key={a.id}
                layout
                className={`tile${a.signed ? '' : ' unsigned'}${picked === a.id ? ' picked' : ''}`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={SPRING}
                onClick={() => setPicked(p => (p === a.id ? null : a.id))}
                aria-pressed={picked === a.id}
              >
                <span className="tile-art"><Art id={a.id} /><span className="tile-kind">{a.kind}</span></span>
                <span className="tile-meta">
                  <span className="tile-title">{a.title}</span>
                  <span className="tile-by">{a.by}</span>
                  <span className="tile-row">
                    <span className={`badge${a.signed ? '' : ' warn'}`}>{a.signed ? <ShieldOk /> : <ShieldNo />}{a.signed ? 'Signed' : 'Unsigned · unverified'}</span>
                    <span className="tile-remix">{a.remixes}</span>
                  </span>
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {asset && (
            <motion.aside key={asset.id} className={`provenance${asset.signed ? '' : ' warn'}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={SPRING} aria-label="Provenance">
              <div className="prov-head">
                <span className="eyebrow">Provenance</span>
                <button className="x-btn" onClick={() => setPicked(null)} aria-label="Close provenance">×</button>
              </div>
              <div className="prov-title">{asset.title}</div>
              <ol className="chain">
                {asset.chain.map((c, i) => (
                  <motion.li key={c.label} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: 0.06 + i * 0.05 }}>
                    <span className="chain-dot" aria-hidden="true" />
                    <span className="chain-label">{c.label}</span>
                    <span className="chain-detail">{c.detail}</span>
                  </motion.li>
                ))}
              </ol>
              <button className="pill-btn" disabled={!asset.signed}>{asset.signed ? 'Remix in Fable Duo' : 'Remix disabled'}</button>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
