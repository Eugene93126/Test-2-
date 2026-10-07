import { canvas, ctx2d, cached, copyInto } from './canvas'
import { paperBase } from './paper'
import { fbm, rng } from '../lib/rand'
import { TEXT } from '../lib/timeline'

// The Columbus incident report: letterhead, typewritten lines, a hand-inked
// ellipse around "desync", and later the Gatepoint seal.

export const REPORT_MM = { w: 210, h: 297 }
export const REPORT_PPMM = 9
const INK = '#1E252B'
const PRINT = '#3A4650'
const PEN = '#1B2A3C'
export const SEAL_INK = '#2A4560'

const LEFT = 24
const LINES = {
  header: 18, rule: 21.5, title: 36, units: 48, duration: 55, cause: 62, status: 69,
  seqHead: 86, seq: [95, 102, 109, 116, 123], reviewed: 262,
}
const SEQ: [string, number[]?][] = [
  ['09:12  Fleet weight update 2033.03.14-r2 sent to Gatepoint CBUS-2.'],
  ['09:14  Dock rejects update: signature ██████████ mismatch.', [36, 46]],
  ['09:14  Reflex units keep prior weights; Core plans on the new ones.'],
  ['09:15  ███ units hold position in safe mode. No contact events.', [7, 10]],
  ['09:55  Update re-signed and reconciled at dock. Units resume.'],
]

/** Where "desync" sits, in page millimetres (for the ellipse and the pen). */
export const DESYNC = (() => {
  const line = TEXT.report[3]
  const i = line.indexOf(TEXT.circled)
  const adv = 2.54 // Courier at 10 characters per inch
  return { x0: LEFT + i * adv, x1: LEFT + (i + TEXT.circled.length) * adv, y: LINES.cause }
})()

export const SEAL = { x: 158, y: 99, r: 20, rot: -9 }

function typeLine(g: CanvasRenderingContext2D, s: string, xmm: number, ymm: number, r: () => number, sizePt = 12, bold = false) {
  const p = REPORT_PPMM
  const em = sizePt * 0.3528 * p
  g.font = `${bold ? 700 : 400} ${em}px "Courier Prime"`
  g.textBaseline = 'alphabetic'
  const adv = 0.6 * em
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === ' ') continue
    if (ch === '█') {
      // Redaction: a marker bar, not a glyph.
      g.fillStyle = 'rgba(16,19,22,0.92)'
      const x = (xmm * p) + i * adv - adv * 0.08
      g.fillRect(x, ymm * p - em * 0.72 + (r() - 0.5) * 0.6, adv * 1.18, em * 0.86)
      continue
    }
    // A typewriter: each strike lands a little differently.
    const a = 0.8 + r() * 0.17
    const dx = (r() - 0.5) * 0.18 * p, dy = (r() - 0.5) * 0.22 * p
    g.fillStyle = INK
    g.globalAlpha = a
    g.shadowColor = 'rgba(30,37,43,0.35)'
    g.shadowBlur = 0.12 * p
    g.fillText(ch, xmm * p + i * adv + dx, ymm * p + dy)
    if (r() < 0.05) { g.globalAlpha = a * 0.35; g.fillText(ch, xmm * p + i * adv + dx + 0.12 * p, ymm * p + dy) }
  }
  g.globalAlpha = 1
  g.shadowBlur = 0
}

