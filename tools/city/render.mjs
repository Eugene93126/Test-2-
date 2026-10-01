// Offline renderer for the city loop.
//   node tools/city/render.mjs still --w 1280 --h 720 --t 6 --out shot.png [--mode depth]
//   node tools/city/render.mjs loop  --w 2560 --h 1440   (frames -> public/media/city-loop.mp4, depth, poster)
import { createServer } from 'vite'
import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const args = process.argv.slice(2)
const cmd = args[0] ?? 'still'
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i > -1 ? args[i + 1] : d }
const W = Number(opt('w', 1280)), H = Number(opt('h', 720))

const server = await createServer({ configFile: resolve(here, 'vite.config.ts'), logLevel: 'error' })
await server.listen()
const url = `http://localhost:${server.config.server.port}/`

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
})
const page = await browser.newPage({ viewport: { width: W, height: H } })
page.on('console', m => console.log('[page]', m.text()))
page.on('pageerror', e => console.error('[pageerror]', e.message))
await page.goto(`${url}?w=${W}&h=${H}&t=-1`)
await page.waitForFunction(() => window.city?.ready, null, { timeout: 120000 })

async function grab(t, mode = 'color', type = 'png') {
  const data = await page.evaluate(([t, mode, type]) => {
    window.city.render(t, mode)
    return document.querySelector('canvas').toDataURL(type === 'png' ? 'image/png' : 'image/jpeg', 0.95)
  }, [t, mode, type])
  return Buffer.from(data.split(',')[1], 'base64')
}

try {
  if (cmd === 'still') {
    const out = resolve(opt('out', resolve(here, 'still.png')))
    const t0 = Date.now()
    writeFileSync(out, await grab(Number(opt('t', 6)), opt('mode', 'color')))
    console.log('wrote', out, `${Date.now() - t0} ms`)
  } else if (cmd === 'loop') {
    const fps = Number(opt('fps', 30))
    const loop = await page.evaluate(() => window.city.loop)
    const frames = Math.round(loop * fps)
    const dir = resolve(here, 'frames')
    if (existsSync(dir) && !args.includes('--resume')) rmSync(dir, { recursive: true })
    mkdirSync(dir, { recursive: true })
    const start = Number(opt('from', 0))
    const t0 = Date.now()
    for (let i = start; i < frames; i++) {
      const f = resolve(dir, `f${String(i).padStart(4, '0')}.png`)
      if (args.includes('--resume') && existsSync(f)) continue
      writeFileSync(f, await grab(i / fps))
      if (i % 10 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`)
    }
    const media = resolve(root, 'public/media')
    mkdirSync(media, { recursive: true })
    writeFileSync(resolve(media, 'city-depth.png'), await grab(0, 'depth'))
    const outW = Number(opt('outw', 1920)), outH = Math.round(outW * H / W / 2) * 2
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', resolve(dir, 'f%04d.png'),
      '-vf', `scale=${outW}:${outH}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', opt('crf', '21'),
      '-pix_fmt', 'yuv420p', '-tune', 'film', '-g', String(fps * 2), '-movflags', '+faststart', '-an', resolve(media, 'city-loop.mp4')], { stdio: 'inherit' })
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(dir, 'f0000.png'), '-vf', `scale=${outW}:${outH}:flags=lanczos`, '-q:v', '3', resolve(media, 'city-poster.jpg')], { stdio: 'inherit' })
    console.log('encoded loop', frames, 'frames')
  }
} finally {
  await browser.close()
  await server.close()
}
