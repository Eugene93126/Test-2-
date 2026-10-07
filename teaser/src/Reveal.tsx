import { useLayoutEffect, useRef } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FPS, ev } from './lib/timeline'
import { paintReveal, paintRevealGlitch } from './art/reveal'

// July 8., as an engraved title page (src/art/reveal.ts). Nothing moves but
// the grain, after the sigil boots in its first two frames.

function Grain({ frame }: { frame: number }) {
  // Fine grain at half resolution, drawn straight into a canvas each frame.
  const ref = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d', { willReadFrequently: true })!
    const img = g.createImageData(c.width, c.height)
    let s = (frame * 2654435761) >>> 0 || 1
    for (let i = 0; i < img.data.length; i += 4) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5
      const v = ((s >>> 0) / 4294967296) * 255
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
  }, [frame])
  return <canvas ref={ref} width={960} height={540} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.055, mixBlendMode: 'screen' }} />
}

/** The page itself, painted once; the sigil's boot glitch on the first frames. */
function Page({ frame }: { frame: number }) {
  const { width, height } = useVideoConfig()
  const ref = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d', { willReadFrequently: true })!
    g.drawImage(paintReveal(width, height), 0, 0)
    const k = frame - Math.round(ev('reveal')[0] * FPS)
    paintRevealGlitch(g, width, height, k === 0 ? 1 : k === 1 ? 0.45 : 0)
  }, [frame, width, height])
  return <canvas ref={ref} width={width} height={height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}

export function Reveal({ frame }: { frame: number; scale?: number }) {
  return (
    <AbsoluteFill style={{ background: '#0B0E12' }}>
      <Page frame={frame} />
      <Grain frame={frame} />
    </AbsoluteFill>
  )
}
