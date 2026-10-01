import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DEVICES, FORECAST, HOURS, PEAK, SAVED, TODAY_COST, TODAY_KWH, priceAt, type DeviceId } from '../../data/home'
import { useLive } from '../../data/live'
import { SPRING } from '../motion'

// Claude Home: Odyssey 3.2 runs the apartment through approved connectors and
// plans around the grid. Odyssey coordinates; it never drives motors itself.

const ic = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const ICONS: Record<DeviceId, React.ReactNode> = {
  lights: <svg {...ic}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>,
  thermostat: <svg {...ic}><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z" /><path d="M12 9v7" /></svg>,
  dishwasher: <svg {...ic}><rect x="4.5" y="3" width="15" height="18" rx="2.5" /><path d="M4.5 8h15" /><circle cx="12" cy="14.5" r="3.5" /></svg>,
  car: <svg {...ic}><path d="M5 16V11l2-4.5h10L19 11v5" /><path d="M3.5 16h17M7 19v-3M17 19v-3" /><path d="M12.5 8.5l-1.5 2.5h2l-1.5 2.5" /></svg>,
  speaker: <svg {...ic}><rect x="6" y="3" width="12" height="18" rx="3" /><circle cx="12" cy="14" r="3" /><path d="M12 7v.01" /></svg>,
  purifier: <svg {...ic}><rect x="6.5" y="3" width="11" height="18" rx="3" /><path d="M9.5 7h5M9.5 10h5M9.5 13h5" /></svg>,
}

const BASE_KW = 0.16 // fridge and standby
const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`

export function Home() {
  const [on, setOn] = useState<Record<DeviceId, boolean>>(() => Object.fromEntries(DEVICES.map(d => [d.id, d.startsOn])) as Record<DeviceId, boolean>)
  const [why, setWhy] = useState(false)
  const [waitlist, setWaitlist] = useState(false)
  const live = useLive()
  const draw = DEVICES.reduce((s, d) => s + (on[d.id] ? d.kw : 0), BASE_KW)

  return (
    <div className="home" data-scroll>
      <div className="devices">
        <div className="devices-head">
          <h3 className="eyebrow">Approved devices</h3>
          <span className="draw">Drawing now <b>{draw.toFixed(2)} kW</b></span>
        </div>
        <ul className="device-list">
          {DEVICES.map((d, i) => {
            const isOn = on[d.id] && !d.locked
            return (
              <motion.li key={d.id} className={`device${d.locked ? ' locked' : ''}${isOn ? ' on' : ''}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: 0.04 * i }}>
                <span className="device-icon">{ICONS[d.id]}</span>
                <span className="device-text">
                  <span className="device-name">{d.name}</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={d.locked ?? String(isOn)} className="device-sub" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SPRING}>
                      {d.locked ?? (isOn ? d.on : d.off)}
                    </motion.span>
                  </AnimatePresence>
                </span>
                {d.locked
                  ? <button className="ghost-btn" aria-expanded={why} onClick={() => setWhy(w => !w)}>Why?</button>
                  : (
                    <button className="switch dev-switch" role="switch" aria-checked={isOn} aria-label={d.name} onClick={() => setOn(o => ({ ...o, [d.id]: !o[d.id] }))}>
                      <span className="switch-track"><motion.span className="switch-knob" animate={{ x: isOn ? 16 : 0 }} transition={SPRING} /></span>
                    </button>
                  )}
              </motion.li>
            )
          })}
        </ul>
        <AnimatePresence>
          {why && (
            <motion.p className="why" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={SPRING}>
              Odyssey only talks to devices certified for approved MCP under the 2033 Act. This purifier isn’t, so Claude can’t see it or switch it, and it can’t see your home.
            </motion.p>
          )}
        </AnimatePresence>
        <p className="fine home-note">Odyssey 3.2 runs on your puck and glasses and keeps working offline. Today: 11 actions, 0 undone.</p>
      </div>

      <div className="home-side">
        <Ledger now={live.time.minutes / 60} claudeKJ={live.energyKJ} />
        <Tonight on={on} />
        <div className="dock-card">
          <div>
            <h3 className="eyebrow">Pantheon home dock</h3>
            <p className="dock-copy">Robot handoff from Odyssey is in pilot in Ohio and Arizona only. Chicago isn’t covered yet.</p>
          </div>
          <button className="pill-btn" disabled={waitlist} onClick={() => setWaitlist(true)}>{waitlist ? 'On the waitlist' : 'Join the waitlist'}</button>
        </div>
      </div>
    </div>
  )
}

