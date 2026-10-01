// Five themes. Each sets the UI palette (CSS variables) and the lens: an
// electrochromic tint that grades the real world seen through the glasses.

export type ThemeId = 'paper' | 'graphite' | 'glass' | 'dusk' | 'kiln'
export type Vec3 = [number, number, number]

export interface LensGrade {
  exposure: number
  contrast: number
  saturation: number
  tint: Vec3 // multiplicative lens filter
  lift: Vec3 // added to shadows (haze, milky lenses)
  vignette: number
  grain: number
  bloom: number
}

export interface Theme {
  id: ThemeId
  label: string
  swatch: string
  description: string
  ui: Record<string, string>
  lens: LensGrade
}

// Anthropic palette anchors.
export const IVORY = '#FAF9F5'
export const SLATE = '#141413'
export const CLAY = '#D97757'

export const THEMES: Record<ThemeId, Theme> = {
  paper: {
    id: 'paper',
    label: 'Paper',
    swatch: IVORY,
    description: 'Clear lens, lifted and soft',
    ui: {
      '--ink': SLATE,
      '--ink-2': '#5E5D59',
      '--ink-3': '#64645F',
      '--accent': CLAY,
      '--accent-ink': '#A04B2A',
      '--surface': 'rgba(250, 249, 245, 0.74)',
      '--surface-strong': 'rgba(250, 249, 245, 0.88)',
      '--edge': 'rgba(255, 255, 255, 0.9)',
      '--hair': 'rgba(20, 20, 19, 0.12)',
      '--chip': 'rgba(20, 20, 19, 0.06)',
      '--chip-on': SLATE,
      '--chip-on-ink': IVORY,
      '--shadow': '0 18px 50px rgba(40, 34, 20, 0.22)',
    },
    lens: { exposure: 1.26, contrast: 0.94, saturation: 0.82, tint: [1.0, 0.975, 0.93], lift: [0.05, 0.047, 0.042], vignette: 0.26, grain: 0.028, bloom: 0.35 },
  },
  graphite: {
    id: 'graphite',
    label: 'Graphite',
    swatch: '#2A2A28',
    description: 'Smoked lens, low glare',
    ui: {
      '--ink': '#F0EEE6',
      '--ink-2': '#B0AEA5',
      '--ink-3': '#95948C',
      '--accent': CLAY,
      '--accent-ink': '#F0A27F',
      '--surface': 'rgba(28, 28, 26, 0.62)',
      '--surface-strong': 'rgba(24, 24, 22, 0.8)',
      '--edge': 'rgba(255, 255, 255, 0.14)',
      '--hair': 'rgba(255, 255, 255, 0.12)',
      '--chip': 'rgba(255, 255, 255, 0.07)',
      '--chip-on': '#F0EEE6',
      '--chip-on-ink': SLATE,
      '--shadow': '0 18px 50px rgba(0, 0, 0, 0.5)',
    },
    lens: { exposure: 0.62, contrast: 1.12, saturation: 0.55, tint: [0.92, 0.94, 0.97], lift: [0, 0, 0], vignette: 0.5, grain: 0.035, bloom: 0.5 },
  },
  glass: {
    id: 'glass',
    label: 'Glass',
    swatch: '#BFE3F2',
    description: 'Clear lens with an ice-blue clarity',
    ui: {
      '--ink': IVORY,
      '--ink-2': 'rgba(250, 249, 245, 0.8)',
      '--ink-3': 'rgba(250, 249, 245, 0.68)',
      '--accent': CLAY,
      '--accent-ink': '#FFC2A6',
      '--surface': 'rgba(255, 255, 255, 0.12)',
      '--surface-strong': 'rgba(28, 34, 48, 0.42)',
      '--edge': 'rgba(255, 255, 255, 0.42)',
      '--hair': 'rgba(255, 255, 255, 0.2)',
      '--chip': 'rgba(255, 255, 255, 0.1)',
      '--chip-on': IVORY,
      '--chip-on-ink': SLATE,
      '--shadow': '0 20px 60px rgba(10, 14, 30, 0.38)',
    },
    lens: { exposure: 1.02, contrast: 1.05, saturation: 0.98, tint: [0.93, 1.0, 1.06], lift: [0, 0.005, 0.012], vignette: 0.36, grain: 0.03, bloom: 0.45 },
  },
  dusk: {
    id: 'dusk',
    label: 'Dusk',
    swatch: '#E0915B',
    description: 'Amber lens, warm and low',
    ui: {
      '--ink': '#F7E9DE',
      '--ink-2': '#DCC0AD',
      '--ink-3': '#AC917F',
      '--accent': '#E0855E',
      '--accent-ink': '#F7B08D',
      '--surface': 'rgba(52, 30, 24, 0.56)',
      '--surface-strong': 'rgba(44, 26, 20, 0.74)',
      '--edge': 'rgba(255, 220, 190, 0.24)',
      '--hair': 'rgba(255, 220, 190, 0.18)',
      '--chip': 'rgba(255, 220, 190, 0.09)',
      '--chip-on': '#F7E9DE',
      '--chip-on-ink': '#2E1A1E',
      '--shadow': '0 18px 50px rgba(30, 10, 5, 0.5)',
    },
    lens: { exposure: 1.06, contrast: 1.02, saturation: 1.18, tint: [1.0, 0.84, 0.58], lift: [0.014, 0.007, 0], vignette: 0.42, grain: 0.035, bloom: 0.6 },
  },
  kiln: {
    id: 'kiln',
    label: 'Kiln',
    swatch: '#B1451F',
    description: 'Clay lens, high contrast',
    ui: {
      '--ink': '#1C120E',
      '--ink-2': '#4A2E22',
      '--ink-3': '#7A5A4A',
      '--accent': '#B1451F',
      '--accent-ink': '#8F3517',
      '--surface': 'rgba(250, 246, 240, 0.9)',
      '--surface-strong': 'rgba(250, 246, 240, 0.96)',
      '--edge': '#1C120E',
      '--hair': 'rgba(28, 18, 14, 0.3)',
      '--chip': 'rgba(28, 18, 14, 0.07)',
      '--chip-on': '#B1451F',
      '--chip-on-ink': '#FFFFFF',
      '--shadow': '0 0 0 1px #1C120E, 0 14px 30px rgba(28, 18, 14, 0.28)',
    },
    lens: { exposure: 1.2, contrast: 1.34, saturation: 0.78, tint: [1.0, 0.68, 0.62], lift: [0.016, 0.004, 0.002], vignette: 0.46, grain: 0.042, bloom: 0.38 },
  },
}

export const THEME_ORDER: ThemeId[] = ['paper', 'graphite', 'glass', 'dusk', 'kiln']
