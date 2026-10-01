import { useApp } from '../../state/store'
import { modelById } from '../../data/models'

// Chat as it stands before phase 4: the thesis conversation from the reference,
// re-timed to 8:41 PM. The voice orb and live waveform come in phase 4.
export function Chat() {
  const model = modelById(useApp(s => s.model))
  return (
    <div className="chat">
      <div className="main-body">
        <div className="bubble you">
          <div className="caption">Voice · transcribed</div>
          Pantheon 2.0 launched today. Should I move my thesis over to it, or keep using Fable?
        </div>
        <div className="reply">
          <div className="caption">{model.name} · remembered your thesis plan from March</div>
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
    </div>
  )
}
