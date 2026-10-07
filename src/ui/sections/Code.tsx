import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '../../state/store'
import { REAL_MINUTES, REPLAY, SEAL, SWARM, SWARM_H, SWARM_W, TESTS, stateAt, testsAt, type SwarmAgent, type SwarmState } from '../../data/swarm'
import { SPRING } from '../motion'
import { Spark, linkPath, sampleLink, type Pt } from './flow'

// Claude Code: a finished swarm build you can replay. The map shows who is
// working and where work is handed on; the terminal is the same story in text.

const left = (a: SwarmAgent): Pt => [a.x - a.w / 2, a.y]
const right = (a: SwarmAgent): Pt => [a.x + a.w / 2, a.y]
const byId = (id: string) => SWARM.find(a => a.id === id)!

interface Edge { id: string; from: Pt; to: Pt; src: string; dst: string }
const EDGES: Edge[] = [
  ...SWARM.flatMap(a => a.after.map(src => ({ id: `${src}>${a.id}`, from: right(byId(src)), to: left(a), src, dst: a.id }))),
  { id: 'verifier>seal', from: right(byId('verifier')), to: [SEAL.x - SEAL.r, SEAL.y], src: 'verifier', dst: 'seal' },
]

export function Code() {
  const reduced = useApp(s => s.reducedMotion)
  // Replay clock in seconds, or null for the finished build.
  const [t, setT] = useState<number | null>(null)
  const [approved, setApproved] = useState(false)
  const started = useRef(0)

  useEffect(() => {
    if (t == null) return
    const id = window.setInterval(() => {
      const now = (performance.now() - started.current) / 1000
      setT(now >= REPLAY ? null : now)
    }, 90)
    return () => window.clearInterval(id)
  }, [t == null])

  const run = () => { started.current = performance.now(); setApproved(false); setT(0) }
  const running = t != null
  const tests = testsAt(t)
  const signed = t == null || t >= SEAL.at
  const verifier = stateAt(byId('verifier'), t)
  const minutes = running ? Math.max(1, Math.round((t / REPLAY) * REAL_MINUTES)) : REAL_MINUTES

  return (
    <div className="code">
      <div className="code-bar">
        <h3 className="repo">harbor-ledger</h3>
        <span className="eyebrow">swarm of 7 · Fable Duo 4.1</span>
        <span className={`status-pill${running ? ' live' : ''}`}>
          <span className="sdot" />{running ? `Replaying at ${Math.round((REAL_MINUTES * 60) / REPLAY)}×` : 'Signed · ready for review'}
        </span>
        <button className="ghost-btn" onClick={() => (running ? setT(null) : run())}>{running ? 'Show finished build' : 'Run swarm again'}</button>
      </div>

      <SwarmMap t={t} reduced={reduced} />

      <div className="code-grid">
        <div className="stats">
          <Stat label="Tests" value={`${tests} / ${TESTS}`} bar={tests / TESTS} tone={tests === TESTS ? 'ok' : 'run'} />
          <Stat label="Elapsed" value={`${minutes} min`} note={running ? `of ${REAL_MINUTES}, replayed` : 'this afternoon'} />
          <Stat label="Verifier" value={signed ? 'Signed' : verifier === 'working' ? 'Reviewing' : 'Waiting'} tone={signed ? 'ok' : verifier === 'working' ? 'run' : undefined} note="trained apart from the builders" />
        </div>
        <Terminal t={t} tests={tests} signed={signed} />
      </div>

      <div className="code-foot">
        <span className="fine">Seven agents, one plan. The verifier was trained separately from the builders, so it doesn’t share their blind spots.</span>
        <button className="pill-btn" disabled={running || approved} onClick={() => setApproved(true)}>
          {approved ? 'Approved · signed with your puck key' : 'Approve deploy'}
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, note, bar, tone }: { label: string; value: string; note?: string; bar?: number; tone?: 'ok' | 'run' }) {
  return (
    <div className={`stat${tone ? ` ${tone}` : ''}`}>
      <span className="eyebrow">{label}</span>
      <span className="stat-value">{value}</span>
      {bar != null && <span className="stat-bar"><span style={{ transform: `scaleX(${bar})` }} /></span>}
      {note && <span className="stat-note">{note}</span>}
    </div>
  )
}

