export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'

export type Category =
  | 'combat'
  | 'travel'
  | 'energy'
  | 'economy'
  | 'general'
  | 'faction'

export type ContractType = 'standard' | 'elite' | 'black' | 'survival'

export type Complexity = 'easy' | 'medium' | 'hard' | 'extreme'

export interface Objective {
  id: number
  title: string
  name?: string
  category: Category
  difficulty: Difficulty
  complexity?: Complexity
  current: number
  target: number
  bounty?: number
  partialReward?: number
  agent_note?: string
  log_pattern?: string
  log_patterns?: any[]
  metric?: 'count' | 'sum' | 'distinct'
  verification?: 'log' | 'manual'
}

export interface Reward {
  place: string
  reward: string
}

export interface Contract {
  number: number
  type: ContractType
  endsAt: number
  participants: number
  rewards: Reward[]
  objectives: Objective[]
}

export interface Standing {
  rank: number
  name: string
  completed: number
  /** Minutes since release at which the last objective was verified */
  minutes: number
  isYou?: boolean
}

export interface ArchiveEntry {
  number: number
  date: string
  type: ContractType
  winner: string
  /** Minutes after release */
  minutes: number
  participants: number
  objectives: Objective[]
}

export interface Champion {
  name: string
  wins: number
  top3: number
  completed: number
  fastestMin: number
}
