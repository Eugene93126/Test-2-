import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AGENTS, DEBATE, type Agent } from '../../data/agents'
import { useApp } from '../../state/store'
import { SPRING } from '../motion'
import { Arrival, Spark, linkPath, sampleLink, type Pt } from './flow'

// Claude Circle: six agents studying in the background. Pick one to see its
// skill tree and what it wants to ask you; or put two in the debate arena.
// Light flows through it all: from the agent's engram into its tree, out along
// the branches it is learning, and between debaters toward the judge.

const treeEls = new Map<string, HTMLElement>()
const TREE_W = 460, TREE_H = 236
const ROOT: Pt = [30, TREE_H / 2]
const BX = 168, LX = 318
const by = (i: number) => 26 + i * 61
const ly = (i: number, j: number) => by(i) - 13 + j * 26

export function Circle() {
  const [agentId, setAgentId] = useState('brian')
  const [view, setView] = useState<'skills' | 'debate'>('skills')
  const agent = AGENTS.find(a => a.id === agentId)!
  const reduced = useApp(s => s.reducedMotion)
  const rootRef = useRef<HTMLDivElement>(null)
  const colRef = useRef<HTMLDivElement>(null)
  const cards = useRef(new Map<string, HTMLElement>())
  const [link, setLink] = useState<{ a: Pt; b: Pt } | null>(null)

  // The engram link runs from the chosen agent's row, across the divider, into
  // the root of its tree. Positions come from layout (offsets), so springs and
  // the glass glue don't skew them.
  useLayoutEffect(() => {
    const root = rootRef.current, col = colRef.current
    const tree = treeEls.get(agentId)
    const measure = () => {
      const card = cards.current.get(agentId)
      if (!root || !col || !card || !tree || view !== 'skills' || !tree.isConnected || root.offsetWidth < 700) { setLink(null); return }
      const c = offsetIn(card, root), t = offsetIn(tree, root)
      const s = tree.offsetWidth / TREE_W
      const a: Pt = [Math.round(col.offsetLeft + col.offsetWidth), Math.round(c.y + card.offsetHeight / 2)]
      const b: Pt = [Math.round(t.x + (ROOT[0] - 19) * s), Math.round(t.y + ROOT[1] * s)]
      setLink(l => (l && l.a[0] === a[0] && l.a[1] === a[1] && l.b[0] === b[0] && l.b[1] === b[1] ? l : { a, b }))
    }
    measure()
    if (!root) return
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    if (tree) ro.observe(tree)
    return () => ro.disconnect()
  }, [agentId, view])

  return (
    <div className="circle" ref={rootRef}>
      <div className="agents" ref={colRef}>
        <div className="agents-head">
          <span className="eyebrow">6 of 25 agents on Max</span>
          <button className="ghost-btn" title="Spawning arrives with the agent marketplace">+ Spawn agent</button>
        </div>
        <div className="agent-grid" role="listbox" aria-label="Agents">
          {AGENTS.map((a, i) => {
            const on = a.id === agentId
            return (
              <button key={a.id} ref={el => { if (el) cards.current.set(a.id, el); else cards.current.delete(a.id) }}
                role="option" aria-selected={on} className="agent-card" onClick={() => { setAgentId(a.id); setView('skills') }}>
                {on && <motion.span layoutId="agent-on" className="agent-on" transition={SPRING} />}
                <span className="agent-top">
                  <span className="avatar" style={{ background: a.color }}>{a.initial}</span>
                  <span className="agent-id"><span className="agent-name">{a.name}</span><span className="agent-meta">{a.domain} · Lv {a.level}</span></span>
                </span>
                <span className="agent-status">{a.status}</span>
                <span className="xp" aria-hidden="true">
                  <motion.span className="xp-fill" style={{ background: a.color }} initial={{ scaleX: 0 }} animate={{ scaleX: a.xp / 100 }} transition={{ ...SPRING, delay: 0.1 }}>
                    {!reduced && <span className="xp-sheen" style={{ animationDelay: `${-i * 0.7}s` }} />}
                  </motion.span>
                </span>
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
            ? <motion.div key={`skills-${agent.id}`} className="panel-view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={SPRING}><AgentDetail agent={agent} reduced={reduced} /></motion.div>
            : <motion.div key="debate" className="panel-view" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={SPRING}><Debate reduced={reduced} /></motion.div>}
        </AnimatePresence>
      </div>

      {link && <Engram key={agent.id} a={link.a} b={link.b} color={agent.color} reduced={reduced} />}
    </div>
  )
}

function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0, y = 0, n: HTMLElement | null = el
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null }
  return { x, y }
}

// The agent's engram streaming into its skill tree.
function Engram({ a, b, color, reduced }: { a: Pt; b: Pt; color: string; reduced: boolean }) {
  const pts = useMemo(() => sampleLink(a, b, 26), [a, b])
  const d = linkPath(a, b)
  return (
    <div className="engram" style={{ '--agent': color } as React.CSSProperties} aria-hidden="true">
      <svg className="engram-svg">
        <motion.path d={d} className="engram-path" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }} />
      </svg>
      {!reduced && [0, 1, 2].map(i => <Spark key={i} pts={pts} period={2100} delay={500 + i * 700} className="bright" />)}
      <span className="engram-port" style={{ left: a[0], top: a[1] }} />
    </div>
  )
}

