/** Platform-wide numbers shown in the dashboard KPI strip. */
export const globalStats = {
  registered: 12482,
  active: 482,
  completed: 1847,
  rewardsPaid: '$4.82B',
}

/** The signed-in agent's personal numbers. */
export const agentStats = {
  started: 37,
  completed: 29,
  wins: 8,
  top3: 14,
  objectives: 312,
  completionRate: '78.4%',
  avgTime: '4h 21m',
  fastest: '2h 14m',
  bestFinish: '1st',
}

export type AchievementIcon = 'trophy' | 'speed' | 'perfect' | 'streak'

export const achievements: {
  id: string
  icon: AchievementIcon
  title: string
  description: string
}[] = [
  {
    id: 'first-win',
    icon: 'trophy',
    title: 'First Contract Win',
    description: 'Won your first contract.',
  },
  {
    id: 'speed',
    icon: 'speed',
    title: 'Speed Runner',
    description: 'Completed a contract in under 2 hours.',
  },
  {
    id: 'perfect',
    icon: 'perfect',
    title: 'Perfect Run',
    description: 'Completed 10/10 objectives.',
  },
  {
    id: 'streak',
    icon: 'streak',
    title: 'Three in a Row',
    description: 'Finished in the top 3 for three consecutive contracts.',
  },
]

export const announcements: {
  id: string
  title: string
  body: string
  ago: string
}[] = [
  {
    id: 'new',
    title: 'New Contract Available',
    body: 'Contract #1847 is now active.',
    ago: '6h ago',
  },
  {
    id: 'objective',
    title: 'Objective Updated',
    body: 'Objective #7 has been replaced due to a verification issue.',
    ago: '3h ago',
  },
]

export type ActivityKind = 'objective' | 'rank' | 'progress' | 'win'

export const activity: {
  id: string
  kind: ActivityKind
  who: string
  text: string
  ago: string
}[] = [
  { id: '1', kind: 'objective', who: 'PlayerA', text: 'completed Objective 10', ago: '1m' },
  { id: '2', kind: 'rank', who: 'PlayerD', text: 'moved into #2', ago: '4m' },
  { id: '3', kind: 'progress', who: 'PlayerB', text: 'completed 8/10 objectives', ago: '9m' },
  { id: '4', kind: 'win', who: 'PlayerA', text: 'won Contract #1846', ago: '17h' },
]
