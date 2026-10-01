// Rough cost comparison between quality tiers. SwiftShader renders on the CPU,
// so its frame time scales with the GPU work each tier asks for. Not a real
// device number: use the in-app perf meter (backtick key) on hardware.
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
page.on('pageerror', e => console.error('[pageerror]', e.message))
page.on('console', m => { if (m.type() === 'error' || m.text().includes('THREE.WebGLProgram')) console.log('[console]', m.text().slice(0, 300)) })
for (const q of (process.argv[2] ?? 'high,low').split(',')) {
  await page.goto(`http://localhost:5173/?quality=${q}&focus=1`)
  await page.waitForTimeout(9000)
  const r = await page.evaluate(() => new Promise(res => {
    const t0 = performance.now(); let n = 0
    const f = () => { n++; if (performance.now() - t0 < 15000) requestAnimationFrame(f); else res({ n, ms: (performance.now() - t0) / n, q: document.documentElement.dataset.quality }) }
    requestAnimationFrame(f)
  }))
  console.log(q, JSON.stringify(r))
}
await browser.close()
