// Claude Circle (canon §7): persistent agents, each in its own engram module,
// training in the background and grounded against real outcomes.

export interface Skill { name: string; v: number; children: { name: string; v: number; flag?: string }[] }
export interface Agent {
  id: string; name: string; initial: string; domain: string; level: number; hours: number; xp: number
  color: string; status: string; truth: string; skills: Skill[]; questions: string[]
}

export const AGENTS: Agent[] = [
  {
    id: 'brian', name: 'Brian', initial: 'B', domain: 'Law', level: 14, hours: 212, xp: 72, color: '#A9502D',
    status: 'Studying overnight: evidence rules for agent-drafted briefs', truth: '1,840 decided Illinois cases',
    skills: [
      { name: 'Contract law', v: 78, children: [{ name: 'Formation', v: 84 }, { name: 'Remedies', v: 71 }] },
      { name: 'Evidence', v: 66, children: [{ name: 'Hearsay', v: 72 }, { name: 'Authentication', v: 58, flag: 'A public feed claimed Illinois repealed rule 901. Quarantined: it conflicts with 3 signed sources.' }] },
      { name: 'Criminal procedure', v: 54, children: [{ name: 'Search and seizure', v: 61 }, { name: 'Sentencing', v: 39 }] },
      { name: 'Illinois civil code', v: 31, children: [{ name: 'Torts', v: 36 }, { name: 'Property', v: 18 }] },
    ],
    questions: [
      'Your thesis cites a 2031 ruling that was later reversed. Keep it as history or replace it?',
      'Should I prioritize federal or Illinois evidence rules next week?',
      'A public feed claimed a rule was repealed. I quarantined it. Want the details?',
    ],
  },
  {
    id: 'ada', name: 'Ada', initial: 'A', domain: 'History', level: 22, hours: 401, xp: 88, color: '#5E6B8C',
    status: 'Reading: 19th-century trade regimes and tariff wars', truth: 'archival sources and dated records',
    skills: [
      { name: 'Industrial Revolution', v: 91, children: [{ name: 'Steam and rail', v: 94 }, { name: 'Labor movements', v: 86 }] },
      { name: 'Cold War', v: 74, children: [{ name: 'Arms race', v: 80 }, { name: 'Decolonization', v: 62 }] },
      { name: 'Qing economy', v: 63, children: [{ name: 'Silver trade', v: 70 }, { name: 'Canton system', v: 55 }] },
      { name: 'Labor history', v: 69, children: [{ name: 'Strike waves', v: 73 }, { name: 'Wage data', v: 58 }] },
    ],
    questions: [
      'Your chapter 1 compares 2030s layoffs to the 1840s. Want the stronger 1870s parallel instead?',
      'Should I read primary sources in German or rely on translations?',
      'I found two contradicting wage datasets. Which archive do you trust?',
    ],
  },
  {
    id: 'theo', name: 'Theo', initial: 'T', domain: 'VR design', level: 17, hours: 288, xp: 65, color: '#3F7F73',
    status: 'Prototyping comfort-safe locomotion for a 40-player world', truth: 'playtest telemetry from 2,300 sessions',
    skills: [
      { name: 'Level design', v: 81, children: [{ name: 'Wayfinding', v: 85 }, { name: 'Pacing', v: 74 }] },
      { name: 'Multiplayer netcode', v: 52, children: [{ name: 'Prediction', v: 60 }, { name: 'Regional servers', v: 41 }] },
      { name: 'Haptic profiles', v: 44, children: [{ name: 'Texture maps', v: 49 }, { name: 'Certified drivers', v: 28 }] },
      { name: 'Motion comfort', v: 70, children: [{ name: 'Locomotion', v: 76 }, { name: 'Vection', v: 63 }] },
    ],
    questions: [
      'Teleport or smooth locomotion as the default?',
      'Haptic profiles need certified drivers. Target the two biggest suits only?',
      'Should the world persist between sessions?',
    ],
  },
  {
    id: 'iris', name: 'Iris', initial: 'I', domain: 'Materials', level: 9, hours: 96, xp: 41, color: '#8A6A3C',
    status: 'Simulating solid-state electrolyte candidates', truth: 'published lab measurements',
    skills: [
      { name: 'Battery chemistry', v: 58, children: [{ name: 'Solid electrolytes', v: 62 }, { name: 'Anodes', v: 51 }] },
      { name: 'Crystal structures', v: 47, children: [{ name: 'Lattices', v: 55 }, { name: 'Defects', v: 38 }] },
      { name: 'Simulation methods', v: 61, children: [{ name: 'DFT', v: 66 }, { name: 'Molecular dynamics', v: 57 }] },
      { name: 'Lab protocol', v: 35, children: [{ name: 'Safety', v: 44 }, { name: 'Synthesis', v: 24 }] },
    ],
    questions: [
      'Two candidates look stable in simulation. Want a summary for a real lab?',
      'Should I weight cost or energy density higher?',
      'Simulation disagrees with one paper. Flag it?',
    ],
  },
  {
    id: 'sol', name: 'Sol', initial: 'S', domain: 'Energy markets', level: 12, hours: 150, xp: 54, color: '#6E5A8A',
    status: 'Tracking Midwest grid price spreads', truth: 'grid operator price history',
    skills: [
      { name: 'Grid pricing', v: 72, children: [{ name: 'Peak windows', v: 80 }, { name: 'Spreads', v: 66 }] },
      { name: 'Gas markets', v: 49, children: [{ name: 'Henry Hub', v: 55 }, { name: 'Storage', v: 42 }] },
      { name: 'Storage economics', v: 57, children: [{ name: 'Batteries', v: 61 }, { name: 'Pumped hydro', v: 48 }] },
      { name: 'Policy', v: 40, children: [{ name: 'The 2033 Act', v: 52 }, { name: 'Tariff filings', v: 27 }] },
    ],
    questions: [
      'Off-peak moved 30 minutes later this week. Update home schedules?',
      'Want a weekly power-cost forecast in your glance layer?',
      'Should I learn shipping fuel markets too?',
    ],
  },
  {
    id: 'nell', name: 'Nell', initial: 'N', domain: 'Kitchen', level: 6, hours: 41, xp: 30, color: '#9A5A6A',
    status: 'Learning family recipes from your mom’s voice notes', truth: 'your family’s ratings',
    skills: [
      { name: 'Family recipes', v: 52, children: [{ name: 'Mom’s voice notes', v: 64 }, { name: 'Holiday dishes', v: 40 }] },
      { name: 'Meal planning', v: 44, children: [{ name: 'Market days', v: 50 }, { name: 'Leftovers', v: 37 }] },
      { name: 'Grocery budget', v: 38, children: [{ name: 'Price tracking', v: 45 }, { name: 'Bulk buys', v: 26 }] },
      { name: 'Technique', v: 29, children: [{ name: 'Knife work', v: 33 }, { name: 'Bread', v: 19 }] },
    ],
    questions: [
      'Your mom says "a little" salt. Is that a teaspoon?',
      'Plan meals around the farmers market on Wednesday?',
      'Should I share recipes with your sister’s Nell?',
    ],
  },
]

