// Interaction screenshots: hover a panel, press to ripple, dwell to focus.
//   node tools/interact.mjs <outDir> [--theme glass]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const out = resolve(args[0])
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i > -1 ? args[i + 1] : d }
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', e => console.error('[pageerror]', e.message))
await page.goto(`http://localhost:5173/?theme=${opt('theme', 'glass')}`)
await page.waitForTimeout(6000)
const main = await page.locator('[data-panel="main"]').boundingBox()
const cx = main.x + main.width * 0.62, cy = main.y + main.height * 0.72
await page.mouse.move(cx - 200, cy - 40, { steps: 6 })
await page.mouse.move(cx, cy, { steps: 6 })
await page.waitForTimeout(500)
await page.screenshot({ path: resolve(out, 'hover.png') })
await page.mouse.down(); await page.mouse.up()
await page.waitForTimeout(250)
await page.screenshot({ path: resolve(out, 'ripple.png') })
await page.waitForTimeout(2500)
await page.screenshot({ path: resolve(out, 'focused.png') })
await page.mouse.move(20, 450, { steps: 4 })
await page.waitForTimeout(2500)
await page.screenshot({ path: resolve(out, 'released.png') })
console.log('done')
await browser.close()