function SwarmMap({ t, reduced }: { t: number | null; reduced: boolean }) {
  const [scale, setScale] = useState(1)
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(el.offsetWidth / SWARM_W || 1)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const st = (id: string): SwarmState => (id === 'seal' ? (t == null || t >= SEAL.at ? 'done' : 'waiting') : stateAt(byId(id), t))
  // Work is handed on along an edge while its source is done and its target is busy.
  const edgeState = (e: Edge) => {
    const a = st(e.src), b = st(e.dst)
    return a === 'done' && b === 'done' ? 'done' : a === 'done' && (b === 'working' || e.dst === 'seal') ? 'live' : 'idle'
  }
  const finished = t == null

  return (
    <div className="swarm" ref={box} role="img" aria-label={`Swarm map: ${SWARM.map(a => `${a.role} ${st(a.id)}`).join(', ')}`}>
      <svg viewBox={`0 0 ${SWARM_W} ${SWARM_H}`} aria-hidden="true">
        {EDGES.map(e => <path key={e.id} d={linkPath(e.from, e.to)} className={`sw-edge ${edgeState(e)}`} />)}
        {SWARM.map(a => {
          const s = st(a.id)
          return (
            <motion.g key={a.id} className={`sw-node ${s}`} style={{ transformOrigin: `${a.x}px ${a.y}px` }}
              animate={{ scale: s === 'done' && !finished ? [1.08, 1] : 1 }} transition={SPRING}>
              <rect x={a.x - a.w / 2} y={a.y - 13} width={a.w} height={26} rx={13} />
              <text x={a.x} y={a.y + 4.2} textAnchor="middle">{a.role}</text>
            </motion.g>
          )
        })}
        <g className={`sw-seal ${st('seal')}`}>
          <circle cx={SEAL.x} cy={SEAL.y} r={SEAL.r} />
          <path d={`M${SEAL.x - 6} ${SEAL.y} l4 4 l8 -8`} />
          <text x={SEAL.x} y={SEAL.y + SEAL.r + 15} textAnchor="middle">Signed</text>
        </g>
      </svg>
      {!reduced && (
        <div className="swarm-flow" style={{ width: SWARM_W, height: SWARM_H, transform: `scale(${scale})` }} aria-hidden="true">
          {SWARM.filter(a => st(a.id) === 'working').map(a => (
            <span key={`w-${a.id}`} className="busy" style={{ left: a.x, top: a.y, width: a.w + 10, height: 36, marginLeft: -(a.w + 10) / 2, marginTop: -18 }} />
          ))}
          {EDGES.map(e => <EdgeFlow key={e.id} e={e} mode={finished ? 'idle' : edgeState(e) === 'live' ? 'live' : 'off'} />)}
        </div>
      )}
    </div>
  )
}

function EdgeFlow({ e, mode }: { e: Edge; mode: 'live' | 'idle' | 'off' }) {
  const pts = useMemo(() => sampleLink(e.from, e.to, 16), [e])
  const phase = (e.id.length * 137) % 1000
  if (mode === 'off') return null
  if (mode === 'idle') return <Spark pts={pts} period={5200} delay={400 + phase * 4} window={[0, 0.3]} className="learning" />
  return (
    <>
      <Spark pts={pts} period={1300} delay={phase * 0.6} />
      <Spark pts={pts} period={1300} delay={650 + phase * 0.6} />
    </>
  )
}

function Terminal({ t, tests, signed }: { t: number | null; tests: number; signed: boolean }) {
  const lines: { id: string; who?: string; text: string; tone: 'cmd' | 'ok' | 'run' | 'wait' | 'seal' }[] = [
    { id: 'cmd', text: '$ claude swarm run harbor-ledger --agents 7', tone: 'cmd' },
  ]
  for (const a of SWARM) {
    const s = stateAt(a, t)
    if (a.id === 'tests') lines.push({ id: a.id, who: a.cli, text: s === 'waiting' ? 'waiting for builders' : `${tests} / ${TESTS} passing`, tone: s === 'done' ? 'ok' : s === 'working' ? 'run' : 'wait' })
    else if (a.id === 'verifier') lines.push({ id: a.id, who: a.cli, text: s === 'waiting' ? 'waiting for tests' : s === 'working' ? a.work : a.done, tone: s === 'done' ? 'ok' : s === 'working' ? 'run' : 'wait' })
    else if (s !== 'waiting') lines.push({ id: a.id, who: a.cli, text: s === 'working' ? a.work : a.done, tone: s === 'done' ? 'ok' : 'run' })
  }
  if (signed) lines.push({ id: 'seal', who: 'signed', text: 'deploy bundle signed · ready for review', tone: 'seal' })
  if (t == null) lines.push({ id: 'prompt', text: '$', tone: 'cmd' })

  return (
    <div className="terminal" role="log" aria-label="Swarm terminal" aria-live="off">
      <AnimatePresence initial={false}>
        {lines.map(l => (
          <motion.div key={l.id} layout="position" className={`tline ${l.tone}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={SPRING}>
            {l.who && <span className="who">{l.who.padEnd(10, ' ')}</span>}
            {l.tone === 'run' && <span className="spinner" aria-hidden="true" />}
            <span className="tt">{l.text}</span>
            {l.id === 'prompt' && <span className="caret" />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
