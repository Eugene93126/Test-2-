// iPhone 11: Code, Home, Memory, Trust.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
page.on('pageerror', e => console.error('[pageerror]', e.message))
for (const s of ['code', 'home', 'memory', 'trust']) {
  await page.goto(`http://localhost:5173/?theme=graphite&section=${s}`)
  await page.waitForTimeout(7000)
  await page.screenshot({ path: resolve(out, `phone-${s}.png`), timeout: 90000 })
  console.log('shot', s)
}
await browser.close()
