// Phone audit: iPhone 11 portrait and landscape, iPhone SE, across sections.
// usage: node tools/phone6.mjs <outdir> [device] [sections,comma] [query]
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const DEVICES = {
  i11: { viewport: { width: 414, height: 896 } },
  land: { viewport: { width: 896, height: 414 } },
  se: { viewport: { width: 375, height: 667 } },
}
const dev = process.argv[3] ?? 'i11'
const sections = (process.argv[4] ?? 'chat').split(',')
const extra = process.argv[5] ?? ''
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ ...DEVICES[dev], deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
page.on('pageerror', e => console.error('[pageerror]', e.message))
for (const s of sections) {
  await page.goto(`http://localhost:5173/?theme=graphite&section=${s}${extra}`)
  await page.waitForTimeout(7000)
  await page.screenshot({ path: resolve(out, `${dev}-${s}.png`), timeout: 90000 })
  console.log('shot', dev, s)
}
await browser.close()
