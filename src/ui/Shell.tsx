import { GlassPanel } from '../glass/GlassPanel'
import { Glyph } from './Glyph'
import { useApp } from '../state/store'

// Phase 2: the panels in place at their three depths, with real content, so the
// glass, type and logo can be judged in context. The HUD, Dock and model picker
// become interactive in phase 3; the sections arrive in phases 4 and 5.

export function Shell() {
  const glyph = useApp(s => s.glyph)
  return (
    <>
      {/* Near: head-height chrome */}
      <GlassPanel id="hud-brand" depth="near" radius={22} delay={0} className="hud hud-brand" as="header" label="Claude">
        <Glyph id={glyph} size={24} />
        <span className="brand-word">Claude</span>
        <span className="hud-meta">Sat, Jul 8 · <b>8:41 PM</b><span className="wide-only"> · Chicago 74°F</span></span>
      </GlassPanel>

      <GlassPanel id="hud-status" depth="near" radius={22} delay={0.06} className="hud hud-status wide-only" label="Status">
        <span className="hud-item"><span className="live-dot" aria-hidden="true" />Grid <b>$0.212</b>/kWh</span>
        <span className="hud-item muted">Peak until 9 PM</span>
        <span className="hud-item muted">Glasses 61%</span>
        <span className="hud-item muted">Max plan</span>
      </GlassPanel>

      {/* Far: peripheral glances */}
      <div className="col col-left wide-only">
        <GlassPanel id="glance-transit" depth="far" radius={22} delay={0.2} className="card">
          <div className="eyebrow">Transit</div>
          <div className="card-title">Red Line at Belmont</div>
          <div className="big-num"><span className="num">4</span><span className="unit">min · leave in 2</span></div>
        </GlassPanel>
        <GlassPanel id="glance-circle" depth="far" radius={22} delay={0.26} className="card">
          <div className="eyebrow">Claude Circle · today</div>
          <p className="card-body">Brian finished 6 hours of study and has 3 questions for you.</p>
          <div className="card-link">Open Circle</div>
        </GlassPanel>
        <GlassPanel id="glance-tonight" depth="far" radius={22} delay={0.32} className="card">
          <div className="eyebrow">Tonight</div>
          <p className="card-body">Pantheon 2.0 keynote replay with Dev and Sam, 9:00 PM</p>
        </GlassPanel>
      </div>

      <div className="col col-right wide-only">
        <GlassPanel id="glance-energy" depth="far" radius={22} delay={0.24} className="card">
          <div className="eyebrow">Your AI energy today</div>
          <div className="big-num"><span className="num">41.6</span><span className="unit">kJ</span></div>
          <div className="meter" aria-hidden="true"><span style={{ width: '64%' }} /><span className="clay" style={{ width: '22%' }} /><span className="faint" style={{ width: '9%' }} /></div>
          <p className="card-note">Fable Duo 26.6 · Pantheon 9.2 · Odyssey 3.9</p>
          <p className="card-note">Heavy jobs queued for 1:00 AM, when power is cheapest</p>
        </GlassPanel>
        <GlassPanel id="glance-view" depth="far" radius={22} delay={0.3} className="card">
          <div className="eyebrow">In view</div>
          <p className="card-body">Navy Pier fireworks at 10:15 PM, to the southeast past the Hancock.</p>
        </GlassPanel>
      </div>

      {/* Mid: the main window, where your eyes rest */}
      <GlassPanel id="main" depth="mid" radius={30} delay={0.12} focusable className="main" as="section" label="Chat">
        <div className="main-head">
          <h2 className="main-title">Chat</h2>
          <span className="main-sub">Thesis · warehouse automation</span>
          <span className="model-chip"><span className="dot" style={{ background: 'var(--clay)' }} />Fable Duo 4.1<span className="tag">Digital</span></span>
        </div>
        <div className="main-body">
          <div className="bubble you">
            <div className="caption">Voice · transcribed</div>
            Pantheon 2.0 launched today. Should I move my thesis over to it, or keep using Fable?
          </div>
          <div className="reply">
            <div className="caption">Fable Duo 4.1 · remembered your thesis plan from March</div>
            <p>For most of it, stay on Fable Duo. It already knows your chapters, it answers faster, and it uses a fraction of the energy.</p>
            <p>Move two things to Pantheon, where its depth pays off: the 40-hour data reconciliation in chapter 4, and validating your warehouse simulation against real robot data. Your Max plan covers both. It's peak grid hours in Chicago until 9, so I'd queue them for 1:00 AM.</p>
            <div className="actions">
              <span className="action primary">Queue overnight on Pantheon</span>
              <span className="action">Ask Brian about citation rules</span>
              <span className="action">Open chapter 4</span>
            </div>
          </div>
        </div>
        <div className="composer">
          <span className="composer-hint">Ask, or say "Claude"…</span>
          <span className="composer-effort">Effort: auto</span>
          <span className="mic" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </span>
        </div>
      </GlassPanel>

      {/* Near: the Dock */}
      <GlassPanel id="dock" depth="near" radius={28} delay={0.4} className="dock" as="nav" label="Dock">
        {DOCK.map(d => (
          <span key={d.label} className={`dock-item${d.label === 'Chat' ? ' current' : ''}`}>
            <span className="dock-icon">{d.icon}</span>
            <span className="dock-label">{d.label}</span>
          </span>
        ))}
      </GlassPanel>
    </>
  )
}

const ic = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const DOCK = [
  { label: 'Chat', icon: <svg {...ic}><path d="M4 5h16v11H9l-5 4z" /></svg> },
  { label: 'Circle', icon: <svg {...ic}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="6.5" r="2" /><circle cx="7.2" cy="15" r="2" /><circle cx="16.8" cy="15" r="2" /></svg> },
  { label: 'World', icon: <svg {...ic}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></svg> },
  { label: 'Code', icon: <svg {...ic}><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></svg> },
  { label: 'Home', icon: <svg {...ic}><path d="M4 11l8-7 8 7v9H4z" /><path d="M10 20v-5h4v5" /></svg> },
  { label: 'Memory', icon: <svg {...ic}><path d="M12 4l8 4-8 4-8-4z" /><path d="M4 12l8 4 8-4M4 16l8 4 8-4" /></svg> },
  { label: 'Trust', icon: <svg {...ic}><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg> },
]
