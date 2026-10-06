import type {
  ArchiveEntry,
  Category,
  Champion,
  Contract,
  Difficulty,
  Objective,
  Standing,
} from '../types'

const obj = (
  id: number,
  title: string,
  category: Category,
  difficulty: Difficulty,
  target: number,
  current: number,
): Objective => ({ id, title, category, difficulty, target, current })

/** Today's contract, modelled on the example in the spec (4 Easy · 3 Medium · 2 Hard · 1 Extreme). */
export const today: Contract = {
  number: 1847,
  type: 'standard',
  endsAt: Date.now() + (17 * 3600 + 39 * 60 + 45) * 1000,
  participants: 482,
  rewards: [{ place: 'Winner', reward: '$10,000,000 + 1× Xanax' }],
  objectives: [
    obj(1, 'Use 1,500 Energy', 'energy', 'medium', 1500, 1500),
    obj(2, 'Fly to Switzerland twice', 'travel', 'hard', 2, 1),
    obj(3, 'Lose 5 attacks', 'combat', 'easy', 5, 5),
    obj(4, 'Defeat a player 5+ levels above you', 'combat', 'extreme', 1, 0),
    obj(5, 'Complete 3 crimes', 'general', 'easy', 3, 3),
    obj(6, 'Use 5 medical items', 'energy', 'easy', 5, 5),
    obj(7, 'Travel to 3 different countries', 'travel', 'medium', 3, 3),
    obj(8, 'Make 10 successful attacks', 'combat', 'medium', 10, 7),
    obj(9, 'Sell an item through the item market', 'economy', 'easy', 1, 1),
    obj(10, 'Gain 5,000 faction respect', 'faction', 'hard', 5000, 3120),
  ],
}

export const standings: Standing[] = [
  { rank: 1, name: 'PlayerA', completed: 9, minutes: 197 },
  { rank: 2, name: 'PlayerD', completed: 9, minutes: 214 },
  { rank: 3, name: 'PlayerB', completed: 8, minutes: 231 },
  { rank: 4, name: 'PlayerF', completed: 8, minutes: 246 },
  { rank: 5, name: 'PlayerC', completed: 8, minutes: 259 },
  { rank: 14, name: 'You', completed: 6, minutes: 301, isYou: true },
]

const pool: Objective[] = [
  obj(0, 'Win 5 attacks', 'combat', 'easy', 5, 5),
  obj(0, 'Achieve 3 critical hits', 'combat', 'medium', 3, 3),
  obj(0, 'Hospitalize 10 players', 'combat', 'hard', 10, 10),
  obj(0, 'Defeat a player with higher battle stats', 'combat', 'extreme', 1, 1),
  obj(0, 'Travel to Japan', 'travel', 'medium', 1, 1),
  obj(0, 'Spend 6 hours outside Torn', 'travel', 'hard', 6, 6),
  obj(0, 'Use 5 Xanax', 'energy', 'medium', 5, 5),
  obj(0, 'Use 3 medical items', 'energy', 'easy', 3, 3),
  obj(0, 'Earn $5M', 'economy', 'hard', 5_000_000, 5_000_000),
  obj(0, 'Buy an item from the market', 'economy', 'easy', 1, 1),
  obj(0, 'Complete a trade', 'economy', 'easy', 1, 1),
  obj(0, 'Complete 5 crimes', 'general', 'medium', 5, 5),
  obj(0, 'Train 1,000 stat points', 'general', 'medium', 1000, 1000),
  obj(0, 'Complete 3 missions', 'general', 'easy', 3, 3),
  obj(0, 'Make 10 faction attacks', 'faction', 'hard', 10, 10),
  obj(0, 'Donate to your faction', 'faction', 'easy', 1, 1),
]

/** Deterministic pick so archive entries are stable between renders. */
function pick(seed: number): Objective[] {
  return Array.from({ length: 10 }, (_, i) => {
    const o = pool[(seed * 3 + i * 5) % pool.length]
    return { ...o, id: i + 1 }
  })
}

export const archive: ArchiveEntry[] = [
  { number: 1846, date: 'Oct 6', type: 'elite', winner: 'PlayerA', minutes: 138, participants: 468 },
  { number: 1845, date: 'Oct 5', type: 'black', winner: 'PlayerB', minutes: 111, participants: 455 },
  { number: 1844, date: 'Oct 4', type: 'standard', winner: 'PlayerC', minutes: 307, participants: 441 },
  { number: 1843, date: 'Oct 3', type: 'survival', winner: 'PlayerA', minutes: 96, participants: 437 },
  { number: 1842, date: 'Oct 2', type: 'standard', winner: 'PlayerE', minutes: 188, participants: 429 },
  { number: 1841, date: 'Oct 1', type: 'elite', winner: 'PlayerB', minutes: 152, participants: 420 },
  { number: 1840, date: 'Sep 30', type: 'standard', winner: 'PlayerD', minutes: 224, participants: 411 },
].map((e) => ({ ...e, objectives: pick(e.number) })) as ArchiveEntry[]

export const champions: Champion[] = [
  { name: 'PlayerA', wins: 28, top3: 41, completed: 67, fastestMin: 102 },
  { name: 'PlayerB', wins: 21, top3: 36, completed: 59, fastestMin: 111 },
  { name: 'PlayerC', wins: 17, top3: 29, completed: 51, fastestMin: 123 },
  { name: 'PlayerD', wins: 14, top3: 25, completed: 44, fastestMin: 140 },
  { name: 'PlayerE', wins: 11, top3: 22, completed: 40, fastestMin: 151 },
]
