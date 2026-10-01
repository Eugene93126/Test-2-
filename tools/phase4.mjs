// Phase 4 sections: Circle (skills, debate) and World (grid, unsigned + provenance).
import { chromium } from 'playwright-core'
import { resolve } from 'node:path'
const out = resolve(process.argv[2])
const theme = process.argv[3] ?? 'glass'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', e => console.error('[pageerror]', e.message))
page.on('console', m => { if (m.type() === 'error') console.log('[error]', m.text().slice(0, 300)) })
const shot = async (name, wait = 2500) => { await page.waitForTimeout(wait); await page.screenshot({ path: resolve(out, `${name}.png`) }); console.log('shot', name) }
const click = sel => page.click(sel, { force: true })
await page.goto(`http://localhost:5173/?theme=${theme}&section=circle`)
await page.waitForTimeout(6000)
await page.mouse.move(10, 880)
await shot('circle-skills', 3000)
await page.hover('.tree .node.learning >> nth=2', { force: true }).catch(() => {})
await click('.seg-btn:has-text("Debate arena")')
await page.waitForTimeout(6000)
await click('.pill-btn:has-text("Next round")')
await page.waitForTimeout(5500)
await click('.pill-btn:has-text("Next round")')
await shot('circle-debate', 6000)
await click('button[aria-label="Claude World"]')
await shot('world', 4500)
await click('.switch')
await page.waitForTimeout(2500)
await click('.tile.unsigned')
await shot('world-unsigned', 3500)
await browser.close()