function AgentDetail({ agent, reduced }: { agent: Agent; reduced: boolean }) {
  return (
    <div className="agent-detail">
      <div className="agent-hero">
        <span className="avatar big" style={{ background: agent.color }}>{agent.initial}</span>
        <div>
          <div className="agent-title">{agent.name}</div>
          <div className="agent-meta">{agent.domain} · Level {agent.level} · trained {agent.hours} hours · {agent.xp}% to level {agent.level + 1}</div>
        </div>
      </div>
      <SkillTree agent={agent} reduced={reduced} />
      <h3 className="eyebrow">Questions from last night</h3>
      <ul className="questions">
        {agent.questions.map((q, i) => (
          <motion.li key={q} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: 0.35 + i * 0.06 }}>{q}</motion.li>
        ))}
      </ul>
      <div className="fine">Grounded against {agent.truth} · memory writes signed · base model Fable Duo 4.1</div>
    </div>
  )
}

type NodeState = 'mastered' | 'learning' | 'locked'
const stateOf = (v: number): NodeState => (v >= 60 ? 'mastered' : v >= 30 ? 'learning' : 'locked')

// A left-to-right tree: domain, four skills, two specialties each.
function SkillTree({ agent, reduced }: { agent: Agent; reduced: boolean }) {
  const [hover, setHover] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const W = TREE_W, H = TREE_H, root = { x: ROOT[0], y: ROOT[1] }
  const bx = BX, lx = LX
  const curve = (x1: number, y1: number, x2: number, y2: number) => linkPath([x1, y1], [x2, y2])
  const hovered = agent.skills.flatMap(s => [s, ...s.children]).find(n => n.name === hover) as { name: string; v: number; flag?: string } | undefined

  const ref = (el: HTMLDivElement | null) => { if (el) treeEls.set(agent.id, el) }
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(el.offsetWidth / W || 1)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [W])

  let k = 0
  const node = (name: string, v: number, x: number, y: number, r: number, flag?: string) => {
    const st = stateOf(v)
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
    <div className="tree" ref={el => { ref(el); box.current = el }} style={{ '--agent': agent.color } as React.CSSProperties}>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${agent.name}'s skill tree`}>
        {agent.skills.map((s, i) => (
          <g key={s.name}>
            <motion.path d={curve(root.x, root.y, bx, by(i))} className={`edge ${stateOf(s.v)}`} style={stateOf(s.v) === 'mastered' ? { stroke: agent.color } : undefined}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }} />
            {s.children.map((c, j) => (
              <motion.path key={c.name} d={curve(bx, by(i), lx, ly(i, j))} className={`edge ${stateOf(c.v)}`} style={stateOf(c.v) === 'mastered' ? { stroke: agent.color } : undefined}
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
                {node(c.name, c.v, lx, ly(i, j), 5.5, c.flag)}
                <text x={lx + 11} y={ly(i, j) + 4} className={`tlabel small ${stateOf(c.v)}`}>{c.name} <tspan className="tval">{c.v}</tspan></text>
              </g>
            ))}
          </g>
        ))}
      </svg>
      {!reduced && (
        <div className="tree-flow" style={{ width: W, height: H, transform: `scale(${scale})` }} aria-hidden="true">
          <TreeFlow agent={agent} />
        </div>
      )}
      <AnimatePresence>
        {hovered?.flag && (
          <motion.div className="tree-tip" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING}>{hovered.flag}</motion.div>
        )}
      </AnimatePresence>
      <div className="legend"><span className="lg mastered" style={{ background: agent.color }} />Mastered<span className="lg learning" style={{ borderColor: agent.color }} />Learning<span className="lg locked" />Locked<span className="lg flagged" />Quarantined source</div>
    </div>
  )
}

