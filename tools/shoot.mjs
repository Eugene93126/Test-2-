// Screenshots of the running app for review.
//   node tools/shoot.mjs <outDir> [--url http://localhost:5173/] [--w 1440 --h 900] [--wait 2500] name=query ...
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const out = resolve(args[0])
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i > -1 ? args[i + 1] : d }
const url = opt('url', 'http://localhost:5173/')
const W = Number(opt('w', 1440)), H = Number(opt('h', 900)), wait = Number(opt('wait', 2500))
const shots = args.filter(a => a.includes('=') && !a.startsWith('--'))
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(opt('dpr', 1)) })
page.on('pageerror', e => console.error('[pageerror]', e.message))
page.on('response', r => { if (r.status() >= 400) console.log('[http]', r.status(), r.url()) })
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text()) })
for (const s of shots) {
  const i = s.indexOf('=')
  const name = s.slice(0, i), query = s.slice(i + 1)
  await page.goto(`${url}?${query.replaceAll(',', '&')}`)
  await page.waitForTimeout(wait)
  if (opt('mouse')) {
    const [mx, my] = opt('mouse').split(',').map(Number)
    await page.mouse.move(mx * W, my * H, { steps: 8 })
    await page.waitForTimeout(1500)
  }
  await page.screenshot({ path: resolve(out, `${name}.png`) })
  console.log('shot', name)
}
await browser.close()
