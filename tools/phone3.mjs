// iPhone 11 viewport: model picker and Dock customization.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
page.on('pageerror', e => console.error('[pageerror]', e.message))
await page.goto('http://localhost:5173/?theme=dusk')
await page.waitForTimeout(7000)
await page.tap('#model-chip')
await page.waitForTimeout(5000)
await page.screenshot({ path: resolve(out, 'phone-models.png') })
await page.tap('.model-row:has-text("Odyssey")')
await page.waitForTimeout(3000)
await page.screenshot({ path: resolve(out, 'phone-odyssey.png') })
await page.tap('.model-close')
await page.waitForTimeout(4000)
await page.tap('button[aria-label="Customize Dock"]')
await page.waitForTimeout(5000)
await page.screenshot({ path: resolve(out, 'phone-dock.png') })
await browser.close()
console.log('done')
