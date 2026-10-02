import { canvas, copyInto, cached } from './canvas'
import { paperBase } from './paper'
import { BODY_DRAW } from './bodies'

// CrossBody-12 cards: slate cardstock, one body each in white ink, an index.

export const CARD_MM = { w: 152, h: 102 }
const P = 8

export function paintCard(i: number, body: string) {
  return cached(`card:${i}`, () => {
    const base = paperBase('card', CARD_MM.w, CARD_MM.h, { base: '#232B32', mottle: 0.5, fibers: 0.5, grain: 7, ppmm: P }, 11)
    const c = canvas(base.width, base.height)
    const g = copyInto(c, base)
    // The drawing: 200 × 130 units into the card, centred.
    const k = (CARD_MM.w * 0.62 * P) / 200
    g.save()
    g.translate((CARD_MM.w * P - 200 * k) / 2, (CARD_MM.h * P - 130 * k) / 2 - 3 * P)
    g.scale(k, k)
    g.strokeStyle = g.fillStyle = '#E9EFF2'
    g.lineWidth = (0.42 * P) / k
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.shadowColor = 'rgba(233,239,242,0.25)'
    g.shadowBlur = 0.4 * P
    BODY_DRAW[body](g)
    g.restore()
    // Index, bottom-left; a tiny archive label, top-left.
    g.fillStyle = '#9DA9B1'
    g.font = `500 ${3.6 * P}px "JetBrains Mono"`
    g.letterSpacing = `${0.3 * P}px`
    g.fillText(`${String(i + 1).padStart(2, '0')}/12`, 7 * P, (CARD_MM.h - 7) * P)
    g.font = `500 ${2.1 * P}px "JetBrains Mono"`
    g.fillStyle = '#6D7A83'
    g.letterSpacing = `${0.35 * P}px`
    g.fillText('CROSSBODY-12', 7 * P, 9.5 * P)
    g.letterSpacing = '0px'
    return c
  })
}
