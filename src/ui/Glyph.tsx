import type { GlyphId } from '../state/store'

// Three original marks for the Claude app on glasses. None of them uses rays
// or a starburst, so they never read as the real Claude logo.
//   lens:     a ring with two ticks, a viewfinder for glasses
//   arc:      an open ring with a point of attention in the gap
//   keystone: the keystone of Keystone Frontier Group, with a set stone

export const GLYPH_NAMES: Record<GlyphId, string> = { lens: 'Lens', arc: 'Arc', keystone: 'Keystone' }

export function GlyphMark({ id, size = 14, stroke = 'currentColor' }: { id: GlyphId; size?: number; stroke?: string }) {
  const common = { fill: 'none', stroke, strokeWidth: 2.3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {id === 'lens' && (<>
        <circle cx="12" cy="12" r="6" {...common} />
        <path d="M12 2.6v3.2M12 18.2v3.2" {...common} />
      </>)}
      {id === 'arc' && (<>
        <path d="M17.6 7.2A7.2 7.2 0 1 0 17.6 16.8" {...common} />
        <circle cx="19.2" cy="12" r="1.9" fill={stroke} />
      </>)}
      {id === 'keystone' && (<>
        <path d="M5.2 5.4h13.6l-2.9 13.4H8.1z" {...common} />
        <circle cx="12" cy="11.2" r="2" fill={stroke} />
      </>)}
    </svg>
  )
}

/** The mark on its clay tile. */
export function Glyph({ id, size = 24 }: { id: GlyphId; size?: number }) {
  return (
    <span className="glyph" style={{ width: size, height: size, borderRadius: size * 0.32 }}>
      <GlyphMark id={id} size={Math.round(size * 0.64)} stroke="var(--ivory)" />
    </span>
  )
}
