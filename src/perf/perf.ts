import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2 } from 'three'

// Frame timing: frame interval (what you see), CPU time spent in the render
// loop, and GPU time from EXT_disjoint_timer_query_webgl2 where the browser
// exposes it (Chrome on desktop does; Safari doesn't).

export const perfStats = {
  fps: 0,
  frameMs: 0,
  p95Ms: 0,
  cpuMs: 0,
  gpuMs: null as number | null,
  calls: 0,
  triangles: 0,
  dpr: 1,
  width: 0,
  height: 0,
  gpuName: '',
}

type TimerExt = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

export function PerfProbe() {
  const gl = useThree(s => s.gl)
  const state = useRef({ last: 0, cpuStart: 0, intervals: [] as number[], query: null as WebGLQuery | null, pending: [] as WebGLQuery[] })
  const ext = useRef<TimerExt | null>(null)
  const buf = useRef(new Vector2())
  const tick = useRef(0)

  useEffect(() => {
    const ctx = gl.getContext() as WebGL2RenderingContext
    ext.current = ctx.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null
    const dbg = ctx.getExtension('WEBGL_debug_renderer_info')
    perfStats.gpuName = dbg ? String(ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ''
    gl.info.autoReset = false
  }, [gl])

  // Runs first in the frame.
  useFrame(() => {
    const s = state.current
    const now = performance.now()
    if (s.last) {
      const dt = now - s.last
      s.intervals.push(dt)
      if (s.intervals.length > 240) s.intervals.shift()
      perfStats.frameMs = perfStats.frameMs ? perfStats.frameMs * 0.92 + dt * 0.08 : dt
      perfStats.fps = 1000 / perfStats.frameMs
    }
    s.last = now
    s.cpuStart = now
    gl.info.reset()
    const ctx = gl.getContext() as WebGL2RenderingContext
    const e = ext.current
    if (e) {
      // Collect finished queries.
      while (s.pending.length) {
        const q = s.pending[0]
        if (!ctx.getQueryParameter(q, ctx.QUERY_RESULT_AVAILABLE)) break
        s.pending.shift()
        if (!ctx.getParameter(e.GPU_DISJOINT_EXT)) {
          const ms = ctx.getQueryParameter(q, ctx.QUERY_RESULT) / 1e6
          perfStats.gpuMs = perfStats.gpuMs == null ? ms : perfStats.gpuMs * 0.9 + ms * 0.1
        }
        ctx.deleteQuery(q)
      }
      if (s.pending.length < 4) {
        s.query = ctx.createQuery()
        if (s.query) ctx.beginQuery(e.TIME_ELAPSED_EXT, s.query)
      }
    }
  }, -1000)

  // Runs last in the frame, after the composer has drawn.
  useFrame(() => {
    const s = state.current
    const ctx = gl.getContext() as WebGL2RenderingContext
    if (ext.current && s.query) {
      ctx.endQuery(ext.current.TIME_ELAPSED_EXT)
      s.pending.push(s.query)
      s.query = null
    }
    const cpu = performance.now() - s.cpuStart
    perfStats.cpuMs = perfStats.cpuMs ? perfStats.cpuMs * 0.9 + cpu * 0.1 : cpu
    perfStats.calls = gl.info.render.calls
    perfStats.triangles = gl.info.render.triangles
    perfStats.dpr = gl.getPixelRatio()
    const sz = gl.getDrawingBufferSize(buf.current)
    perfStats.width = sz.x
    perfStats.height = sz.y
    if (s.intervals.length > 30 && tick.current++ % 15 === 0) {
      const sorted = [...s.intervals].sort((a, b) => a - b)
      perfStats.p95Ms = sorted[Math.floor(sorted.length * 0.95)]
    }
  }, 1000)

  return null
}
