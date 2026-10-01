import { useApp } from '../state/store'

// Superposition: interactive elements you aren't looking at shimmer with a soft,
// wave-like aura. When your gaze lands on one, it collapses into a crisp,
// raised, tactile button. Gaze is the pointer on a laptop, the center of view
// when the motion sensor drives the glasses, and your finger on touch.

export const QUANTUM = [
  '.dock-item', '.model-chip', '.action', '.seg-btn', '.chip-btn', '.agent-card', '.tile', '.card-hit',
  '.pin', '.model-row', '.model-use', '.model-close', '.pill-btn', '.switch', '.ghost-btn',
].join(', ')

const gaze = { x: -1, y: -1, moved: false, frame: 0, touchUntil: 0 }
let observed: Element | null = null
let reticle: HTMLElement | null = null

export function installGaze() {
  const move = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    gaze.x = e.clientX; gaze.y = e.clientY; gaze.moved = true
  }
  const down = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    const el = (e.target as Element | null)?.closest(QUANTUM) ?? null
    observe(el)
    gaze.touchUntil = performance.now() + 700
  }
  const leave = () => { gaze.x = -1; gaze.y = -1; observe(null) }
  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('pointerdown', down, { passive: true })
  document.addEventListener('pointerleave', leave)
  reticle = document.createElement('div')
  reticle.className = 'reticle'
  reticle.setAttribute('aria-hidden', 'true')
  document.body.appendChild(reticle)
  return () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerdown', down)
    document.removeEventListener('pointerleave', leave)
    reticle?.remove()
  }
}

function observe(el: Element | null) {
  if (el === observed) return
  observed?.classList.remove('observed')
  el?.classList.add('observed')
  observed = el
  reticle?.classList.toggle('locked', !!el)
}

/** Once per frame from the render loop; hit-tests every other frame. */
export function stepGaze() {
  const gyro = useApp.getState().gyro === 'on'
  reticle?.classList.toggle('on', gyro)
  if (performance.now() < gaze.touchUntil) return
  if (++gaze.frame % 2) return
  let x = gaze.x, y = gaze.y
  if (gyro) { x = window.innerWidth / 2; y = window.innerHeight / 2 }
  else if (!gaze.moved) return
  gaze.moved = false
  if (x < 0) { observe(null); return }
  const el = document.elementFromPoint(x, y)?.closest(QUANTUM) ?? null
  observe(el)
}
