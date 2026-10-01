import type { SectionId } from '../state/store'

export interface SectionDef {
  id: SectionId
  /** Dock label. */
  label: string
  title: string
  subtitle: string
}

export const SECTIONS: Record<SectionId, SectionDef> = {
  chat: { id: 'chat', label: 'Chat', title: 'Chat', subtitle: 'Thesis · warehouse automation' },
  circle: { id: 'circle', label: 'Circle', title: 'Claude Circle', subtitle: 'Your trained agents' },
  world: { id: 'world', label: 'World', title: 'Claude World', subtitle: 'Shared assets from people you follow' },
  code: { id: 'code', label: 'Code', title: 'Claude Code', subtitle: 'Agent swarm build' },
  home: { id: 'home', label: 'Home', title: 'Claude Home', subtitle: 'Odyssey 3.2 · approved devices' },
  memory: { id: 'memory', label: 'Memory', title: 'Memory', subtitle: 'What Claude knows, and where it learned it' },
  trust: { id: 'trust', label: 'Trust', title: 'Trust', subtitle: 'Identity, provenance and impersonation' },
}
