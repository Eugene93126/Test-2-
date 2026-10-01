import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { Stage } from './scene/Stage'
import { Shell } from './ui/Shell'
import { ReviewMenu } from './ui/ReviewMenu'
import { installWorldTap } from './glass/gaze'
import { measureRest, panels } from './glass/registry'
import { installGaze } from './gaze/quantum'
import { PerfMeter } from './perf/PerfMeter'
import { Announcer } from './ui/Announcer'
import { useHeadInput } from './head/headPose'
import { useApp } from './state/store'
import { THEMES } from './theme/themes'

function skipToMain() {
  const s = useApp.getState()
  s.setGlances(false)
  const main = document.querySelector<HTMLElement>('[data-panel="main"]')
  if (!main) return
  main.tabIndex = -1
  main.focus()
}

export function App() {
  const theme = useApp(s => s.theme)
  const reducedMotion = useApp(s => s.reducedMotion)
  const typePair = useApp(s => s.typePair)
  const fx = useApp(s => s.fx)
  const tier = useApp(s => s.tier)
  const glances = useApp(s => s.glances)
  const contrast = useApp(s => s.contrast)
  const largeText = useApp(s => s.largeText)
  useHeadInput()

  useEffect(() => { document.documentElement.dataset.type = typePair }, [typePair])
  useEffect(() => { document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full' }, [reducedMotion])
  useEffect(() => { document.documentElement.dataset.fx = fx }, [fx])
  useEffect(() => { document.documentElement.dataset.quality = tier }, [tier])
  useEffect(() => { document.documentElement.dataset.glances = glances ? 'open' : 'closed' }, [glances])
  useEffect(() => { document.documentElement.dataset.contrast = contrast ? 'more' : 'normal' }, [contrast])
  useEffect(() => { document.documentElement.dataset.text = largeText ? 'large' : 'normal' }, [largeText])

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
    const mc = window.matchMedia('(prefers-contrast: more)')
    const onContrast = () => useApp.getState().setContrast(mc.matches)
    mc.addEventListener('change', onContrast)
    const key = (e: KeyboardEvent) => {
      if (e.key === '`' && !(e.target instanceof HTMLInputElement)) useApp.getState().setPerfOpen(!useApp.getState().perfOpen)
      // Escape closes the Dock sheet or the phone glances and returns focus to what opened them.
      // (The model picker handles its own Escape.)
      if (e.key === 'Escape') {
        const s = useApp.getState()
        if (s.modal === 'dock') { s.setModal(null); document.querySelector<HTMLElement>('.dock-edit')?.focus() }
        else if (s.glances) { s.setGlances(false); document.querySelector<HTMLElement>('.glance-toggle')?.focus() }
      }
    }
    window.addEventListener('keydown', key)
    return () => { mq.removeEventListener('change', on); mc.removeEventListener('change', onContrast); window.removeEventListener('keydown', key) }
  }, [])

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <Stage />
      <main className="overlay" data-overlay-root>
        <a className="skip-link" href="#main-window" onClick={e => { e.preventDefault(); skipToMain() }}>Skip to the main window</a>
        <h1 className="sr-only">Claude, July 8, 2034, seen through AR glasses</h1>
        <Shell />
      </main>
      <ReviewMenu />
      <Announcer />
      <PerfMeter />
    </MotionConfig>
  )
}
