// Dock superposition and gaze collapse, desktop and phone.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/?theme=glass')
await page.waitForTimeout(6000)
const item = await page.locator('.dock-item >> nth=2').boundingBox()
await page.mouse.move(item.x + item.width / 2, item.y + 20)
await page.waitForTimeout(2500)
const dock = await page.locator('.dock').boundingBox()
await page.screenshot({ timeout: 90000, path: resolve(out, 'dock-gaze.png'), clip: { x: dock.x - 20, y: dock.y - 30, width: dock.width + 40, height: dock.height + 50 } })
await page.close()
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const phone = await ctx.newPage()
await phone.goto('http://localhost:5173/?theme=graphite&section=circle')
await phone.waitForTimeout(6000)
await phone.screenshot({ timeout: 90000, path: resolve(out, 'phone-dock.png'), clip: { x: 0, y: 780, width: 414, height: 116 } })
await browser.close()
console.log('done')
