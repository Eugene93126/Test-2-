import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '../../state/store'
import { modelById } from '../../data/models'
import { THEMES } from '../../theme/themes'
import { useVoice, type Message } from '../../voice/voice'
import { orbAnchor } from '../../voice/VoiceOrb'
import { Waveform } from '../../voice/Waveform'
import { SPRING } from '../motion'

// Chat, voice first. Tap the orb and talk: your words appear as you say them,
// then Claude answers and the clip it made lands in the thread.

const STATE_LABEL = { idle: '', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' } as const

export function Chat() {
  const model = modelById(useApp(s => s.model))
  const theme = useApp(s => s.theme)
  const { phase, messages, start, stop } = useVoice()
  const ink = THEMES[theme].ui['--ink'], accent = THEMES[theme].ui['--accent']

  return (
    <div className="chat">
      <div className="main-body chat-log">
        <div className="bubble you">
          <div className="caption">Voice · transcribed · 8:39 PM</div>
          Pantheon 2.0 launched today. Should I move my thesis over to it, or keep using Fable?
        </div>
        <div className="reply">
          <div className="caption">Fable Duo 4.1 · remembered your thesis plan from March</div>
          <p>For most of it, stay on Fable Duo. It already knows your chapters, it answers faster, and it uses a fraction of the energy.</p>
          <p>Move two things to Pantheon, where its depth pays off: the 40-hour data reconciliation in chapter 4, and validating your warehouse simulation against real robot data. Your Max plan covers both. It's peak grid hours in Chicago until 9, so I'd queue them for 1:00 AM.</p>
          {messages.length === 0 && (
            <div className="actions">
              <span className="action primary">Queue overnight on Pantheon</span>
              <span className="action">Ask Brian about citation rules</span>
              <span className="action">Open chapter 4</span>
            </div>
          )}
        </div>
        <AnimatePresence initial={false}>
          {messages.map(m => <Msg key={m.id} m={m} live={phase === 'listening' && m.from === 'you'} />)}
        </AnimatePresence>
      </div>

      <div className={`composer${phase !== 'idle' ? ' voice' : ''}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          {phase === 'idle' ? (
            <motion.span key="hint" className="composer-idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING}>
              <span className="composer-hint">Tap the orb and talk, or say "Claude"…</span>
              <span className="composer-effort">{model.name} · effort auto</span>
            </motion.span>
          ) : (
            <motion.span key="voice" className="voice-row" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING}>
              <Waveform color={ink} accent={accent} />
              <span className="voice-state" aria-live="polite">{STATE_LABEL[phase]}</span>
            </motion.span>
          )}
        </AnimatePresence>
        <button
          ref={el => { orbAnchor.el = el }}
          className="orb-button"
          aria-pressed={phase === 'listening'}
          onClick={() => (phase === 'idle' ? start() : phase === 'listening' ? stop() : undefined)}
        >
          <span className="sr-only">{phase === 'listening' ? 'Stop listening' : 'Talk to Claude'}</span>
        </button>
      </div>
    </div>
  )
}

function Msg({ m, live }: { m: Message; live: boolean }) {
  const all = m.text.split(' ')
  const text = all.slice(0, m.shown).join(' ')
  const done = m.shown >= all.length
  return (
    <motion.div
      layout="position"
      className={m.from === 'you' ? 'bubble you' : 'reply'}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
    >
      {m.caption && <div className="caption">{m.caption}</div>}
      {m.from === 'you' ? <>{text}{live && <span className="caret" aria-hidden="true" />}</> : <p>{text}</p>}
      <AnimatePresence>{m.clip && done && <ClipCard />}</AnimatePresence>
    </motion.div>
  )
}

function ClipCard() {
  return (
    <motion.div className="clip" initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING}>
      <div className="clip-art" aria-label="Warehouse simulation clip, 20 seconds">
        <svg viewBox="0 0 260 146" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a352f" /><stop offset="1" stopColor="#57504a" /></linearGradient>
          </defs>
          <rect width="260" height="146" fill="#24221f" />
          <path d="M0 88 L260 88 L260 146 L0 146 Z" fill="url(#floor)" />
          <path d="M130 70 L0 146 M130 70 L260 146" stroke="#6b6359" strokeWidth="1" opacity="0.6" />
          {[0, 1, 2].map(i => (
            <g key={i}>
              <rect x={14 + i * 24} y={24 + i * 8} width={18 - i * 3} height={78 - i * 14} fill="#6E6558" />
              <rect x={228 - i * 24 - (18 - i * 3)} y={24 + i * 8} width={18 - i * 3} height={78 - i * 14} fill="#6E6558" />
            </g>
          ))}
          <g className="clip-bot"><rect x="118" y="80" width="22" height="26" rx="6" fill="#D97757" /><rect x="122" y="84" width="14" height="6" rx="2" fill="#FAF9F5" opacity="0.8" /></g>
        </svg>
        <span className="clip-time">▶ 0:20</span>
      </div>
      <div className="clip-meta">
        <span className="caption">Rendered with Fable Duo · 1 min 12 s · 3.1 kJ</span>
        <span className="signed">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
          Signed · provenance attached · synthetic
        </span>
      </div>
    </motion.div>
  )
}
