// Phase 5 sections: Code, Home, Memory, Trust (desktop), with one interaction each.
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const theme = process.argv[3] ?? 'glass'
const only = process.argv[4]
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', e => console.error('[pageerror]', e.message))
page.on('console', m => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 300)) })
const shot = async (name, wait = 2500) => { await page.waitForTimeout(wait); await page.screenshot({ timeout: 90000, path: resolve(out, `${name}.png`) }); console.log('shot', name) }
const click = sel => page.click(sel, { force: true })
const sections = only ? [only] : ['code', 'home', 'memory', 'trust']
for (const s of sections) {
  await page.goto(`http://localhost:5173/?theme=${theme}&section=${s}`)
  await page.waitForTimeout(6500)
  await page.mouse.move(10, 880)
  await shot(s, 2500)
  if (s === 'code') { await click('.ghost-btn:has-text("Run swarm again")'); await shot('code-run', 7000) }
  if (s === 'home') { await click('.dev-switch >> nth=1'); const b = await page.locator('.bar-slot >> nth=2').boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height - 6); await shot('home-hover', 2500) }
  if (s === 'memory') { await click('.quarantine .ghost-btn'); await click('.mem-main >> nth=0'); await shot('memory-open', 3500); await click('.mem .ghost-btn:has-text("Forget") >> nth=2'); await shot('memory-forget', 3000) }
  if (s === 'trust') { await click('.pill-btn:has-text("Check provenance")'); await shot('trust-check', 7000) }
}
await browser.close()
