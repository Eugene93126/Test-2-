import { motion } from 'motion/react'
import type { SectionId } from '../../state/store'
import { SECTIONS } from '../../data/sections'
import { SECTION_ICONS } from '../icons'
import { SPRING } from '../motion'

// A section's resting state until it is built out: what it is, in one line from
// the canon, and when it arrives in the prototype.
export function Resting({ id }: { id: SectionId }) {
  const s = SECTIONS[id]
  return (
    <div className="resting">
      <motion.span className="resting-icon" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...SPRING, delay: 0.05 }}>
        {SECTION_ICONS[id]}
      </motion.span>
      <p className="resting-summary">{s.summary}</p>
      <span className="resting-phase">Built out in phase {s.phase}</span>
    </div>
  )
}
