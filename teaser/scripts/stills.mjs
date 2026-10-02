// Style frames: one still per shot (times from the timeline), or any frames
// given as arguments: node scripts/stills.mjs [comp] [t1 t2 ...]
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import { readFileSync, mkdirSync } from 'node:fs'
import { CHROME, GL } from './env.mjs'

const tl = JSON.parse(readFileSync(new URL('../src/timeline.json', import.meta.url)))
const id = process.argv[2] && isNaN(+process.argv[2]) ? process.argv[2] : 'Teaser'
const args = process.argv.slice(id === process.argv[2] ? 3 : 2).map(Number)
const shots = args.length ? args.map(t => ({ id: `t${t}`, t })) : tl.shots.flatMap(s => s.still == null ? [] : [].concat(s.still).map((t, i) => ({ id: `${s.id}${[].concat(s.still).length > 1 ? 'ab'[i] : ''}`, t })))
const out = new URL('../out/stills/', import.meta.url).pathname
mkdirSync(out, { recursive: true })
const t0 = Date.now()
const serveUrl = await bundle({ entryPoint: new URL('../src/index.ts', import.meta.url).pathname })
const logs = process.env.LOGS === '1'
const opts = { serveUrl, browserExecutable: CHROME, chromiumOptions: { gl: GL }, timeoutInMilliseconds: 240000,
  onBrowserLog: logs ? l => { if (l.type === 'error' || l.type === 'warning' || l.text.includes('THREE')) console.log(`[${l.type}]`, l.text.slice(0, 400)) } : undefined }
const inputProps = process.env.NOPOST === '1' ? { post: false } : process.env.SET ? { set: process.env.SET } : {}
opts.inputProps = inputProps
const composition = await selectComposition({ ...opts, id })
console.log('bundled in', ((Date.now() - t0) / 1000).toFixed(1), 's')
for (const s of shots) {
  const t1 = Date.now()
  const frame = Math.round(s.t * tl.meta.fps)
  await renderStill({ ...opts, composition, frame, output: `${out}${id === 'Teaser' ? '' : id + '-'}${s.id}.png` })
  console.log(s.id, 'frame', frame, ((Date.now() - t1) / 1000).toFixed(1), 's')
}
