import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Art } from './art'
import { SPRING } from '../motion'

// Trust (canon §12): voices and faces stopped being proof. Identity is a
// hardware signature, families keep a safe word, recordings are checked for a
// device signature, and Claude reports what it blocked.

const ALERTS = [
  { when: 'Today · 9:02 AM', text: 'A gray-market endpoint asked Lakeshore Credit Union for your voiceprint. Blocked: the bank needs your hardware signature.' },
  { when: 'Yesterday', text: 'An agent claiming to represent your landlord failed its signature check. Conversation ended; your landlord was told.' },
  { when: 'Jul 2', text: 'Someone posted a video using your face to Claude World. It had no device signature, so it was hidden from search.' },
]

const CHECKS = [
  { label: 'Device signature', result: 'None. No certified camera or phone signed it.' },
  { label: 'Voice', result: 'Matches a known clone model sold outside the bloc.' },
  { label: 'Outlets', result: '0 certified outlets carry it.' },
]

const Cross = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
const Glasses = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="6.5" cy="14" r="3.5" /><circle cx="17.5" cy="14" r="3.5" /><path d="M10 14h4M3 14l1.5-6M21 14l-1.5-6" /></svg>
const Puck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="5" /><circle cx="12" cy="12" r="2.5" /></svg>

export function Trust() {
  return (
    <div className="trust" data-scroll>
      <div className="trust-col">
        <section className="trust-card identity">
          <span className="eyebrow">Signed identity</span>
          <span className="trust-title">Active on glasses and puck</span>
          <div className="keys" aria-hidden="true">
            <span className="key"><Glasses />Glasses</span>
            <span className="key-link"><span /></span>
            <span className="key"><Puck />Puck</span>
          </div>
          <p className="trust-copy">Your bank, the court portal and your landlord’s agent require a hardware signature. Voice and face alone unlock nothing.</p>
        </section>
        <section className="trust-card">
          <span className="eyebrow">Family safe word</span>
          <span className="trust-title">Set · shared with 4 people</span>
          <div className="family" aria-label="Shared with Mom, Dad, Leila and Grandma">
            {['M', 'D', 'L', 'G'].map((f, i) => <span key={f} className="fam" style={{ zIndex: 4 - i }}>{f}</span>)}
          </div>
          <p className="trust-copy">Last used 3 weeks ago, during a suspicious call. The word itself is never stored by Claude.</p>
        </section>
        <Callbacks />
      </div>
      <div className="trust-col">
        <Verify />
        <section className="trust-card alerts">
          <span className="eyebrow">Alerts</span>
          <ul className="alert-list">
            {ALERTS.map((a, i) => (
              <motion.li key={a.when} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 + i * 0.05 }}>
                <span className="alert-when">{a.when}</span>
                <span className="alert-text">{a.text}</span>
              </motion.li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

// Anything sensitive is confirmed on a second channel before Claude acts.
function Callbacks() {
  const [on, setOn] = useState(true)
  return (
    <section className="trust-card">
      <div className="card-row">
        <span className="eyebrow">Callbacks</span>
        <button className="switch" role="switch" aria-checked={on} aria-label="Callback on a second channel" onClick={() => setOn(v => !v)}>
          <span className="switch-track"><motion.span className="switch-knob" animate={{ x: on ? 16 : 0 }} transition={SPRING} /></span>
        </button>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p key={String(on)} className="trust-copy" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SPRING}>
          {on
            ? 'Money, legal filings and anything about your accounts get a callback on a second channel before Claude acts. 2 this month.'
            : 'Off. Claude will act on signed requests without calling you back on a second channel.'}
        </motion.p>
      </AnimatePresence>
    </section>
  )
}

// Checks run one after another, like a person reading down a list.
function Verify() {
  const [step, setStep] = useState(-1) // -1 idle, 0..3 checking, 4 done
  useEffect(() => {
    if (step < 0 || step >= CHECKS.length) return
    const id = window.setTimeout(() => setStep(s => s + 1), step === 0 ? 700 : 650)
    return () => window.clearTimeout(id)
  }, [step])
  const scanning = step >= 0 && step < CHECKS.length
  const done = step > CHECKS.length - 1

  return (
    <section className="trust-card verify">
      <span className="eyebrow">Verify a recording</span>
      <div className="clip-check">
        <span className={`thumb${scanning ? ' scanning' : ''}${done ? ' flagged' : ''}`}>
          <Art id="alderman" />
          {scanning && <span className="scan-line" />}
          <span className="thumb-time">0:48</span>
        </span>
        <span className="file">
          <span className="file-name">Alderman_statement_leak.mp4</span>
          <span className="file-meta">Shared to you by a group chat · 31 MB</span>
          {step < 0 && <button className="pill-btn" onClick={() => setStep(0)}>Check provenance</button>}
          {scanning && <span className="checking"><span className="spinner" />Checking…</span>}
          {done && <button className="ghost-btn" onClick={() => setStep(-1)}>Check again</button>}
        </span>
      </div>
      <AnimatePresence initial={false}>
        {step >= 0 && (
          <motion.ul key="checks" className="checks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={SPRING}>
            {CHECKS.map((c, i) => step > i && (
              <motion.li key={c.label} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={SPRING}>
                <span className="mark bad"><Cross /></span>
                <span><b>{c.label}.</b> {c.result}</span>
              </motion.li>
            ))}
            {done && (
              <motion.li key="verdict" className="verdict-row" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.1 }}>
                <span className="mark warn">!</span>
                <span><b>Treat as unverified.</b> Claude won’t repeat it as fact or pass it to your agents.</span>
              </motion.li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}
