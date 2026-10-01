import { motion } from 'motion/react'
import { useApp } from '../state/store'
import { THEMES, THEME_ORDER } from '../theme/themes'
import { enableGyro, recenterGyro } from '../head/headPose'
import { SPRING } from './motion'

// Phase 1 review controls. The real HUD and Dock replace this in phase 3.
export function DevBar() {
  const s = useApp()
  const gyroOffer = s.gyro === 'available' || s.gyro === 'needs-permission'

  return (
    <motion.nav
      className="devbar"
      aria-label="Review controls"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.4 }}
    >
      <div className="devbar-group" role="group" aria-label="Theme">
        {THEME_ORDER.map(id => {
          const t = THEMES[id]
          const on = s.theme === id
          return (
            <button key={id} className="chip" aria-pressed={on} onClick={() => s.setTheme(id)} title={t.description}>
              {on && <motion.span layoutId="theme-pill" className="chip-pill" transition={SPRING} />}
              <span className="swatch" style={{ background: t.swatch }} />
              <span className="chip-label">{t.label}</span>
            </button>
          )
        })}
      </div>
      <span className="devbar-rule" aria-hidden="true" />
      <div className="devbar-group" role="group" aria-label="View">
        <Toggle on={s.focused} onClick={() => s.setFocused(!s.focused)} label="Focus panel" />
        <Toggle on={s.headMotion} onClick={() => s.setHeadMotion(!s.headMotion)} label="Head motion" />
        <Toggle on={s.videoPlaying} onClick={() => s.setVideoPlaying(!s.videoPlaying)} label="City loop" />
        <Toggle on={s.reducedMotion} onClick={() => s.setReducedMotion(!s.reducedMotion)} label="Reduce motion" />
        <Toggle on={s.perfOpen} onClick={() => s.setPerfOpen(!s.perfOpen)} label="Perf" />
        {gyroOffer && <button className="chip" onClick={() => enableGyro()}><span className="chip-label">Use motion sensor</span></button>}
        {s.gyro === 'on' && <button className="chip" onClick={() => recenterGyro()}><span className="chip-label">Recenter</span></button>}
      </div>
    </motion.nav>
  )
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button className="chip" aria-pressed={on} onClick={onClick}>
      <motion.span className="dot" animate={{ scale: on ? 1 : 0.6, opacity: on ? 1 : 0.4 }} transition={SPRING} />
      <span className="chip-label">{label}</span>
    </button>
  )
}