export interface DebateLine { who: 'brian' | 'ada'; text: string; swing: number }

export const DEBATE = {
  topic: 'Should courts admit briefs drafted by trained agents?',
  rounds: [
    [
      { who: 'brian', text: 'Admit them, with a signed trace. My briefs cite every case I learned from, so a judge can audit them faster than a human associate’s work.', swing: 0.28 },
      { who: 'ada', text: 'Every time a new writing technology entered court, from typewriters to word processors, the question was authorship and accountability, not quality. Who answers for an error?', swing: -0.22 },
    ],
    [
      { who: 'brian', text: 'The human lawyer who signs it. That is already the rule, and the trace makes review easier, not harder.', swing: 0.2 },
      { who: 'ada', text: 'Then the trace becomes the target. A poisoned training source would look perfectly legible. History says forgers attack the seal, not the letter.', swing: -0.32 },
    ],
    [
      { who: 'brian', text: 'Which is why my memory writes are signed and a conflicting source gets quarantined. Last night I refused one about rule 901.', swing: 0.18 },
      { who: 'ada', text: 'One you caught. In 1890s Chicago, forged land titles passed for a decade because the registry itself was trusted. Require a second, independently trained verifier.', swing: -0.08 },
    ],
  ] as DebateLine[][],
  verdict: 'Close. Admit agent briefs with a signed trace, on Ada’s condition: an independently trained verifier signs too.',
}
