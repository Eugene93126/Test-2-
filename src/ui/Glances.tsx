import { GlassPanel } from '../glass/GlassPanel'
import { useApp } from '../state/store'
import { fmtKJ, useLive } from '../data/live'

// Peripheral glance cards at the far depth. Fewer overlays is the design goal
// (canon §5), so each card is one fact and, at most, one way in.

export function Glances() {
  const setSection = useApp(s => s.setSection)
  const live = useLive()
  return (
    <>
      <div className="col col-left wide-only">
        <GlassPanel id="glance-transit" depth="far" radius={22} delay={0.2} className="card">
          <div className="eyebrow">Transit</div>
          <div className="card-title">Red Line at Belmont</div>
          <div className="big-num">
            <span className="num">{live.train}</span>
            <span className="unit">min · {live.leaveIn > 0 ? `leave in ${live.leaveIn}` : 'leave now'}</span>
          </div>
        </GlassPanel>
        <GlassPanel id="glance-circle" depth="far" radius={22} delay={0.26} className="card card-action">
          <button className="card-hit" onClick={() => setSection('circle')}>
            <span className="eyebrow">Claude Circle · today</span>
            <span className="card-body">Brian finished 6 hours of study and has 3 questions for you.</span>
            <span className="card-link">Open Circle</span>
          </button>
        </GlassPanel>
        <GlassPanel id="glance-tonight" depth="far" radius={22} delay={0.32} className="card">
          <div className="eyebrow">Tonight · {live.keynote > 0 ? `in ${Math.ceil(live.keynote)} min` : 'started'}</div>
          <p className="card-body">Pantheon 2.0 keynote replay with Dev and Sam, 9:00 PM</p>
        </GlassPanel>
      </div>

      <div className="col col-right wide-only">
        <GlassPanel id="glance-energy" depth="far" radius={22} delay={0.24} className="card card-action">
          <button className="card-hit" onClick={() => setSection('home')}>
            <span className="eyebrow">Your AI energy today</span>
            <span className="big-num"><span className="num">{fmtKJ(live.energyKJ)}</span><span className="unit">kJ</span></span>
            <span className="meter" aria-hidden="true"><span style={{ width: '64%' }} /><span className="clay" style={{ width: '22%' }} /><span className="faint" style={{ width: '14%' }} /></span>
            <span className="card-note">Fable Duo {fmtKJ(live.byModel.fable)} · Pantheon {fmtKJ(live.byModel.pantheon)} · Odyssey {fmtKJ(live.byModel.odyssey)}</span>
            <span className="card-note">{live.peak ? 'Heavy jobs queued for 1:00 AM, when power is cheapest' : 'Off-peak now. Queued jobs start at 1:00 AM.'}</span>
          </button>
        </GlassPanel>
        <GlassPanel id="glance-view" depth="far" radius={22} delay={0.3} className="card">
          <div className="eyebrow">In view</div>
          <p className="card-body">Navy Pier fireworks at 10:15 PM, to the southeast past the Hancock.</p>
        </GlassPanel>
      </div>
    </>
  )
}
