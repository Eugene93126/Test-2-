import { useEffect, useState } from 'react'
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame, useVideoConfig } from 'remotion'
import { ThreeCanvas } from '@remotion/three'
import { FPS, ev } from './lib/timeline'
import { loadFonts } from './fonts'
import { World } from './world/World'
import { EdgeCode } from './Overlay'
import { Reveal } from './Reveal'

export const Teaser = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const t = frame / FPS
  const [handle] = useState(() => delayRender('fonts'))
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t0 = performance.now()
    loadFonts().then(() => { if (getInputProps().perf) console.log(`[perf] fonts ${(performance.now() - t0).toFixed(0)}ms`); setReady(true); continueRender(handle) })
  }, [handle])
  if (!ready) return null
  const [b0, b1] = ev('black')
  const scale = width / 1920
  return (
    <AbsoluteFill style={{ background: '#0B0E12' }}>
      {t < b0 && (
        <ThreeCanvas width={width} height={height} shadows="variance" camera={{ fov: 20, near: 0.01, far: 6, position: [0, 1, 0] }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}>
          <World t={t} frame={frame} post={getInputProps().post !== false} perf={getInputProps().perf === true} />
        </ThreeCanvas>
      )}
      {t < b0 && <EdgeCode t={t} frame={frame} scale={scale} />}
      {t >= b0 && t < b1 && <AbsoluteFill style={{ background: '#000' }} />}
      {t >= b1 && <Reveal frame={frame} scale={scale} />}
    </AbsoluteFill>
  )
}
