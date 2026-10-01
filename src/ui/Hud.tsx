import { AnimatePresence, motion } from 'motion/react'
import { GlassPanel } from '../glass/GlassPanel'
import { Glyph } from './Glyph'
import { useApp } from '../state/store'
import { fmtKJ, useLive } from '../data/live'
import { SPRING } from './motion'

// Head-height chrome: who and when on the left; power, energy and battery on
// the right. Values roll like an instrument when they change.

function Roll({ value, className }: { value: string; className?: string }) {
  return (
    <span className={`roll ${className ?? ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: '60%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-60%', opacity: 0 }} transition={SPRING}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function Hud() {
  const glyph = useApp(s => s.glyph)
  const live = useLive()
  return (
    <>
      <GlassPanel id="hud-brand" depth="near" radius={22} delay={0} className="hud hud-brand" as="header" label="Claude">
        <Glyph id={glyph} size={24} />
        <span className="brand-word">Claude</span>
        <span className="hud-meta">
          Sat, Jul 8 · <b><Roll value={live.time.label} /></b>
          <span className="wide-only"> · Chicago 74°F</span>
        </span>
      </GlassPanel>

      <GlassPanel id="hud-status" depth="near" radius={22} delay={0.06} className="hud hud-status wide-only" label="Power and energy">
        <span className="hud-item" title={live.peak ? 'Peak pricing, 4 to 9 PM' : 'Off-peak pricing'}>
          <span className={`live-dot${live.peak ? '' : ' calm'}`} aria-hidden="true" />
          Grid <b><Roll value={`$${live.price.toFixed(3)}`} /></b>/kWh
        </span>
        <span className="hud-item muted"><Roll value={live.peak ? 'Peak until 9 PM' : 'Off-peak now'} /></span>
        <span className="hud-item hud-energy" aria-label={`AI energy today ${fmtKJ(live.energyKJ)} kilojoules`}>
          <span className="mini-meter" aria-hidden="true"><span style={{ width: '64%' }} /><span className="clay" style={{ width: '22%' }} /><span className="faint" style={{ width: '14%' }} /></span>
          <b><Roll value={fmtKJ(live.energyKJ)} /></b> kJ
        </span>
        <span className="hud-item muted">Glasses <Roll value={`${live.battery}%`} /></span>
      </GlassPanel>
    </>
  )
}
