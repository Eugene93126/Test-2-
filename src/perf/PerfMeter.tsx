import { useEffect, useState } from 'react'
import { perfStats } from './perf'
import { useApp } from '../state/store'

const BUDGET = 8.33 // ms, one frame at 120 Hz

function tone(ms: number | null) {
  if (ms == null) return 'var(--ink-3)'
  return ms <= BUDGET ? '#8FC9A6' : ms <= 16.7 ? '#E3B25A' : '#E0715A'
}

export function PerfMeter() {
  const open = useApp(s => s.perfOpen)
  const [, force] = useState(0)

  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => force(n => n + 1), 250)
    return () => window.clearInterval(id)
  }, [open])

  if (!open) return null
  const s = perfStats
  const row = (label: string, value: string, color?: string) => (
    <div className="perf-row"><span>{label}</span><b style={{ color }}>{value}</b></div>
  )
  return (
    <aside className="perf" aria-label="Performance">
      <div className="perf-title">Frame budget · {BUDGET.toFixed(2)} ms (120 Hz)</div>
      {row('FPS', s.fps ? s.fps.toFixed(0) : '–')}
      {row('Frame', `${s.frameMs.toFixed(2)} ms`, tone(s.frameMs))}
      {row('Frame p95', `${s.p95Ms.toFixed(2)} ms`, tone(s.p95Ms))}
      {row('CPU (render loop)', `${s.cpuMs.toFixed(2)} ms`, tone(s.cpuMs))}
      {row('GPU', s.gpuMs == null ? 'timer unavailable' : `${s.gpuMs.toFixed(2)} ms`, tone(s.gpuMs))}
      {row('Draw calls', String(s.calls))}
      {row('Triangles', s.triangles.toLocaleString())}
      {row('Resolution', `${s.width}×${s.height} @ ${s.dpr.toFixed(2)}x`)}
      {s.gpuName && <div className="perf-gpu">{s.gpuName}</div>}
    </aside>
  )
}