function Ledger({ now, claudeKJ }: { now: number; claudeKJ: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = 2.4
  const bars = Array.from({ length: 24 }, (_, h) => ({
    h,
    actual: HOURS[h] ?? 0,
    forecast: h >= 20 ? FORECAST[h - 20] : 0,
  }))
  const nowPct = Math.min(1, now / 24) * 100
  const tip = hover != null ? bars[hover] : null

  return (
    <div className="ledger">
      <h3 className="eyebrow">Household energy ledger · today</h3>
      <div className="ledger-head">
        <span className="big-num"><span className="num">{TODAY_KWH.toFixed(1)}</span><span className="unit">kWh · ${TODAY_COST.toFixed(2)}</span></span>
        <span className="saved">Saved ${SAVED.toFixed(2)} by moving the car, dishwasher and cooling off-peak</span>
      </div>
      <div className="chart" onPointerLeave={() => setHover(null)}>
        <span className="peak-band" style={{ left: `${(PEAK[0] / 24) * 100}%`, width: `${((PEAK[1] - PEAK[0]) / 24) * 100}%` }}>
          <span>Peak · 21.2¢</span>
        </span>
        <div className="bars">
          {bars.map(b => (
            <span key={b.h} className={`bar-slot${hover === b.h ? ' hot' : ''}`} onPointerEnter={() => setHover(b.h)}>
              {b.forecast > 0 && <motion.span className="bar forecast" style={{ height: `${((b.actual + b.forecast) / max) * 100}%` }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...SPRING, delay: 0.3 + b.h * 0.018 }} />}
              {b.actual > 0 && <motion.span className={`bar${b.h >= PEAK[0] && b.h < PEAK[1] ? ' peak' : ''}${b.h < 6 ? ' shifted' : ''}`} style={{ height: `${(b.actual / max) * 100}%` }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...SPRING, delay: 0.2 + b.h * 0.018 }} />}
            </span>
          ))}
        </div>
        <span className="now-mark" style={{ left: `${nowPct}%` }}><span className="now-dot" /></span>
      </div>
      <div className="chart-axis"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span></div>
      <div className="ledger-foot">
        <span><i className="lg-swatch shifted" />Shifted off-peak</span>
        <span><i className="lg-swatch peak" />Peak</span>
        <span><i className="lg-swatch forecast" />Forecast</span>
        <span className="claude-share" aria-live="polite">
          {tip
            ? <b>{hourLabel(tip.h)} · {(tip.actual + tip.forecast).toFixed(2)} kWh{tip.forecast ? ' forecast' : ''} · {(priceAt(tip.h) * 100).toFixed(1)}¢</b>
            : <>Claude today: {claudeKJ.toFixed(1)} kJ ≈ {(claudeKJ / 3600).toFixed(3)} kWh</>}
        </span>
      </div>
    </div>
  )
}

// Tonight's plan follows the switches: turn a device off and its slot goes.
function Tonight({ on }: { on: Record<DeviceId, boolean> }) {
  const plan = [
    on.thermostat && { id: 'cool', at: '9:00 PM', what: 'Cooling to 73°F as peak ends', price: 11.8 },
    { id: 'jobs', at: '1:00 AM', what: '2 heavy Pantheon jobs from your thesis queue', price: 11.8 },
    on.car && { id: 'car', at: '1:00 AM', what: 'Car charging to 90%', price: 11.8 },
    on.dishwasher && { id: 'dish', at: '1:30 AM', what: 'Dishwasher', price: 11.8 },
  ].filter(Boolean) as { id: string; at: string; what: string; price: number }[]
  return (
    <div className="tonight">
      <h3 className="eyebrow">Tonight, on cheap power</h3>
      <ul className="plan">
        <AnimatePresence initial={false} mode="popLayout">
          {plan.map(p => (
            <motion.li key={p.id} layout="position" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={SPRING}>
              <span className="plan-at">{p.at}</span>
              <span className="plan-what">{p.what}</span>
              <span className="plan-price">{p.price.toFixed(1)}¢</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
