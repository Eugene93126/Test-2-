import { useLayoutEffect, useRef } from 'react'
import { AbsoluteFill } from 'remotion'
import { TEXT } from './lib/timeline'

// July 8. Nothing moves but the grain.

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

export function Reveal({ frame, scale = 1 }: { frame: number; scale?: number }) {
  return (
    <AbsoluteFill style={{ background: '#0B0E12', alignItems: 'center', justifyContent: 'center' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 48%, rgba(40,52,64,0.35), rgba(11,14,18,0) 60%)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 * scale, transform: `translateY(${-6 * scale}px)` }}>
        <div style={{ fontFamily: 'Newsreader', fontWeight: 400, fontSize: 104 * scale, letterSpacing: '-0.012em', color: '#DCE3E8', fontVariationSettings: '"opsz" 72' }}>{TEXT.revealTitle}</div>
        <div style={{ fontFamily: '"JetBrains Mono"', fontWeight: 400, fontSize: 19 * scale, letterSpacing: '0.18em', color: '#5E6B73' }}>{TEXT.revealCaption}</div>
      </div>
      <Grain frame={frame} />
    </AbsoluteFill>
  )
}
