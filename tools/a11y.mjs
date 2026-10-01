// Accessibility audit with axe-core across sections (contrast is checked by
// hand: axe can't see the WebGL city behind the glass).
// usage: node tools/a11y.mjs <path to axe.min.js> [sections]
import { chromium } from 'playwright-core'
const axePath = process.argv[2]
const sections = (process.argv[3] ?? 'chat,circle,world,code,home,memory,trust').split(',')
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const seen = new Map()
for (const s of sections) {
  await page.goto(`http://localhost:5173/?section=${s}`)
  await page.waitForTimeout(5000)
  await page.addScriptTag({ path: axePath })
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { rules: { 'color-contrast': { enabled: false } } })
    return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join(' ')) }))
  })
  for (const v of res) {
    const k = v.id
    if (!seen.has(k)) seen.set(k, { ...v, sections: [s] })
    else seen.get(k).sections.push(s)
  }
}
for (const v of seen.values()) console.log(`[${v.impact}] ${v.id}: ${v.help} (${v.sections.join(',')})\n   ` + v.nodes.join('\n   '))
if (!seen.size) console.log('no violations')
await browser.close()
