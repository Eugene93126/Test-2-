import type { ArtId } from '../../data/assets'

// Small illustrations for Claude World tiles, one per asset. 240 x 140 units.
// Moving parts (rain, ferry, bars) animate only while the tile is hovered.

export function Art({ id }: { id: ArtId }) {
  return (
    <svg viewBox="0 0 240 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={`art art-${id}`}>
      {ART[id]}
    </svg>
  )
}

const rain = (color: string, n = 26, seed = 1) =>
  Array.from({ length: n }, (_, i) => {
    const x = ((i * 53 + seed * 31) % 260) - 10, y = ((i * 37 + seed * 17) % 120) - 10
    return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 18} stroke={color} strokeWidth="1" opacity="0.35" />
  })

const ART: Record<ArtId, React.ReactNode> = {
  // The White City and the first Ferris wheel, in the rain.
  rainline: (<>
    <defs><linearGradient id="g-rain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#334356" /><stop offset="1" stopColor="#8E9BA5" /></linearGradient></defs>
    <rect width="240" height="140" fill="url(#g-rain)" />
    <g fill="none" stroke="#D9D2C2" strokeWidth="1.4" opacity="0.85">
      <circle cx="176" cy="62" r="34" />
      {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <line key={i} x1="176" y1="62" x2={176 + Math.cos(a) * 34} y2={62 + Math.sin(a) * 34} strokeWidth="0.7" /> })}
    </g>
    <path d="M20 108 h110 v-26 h-110z" fill="#E8E1D0" opacity="0.92" />
    <path d="M44 82 a31 22 0 0 1 62 0z" fill="#EFE9DA" />
    {Array.from({ length: 9 }, (_, i) => <rect key={i} x={26 + i * 11.5} y="86" width="4" height="20" fill="#B9B09C" />)}
    <rect y="108" width="240" height="32" fill="#2B3540" />
    <path d="M20 112 h110" stroke="#E8E1D0" strokeWidth="2" opacity="0.25" />
    <g className="mover rain">{rain('#E6EEF5', 30, 2)}</g>
  </>),
  orrery: (<>
    <rect width="240" height="140" fill="#221F1A" />
    <defs><radialGradient id="g-sun"><stop offset="0" stopColor="#FFE7A6" /><stop offset="0.6" stopColor="#E8B456" /><stop offset="1" stopColor="#8A5A1E" /></radialGradient></defs>
    <g fill="none" stroke="#B8904A" strokeWidth="1.2">
      <ellipse cx="120" cy="72" rx="36" ry="14" /><ellipse cx="120" cy="72" rx="64" ry="25" /><ellipse cx="120" cy="72" rx="96" ry="38" opacity="0.7" />
    </g>
    <circle cx="120" cy="70" r="11" fill="url(#g-sun)" />
    <g className="mover spin" style={{ transformOrigin: '120px 72px' }}>
      <circle cx="156" cy="72" r="4" fill="#C9C2B2" /><circle cx="64" cy="84" r="6" fill="#B07A47" /><circle cx="196" cy="58" r="5" fill="#8EA3B0" />
    </g>
    <circle cx="120" cy="72" r="22" fill="none" stroke="#7A5A2A" strokeWidth="5" strokeDasharray="2.6 2.4" opacity="0.8" />
  </>),
  ferry: (<>
    <defs><linearGradient id="g-ferry" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E1826" /><stop offset="0.55" stopColor="#1F3552" /><stop offset="1" stopColor="#0A1220" /></linearGradient></defs>
    <rect width="240" height="140" fill="url(#g-ferry)" />
    <path d="M0 78 h240" stroke="#3A5272" strokeWidth="1" />
    {Array.from({ length: 14 }, (_, i) => <rect key={i} x={i * 18 + 4} y={70 - ((i * 7) % 9)} width="10" height={8 + ((i * 7) % 9)} fill="#16243A" />)}
    <g className="mover drift">
      <path d="M70 80 h74 l-8 10 h-58z" fill="#E7E2D6" />
      <rect x="86" y="72" width="40" height="8" rx="1.5" fill="#D9D3C5" />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} x={90 + i * 5} y="74.5" width="2.6" height="3" fill="#E3B25A" />)}
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={84 + i * 9} y={96 + i * 4} width="3" height={10 - i} fill="#E3B25A" opacity={0.5 - i * 0.07} />)}
    </g>
  </>),
  choir: (<>
    <defs><linearGradient id="g-choir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1E2036" /><stop offset="1" stopColor="#3A3C5A" /></linearGradient></defs>
    <rect width="240" height="140" fill="url(#g-choir)" />
    <g className="mover bars">
      {Array.from({ length: 24 }, (_, i) => { const h = 12 + Math.abs(Math.sin(i * 0.7) * 34) + (i % 5) * 4; return <rect key={i} x={24 + i * 8} y={70 - h / 2} width="4" height={h} rx="2" fill={i % 6 === 2 ? '#D97757' : '#A8ADD0'} opacity="0.9" style={{ transformOrigin: `${26 + i * 8}px 70px`, animationDelay: `${(i % 7) * -0.13}s` }} /> })}
    </g>
  </>),
  courtyard: (<>
    <defs><linearGradient id="g-court" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4D6A5F" /><stop offset="1" stopColor="#2E463D" /></linearGradient></defs>
    <rect width="240" height="140" fill="url(#g-court)" />
    {[30, 96, 162].map(x => <path key={x} d={`M${x} 104 v-44 a24 24 0 0 1 48 0 v44z`} fill="#1F322B" stroke="#C9B48A" strokeWidth="1.5" />)}
    <rect y="104" width="240" height="36" fill="#26392F" />
    <ellipse cx="120" cy="120" rx="70" ry="8" fill="#5F8577" opacity="0.6" />
    <g className="mover rain">{rain('#DDEBE4', 26, 5)}</g>
  </>),
  greenhouse: (<>
    <defs><linearGradient id="g-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B8D3BE" /><stop offset="1" stopColor="#77A086" /></linearGradient></defs>
    <rect width="240" height="140" fill="url(#g-green)" />
    <path d="M40 120 V70 L120 28 L200 70 V120 Z" fill="#E9F3EC" fillOpacity="0.35" stroke="#FFFFFF" strokeWidth="1.4" />
    <g stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8">
      <path d="M80 120 V49 M120 120 V28 M160 120 V49 M40 95 H200 M40 70 L120 112 L200 70 M80 49 L160 120 M160 49 L80 120" />
    </g>
    {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={56 + i * 16} cy={112 - (i % 3) * 4} r={4 + (i % 2) * 2} fill="#3F6B4E" />)}
  </>),
  saltflats: (<>
    <defs><linearGradient id="g-salt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2E9DA" /><stop offset="0.6" stopColor="#E2D6C0" /><stop offset="1" stopColor="#C9B99E" /></linearGradient></defs>
    <rect width="240" height="140" fill="url(#g-salt)" />
    <path d="M0 74 h240" stroke="#B9A88E" strokeWidth="1" />
    <g className="mover pulse" fill="none" stroke="#B1451F">
      {[14, 30, 48, 68].map((r, i) => <ellipse key={r} cx="120" cy="100" rx={r * 1.8} ry={r * 0.42} strokeWidth="1.2" opacity={0.7 - i * 0.15} />)}
    </g>
    <rect x="118" y="84" width="4" height="14" rx="2" fill="#2E2A24" />
  </>),
  lakefront: (<>
    <defs><linearGradient id="g-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#24345A" /><stop offset="0.55" stopColor="#5E5A82" /><stop offset="0.75" stopColor="#B78A8C" /><stop offset="1" stopColor="#2A3550" /></linearGradient></defs>
    <rect width="240" height="140" fill="url(#g-lake)" />
    {[[40, 30], [52, 46], [66, 38], [80, 58], [96, 40], [108, 30], [124, 50], [140, 34], [156, 44], [170, 26]].map(([x, h]) => <rect key={x} x={x} y={92 - h} width="10" height={h} fill="#1B2238" />)}
    <path d="M118 92 v-62 M114 92 v-56" stroke="#1B2238" strokeWidth="2" />
    <rect y="92" width="240" height="48" fill="#1E2A44" />
    {[[44, 6], [70, 9], [100, 7], [128, 10], [160, 6]].map(([x, l]) => <rect key={x} x={x} y="96" width="2" height={l * 3} fill="#E3B25A" opacity="0.45" />)}
  </>),
  alderman: (<>
    <rect width="240" height="140" fill="#5A5A5A" />
    <circle cx="120" cy="56" r="22" fill="#8A8A8A" />
    <path d="M70 140 c4-32 26-46 50-46 s46 14 50 46z" fill="#7A7A7A" />
    {[24, 61, 88, 117].map(y => <rect key={y} y={y} width="240" height="3" fill="#BDBDBD" opacity="0.4" />)}
  </>),
}