/** Paper plus everything printed and typed on it. Built once. */
export function reportBase() {
  return cached('report-base', () => {
    const p = REPORT_PPMM
    const paper = paperBase('report', REPORT_MM.w, REPORT_MM.h, { base: '#EEF0EF', mottle: 0.55, fibers: 0.35, grain: 6, ppmm: p }, 3)
    const c = canvas(paper.width, paper.height)
    const g = copyInto(c, paper)
    const r = rng(2033)

    // Letterhead, offset-printed.
    g.fillStyle = PRINT
    g.font = `600 ${2.7 * p}px "Instrument Sans"`
    g.letterSpacing = `${0.55 * p}px`
    g.fillText(TEXT.reportHeader, LEFT * p, LINES.header * p)
    g.textAlign = 'right'
    g.font = `500 ${2.5 * p}px "JetBrains Mono"`
    g.letterSpacing = `${0.2 * p}px`
    g.fillText(TEXT.reportFile, (REPORT_MM.w - LEFT) * p, LINES.header * p)
    g.textAlign = 'left'
    g.letterSpacing = '0px'
    g.fillRect(LEFT * p, LINES.rule * p, (REPORT_MM.w - 2 * LEFT) * p, 0.28 * p)

    // Typed.
    const L = TEXT.report
    typeLine(g, L[0], LEFT, LINES.title, r, 12, true)
    typeLine(g, L[1], LEFT, LINES.units, r)
    typeLine(g, L[2], LEFT, LINES.duration, r)
    typeLine(g, L[3], LEFT, LINES.cause, r)
    typeLine(g, L[4], LEFT, LINES.status, r)
    typeLine(g, 'SEQUENCE OF EVENTS', LEFT, LINES.seqHead, r, 10.5, true)
    g.fillStyle = INK
    g.globalAlpha = 0.8
    g.fillRect(LEFT * p, (LINES.seqHead + 1.1) * p, 18 * 2.22 * p, 0.25 * p)
    g.globalAlpha = 1
    SEQ.forEach(([s], i) => typeLine(g, s, LEFT, LINES.seq[i], r, 10.5))

    // The sign-off box near the foot of the page.
    typeLine(g, 'REVIEWED BY ____________________   DATE __________', LEFT, LINES.reviewed, r, 10.5)
    typeLine(g, 'Page 1 of 4', REPORT_MM.w - LEFT - 25, 285, r, 9)
    return c
  })
}

/** The ink ellipse: a hand-drawn loop with overshoot, as page-mm points. */
export const ELLIPSE = (() => {
  const cx = (DESYNC.x0 + DESYNC.x1) / 2, cy = DESYNC.y - 1.3
  const rx = (DESYNC.x1 - DESYNC.x0) / 2 + 4.6, ry = 4.7
  const tilt = -0.07
  const pts: { x: number; y: number; w: number }[] = []
  const n = 220
  // Starts and ends on the right of the word, so the pen lifts away without hiding it.
  const a0 = Math.PI * 0.08, sweep = Math.PI * 2 * 1.13
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = a0 - sweep * t
    // A hand's loop: slightly spiralled, wobbling radius.
    const wob = 1 + (fbm(t * 6, 1.3, 9, 3) - 0.5) * 0.12 + t * 0.07
    const x0 = Math.cos(a) * rx * wob, y0 = Math.sin(a) * ry * wob
    const x = cx + x0 * Math.cos(tilt) - y0 * Math.sin(tilt)
    const y = cy + x0 * Math.sin(tilt) + y0 * Math.cos(tilt)
    // Pen pressure: thin in, full in the middle, lifting out.
    const w = 0.42 + 0.3 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) - 0.32 * Math.max(0, (t - 0.86) / 0.14)
    pts.push({ x, y, w })
  }
  return pts
})()

export function ellipseTip(p: number) {
  const i = Math.min(ELLIPSE.length - 1, Math.max(0, Math.round(p * (ELLIPSE.length - 1))))
  return ELLIPSE[i]
}

/** The ellipse's own little canvas, so the bleed is blurred once, not per stroke. */
const ELLIPSE_BOX = (() => {
  const xs = ELLIPSE.map(p => p.x), ys = ELLIPSE.map(p => p.y)
  const pad = 4
  return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 }
})()
let ellipseCanvas: HTMLCanvasElement | null = null

function drawEllipse(g: CanvasRenderingContext2D, prog: number, bleed: number) {
  const p = REPORT_PPMM
  const n = Math.floor(prog * (ELLIPSE.length - 1))
  if (n < 1) return
  const B = ELLIPSE_BOX
  if (!ellipseCanvas) ellipseCanvas = canvas(B.w * p, B.h * p)
  const e = ctx2d(ellipseCanvas)
  e.clearRect(0, 0, ellipseCanvas.width, ellipseCanvas.height)
  e.lineCap = 'round'
  e.lineJoin = 'round'
  e.strokeStyle = PEN
  const stroke = (extra: number) => {
    for (let i = 1; i <= n; i++) {
      const a = ELLIPSE[i - 1], b = ELLIPSE[i]
      e.lineWidth = (b.w + extra) * p
      e.beginPath(); e.moveTo((a.x - B.x) * p, (a.y - B.y) * p); e.lineTo((b.x - B.x) * p, (b.y - B.y) * p); e.stroke()
    }
  }
  // Bleed: ink wicking into the fibres, a soft halo that grows a little.
  stroke(0.25)
  g.save()
  g.filter = `blur(${(0.18 + bleed * 0.25) * p}px)`
  g.globalAlpha = 0.28 + bleed * 0.12
  g.drawImage(ellipseCanvas, B.x * p, B.y * p)
  g.restore()
  e.clearRect(0, 0, ellipseCanvas.width, ellipseCanvas.height)
  stroke(0)
  g.globalAlpha = 0.9
  g.drawImage(ellipseCanvas, B.x * p, B.y * p)
  g.globalAlpha = 1
}

