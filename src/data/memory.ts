// Memory (canon §8, §11): an engram store apart from the model's weights.
// Every write is logged and signed with its source; forgetting a memory also
// removes anything learned only from it. Writes that conflict with signed
// sources are quarantined instead of learned.

export interface Memory {
  id: string
  text: string
  source: string
  signed: boolean
  learned: string
  used: string
  /** Things learned only from this memory, removed with it. */
  derived: string[]
}

export const MEMORIES: Memory[] = [
  {
    id: 'thesis', text: 'Thesis: warehouse automation and labor, chapters 1–6', source: 'Your documents · Mar 2034', signed: true,
    learned: 'Mar 14, 2034, from thesis-draft-v6, signed by your puck', used: '41 times this month, mostly in Chat',
    derived: ['Chapter outline', 'Your citation style'],
  },
  {
    id: 'glasses', text: 'Prefers short answers on glasses, long ones on desktop', source: 'You said this · Jan 2034', signed: true,
    learned: 'Jan 9, 2034, in a voice chat on your glasses', used: 'Every reply on glasses', derived: [],
  },
  {
    id: 'advisor', text: 'Advisor is Dr. Okafor; meets Thursdays at 3 PM', source: 'Calendar · Feb 2034', signed: true,
    learned: 'Feb 2, 2034, from your university calendar connector', used: 'Thursday reminders and the Transit glance', derived: ['Thursday 2:30 PM leave-by reminder'],
  },
  {
    id: 'models', text: 'Uses Fable for writing, Pantheon only for heavy jobs', source: 'Learned from your choices · May 2034', signed: false,
    learned: 'May 2034, from 212 model picks; you can correct it any time', used: 'Default model suggestions', derived: ['Queue heavy jobs for off-peak power'],
  },
  {
    id: 'safeword', text: 'Family safe word is set (the word itself is never stored here)', source: 'Trust center · Apr 2034', signed: true,
    learned: 'Apr 20, 2034, when you set it up in Trust', used: 'Once, during a suspicious call', derived: [],
  },
]

export const QUARANTINE = {
  agent: 'Brian',
  claim: 'Illinois repealed evidence rule 901 in 2033.',
  from: 'statutes-daily feed · public · unsigned',
  conflicts: [
    'Illinois Rules of Evidence, current text · Illinois Courts · signed',
    'Brian’s casebook of 1,840 decided Illinois cases · signed',
    'A June 2034 appellate ruling that applies rule 901 · signed',
  ],
}