// One cycle: a comet leaves the domain for each skill it has started, then
// carries on into the specialties. Strong skills carry two comets, learning
// ones a single dimmer one, locked ones none. Flow toward a quarantined
// source stops short and fizzles amber: nothing from it reaches the agent.
const PERIOD = 3200
const START = 750
function TreeFlow({ agent }: { agent: Agent }) {
  const root = ROOT, bx = BX, lx = LX
  const parts = useMemo(() => {
    const out: React.ReactNode[] = []
    agent.skills.forEach((s, i) => {
      const st = stateOf(s.v)
      if (st === 'locked') return
      const phase = (i * 0.21) % 1
      const a = sampleLink(root, [bx, by(i)])
      const comets = st === 'mastered' ? [0, 0.5] : [0]
      comets.forEach(c => {
        const delay = START + ((phase + c) % 1) * PERIOD
        out.push(<Spark key={`s${i}${c}`} pts={a} period={PERIOD} delay={delay} window={[0, 0.42]} className={st} />)
        out.push(<Arrival key={`h${i}${c}`} x={bx} y={by(i)} r={13} period={PERIOD} delay={delay} at={0.42} className={st} />)
        s.children.forEach((ch, j) => {
          const cs = stateOf(ch.v)
          if (cs === 'locked') return
          const b = sampleLink([bx, by(i)], [lx, ly(i, j)])
          const blocked = !!ch.flag
          out.push(<Spark key={`c${i}${j}${c}`} pts={b} period={PERIOD} delay={delay} window={[0.42, blocked ? 0.74 : 0.86]} upTo={blocked ? 0.62 : 1} className={blocked ? 'blocked' : cs} />)
          if (!blocked) out.push(<Arrival key={`a${i}${j}${c}`} x={lx} y={ly(i, j)} r={9} period={PERIOD} delay={delay} at={0.86} className={cs} />)
        })
      })
      s.children.forEach((ch, j) => {
        if (stateOf(ch.v) === 'learning') out.push(<span key={`b${i}${j}`} className="halo breathe" style={{ left: lx, top: ly(i, j), animationDelay: `${-(i + j) * 0.6}s` }} />)
        if (ch.flag) out.push(<span key={`f${i}${j}`} className="halo flagged" style={{ left: lx + 5.5 + 1, top: ly(i, j) - 5.5 - 3.5 }} />)
      })
      if (st === 'learning') out.push(<span key={`bs${i}`} className="halo breathe big" style={{ left: bx, top: by(i), animationDelay: `${-i * 0.8}s` }} />)
    })
    return out
  }, [agent, root, bx, lx])
  return (
    <>
      <span className="orbit" style={{ left: root[0], top: root[1] }} />
      <span className="core" style={{ left: root[0], top: root[1] }} />
      {parts}
    </>
  )
}

function Debate({ reduced }: { reduced: boolean }) {
  const [round, setRound] = useState(0)
  const [shown, setShown] = useState(0)
  const lines = DEBATE.rounds.slice(0, round + 1).flat()
  const lean = lines.slice(0, shown).reduce((s, l) => s + l.swing, 0)
  const roundDone = shown >= lines.length
  const last = round === DEBATE.rounds.length - 1
  const brian = AGENTS[0], ada = AGENTS[1]
  const speaker = shown > 0 ? lines[shown - 1].who : null
  const to = -lean * 70 // the judge marker's offset, in % of the track

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
      <div className="duel" role="img" aria-label={`Judge leans ${lean > 0.05 ? 'toward Brian' : lean < -0.05 ? 'toward Ada' : 'to neither'}`}>
        <span className={`avatar${speaker === 'brian' ? ' speaking' : ''}`} style={{ background: brian.color, '--agent': brian.color } as React.CSSProperties}>B</span>
        <span className="duel-track">
          <span className="duel-mid" />
          {!reduced && <>
            <DuelFlow from={-50} to={to} side="brian" delay={0} />
            <DuelFlow from={-50} to={to} side="brian" delay={1100} />
            <DuelFlow from={50} to={to} side="ada" delay={550} />
            <DuelFlow from={50} to={to} side="ada" delay={1650} />
            {speaker && <DuelPulse key={shown} from={speaker === 'brian' ? -50 : 50} to={to} side={speaker} />}
          </>}
          {/* A full-width rail slides by a share of the track; only transforms animate. */}
          <motion.span className="duel-rail" animate={{ x: `${to}%` }} transition={SPRING}>
            <span className="duel-mark">{!reduced && shown > 0 && <span key={shown} className="mark-ripple" />}</span>
          </motion.span>
        </span>
        <span className={`avatar${speaker === 'ada' ? ' speaking' : ''}`} style={{ background: ada.color, '--agent': ada.color } as React.CSSProperties}>A</span>
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

// Arguments drift from each debater toward wherever the judge currently leans.
function DuelFlow({ from, to, side, delay }: { from: number; to: number; side: 'brian' | 'ada'; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el?.animate) return
    const a = el.animate([
      { transform: `translateX(${from}%)`, opacity: 0 },
      { opacity: 0.8, offset: 0.2 },
      { opacity: 0.8, offset: 0.75 },
      { transform: `translateX(${to}%)`, opacity: 0 },
    ], { duration: 2200, delay, iterations: Infinity, easing: 'cubic-bezier(.4,0,.7,1)', fill: 'backwards' })
    return () => a.cancel()
  }, [from, to, delay])
  return <span ref={ref} className={`duel-flow ${side}`} aria-hidden="true"><span /></span>
}

// A brighter pulse carries each new argument to the judge.
function DuelPulse({ from, to, side }: { from: number; to: number; side: 'brian' | 'ada' }) {
  return (
    <motion.span className={`duel-flow pulse ${side}`} aria-hidden="true"
      initial={{ x: `${from}%`, opacity: 0 }} animate={{ x: `${to}%`, opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.85, ease: [0.3, 0, 0.2, 1], opacity: { duration: 0.85, times: [0, 0.15, 0.8, 1] } }}>
      <span />
    </motion.span>
  )
}
