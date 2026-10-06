import {
  Building2,
  Coins,
  Flag,
  Pill,
  Plane,
  Swords,
  type LucideIcon,
} from 'lucide-react'
import type { Category, ContractType, Difficulty } from '../types'

export const categoryMeta: Record<
  Category,
  { label: string; icon: LucideIcon }
> = {
  combat: { label: 'Combat', icon: Swords },
  travel: { label: 'Travel', icon: Plane },
  energy: { label: 'Energy / Items', icon: Pill },
  economy: { label: 'Economy', icon: Coins },
  general: { label: 'General', icon: Building2 },
  faction: { label: 'Faction', icon: Flag },
}

export const difficultyMeta: Record<
  Difficulty,
  { label: string; className: string }
> = {
  easy: { label: 'Easy', className: 'bg-easy' },
  medium: { label: 'Medium', className: 'bg-medium' },
  hard: { label: 'Hard', className: 'bg-hard' },
  extreme: { label: 'Extreme', className: 'bg-extreme' },
}

export const contractTypeMeta: Record<
  ContractType,
  { label: string; winners: string; blurb: string }
> = {
  standard: {
    label: 'Standard',
    winners: '1 winner',
    blurb: 'First player to finish wins.',
  },
  elite: {
    label: 'Elite',
    winners: 'Top 3',
    blurb: 'The first three players to finish are rewarded.',
  },
  black: {
    label: 'Black',
    winners: 'Top 10',
    blurb: 'The first ten players to finish are rewarded.',
  },
  survival: {
    label: 'Survival',
    winners: 'Everyone who finishes',
    blurb: 'Complete every objective within 24 hours to be rewarded.',
  },
}
