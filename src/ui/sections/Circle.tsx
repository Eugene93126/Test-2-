import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AGENTS, DEBATE, type Agent } from '../../data/agents'
import { SPRING } from '../motion'

// Claude Circle: six agents studying in the background. Pick one to see its
// skill tree and what it wants to ask you; or put two in the debate arena.

export function Circle() {
  const [agentId, setAgentId] = useState('brian')
  const [view, setView] = useState<'skills' | 'debate'>('skills')
  const agent = AGENTS.find(a => a.id === agentId)!

  return (
    <div className="circle">
      <div className="agents">
        <div className="agents-head">
          <span className="eyebrow">6 of 25 agents on Max</span>
          <button className="ghost-btn" title="Spawning arrives with the agent marketplace">+ Spawn agent</button>
        </div>
        <div className="agent-grid" role="listbox" aria-label="Agents">
          {AGENTS.map(a => {
            const on = a.id === agentId
            return (
              <button key={a.id} role="option" aria-selected={on} className="agent-card" onClick={() => { setAgentId(a.id); setView('skills') }}>
                {on && <motion.span layoutId="agent-on" className="agent-on" transition={SPRING} />}
                <span className="agent-top">
                  <span className="avatar" style={{ background: a.color }}>{a.initial}</span>
                  <span className="agent-id"><span className="agent-name">{a.name}</span><span className="agent-meta">{a.domain} · Lv {a.level}</span></span>
                </span>
                <span className="agent-status">{a.status}</span>
                <span className="xp" aria-hidden="true"><motion.span style={{ background: a.color }} initial={{ scaleX: 0 }} animate={{ scaleX: a.xp / 100 }} transition={{ ...SPRING, delay: 0.1 }} /></span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="agent-panel">
        <div className="seg" role="tablist" aria-label="View">
          {(['skills', 'debate'] as const).map(v => (
            <button key={v} role="tab" aria-selected={view === v} className="seg-btn" onClick={() => setView(v)}>
              {view === v && <motion.span layoutId="seg-pill" className="seg-pill" transition={SPRING} />}
              <span>{v === 'skills' ? `${agent.name}’s skills` : 'Debate arena'}</span>
            </button>
          ))}
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          {view === 'skills'
            ? <motion.div key={`skills-${agent.id}`} className="panel-view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={SPRING}><AgentDetail agent={agent} /></motion.div>
            : <motion.div key="debate" className="panel-view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={SPRING}><Debate /></motion.div>}
        </AnimatePresence>
      </div>
    </div>
  )
}

function AgentDetail({ agent }: { agent: Agent }) {
  return (
    <div className="agent-detail">
      <div className="agent-hero">
        <span className="avatar big" style={{ background: agent.color }}>{agent.initial}</span>
        <div>
          <div className="agent-title">{agent.name}</div>
          <div className="agent-meta">{agent.domain} · Level {agent.level} · trained {agent.hours} hours · {agent.xp}% to level {agent.level + 1}</div>
        </div>
      </div>
      <SkillTree agent={agent} />
      <div className="eyebrow">Questions from last night</div>
      <ul className="questions">
        {agent.questions.map((q, i) => (
          <motion.li key={q} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: 0.35 + i * 0.06 }}>{q}</motion.li>
        ))}
      </ul>
      <div className="fine">Grounded against {agent.truth} · memory writes signed · base model Fable Duo 4.1</div>
    </div>
  )
}

// A left-to-right tree: domain, four skills, two specialties each.
function SkillTree({ agent }: { agent: Agent }) {
  const [hover, setHover] = useState<string | null>(null)
  const W = 460, H = 236, root = { x: 30, y: H / 2 }
  const bx = 168, lx = 318
  const by = (i: number) => 26 + i * 61
  const state = (v: number) => (v >= 60 ? 'mastered' : v >= 30 ? 'learning' : 'locked')
  const curve = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`
  const hovered = agent.skills.flatMap(s => [s, ...s.children]).find(n => n.name === hover) as { name: string; v: number; flag?: string } | undefined

  let k = 0
  const node = (name: string, v: number, x: number, y: number, r: number, flag?: string) => {
    const st = state(v)
    const i = k++
    const circ = 2 * Math.PI * (r + 3)
    return (
      <motion.g key={name} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SPRING, delay: 0.05 + i * 0.035 }}
        style={{ transformOrigin: `${x}px ${y}px` }} className={`node ${st}`} tabIndex={0} role="img" aria-label={`${name}, ${v} of 100${flag ? ', quarantined source' : ''}`}
        onPointerEnter={() => setHover(name)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(name)} onBlur={() => setHover(null)}>
        {st === 'learning' && <circle cx={x} cy={y} r={r + 3} className="arc" style={{ stroke: agent.color, strokeDasharray: `${(circ * v) / 100} ${circ}` }} transform={`rotate(-90 ${x} ${y})`} />}
        <circle cx={x} cy={y} r={r} className="dot" style={st === 'mastered' ? { fill: agent.color, stroke: agent.color } : undefined} />
        {flag && <path d={`M${x + r - 2} ${y - r - 7} l6 10 h-12 z`} className="flag" />}
      </motion.g>
    )
  }

  return (
    <div className="tree">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${agent.name}'s skill tree`}>
        {agent.skills.map((s, i) => (
          <g key={s.name}>
            <motion.path d={curve(root.x, root.y, bx, by(i))} className={`edge ${state(s.v)}`} style={state(s.v) === 'mastered' ? { stroke: agent.color } : undefined}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }} />
            {s.children.map((c, j) => (
              <motion.path key={c.name} d={curve(bx, by(i), lx, by(i) - 13 + j * 26)} className={`edge ${state(c.v)}`} style={state(c.v) === 'mastered' ? { stroke: agent.color } : undefined}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.25 + i * 0.05 + j * 0.03, ease: 'easeOut' }} />
            ))}
          </g>
        ))}
        {node(agent.domain, 100, root.x, root.y, 15)}
        {agent.skills.map((s, i) => (
          <g key={s.name}>
            {node(s.name, s.v, bx, by(i), 9)}
            <text x={bx + 15} y={by(i) - 9} className="tlabel">{s.name} <tspan className="tval">{s.v}</tspan></text>
            {s.children.map((c, j) => (
              <g key={c.name}>
                {node(c.name, c.v, lx, by(i) - 13 + j * 26, 5.5, c.flag)}
                <text x={lx + 11} y={by(i) - 13 + j * 26 + 4} className={`tlabel small ${state(c.v)}`}>{c.name} <tspan className="tval">{c.v}</tspan></text>
              </g>
            ))}
          </g>
        ))}
      </svg>
      <AnimatePresence>
        {hovered?.flag && (
          <motion.div className="tree-tip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING}>{hovered.flag}</motion.div>
        )}
      </AnimatePresence>
      <div className="legend"><span className="lg mastered" style={{ background: agent.color }} />Mastered<span className="lg learning" style={{ borderColor: agent.color }} />Learning<span className="lg locked" />Locked<span className="lg flagged" />Quarantined source</div>
    </div>
  )
}

