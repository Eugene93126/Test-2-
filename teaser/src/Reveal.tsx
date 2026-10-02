import { useMemo } from 'react'
import { AbsoluteFill } from 'remotion'
import { TEXT } from './lib/timeline'

// July 8. Nothing moves but the grain.

function Grain({ frame }: { frame: number }) {
  const url = useMemo(() => {
    const W = 480, H = 270
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const g = c.getContext('2d')!
    const img = g.createImageData(W, H)
    let s = (frame * 2654435761) >>> 0 || 1
    for (let i = 0; i < img.data.length; i += 4) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5
      const v = (s >>> 0) / 4294967296
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    return c.toDataURL()
  }, [frame])
  return <AbsoluteFill style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover', opacity: 0.07, mixBlendMode: 'screen', imageRendering: 'pixelated' }} />
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
