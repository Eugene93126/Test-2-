// Gravity well around the model sheet, pinned at a given mass.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', e => console.error('[pageerror]', e.message))
await page.goto('http://localhost:5173/?theme=glass')
await page.waitForTimeout(6000)
await page.mouse.move(10, 880)
await page.screenshot({ path: resolve(out, 'g0.png') })
await page.click('#model-chip', { force: true })
await page.waitForTimeout(4000)
await page.evaluate(() => { window.__massPin = 0.9 })
await page.waitForTimeout(3000)
await page.screenshot({ path: resolve(out, 'g1.png') })
await browser.close()
console.log('done')