function Debate() {
  const [round, setRound] = useState(0)
  const [shown, setShown] = useState(0)
  const lines = DEBATE.rounds.slice(0, round + 1).flat()
  const lean = lines.slice(0, shown).reduce((s, l) => s + l.swing, 0)
  const roundDone = shown >= lines.length
  const last = round === DEBATE.rounds.length - 1
  const brian = AGENTS[0], ada = AGENTS[1]

  // Each argument lands after a beat, like someone taking the floor.
  useEffect(() => {
    if (shown >= lines.length) return
    const id = window.setTimeout(() => setShown(n => n + 1), shown === 0 ? 450 : 1500)
    return () => window.clearTimeout(id)
  }, [shown, lines.length])

  return (
    <div className="debate">
      <div className="debate-head">
        <span className="eyebrow">Round {round + 1} of {DEBATE.rounds.length}</span>
        <h3 className="debate-topic">{DEBATE.topic}</h3>
      </div>
      <div className="duel" aria-label={`Judge leans ${lean > 0.05 ? 'toward Brian' : lean < -0.05 ? 'toward Ada' : 'to neither'}`}>
        <span className="avatar" style={{ background: brian.color }}>B</span>
        <span className="duel-track">
          <span className="duel-mid" />
          {/* A full-width rail slides by a share of the track; only transforms animate. */}
          <motion.span className="duel-rail" animate={{ x: `${-lean * 70}%` }} transition={SPRING}><span className="duel-mark" /></motion.span>
        </span>
        <span className="avatar" style={{ background: ada.color }}>A</span>
      </div>
      <div className="duel-labels"><span>Brian · Law</span><span>Judge-agent</span><span>Ada · History</span></div>
      <div className="debate-lines">
        <AnimatePresence initial={false}>
          {lines.slice(0, shown).map(l => {
            const a = l.who === 'brian' ? brian : ada
            return (
              <motion.div key={l.text} layout="position" className={`line ${l.who}`} initial={{ opacity: 0, x: l.who === 'brian' ? -14 : 14 }} animate={{ opacity: 1, x: 0 }} transition={SPRING}>
                <span className="avatar sm" style={{ background: a.color }}>{a.initial}</span>
                <p>{l.text}</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      <div className="debate-foot">
        {roundDone && !last && <button className="pill-btn" onClick={() => setRound(r => r + 1)}>Next round</button>}
        {roundDone && last && <motion.p className="verdict" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><b>Judge-agent:</b> {DEBATE.verdict}</motion.p>}
        <span className="fine">Brian and Ada were trained on different material, so they disagree for real rather than echoing one model.</span>
      </div>
    </div>
  )
}
