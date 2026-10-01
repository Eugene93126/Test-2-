import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { Stage } from './scene/Stage'
import { Shell } from './ui/Shell'
import { ReviewMenu } from './ui/ReviewMenu'
import { installWorldTap } from './glass/gaze'
import { measureRest, panels } from './glass/registry'
import { installGaze } from './gaze/quantum'
import { PerfMeter } from './perf/PerfMeter'
import { useHeadInput } from './head/headPose'
import { useApp } from './state/store'
import { THEMES } from './theme/themes'

export function App() {
  const theme = useApp(s => s.theme)
  const reducedMotion = useApp(s => s.reducedMotion)
  const typePair = useApp(s => s.typePair)
  const fx = useApp(s => s.fx)
  useHeadInput()

  useEffect(() => { document.documentElement.dataset.type = typePair }, [typePair])
  useEffect(() => { document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full' }, [reducedMotion])
  useEffect(() => { document.documentElement.dataset.fx = fx }, [fx])

  // Panels re-measure when the window or the fonts change their layout.
  useEffect(() => {
    const all = () => panels.forEach(measureRest)
    window.addEventListener('resize', all)
    document.fonts?.ready.then(all)
    const off = installWorldTap()
    const offGaze = installGaze()
    return () => { window.removeEventListener('resize', all); off(); offGaze() }
  }, [])

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
      <main className="overlay" data-overlay-root>
        <h1 className="sr-only">Claude, July 8, 2034, seen through AR glasses</h1>
        <Shell />
      </main>
      <ReviewMenu />
      <PerfMeter />
    </MotionConfig>
  )
}
