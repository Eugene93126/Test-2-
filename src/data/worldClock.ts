import { useEffect, useState } from 'react'

// In-world time: Saturday, July 8, 2034, starting at 8:41 PM in Chicago and
// running in real time from the moment the page opens.
const START_MIN = 20 * 60 + 41 // 8:41 PM
const opened = performance.now()

export interface WorldTime {
  /** Minutes since midnight, fractional. */
  minutes: number
  label: string
  short: string
}

function at(nowMs: number): WorldTime {
  const minutes = START_MIN + (nowMs - opened) / 60000
  const m = Math.floor(minutes) % (24 * 60)
  const h24 = Math.floor(m / 60), mm = m % 60
  const h12 = ((h24 + 11) % 12) + 1
  const ap = h24 < 12 ? 'AM' : 'PM'
  return { minutes, label: `${h12}:${String(mm).padStart(2, '0')} ${ap}`, short: `${h12}:${String(mm).padStart(2, '0')}` }
}

/** Re-renders on every in-world minute (or every `everyMs`). */
export function useWorldTime(everyMs = 1000) {
  const [t, setT] = useState(() => at(performance.now()))
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = at(performance.now())
      setT(prev => (prev.label === next.label && everyMs >= 1000 ? prev : next))
    }, everyMs)
    return () => window.clearInterval(id)
  }, [everyMs])
  return t
}

/** Peak pricing runs 4–9 PM. */
export const PEAK_END = 21 * 60
export const gridPrice = (minutes: number) => (minutes < PEAK_END ? 0.212 : 0.118)
