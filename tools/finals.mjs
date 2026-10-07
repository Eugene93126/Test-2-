// Final screenshot set: every section on a laptop, every theme, and the phone.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const run = async (name, vp, url, mobile = false) => {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.error('[pageerror]', name, e.message))
  await page.goto(`http://localhost:5173/?${url}`)
  await page.waitForTimeout(7500)
  await page.screenshot({ path: resolve(out, `${name}.png`), timeout: 90000 })
  await ctx.close()
  console.log('shot', name)
}
const desk = { width: 1440, height: 900 }
for (const s of ['chat', 'circle', 'world', 'code', 'home', 'memory', 'trust']) await run(`desk-${s}`, desk, `theme=glass&section=${s}&focus=1`)
for (const t of ['paper', 'graphite', 'dusk', 'kiln']) await run(`theme-${t}`, desk, `theme=${t}&section=chat&focus=1`)
for (const s of ['chat', 'circle', 'code', 'home']) await run(`phone-${s}`, { width: 414, height: 896 }, `theme=glass&section=${s}`, true)
await browser.close()
