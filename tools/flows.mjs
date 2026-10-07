// Circle flows, gaze collapse, and walking (distance mapping).
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const theme = process.argv[3] ?? 'glass'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', e => console.error('[pageerror]', e.message))
page.on('console', m => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 300)) })
const shot = async (name, wait = 2500, clip) => { await page.waitForTimeout(wait); await page.screenshot({ path: resolve(out, `${name}.png`), clip }); console.log('shot', name) }
const click = sel => page.click(sel, { force: true })
await page.goto(`http://localhost:5173/?theme=${theme}&section=circle`)
await page.waitForTimeout(7000)
// Gaze on the Ada card: it collapses out of superposition.
const ada = await page.locator('.agent-card >> nth=1').boundingBox()
await page.mouse.move(ada.x + ada.width / 2, ada.y + ada.height / 2)
await shot('circle', 3000)
const main = await page.locator('.main').boundingBox()
await shot('circle-zoom', 200, { x: main.x, y: main.y + 60, width: main.width, height: main.height * 0.62 })
const sparks = await page.locator('.spark').count()
const anims = await page.evaluate(() => document.getAnimations().length)
console.log('sparks', sparks, 'animations', anims)
await click('.agent-card >> nth=0')
await shot('circle-brian', 3500, { x: main.x, y: main.y + 60, width: main.width, height: main.height * 0.62 })
await click('.seg-btn:has-text("Debate arena")')
await page.waitForTimeout(3800)
await shot('debate', 600, { x: main.x, y: main.y + 60, width: main.width, height: 260 })
// Walk back a meter: smaller, bolder text, focus follows.
await page.mouse.move(main.x + main.width / 2, 860)
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 150); await page.waitForTimeout(100) }
await shot('walk-back', 6000)
const stroke = await page.evaluate(() => getComputedStyle(document.querySelector('.main')).getPropertyValue('--q-stroke'))
console.log('stroke', stroke)
await browser.close()
