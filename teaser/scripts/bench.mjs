// Steady-state cost per frame: render a short run of consecutive frames.
// node scripts/bench.mjs <fromFrame> <toFrame> [scale]
import { bundle } from '@remotion/bundler'
import { renderFrames, selectComposition } from '@remotion/renderer'
import { mkdirSync } from 'node:fs'
import { CHROME, GL } from './env.mjs'
const [from, to] = [+process.argv[2], +process.argv[3]]
const scale = +(process.argv[4] ?? 1)
const serveUrl = await bundle({ entryPoint: new URL('../src/index.ts', import.meta.url).pathname })
let T = Date.now()
const opts = { serveUrl, browserExecutable: CHROME, chromiumOptions: { gl: GL }, timeoutInMilliseconds: 600000,
  inputProps: process.env.PERF === '1' ? { perf: true } : {},
  onBrowserLog: l => { if (l.text.startsWith('[perf]')) console.log(`+${((Date.now() - T) / 1000).toFixed(1)}s`, l.text) } }
const composition = await selectComposition({ ...opts, id: 'Teaser' })
const out = new URL('../out/tmp/bench/', import.meta.url).pathname
mkdirSync(out, { recursive: true })
T = Date.now()
let last = Date.now()
await renderFrames({
  ...opts, composition, outputDir: out, imageFormat: 'jpeg', jpegQuality: 90, frameRange: [from, to], concurrency: 1, scale,
  onStart: () => {}, onFrameUpdate: (n, f) => { const now = Date.now(); console.log(`frame ${f} done +${((now - last) / 1000).toFixed(1)}s`); last = now },
})
console.log(`total ${((Date.now() - T) / 1000).toFixed(1)}s for ${to - from + 1} frames`)
