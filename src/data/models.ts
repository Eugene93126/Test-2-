import type { ModelId } from '../state/store'

// The 2034 lineup as the Claude app shows it (canon §3–§6).
export interface ModelDef {
  id: ModelId
  name: string
  cls: 'Digital' | 'Unified' | 'Home'
  tag: string
  dot: string
  note: string
  best: string
  energy: string
  safeguards: string
  availability: string
  locked: boolean
}

export const MODELS: ModelDef[] = [
  {
    id: 'fable', name: 'Fable Duo 4.1', cls: 'Digital', tag: 'Default', dot: '#D97757',
    note: 'Your everyday Claude. Trained with physical data from Pantheon fleets, so it renders and reasons about the real world well, but it cannot control devices or robots.',
    best: 'Writing, research, coding, video, games and worlds',
    energy: 'About 0.6 kJ per typical reply',
    safeguards: 'Public safeguards; no photoreal real people',
    availability: 'All 8 supported countries · every plan',
    locked: false,
  },
  {
    id: 'mythos', name: 'Mythos Duo 4.1', cls: 'Digital', tag: 'Vetted', dot: '#8C6BC8',
    note: 'Same weights as Fable Duo with fewer domain limits, for verified studios, labs and enterprises.',
    best: 'Frontier research, large studio pipelines',
    energy: 'About 0.7 kJ per typical reply',
    safeguards: 'Organization verification required',
    availability: 'Verified organizations only',
    locked: true,
  },
  {
    id: 'pantheon2', name: 'Pantheon 2.0', cls: 'Unified', tag: 'New today', dot: '#E3B25A',
    note: 'Anthropic’s most capable model. One set of weights for deep digital work and for robots at certified Gatepoint docks.',
    best: 'Multi-day projects, hard engineering, anything that ends with a robot doing something',
    energy: 'About 4 kJ per deep task · slower at peak grid hours',
    safeguards: 'ASL-4 · signed through Gatepoints · every action traced',
    availability: 'Included in Max · robots in US, UK, AU, NZ, PL',
    locked: false,
  },
  {
    id: 'odyssey', name: 'Odyssey 3.2', cls: 'Home', tag: 'Claude Home', dot: '#6FA58C',
    note: 'Runs your glasses glance layer and your home through approved connectors. Hands physical tasks to Pantheon where home docks exist.',
    best: 'Home devices, errands, glances, family coordination',
    energy: 'Mostly on-device',
    safeguards: 'Approved MCP only · household permissions',
    availability: 'All plans',
    locked: false,
  },
  {
    id: 'pantheon1', name: 'Pantheon 1.0', cls: 'Unified', tag: 'Legacy', dot: '#9A968C',
    note: 'The first Pantheon. Kept for existing robot fleets.',
    best: 'Existing deployments',
    energy: 'About 6 kJ per deep task',
    safeguards: 'ASL-4',
    availability: 'Supported until Jan 31, 2035',
    locked: false,
  },
]

export const modelById = (id: ModelId) => MODELS.find(m => m.id === id)!
