import { staticFile } from 'remotion'

// OFL fonts from github.com/google/fonts, shipped in public/fonts.
const FACES: [string, string, FontFaceDescriptors?][] = [
  ['Newsreader', 'fonts/Newsreader.ttf', { weight: '200 800' }],
  ['Courier Prime', 'fonts/CourierPrime-Regular.ttf', { weight: '400' }],
  ['Courier Prime', 'fonts/CourierPrime-Bold.ttf', { weight: '700' }],
  ['JetBrains Mono', 'fonts/JetBrainsMono.ttf', { weight: '100 800' }],
  ['Instrument Sans', 'fonts/InstrumentSans.ttf', { weight: '400 700', stretch: '75% 100%' }],
]

let loading: Promise<void> | null = null
export function loadFonts() {
  if (!loading) {
    loading = Promise.all(FACES.map(async ([family, file, desc]) => {
      const f = new FontFace(family, `url(${staticFile(file)})`, desc)
      await f.load()
      document.fonts.add(f)
    })).then(() => undefined)
  }
  return loading
}
