import type { SectionId } from '../state/store'

const ic = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export const SECTION_ICONS: Record<SectionId, React.ReactNode> = {
  chat: <svg {...ic}><path d="M4 5h16v11H9l-5 4z" /></svg>,
  circle: <svg {...ic}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="6.5" r="2" /><circle cx="7.2" cy="15" r="2" /><circle cx="16.8" cy="15" r="2" /></svg>,
  world: <svg {...ic}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></svg>,
  code: <svg {...ic}><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></svg>,
  home: <svg {...ic}><path d="M4 11l8-7 8 7v9H4z" /><path d="M10 20v-5h4v5" /></svg>,
  memory: <svg {...ic}><path d="M12 4l8 4-8 4-8-4z" /><path d="M4 12l8 4 8-4M4 16l8 4 8-4" /></svg>,
  trust: <svg {...ic}><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>,
}

export const SlidersIcon = () => (
  <svg {...ic} width={20} height={20}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
)

export const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
)
