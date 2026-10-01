// iPhone 11: Circle and World.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
page.on('pageerror', e => console.error('[pageerror]', e.message))
for (const [name, q] of [['phone-circle', 'section=circle'], ['phone-world', 'section=world'], ['phone-chat', 'section=chat']]) {
  await page.goto(`http://localhost:5173/?theme=graphite&${q}`)
  await page.waitForTimeout(7000)
  await page.screenshot({ path: resolve(out, `${name}.png`) })
}
await browser.close()
console.log('done')
