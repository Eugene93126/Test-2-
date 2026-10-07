// iPhone 11 viewport: 414x896 at 2x, touch. Shots: rest, tapped main, review menu open.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const theme = process.argv[3] ?? 'glass'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
page.on('pageerror', e => console.error('[pageerror]', e.message))
await page.goto(`http://localhost:5173/?theme=${theme}`)
await page.waitForTimeout(7000)
await page.screenshot({ path: resolve(out, `phone-${theme}.png`) })
await page.tap('[data-panel="main"] .main-body')
await page.waitForTimeout(3500)
await page.screenshot({ path: resolve(out, `phone-${theme}-focus.png`) })
await page.tap('.review-button')
await page.waitForTimeout(1500)
await page.screenshot({ path: resolve(out, `phone-${theme}-review.png`) })
await browser.close()
console.log('done')
