// Claude Code: harbor-ledger, built by a swarm of 7 agents. One planner, four
// builders working in parallel, a test runner, and a verifier trained apart
// from the builders (canon §11: independently trained verifier agents).
// Times are seconds into the replay; the real build took 38 minutes.

export type SwarmState = 'waiting' | 'working' | 'done'

export interface SwarmAgent {
  id: string
  role: string
  /** Name in the terminal. */
  cli: string
  work: string
  done: string
  start: number
  end: number
  /** Center in the swarm map, viewBox units. */
  x: number
  y: number
  w: number
  after: string[]
}

export const SWARM_W = 720, SWARM_H = 180
export const REPLAY = 16.4 // seconds
export const REAL_MINUTES = 38
export const TESTS = 412

const worker = (id: string, role: string, cli: string, work: string, done: string, end: number, y: number): SwarmAgent =>
  ({ id, role, cli, work, done, start: 1.8, end, x: 250, y, w: 116, after: ['planner'] })

export const SWARM: SwarmAgent[] = [
  { id: 'planner', role: 'Planner', cli: 'planner', work: 'reading the brief and the repo', done: 'spec locked: 14 endpoints, 9 screens', start: 0, end: 1.8, x: 62, y: 90, w: 92, after: [] },
  worker('backend-a', 'Backend A', 'backend-a', 'reconcile.ts: matching invoices', 'reconcile.ts  +412 −38', 5.4, 24),
  worker('backend-b', 'Backend B', 'backend-b', 'ledger/import.ts: parsing bank exports', 'ledger/import.ts  +220 −0', 6.4, 68),
  worker('interface', 'Interface', 'interface', 'rendering the invoice table', '9 screens, keyboard + glasses layouts', 8.6, 112),
  worker('migration', 'Data migration', 'migration', 'moving 18,204 rows to the new schema', '18,204 rows moved, 0 lost', 9.8, 156),
  { id: 'tests', role: 'Tests', cli: 'tests', work: '', done: `${TESTS} / ${TESTS} passing`, start: 5.4, end: 12.6, x: 448, y: 90, w: 84, after: ['backend-a', 'backend-b', 'interface', 'migration'] },
  { id: 'verifier', role: 'Verifier', cli: 'verifier', work: 'independent review of 4 diffs', done: 'independent review: 2 notes, 0 blockers', start: 12.6, end: 15.2, x: 582, y: 90, w: 92, after: ['tests'] },
]

export const SEAL = { x: 684, y: 90, r: 16, at: 15.8 }

export function stateAt(a: SwarmAgent, t: number | null): SwarmState {
  if (t == null) return 'done'
  return t >= a.end ? 'done' : t >= a.start ? 'working' : 'waiting'
}

/** Tests pass in a steady climb while the builders land. */
export function testsAt(t: number | null) {
  if (t == null) return TESTS
  const tests = SWARM.find(a => a.id === 'tests')!
  const k = Math.max(0, Math.min(1, (t - tests.start) / (tests.end - tests.start)))
  return Math.round(TESTS * (1 - Math.pow(1 - k, 1.6)))
}
