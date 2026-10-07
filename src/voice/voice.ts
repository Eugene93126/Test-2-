import { create } from 'zustand'
import { useApp } from '../state/store'
import { modelById } from '../data/models'

// Voice mode for Chat. The conversation is scripted (there is no live model
// behind the prototype); the waveform can follow your real microphone.
//   idle -> listening (your words appear) -> thinking -> speaking -> idle

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface Message {
  id: string
  from: 'you' | 'claude'
  caption?: string
  text: string
  /** Words revealed so far (streaming). */
  shown: number
  clip?: boolean
}

const ASK = 'Queue the chapter 4 reconciliation on Pantheon tonight, and make a 20-second clip of the warehouse sim for Dr. Okafor.'
const REPLY = (model: string) =>
  `Done. Chapter 4 is queued on Pantheon for 1:00 AM, when power drops to 11.8¢; first results by breakfast. The clip is rendering on ${model === 'Fable Duo 4.1' ? 'Fable Duo' : model} now: aisle-level camera, physics from your sim's own parameters.`

interface VoiceState {
  phase: VoicePhase
  messages: Message[]
  /** kJ spent by replies in this session; added to the HUD meter. */
  spentKJ: number
  start: () => void
  stop: () => void
}

let timers: number[] = []
const later = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)) }
const words = (s: string) => s.split(' ').length

export const useVoice = create<VoiceState>()((set, get) => ({
  phase: 'idle',
  messages: [],
  spentKJ: 0,
  start: () => {
    if (get().phase !== 'idle') return
    const id = `m${Date.now()}`
    set(s => ({ phase: 'listening', messages: [...s.messages, { id: `${id}-you`, from: 'you', caption: 'Voice · live', text: ASK, shown: 0 }] }))
    // Your words arrive at speaking pace (about 2.6 words per second).
    const n = words(ASK)
    for (let i = 1; i <= n; i++) later(i * 380 + (i > 8 ? 260 : 0), () => reveal(`${id}-you`, i))
    later(n * 380 + 700, () => get().stop())
  },
  stop: () => {
    const s = get()
    if (s.phase !== 'listening') return
    timers.forEach(t => window.clearTimeout(t)); timers = []
    const you = s.messages[s.messages.length - 1]
    set({ phase: 'thinking', messages: s.messages.map(m => (m.id === you.id ? { ...m, shown: words(m.text), caption: 'Voice · transcribed' } : m)) })
    const model = modelById(useApp.getState().model).name
    const text = REPLY(model)
    const rid = `${you.id}-claude`
    later(900, () => {
      set(st => ({ phase: 'speaking', messages: [...st.messages, { id: rid, from: 'claude', caption: `${model} · queued on Pantheon, rendered on Fable Duo`, text, shown: 0, clip: true }] }))
      const n = words(text)
      for (let i = 1; i <= n; i++) later(i * 70, () => reveal(rid, i))
      later(n * 70 + 400, () => set(st => ({ phase: 'idle', spentKJ: st.spentKJ + 3.7 })))
    })
  },
}))

function reveal(id: string, shown: number) {
  useVoice.setState(s => ({ messages: s.messages.map(m => (m.id === id ? { ...m, shown } : m)) }))
}

// ---------- voice level: simulated, or your microphone ----------

export const voiceLevel = { value: 0, mic: false }
let analyser: AnalyserNode | null = null
let buf: Float32Array<ArrayBuffer> | null = null

export async function enableMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const ctx = new AudioContext()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    buf = new Float32Array(analyser.fftSize)
    ctx.createMediaStreamSource(stream).connect(analyser)
    voiceLevel.mic = true
    return true
  } catch {
    voiceLevel.mic = false
    return false
  }
}

/** Call once per frame. Returns 0..1. */
export function sampleLevel(time: number) {
  const phase = useVoice.getState().phase
  let target = 0
  if (analyser && buf && phase === 'listening') {
    analyser.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    target = Math.min(1, Math.sqrt(sum / buf.length) * 7)
  } else if (phase === 'listening' || phase === 'speaking') {
    // Syllables: a quick pulse train under a slower phrase envelope.
    const syl = Math.max(0, Math.sin(time * 13.0) * 0.6 + Math.sin(time * 7.3 + 1.2) * 0.4)
    const phrase = 0.55 + 0.45 * Math.sin(time * 1.7)
    target = (phase === 'speaking' ? 0.55 : 0.8) * syl * phrase + 0.08
  } else if (phase === 'thinking') {
    target = 0.18 + 0.08 * Math.sin(time * 6)
  }
  voiceLevel.value += (target - voiceLevel.value) * 0.25
  return voiceLevel.value
}
