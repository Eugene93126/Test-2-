import { AbsoluteFill } from 'remotion'
import { TEXT, shotAt } from './lib/timeline'
import { hex } from './lib/rand'
import { light } from './world/choreo'

// The signed-capture strip: in 2034 unsigned footage is presumed fake, so
// every frame carries its signature along the edge, like film keycodes.

export function EdgeCode({ t, frame, scale = 1 }: { t: number; frame: number; scale?: number }) {
  const L = light(t)
  const shot = shotAt(t)
  const ink = `rgba(${Math.round(20 + L.dusk * 190)}, ${Math.round(26 + L.dusk * 190)}, ${Math.round(32 + L.dusk * 190)}, ${0.42 - L.dusk * 0.12})`
  const sig = `${hex(Math.floor(frame / 6), 4)} ${hex(Math.floor(frame / 6) + 1, 4)} ${hex(77, 4)}`
  const style = { position: 'absolute' as const, fontFamily: '"JetBrains Mono"', fontSize: 13 * scale, letterSpacing: '0.14em', color: ink, whiteSpace: 'pre' as const }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ ...style, left: 34 * scale, bottom: 26 * scale }}>{`◂ ${TEXT.edgeCode} · ${shot}`}</div>
      <div style={{ ...style, right: 34 * scale, bottom: 26 * scale }}>{`${sig} · F${String(frame).padStart(4, '0')} ▸`}</div>
    </AbsoluteFill>
  )
}
