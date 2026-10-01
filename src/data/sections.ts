import type { SectionId } from '../state/store'

export interface SectionDef {
  id: SectionId
  /** Dock label. */
  label: string
  title: string
  subtitle: string
  /** One line for the section's resting state until it is built out. */
  summary: string
  phase: 4 | 5
}

export const SECTIONS: Record<SectionId, SectionDef> = {
  chat: { id: 'chat', label: 'Chat', title: 'Chat', subtitle: 'Thesis · warehouse automation', summary: 'Voice-first conversation with the model of your choice.', phase: 4 },
  circle: { id: 'circle', label: 'Circle', title: 'Claude Circle', subtitle: 'Your trained agents', summary: 'Six agents studying in the background, each in its own engram module. Brian has 3 questions for you.', phase: 4 },
  world: { id: 'world', label: 'World', title: 'Claude World', subtitle: 'Shared assets from people you follow', summary: 'Worlds, 3D, video and sound made with Fable Duo. Signed work is shown; unsigned uploads stay hidden.', phase: 4 },
  code: { id: 'code', label: 'Code', title: 'Claude Code', subtitle: 'Agent swarm build', summary: 'harbor-ledger: a swarm of 7 agents, 412 tests, signed by an independent verifier.', phase: 5 },
  home: { id: 'home', label: 'Home', title: 'Claude Home', subtitle: 'Odyssey 3.2 · approved devices', summary: 'Your devices through approved connectors, scheduled around the grid. Today: 18.4 kWh, $1.12 saved.', phase: 5 },
  memory: { id: 'memory', label: 'Memory', title: 'Memory', subtitle: 'What Claude knows, and where it learned it', summary: 'Every memory is signed with its source. Forget anything; one write is quarantined for review.', phase: 5 },
  trust: { id: 'trust', label: 'Trust', title: 'Trust', subtitle: 'Identity, provenance and impersonation', summary: 'Signed identity on your glasses and puck. Today Claude blocked a voiceprint request at your bank.', phase: 5 },
}