/** The seal, drawn once as crisp ink with an uneven impression. */
function sealInk() {
  return cached('seal-ink', () => {
    const p = REPORT_PPMM
    const R = SEAL.r * p
    const S = Math.ceil(R * 2 + 6 * p)
    const c = canvas(S, S)
    const g = ctx2d(c)
    g.translate(S / 2, S / 2)
    g.fillStyle = g.strokeStyle = SEAL_INK
    g.lineWidth = 1.15 * p
    g.beginPath(); g.arc(0, 0, R - 0.6 * p, 0, Math.PI * 2); g.stroke()
    g.lineWidth = 0.5 * p
    g.beginPath(); g.arc(0, 0, R - 6.9 * p, 0, Math.PI * 2); g.stroke()
    // Ring text, set around the circle.
    const ring = TEXT.sealRing + ' '
    g.font = `600 ${3.5 * p}px "Instrument Sans"`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const rr = R - 3.8 * p
    const widths = [...ring].map(ch => g.measureText(ch).width)
    const total = widths.reduce((s, w) => s + w, 0)
    const track = (Math.PI * 2 * rr - total) / ring.length
    let ang = -Math.PI / 2
    ;[...ring].forEach((ch, i) => {
      const w = widths[i] + track
      const mid = ang + (w / 2) / rr
      g.save(); g.rotate(mid + Math.PI / 2); g.translate(0, -rr); g.fillText(ch, 0, 0); g.restore()
      ang += w / rr
    })
    g.font = `700 ${5.6 * p}px "Instrument Sans"`
    g.letterSpacing = `${0.55 * p}px`
    g.fillText(TEXT.sealCenter, 0.25 * p, 0.3 * p)
    g.letterSpacing = '0px'
    g.lineWidth = 0.35 * p
    g.beginPath(); g.moveTo(-6 * p, 4.6 * p); g.lineTo(6 * p, 4.6 * p); g.stroke()
    g.beginPath(); g.moveTo(-6 * p, -4.2 * p); g.lineTo(6 * p, -4.2 * p); g.stroke()

    // Uneven pressure: ink thins toward one side and breaks up in specks.
    const img = g.getImageData(0, 0, S, S)
    const d = img.data
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const k = (y * S + x) * 4 + 3
      if (!d[k]) continue
      const u = x / S, v = y / S
      const press = 0.78 + 0.22 * (1 - u * 0.7 - v * 0.3)
      const speck = fbm(x / (0.35 * p), y / (0.35 * p), 41, 3)
      const coarse = fbm(x / (3 * p), y / (3 * p), 43, 3)
      let a = d[k] / 255 * press
      if (speck < 0.32 + (1 - press) * 0.4) a *= 0.25
      a *= 0.75 + coarse * 0.35
      d[k] = Math.max(0, Math.min(255, a * 255))
    }
    g.putImageData(img, 0, 0)
    return c
  })
}

export interface ReportState {
  ellipse: number
  bleed: number
  /** -1 = not stamped; 0..1 = ink spreading after impact. */
  seal: number
}

const frameCanvas = new Map<string, HTMLCanvasElement>()
/** The page for one frame. */
export function paintReport(s: ReportState) {
  const base = reportBase()
  let c = frameCanvas.get('report')
  if (!c) { c = canvas(base.width, base.height); frameCanvas.set('report', c) }
  const g = copyInto(c, base)
  drawEllipse(g, s.ellipse, s.bleed)
  if (s.seal >= 0) {
    const ink = sealInk()
    const p = REPORT_PPMM
    g.save()
    g.translate(SEAL.x * p, SEAL.y * p)
    g.rotate((SEAL.rot * Math.PI) / 180)
    // Spread: a soft wick under the crisp impression, growing as the ink settles.
    g.globalCompositeOperation = 'multiply'
    g.filter = `blur(${(0.15 + s.seal * 0.35) * p}px)`
    g.globalAlpha = 0.35 + 0.25 * s.seal
    g.drawImage(ink, -ink.width / 2, -ink.height / 2)
    g.filter = 'none'
    g.globalAlpha = 0.9
    g.drawImage(ink, -ink.width / 2, -ink.height / 2)
    g.restore()
  }
  return c
}
