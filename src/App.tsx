import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { Stage } from './scene/Stage'
import { DevBar } from './ui/DevBar'
import { PerfMeter } from './perf/PerfMeter'
import { useHeadInput } from './head/headPose'
import { useApp } from './state/store'
import { THEMES } from './theme/themes'

export function App() {
  const theme = useApp(s => s.theme)
  const reducedMotion = useApp(s => s.reducedMotion)
  useHeadInput()

  useEffect(() => {
    const root = document.documentElement
    for (const [k, v] of Object.entries(THEMES[theme].ui)) root.style.setProperty(k, v)
    root.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => { useApp.getState().setReducedMotion(mq.matches); if (mq.matches) useApp.getState().setVideoPlaying(false) }
    mq.addEventListener('change', on)
    const key = (e: KeyboardEvent) => {
      if (e.key === '`' && !(e.target instanceof HTMLInputElement)) useApp.getState().setPerfOpen(!useApp.getState().perfOpen)
    }
    window.addEventListener('keydown', key)
    return () => { mq.removeEventListener('change', on); window.removeEventListener('keydown', key) }
  }, [])

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <Stage />
      <main className="overlay">
        <h1 className="sr-only">Claude, July 8, 2034, seen through AR glasses</h1>
      </main>
      <DevBar />
      <PerfMeter />
    </MotionConfig>
  )
}
