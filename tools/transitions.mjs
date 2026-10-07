// Pinned frames of each model transition: node tools/transitions.mjs <outDir>
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
const run = async (name, row, ts) => {
  await page.evaluate(t => { window.__transitionT = t }, ts[0])
  await page.click('#model-chip', { force: true })
  await page.waitForTimeout(3000)
  await page.click(`.model-row:has-text("${row}")`, { force: true })
  await page.waitForTimeout(800)
  await page.click('.model-use', { force: true })
  for (const t of ts) {
    await page.evaluate(v => { window.__transitionT = v }, t)
    await page.waitForTimeout(2200)
    await page.screenshot({ path: resolve(out, `${name}-${t}.png`) })
  }
  await page.evaluate(() => { window.__transitionT = undefined })
  await page.waitForTimeout(4000)
  console.log('done', name)
}
await run('shatter', 'Pantheon 2.0', [0.38])
// merge checked earlier
// warp checked earlier
await browser.close()
