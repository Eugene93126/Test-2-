// Render the film as an image sequence, in resumable chunks.
//   node scripts/render.mjs --out out/frames/final --format png
//   node scripts/render.mjs --out out/frames/animatic --scale 0.6667 --every 2 --format jpeg
// Options: --comp Teaser  --from 0 --to 1199  --every 1  --scale 1  --concurrency 1  --chunk 150
// Frames land as f0000.png … ; chunks already on disk are skipped, so a rerun resumes.
import { bundle } from '@remotion/bundler'
import { openBrowser, renderFrames, selectComposition } from '@remotion/renderer'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { CHROME, GL } from './env.mjs'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d }
const comp = arg('comp', 'Teaser')
const out = new URL(`../${arg('out', 'out/frames/final')}/`, import.meta.url).pathname
const format = arg('format', 'png')
const ext = format === 'png' ? 'png' : 'jpg'
const every = +arg('every', 1), scale = +arg('scale', 1), concurrency = +arg('concurrency', 1), chunk = +arg('chunk', 150)
mkdirSync(out, { recursive: true })

const T0 = Date.now()
const serveUrl = await bundle({ entryPoint: new URL('../src/index.ts', import.meta.url).pathname })
const browser = await openBrowser('chrome', { browserExecutable: CHROME, chromiumOptions: { gl: GL } })
const opts = { serveUrl, browserExecutable: CHROME, chromiumOptions: { gl: GL }, timeoutInMilliseconds: 600000, puppeteerInstance: browser }
const composition = await selectComposition({ ...opts, id: comp })
const from = +arg('from', 0), to = +arg('to', composition.durationInFrames - 1)
const name = f => join(out, `f${String(f).padStart(4, '0')}.${ext}`)
const wanted = []
for (let f = from; f <= to; f += every) wanted.push(f)
console.log(`bundled ${((Date.now() - T0) / 1000).toFixed(0)}s · ${wanted.length} frames → ${out}`)

let done = wanted.filter(f => existsSync(name(f))).length
const t0 = Date.now()
for (let i = 0; i < wanted.length; i += chunk) {
  const frames = wanted.slice(i, i + chunk)
  if (frames.every(f => existsSync(name(f)))) continue
  const tmp = join(out, `_chunk${frames[0]}`)
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  const c0 = Date.now()
  await renderFrames({
    ...opts, composition, outputDir: tmp, imageFormat: format, jpegQuality: 92, scale, concurrency,
    frameRange: [frames[0], frames[frames.length - 1]], everyNthFrame: every,
    onStart: () => {},
    onFrameUpdate: n => {
      if (n % 10 === 0) {
        const all = done + n, el = (Date.now() - t0) / 1000
        const rate = (Date.now() - c0) / 1000 / n
        console.log(`progress ${all}/${wanted.length} · ${rate.toFixed(2)}s/frame · elapsed ${(el / 60).toFixed(1)} min · eta ${(((wanted.length - all) * rate) / 60).toFixed(1)} min`)
      }
    },
  })
  const files = readdirSync(tmp).filter(f => f.endsWith(`.${format === 'png' ? 'png' : 'jpeg'}`) || f.endsWith('.jpg')).sort()
  if (files.length !== frames.length) throw new Error(`chunk ${frames[0]}: expected ${frames.length} files, got ${files.length}`)
  files.forEach((f, k) => renameSync(join(tmp, f), name(frames[k])))
  rmSync(tmp, { recursive: true, force: true })
  done += frames.length
  console.log(`chunk ${frames[0]}–${frames[frames.length - 1]} done in ${((Date.now() - c0) / 60000).toFixed(1)} min`)
}
await browser.close({ silent: true })
console.log(`ALL DONE ${done}/${wanted.length} in ${((Date.now() - t0) / 60000).toFixed(1)} min`)
