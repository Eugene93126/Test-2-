import { create } from 'zustand'

// One polite live region for things a screen reader user should hear about but
// can't see happen: a new section sliding in, a model switching.

const useAnnouncer = create<{ msg: string; n: number }>(() => ({ msg: '', n: 0 }))

export function announce(msg: string) {
  useAnnouncer.setState(s => ({ msg, n: s.n + 1 }))
}

export function Announcer() {
  const { msg, n } = useAnnouncer()
  // Alternating a trailing space makes a repeated message count as a change.
  return <div className="sr-only" aria-live="polite" aria-atomic="true">{n % 2 ? msg : `${msg}\u00a0`}</div>
}
