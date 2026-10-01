import { useWorldTime, gridPrice, PEAK_END } from './worldClock'

// Small live values for the HUD and glances, all derived from in-world time
// so they agree with each other.
const START_MIN = 20 * 60 + 41

export function useLive() {
  const t = useWorldTime()
  const elapsed = t.minutes - START_MIN // minutes since 8:41 PM
  const peak = t.minutes < PEAK_END
  // Red Line at Belmont: next train 4 min out at 8:41, then every 8 minutes.
  const train = Math.ceil(((4 - elapsed) % 8 + 8) % 8) || 8
  const leaveIn = Math.max(0, train - 2)
  const keynote = 21 * 60 - t.minutes // minutes until 9:00 PM
  return {
    time: t,
    peak,
    price: gridPrice(t.minutes),
    // Odyssey runs on-device in the background: a slow, steady draw.
    energyKJ: 41.6 + Math.max(0, elapsed) * 0.12,
    battery: Math.max(5, 61 - Math.floor(Math.max(0, elapsed) / 5)),
    train,
    leaveIn,
    keynote,
  }
}

export const fmtKJ = (v: number) => v.toFixed(1)
