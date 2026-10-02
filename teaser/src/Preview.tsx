import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion'
import { loadFonts } from './fonts'
import { paintCard } from './art/cards'
import { FLASHES } from './lib/timeline'

// Flat previews of the printed art, for iterating without the 3D scene.
// CardPreview: frame i shows CrossBody card i at its native resolution.

function useFonts() {
  const [handle] = useState(() => delayRender('fonts'))
  const [ready, setReady] = useState(false)
  useEffect(() => { loadFonts().then(() => { setReady(true); continueRender(handle) }) }, [handle])
  return ready
}

function Blit({ src }: { src: () => HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const c = ref.current
    if (!c) return
    const s = src()
    c.width = s.width
    c.height = s.height
    c.getContext('2d')!.drawImage(s, 0, 0)
  })
  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />
}

export const CardPreview = () => {
  const frame = useCurrentFrame()
  const ready = useFonts()
  if (!ready) return null
  const f = FLASHES[frame % 12]
  return (
    <AbsoluteFill style={{ background: '#222' }}>
      <Blit src={() => paintCard(f.i, f.body)} />
    </AbsoluteFill>
  )
}
