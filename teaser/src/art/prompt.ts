import { canvas, ctx2d } from './canvas'
import { TEXT } from '../lib/timeline'

// The glass prompt card's screen: the instruction that made this film.
// Transparent background; drawn onto a plane just inside the glass.

export const PROMPT_MM = { w: 300, h: 112 }
const P = 8
const SLATE = '#141A20'
const STEEL = '#55636C'

let c: HTMLCanvasElement | null = null
export function paintPrompt(typed: number, caretOn: boolean) {
  if (!c) c = canvas(PROMPT_MM.w * P, PROMPT_MM.h * P)
  const g = ctx2d(c)
  g.clearRect(0, 0, c.width, c.height)
  g.textBaseline = 'alphabetic'
  // The display layer inside the glass: milky, inset from a clear polished rim.
  g.fillStyle = 'rgba(241,245,245,0.9)'
  g.beginPath(); g.roundRect(3.2 * P, 3.2 * P, (PROMPT_MM.w - 6.4) * P, (PROMPT_MM.h - 6.4) * P, 1.6 * P); g.fill()
  // Model chip, with the prototype's original lens glyph.
  const gx = 16 * P, gy = 17 * P
  g.strokeStyle = SLATE
  g.lineWidth = 0.55 * P
  g.beginPath(); g.arc(gx, gy, 3.1 * P, 0, Math.PI * 2); g.stroke()
  g.fillStyle = SLATE
  g.beginPath(); g.arc(gx + 0.9 * P, gy - 0.6 * P, 1.05 * P, 0, Math.PI * 2); g.fill()
  g.font = `600 ${4.3 * P}px "Instrument Sans"`
  g.fillText(TEXT.promptModel, gx + 6 * P, gy + 1.5 * P)
  const w = g.measureText(TEXT.promptModel).width
  g.font = `500 ${3.1 * P}px "Instrument Sans"`
  const tag = TEXT.promptClass
  const tw = g.measureText(tag).width
  g.strokeStyle = STEEL
  g.lineWidth = 0.3 * P
  g.beginPath(); g.roundRect(gx + 6 * P + w + 3 * P, gy - 3.2 * P, tw + 5 * P, 6.2 * P, 3.1 * P); g.stroke()
  g.fillStyle = STEEL
  g.fillText(tag, gx + 6 * P + w + 5.5 * P, gy + 1.05 * P)

  // The prompt, typed.
  const full = TEXT.prompt
  const split = full.indexOf('Use')
  const lines = [full.slice(0, split).trim(), full.slice(split)]
  const n = Math.round(typed * full.length)
  g.fillStyle = SLATE
  g.font = `400 ${9.2 * P}px "Newsreader"`
  let left = n
  let caret: [number, number] = [16 * P, 46 * P]
  lines.forEach((ln, i) => {
    const s = ln.slice(0, Math.max(0, left))
    left -= ln.length + 1
    const y = (46 + i * 13) * P
    g.fillText(s, 16 * P, y)
    if (s.length || i === 0) caret = [16 * P + g.measureText(s).width, y]
  })
  if (caretOn) { g.fillRect(caret[0] + 1.2 * P, caret[1] - 7.4 * P, 0.55 * P, 9 * P) }

  // Bottom row: what the model can touch here, and send.
  g.font = `500 ${3.3 * P}px "Instrument Sans"`
  const chips = ['＋', 'Core', 'Reflex · 2 hands', 'Gatepoint CHI-07']
  let x = 16 * P
  const y = (PROMPT_MM.h - 15) * P
  for (const ch of chips) {
    const cw = g.measureText(ch).width + 7 * P
    g.strokeStyle = 'rgba(20,26,32,0.28)'
    g.lineWidth = 0.3 * P
    g.beginPath(); g.roundRect(x, y - 5 * P, cw, 7.6 * P, 3.8 * P); g.stroke()
    g.fillStyle = STEEL
    g.fillText(ch, x + 3.5 * P, y + 0.4 * P)
    x += cw + 2.4 * P
  }
  const sx = (PROMPT_MM.w - 20) * P, sy = y - 1.2 * P
  g.fillStyle = SLATE
  g.beginPath(); g.arc(sx, sy, 6 * P, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#E9EEF0'
  g.lineWidth = 0.75 * P
  g.lineCap = 'round'
  g.beginPath(); g.moveTo(sx, sy + 3 * P); g.lineTo(sx, sy - 2.8 * P); g.moveTo(sx - 2.6 * P, sy - 0.4 * P); g.lineTo(sx, sy - 3 * P); g.lineTo(sx + 2.6 * P, sy - 0.4 * P); g.stroke()
  return c
}
