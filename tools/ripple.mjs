// Burst of frames after pressing a non-focusing card, to see the ripple travel.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', e => console.error('[pageerror]', e.message))
await page.goto('http://localhost:5173/?theme=glass')
await page.waitForTimeout(6000)
const card = await page.locator('[data-panel="glance-tonight"]').boundingBox()
const x = card.x + card.width * 0.45, y = card.y + card.height * 0.6
await page.screenshot({ path: resolve(out, 'r0.png'), clip: { x: card.x - 20, y: card.y - 20, width: card.width + 40, height: card.height + 40 } })
await page.mouse.move(x, y, { steps: 4 })
await page.waitForTimeout(400)
await page.screenshot({ path: resolve(out, 'r1.png'), clip: { x: card.x - 20, y: card.y - 20, width: card.width + 40, height: card.height + 40 } })
await page.evaluate(() => { window.__rippleAge = 0.12 })
await page.mouse.down(); await page.mouse.up()
for (let i = 2; i < 5; i++) {
  await page.evaluate(a => { window.__rippleAge = a }, [0.12, 0.3, 0.55][i - 2])
  await page.waitForTimeout(2200)
  await page.screenshot({ path: resolve(out, `r${i}.png`), clip: { x: card.x - 20, y: card.y - 20, width: card.width + 40, height: card.height + 40 } })
}
await browser.close()
console.log('done')
