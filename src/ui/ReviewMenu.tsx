import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp, type GlyphId, type TypePair } from '../state/store'
import { THEMES, THEME_ORDER } from '../theme/themes'
import { enableGyro, nudgeWalk, recenterGyro, resetWalk } from '../head/headPose'
import { GlyphMark, GLYPH_NAMES } from './Glyph'
import { SPRING } from './motion'

// Review controls for the prototype: theme, type pairing, logo and view
// options. Kept apart from the product UI (plain, not glass) on purpose.

const PAIRS: { id: TypePair; display: string; body: string }[] = [
  { id: 'a', display: 'Newsreader', body: 'Instrument Sans' },
  { id: 'b', display: 'Source Serif 4', body: 'Hanken Grotesk' },
]

export function ReviewMenu() {
  const [open, setOpen] = useState(false)
  const s = useApp()
  const gyroOffer = s.gyro === 'available' || s.gyro === 'needs-permission'

  return (
    <div className="review" data-review>
      <AnimatePresence>
        {open && (
          <motion.div
            id="review-sheet"
            className="review-sheet"
            role="dialog"
            aria-label="Review options"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={SPRING}
          >
            {gyroOffer && (
              <button className="review-cta" onClick={() => enableGyro()}>Use motion sensor</button>
            )}
            {s.gyro === 'on' && (
              <button className="review-cta quiet" onClick={() => recenterGyro()}>Recenter motion</button>
            )}
            {s.gyro === 'denied' && <p className="review-note">Motion access was declined. Allow it in Settings, then reload.</p>}

            <Group label="Theme">
              {THEME_ORDER.map(id => (
                <Option key={id} on={s.theme === id} onClick={() => s.setTheme(id)} layoutId="pill-theme">
                  <span className="swatch" style={{ background: THEMES[id].swatch }} />{THEMES[id].label}
                </Option>
              ))}
            </Group>

            <Group label="Type">
              {PAIRS.map(p => (
                <Option key={p.id} on={s.typePair === p.id} onClick={() => s.setTypePair(p.id)} layoutId="pill-type" wide>
                  <span className={`pair-sample pair-${p.id}`}><span className="pd">{p.display}</span><span className="pb">{p.body}</span></span>
                </Option>
              ))}
            </Group>

            <Group label="Logo">
              {(['lens', 'arc', 'keystone'] as GlyphId[]).map(g => (
                <Option key={g} on={s.glyph === g} onClick={() => s.setGlyph(g)} layoutId="pill-glyph">
                  <GlyphMark id={g} size={16} />{GLYPH_NAMES[g]}
                </Option>
              ))}
            </Group>

            <Group label="View">
              <Toggle on={s.focusPinned} onClick={() => s.setFocusPinned(!s.focusPinned)}>Hold focus</Toggle>
              <Toggle on={s.headMotion} onClick={() => s.setHeadMotion(!s.headMotion)}>Head motion</Toggle>
              <Toggle on={s.videoPlaying} onClick={() => s.setVideoPlaying(!s.videoPlaying)}>City loop</Toggle>
              <Toggle on={s.reducedMotion} onClick={() => s.setReducedMotion(!s.reducedMotion)}>Reduce motion</Toggle>
              <Toggle on={s.perfOpen} onClick={() => s.setPerfOpen(!s.perfOpen)}>Perf</Toggle>
            </Group>

            <Group label="Distance">
              <button className="opt" onClick={() => nudgeWalk(0.35)}><span className="opt-content">Step back</span></button>
              <button className="opt" onClick={() => nudgeWalk(-0.35)}><span className="opt-content">Step closer</span></button>
              <button className="opt" onClick={() => resetWalk()}><span className="opt-content">Reset</span></button>
              <p className="review-note">Scroll, or pinch with two fingers, to walk toward the glass or away from it. Focus and text weight follow you.</p>
            </Group>
          </motion.div>
        )}
      </AnimatePresence>
      <button className="review-button" aria-expanded={open} aria-controls="review-sheet" onClick={() => setOpen(o => !o)}>
        {open ? 'Done' : 'Review'}
      </button>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="review-group" role="group" aria-label={label}>
      <div className="review-label">{label}</div>
      <div className="review-options">{children}</div>
    </div>
  )
}

function Option({ on, onClick, layoutId, wide, children }: { on: boolean; onClick: () => void; layoutId: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <button className={`opt${wide ? ' wide' : ''}`} aria-pressed={on} onClick={onClick}>
      {on && <motion.span layoutId={layoutId} className="opt-pill" transition={SPRING} />}
      <span className="opt-content">{children}</span>
    </button>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="opt toggle" aria-pressed={on} onClick={onClick}>
      <span className="opt-content"><span className="tdot" aria-hidden="true" />{children}</span>
    </button>
  )
}
