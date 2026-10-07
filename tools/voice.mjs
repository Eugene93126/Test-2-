// Chat voice flow: idle, listening, speaking, done with clip.
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
await page.waitForTimeout(1500)
await page.screenshot({ path: resolve(out, 'chat-idle.png') })
await page.click('.orb-button', { force: true })
await page.waitForTimeout(3800)
await page.screenshot({ path: resolve(out, 'chat-listening.png') })
await page.waitForTimeout(9000)
await page.screenshot({ path: resolve(out, 'chat-done.png') })
await browser.close()
console.log('done')
