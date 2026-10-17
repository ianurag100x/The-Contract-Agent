import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type {
  Category,
  ContractType,
  Difficulty,
  Objective,
  Reward,
} from '../types'
import { today as initialToday } from '../data/mock'
import { adminApi } from '../lib/api'

export type AdminContractStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'invalid'

export type WinnerConfig =
  | '1 winner'
  | 'Top 3'
  | 'Top 5'
  | 'Top 10'
  | 'Everyone who completes'

export interface AuditLogEntry {
  id: string
  admin: string
  timestamp: string
  action: string
  target: string
  details: string
  tone?: 'normal' | 'warning' | 'danger' | 'success'
}

export interface VerificationQueueItem {
  id: string
  playerName: string
  objectiveTitle: string
  objectiveId: string
  status: 'verified' | 'processing' | 'pending' | 'failed' | 'error'
  timestamp: string
  apiData?: string
}

export interface Participant {
  id: string
  name: string
  tornId: number
  rank: number
  completedCount: number
  totalCount: number
  partialRewardsEarned?: number // Partial award system
  lastActive: string
  status: 'active' | 'inactive' | 'completed' | 'suspicious' | 'error'
  objectivesProgress: {
    id: number
    title: string
    category: Category
    difficulty: Difficulty
    current: number
    target: number
    partialReward?: number // Partial bounty per objective
    partialRewardStatus?: 'unearned' | 'credited' | 'distributed'
    verifiedAt?: string
    apiEventId?: string
    isSuspicious?: boolean
  }[]
  suspiciousReason?: string
}

export interface SuspiciousActivityItem {
  id: string
  playerName: string
  tornId: number
  contractNumber: number
  event: string
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  timestamp: string
  status: 'investigating' | 'cleared' | 'flagged'
}

export interface AdminAlert {
  id: string
  title: string
  description: string
  type: 'verification' | 'reward' | 'objective' | 'api' | 'security'
  severity: 'warning' | 'danger' | 'info'
  resolved: boolean
  timestamp: string
}

export interface AdminAnnouncement {
  id: string
  title: string
  message: string
  type: 'Information' | 'Warning' | 'Important' | 'Maintenance'
  target: 'Dashboard' | 'Contract page' | 'All users'
  publishedAt: string
  isActive: boolean
}

export interface RewardRecord {
  id: string
  contractNumber: number
  recipient: string
  tornId: number
  rank: string
  reward: string
  rewardType?: 'final_winner' | 'partial_objective' | 'threshold_bonus'
  amountCash?: number
  status: 'delivered' | 'pending' | 'failed' | 'cancelled'
  txId?: string
  date: string
}

export interface SystemHealthMetrics {
  tornApi: 'operational' | 'degraded' | 'down'
  verificationEngine: 'operational' | 'degraded' | 'down'
  database: 'operational' | 'degraded' | 'down'
  rewardSystem: 'operational' | 'degraded' | 'down'
  authentication: 'operational' | 'degraded' | 'down'
  backgroundJobs: 'operational' | 'degraded' | 'down'
  webSocket: 'operational' | 'degraded' | 'down'
  apiRequestsToday: number
  failedRequests: number
  verificationErrors: number
  avgVerificationTime: string
}

export interface AdminUserRecord {
  id: string
  name: string
  tornId: number
  registeredDate: string
  lastActive: string
  status: 'active' | 'suspended' | 'banned'
  apiStatus?: 'working' | 'paused' | 'invalid' | 'missing'
  hasActiveContract?: boolean
  activeContractNumber?: number | null
  contractsEntered: number
  contractsCompleted: number
  wins: number
  top3: number
  completionRate: string
  contractHistory: {
    contractNumber: number
    status: 'Active' | 'Completed' | 'Failed'
    rank: string
    completionTime?: string
  }[]
}

export interface ObjectivePoolItem extends Omit<Objective, 'id' | 'current'> {
  objId: string
  enabled: boolean
  verificationMethod: string
  eligibleForRng: boolean
  consecutiveAllowed: boolean
  weight: number
  partialReward?: number
}

export const OBJECTIVE_POOL: ObjectivePoolItem[] = [
  // Combat
  {
    objId: 'OBJ-001',
    title: 'Win 5 attacks',
    category: 'combat',
    difficulty: 'easy',
    target: 5,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 250000,
    log_pattern: 'Attack won: {"opponent":{opponent:text},"defender":{defender:text},"respect":{respect:number},"energy_used":{energy:int}{rest:text}}',
  },
  {
    objId: 'OBJ-002',
    title: 'Lose 5 attacks',
    category: 'combat',
    difficulty: 'easy',
    target: 5,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 250000,
    log_pattern: 'Attack lost: {"opponent":{opponent:text},"defender":{defender:text},"energy_used":{energy:int}{rest:text}}',
  },
  {
    objId: 'OBJ-003',
    title: 'Achieve 3 critical hits',
    category: 'combat',
    difficulty: 'medium',
    target: 3,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 500000,
    log_pattern: 'Attack critical hit: {"damage":{damage:number},"opponent":{opponent:text}{rest:text}}',
  },
  {
    objId: 'OBJ-004',
    title: 'Make 10 successful attacks',
    category: 'combat',
    difficulty: 'medium',
    target: 10,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.2,
    partialReward: 750000,
    log_pattern: 'Attack won: {"opponent":{opponent:text},"defender":{defender:text},"energy_used":{energy:int}{rest:text}}',
  },
  {
    objId: 'OBJ-005',
    title: 'Make 20 attacks',
    category: 'combat',
    difficulty: 'medium',
    target: 20,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 750000,
    log_pattern: 'Attack {result:word}: {"opponent":{opponent:text},"energy_used":{energy:int}{rest:text}}',
  },
  {
    objId: 'OBJ-006',
    title: 'Hospitalize 10 players',
    category: 'combat',
    difficulty: 'hard',
    target: 10,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.8,
    partialReward: 1000000,
    log_pattern: 'Attack hospitalize: {"opponent":{opponent:text},"defender":{defender:text},"energy_used":{energy:int}{rest:text}}',
  },
  {
    objId: 'OBJ-007',
    title: 'Win an attack without temporary weapon',
    category: 'combat',
    difficulty: 'hard',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.8,
    partialReward: 1000000,
    log_pattern: 'Attack won: {"opponent":{opponent:text},"defender":{defender:text},"temporary_used":false{rest:text}}',
  },
  {
    objId: 'OBJ-008',
    title: 'Defeat a player 5+ levels above you',
    category: 'combat',
    difficulty: 'extreme',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.5,
    partialReward: 1500000,
    log_pattern: 'Attack won: {"opponent":{opponent:text},"level_difference":{diff:int}{rest:text}}',
  },
  {
    objId: 'OBJ-009',
    title: 'Defeat a player with higher battle stats',
    category: 'combat',
    difficulty: 'extreme',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.5,
    partialReward: 1500000,
    log_pattern: 'Attack won: {"opponent":{opponent:text},"fair_fight":{fair_fight:number}{rest:text}}',
  },

  // Travel
  {
    objId: 'OBJ-020',
    title: 'Fly using a specific airport',
    category: 'travel',
    difficulty: 'easy',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 250000,
    log_pattern: 'Travel {action:word}: {"destination":{destination:text},"flight_time":{minutes:int}{rest:text}}',
  },
  {
    objId: 'OBJ-021',
    title: 'Travel to Japan',
    category: 'travel',
    difficulty: 'medium',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 500000,
    log_pattern: 'Travel arrive: {"destination":"Japan"{rest:text}}',
  },
  {
    objId: 'OBJ-022',
    title: 'Travel to 3 different countries',
    category: 'travel',
    difficulty: 'medium',
    target: 3,
    metric: 'distinct',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 500000,
    log_pattern: 'Travel arrive: {"destination":{country:word}{rest:text}}',
  },
  {
    objId: 'OBJ-024',
    title: 'Fly to Switzerland twice',
    category: 'travel',
    difficulty: 'hard',
    target: 2,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.8,
    partialReward: 750000,
    log_pattern: 'Travel arrive: {"destination":"Switzerland"{rest:text}}',
  },
  {
    objId: 'OBJ-025',
    title: 'Spend 6 hours outside Torn',
    category: 'travel',
    difficulty: 'hard',
    target: 6,
    metric: 'sum',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.8,
    partialReward: 750000,
    log_pattern: 'Travel stay: {"hours_abroad":{hours:int}{rest:text}}',
  },

  // Energy / Items
  {
    objId: 'OBJ-030',
    title: 'Use 5 medical items',
    category: 'energy',
    difficulty: 'easy',
    target: 5,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 200000,
    log_pattern: 'Item use {item:word}: {"type":"medical"{rest:text}}',
  },
  {
    objId: 'OBJ-031',
    title: 'Consume 3 booster items',
    category: 'energy',
    difficulty: 'easy',
    target: 3,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 250000,
    log_pattern: 'Item use {item:word}: {"type":"booster"{rest:text}}',
  },
  {
    objId: 'OBJ-032',
    title: 'Use 1,500 Energy',
    category: 'energy',
    difficulty: 'medium',
    target: 1500,
    metric: 'sum',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.2,
    partialReward: 500000,
    log_pattern: 'Gym train {stat:word}: {details:text}"energy_used":{energy:int}{rest:text}',
  },
  {
    objId: 'OBJ-033',
    title: 'Use 5 Xanax',
    category: 'energy',
    difficulty: 'medium',
    target: 5,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 500000,
    log_pattern: 'Item use Xanax: {"item_id":206{rest:text}}',
  },
  {
    objId: 'OBJ-034',
    title: 'Use 1,000 Energy without overdosing',
    category: 'energy',
    difficulty: 'hard',
    target: 1000,
    metric: 'sum',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.8,
    partialReward: 1000000,
    log_pattern: 'Gym train {stat:word}: {details:text}"energy_used":{energy:int}{rest:text}',
  },

  // Economy
  {
    objId: 'OBJ-040',
    title: 'Buy an item from the market',
    category: 'economy',
    difficulty: 'easy',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 200000,
    log_pattern: 'Market buy: {"item":{item:text},"cost":{cost:money}{rest:text}}',
  },
  {
    objId: 'OBJ-041',
    title: 'Complete a trade',
    category: 'economy',
    difficulty: 'easy',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 250000,
    log_pattern: 'Trade complete: {"trader":{trader:text},"trade_id":{trade_id:int}{rest:text}}',
  },
  {
    objId: 'OBJ-042',
    title: 'Sell an item through the item market',
    category: 'economy',
    difficulty: 'easy',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 300000,
    log_pattern: 'Item sale: {"item":{item:text},"buyer":{buyer:text},"price":{price:money}{rest:text}}',
  },
  {
    objId: 'OBJ-043',
    title: 'Spend $2M',
    category: 'economy',
    difficulty: 'medium',
    target: 2000000,
    metric: 'sum',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 500000,
    log_pattern: 'Money spent: {"amount":{amount:money},"purpose":{purpose:text}{rest:text}}',
  },
  {
    objId: 'OBJ-044',
    title: 'Make $1M from item sales',
    category: 'economy',
    difficulty: 'medium',
    target: 1000000,
    metric: 'sum',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 500000,
    log_pattern: 'Item sale: {"price":{price:money}{rest:text}}',
  },
  {
    objId: 'OBJ-045',
    title: 'Earn $5M',
    category: 'economy',
    difficulty: 'hard',
    target: 5000000,
    metric: 'sum',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.8,
    partialReward: 1000000,
    log_pattern: 'Money received: {"amount":{amount:money},"source":{source:text}{rest:text}}',
  },

  // General Torn
  {
    objId: 'OBJ-050',
    title: 'Complete 3 crimes',
    category: 'general',
    difficulty: 'easy',
    target: 3,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 350000,
    log_pattern: 'Crime {action:word}: {"crime_id":{id:int}{rest:text}}',
  },
  {
    objId: 'OBJ-051',
    title: 'Complete 3 missions',
    category: 'general',
    difficulty: 'easy',
    target: 3,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 250000,
    log_pattern: 'Mission completed: {"mission":{mission:text},"credits":{credits:int}{rest:text}}',
  },
  {
    objId: 'OBJ-052',
    title: 'Visit a specific location',
    category: 'general',
    difficulty: 'easy',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 200000,
    log_pattern: 'City visit: {"location":{location:text}{rest:text}}',
  },
  {
    objId: 'OBJ-053',
    title: 'Complete 5 crimes',
    category: 'general',
    difficulty: 'medium',
    target: 5,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 500000,
    log_pattern: 'Crime {action:word}: {"crime_id":{id:int}{rest:text}}',
  },
  {
    objId: 'OBJ-054',
    title: 'Train 1,000 stat points',
    category: 'general',
    difficulty: 'medium',
    target: 1000,
    metric: 'sum',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 500000,
    log_pattern: 'Gym train {stat:word}: {details:text}"energy_used":{energy:int}{rest:text}',
  },
  {
    objId: 'OBJ-055',
    title: 'Complete an education course',
    category: 'general',
    difficulty: 'hard',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.8,
    partialReward: 750000,
    log_pattern: 'Education completed: {"course":{course:text}{rest:text}}',
  },

  // Faction
  {
    objId: 'OBJ-060',
    title: 'Donate to your faction',
    category: 'faction',
    difficulty: 'easy',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 200000,
    log_pattern: 'Faction donation: {"amount":{amount:money}{rest:text}}',
  },
  {
    objId: 'OBJ-061',
    title: 'Make 10 faction attacks',
    category: 'faction',
    difficulty: 'medium',
    target: 10,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 750000,
    log_pattern: 'Faction attack: {"opponent":{opponent:text},"respect":{respect:number}{rest:text}}',
  },
  {
    objId: 'OBJ-062',
    title: 'Participate in a war',
    category: 'faction',
    difficulty: 'medium',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: true,
    weight: 1.0,
    partialReward: 750000,
    log_pattern: 'Faction war hit: {"enemy_faction":{faction:text},"respect":{respect:number}{rest:text}}',
  },
  {
    objId: 'OBJ-063',
    title: 'Gain 5,000 faction respect',
    category: 'faction',
    difficulty: 'hard',
    target: 5000,
    metric: 'sum',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.8,
    partialReward: 1000000,
    log_pattern: 'Faction respect gain: {"respect":{respect:number}{rest:text}}',
  },
  {
    objId: 'OBJ-064',
    title: 'Complete a faction-related action',
    category: 'faction',
    difficulty: 'hard',
    target: 1,
    metric: 'count',
    enabled: true,
    verificationMethod: 'TORN API / Log',
    eligibleForRng: true,
    consecutiveAllowed: false,
    weight: 0.8,
    partialReward: 1000000,
    log_pattern: 'Faction {action:word}: {"details":{details:text}{rest:text}}',
  },
]

export interface AdminContractSettings {
  number: number
  status: AdminContractStatus
  type: ContractType
  winnerConfig: WinnerConfig
  startDate: string
  endsAt: number
  participants: number
  rewards: Reward[]
  objectives: Objective[]
  maxObjectives?: number
  partialRewardsEnabled?: boolean
  partialRewardPerObjective?: number
  winnerStatus?: 'Awaiting Final Verification' | 'Verified Winner' | 'Reward Distributed'
  declaredWinner?: string
  remainingMs?: number
}

export interface AdminPlatformStats {
  registeredUsers: number
  activeUsers: number
  activeContractors: number
  contractsCompleted: number
  totalRewardsDistributed: string
}

interface AdminContextType {
  // Platform Statistics
  stats: AdminPlatformStats
  refreshStats: () => Promise<void>

  // Contract & Tasks Management
  contract: AdminContractSettings
  contractsList: any[]
  refreshContracts: () => Promise<void>
  selectContract: (id: number) => void
  updateStatus: (status: AdminContractStatus) => void
  updateType: (type: ContractType) => void
  updateWinnerConfig: (winnerConfig: WinnerConfig) => void
  updateContractNumber: (num: number) => void
  updateRewards: (rewards: Reward[]) => void
  updateObjectives: (objectives: Objective[]) => void
  updateMaxObjectives: (max: number) => void
  togglePartialRewards: (enabled: boolean) => void
  createContract: (newContract: Partial<AdminContractSettings>) => void
  deleteContractFromDirectory: (id: number) => Promise<boolean>

  // Task CRUD in Contract (Req 5, 6, 7)
  addObjectiveToContract: (newObj: Omit<Objective, 'id' | 'current'> & { log_pattern?: string; log_patterns?: any[] }) => void
  editObjectiveInContract: (index: number, updated: Partial<Objective>) => void
  deleteObjectiveFromContract: (index: number) => void

  // Objectives Library
  objectivePool: ObjectivePoolItem[]
  addObjectiveToPool: (newObj: Omit<ObjectivePoolItem, 'objId'>) => string
  toggleObjectiveEnabled: (objId: string) => void
  updateObjectiveInPool: (objId: string, updated: Partial<ObjectivePoolItem>) => void
  replaceObjective: (index: number, newObj: Omit<Objective, 'id' | 'current'> & { partialReward?: number }) => void
  invalidateObjective: (index: number, reason?: string) => void
  randomizeBalancedObjectives: () => void

  // Controls & Emergency
  startContract: () => void
  pauseContract: () => void
  resumeContract: () => void
  extendDeadlineMinutes: (minutes: number) => void
  endContract: (winnerName?: string) => void
  cancelContract: () => void
  resetContractProgress: () => void
  invalidateContract: (reason?: string) => void
  declareWinner: (winnerName: string) => void

  // Agent Progress, Overrides & Extra Bounty (Req 8)
  manualOverrideTask: (userId: string, objectiveId: string, action: 'mark_completed' | 'mark_uncompleted' | 'reset' | 'delete', reason: string) => Promise<boolean>
  addExtraBounty: (userId: string, amount: number, reason: string) => Promise<boolean>

  // Verification Queue
  verificationQueue: VerificationQueueItem[]
  retryVerification: (id: string) => void
  manuallyVerify: (id: string) => void
  rejectVerification: (id: string) => void

  // Participants & Users
  participants: Participant[]
  selectedParticipant: Participant | null
  setSelectedParticipant: (p: Participant | null) => void
  users: AdminUserRecord[]
  selectedUser: AdminUserRecord | null
  setSelectedUser: (u: AdminUserRecord | null) => void
  suspendUser: (userId: string) => void
  banUser: (userId: string) => void
  restoreUser: (userId: string) => void

  // Rewards
  rewardsHistory: RewardRecord[]
  issueReward: (id: string) => void
  retryReward: (id: string) => void
  cancelReward: (id: string) => void

  // Alerts & Suspicious
  alerts: AdminAlert[]
  resolveAlert: (id: string) => void
  suspiciousActivity: SuspiciousActivityItem[]
  investigateSuspicious: (id: string) => void
  clearSuspicious: (id: string) => void

  // Announcements & Notch Banner
  announcements: AdminAnnouncement[]
  activeAnnouncement: AdminAnnouncement | null
  publishAnnouncement: (announcement: Omit<AdminAnnouncement, 'id' | 'publishedAt' | 'isActive'>) => void
  toggleAnnouncementActive: (id: string) => void
  dismissActiveAnnouncement: () => void
  deleteAnnouncement: (id: string) => void

  // System Health & Logs
  systemHealth: SystemHealthMetrics
  auditLogs: AuditLogEntry[]
  addAuditLog: (action: string, target: string, details: string, tone?: AuditLogEntry['tone']) => void
  resetToDefault: () => void
}

const AdminContext = createContext<AdminContextType | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  // Contract
  const [contract, setContract] = useState<AdminContractSettings>(() => {
    const d = new Date()
    const today24Utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)).getTime()

    try {
      const stored = localStorage.getItem('contract-agent:admin-contract-v3')
      if (stored) {
        const parsed = JSON.parse(stored)
        // If stored contract is active, ensure its endsAt is aligned to today's 24:00 UTC
        if (parsed.status === 'active' && (!parsed.endsAt || parsed.endsAt < Date.now() || parsed.endsAt > today24Utc + 86400000)) {
          parsed.endsAt = today24Utc
        }
        // Ensure existing contract objectives have their log_pattern populated from OBJECTIVE_POOL if missing
        if (parsed && Array.isArray(parsed.objectives)) {
          let objsChanged = false
          parsed.objectives = parsed.objectives.map((o: any) => {
            if (!o.log_pattern) {
              const match = OBJECTIVE_POOL.find((d) => d.title.trim().toLowerCase() === (o.title || o.name || '').trim().toLowerCase())
              if (match?.log_pattern) {
                objsChanged = true
                return {
                  ...o,
                  metric: o.metric || match.metric || 'count',
                  log_pattern: match.log_pattern,
                  log_patterns: match.log_patterns || [{ key: `pat_${Date.now()}`, template: match.log_pattern }],
                }
              }
            }
            return o
          })
          if (objsChanged) {
            localStorage.setItem('contract-agent:admin-contract-v3', JSON.stringify(parsed))
          }
        }
        return parsed
      }
    } catch {}
    return {
      number: initialToday.number,
      status: 'active',
      type: initialToday.type,
      winnerConfig: '1 winner',
      startDate: 'Today 00:00 UTC',
      endsAt: today24Utc,
      participants: initialToday.participants,
      rewards: initialToday.rewards,
      objectives: initialToday.objectives.map((o) => ({ ...o, partialReward: 500000 })),
      partialRewardsEnabled: true,
      partialRewardPerObjective: 500000,
      winnerStatus: 'Awaiting Final Verification',
    }
  })

  // Objective Pool
  const [objectivePool, setObjectivePool] = useState<ObjectivePoolItem[]>(() => {
    try {
      const stored = localStorage.getItem('contract-agent:admin-objpool')
      if (stored) {
        const parsed: ObjectivePoolItem[] = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with master default OBJECTIVE_POOL to ensure all tasks have valid patterns
          let modified = false
          const merged = parsed.map((item) => {
            if (!item.log_pattern) {
              const defaultMatch = OBJECTIVE_POOL.find((d) => d.objId === item.objId || d.title.trim().toLowerCase() === item.title.trim().toLowerCase())
              if (defaultMatch?.log_pattern) {
                modified = true
                return {
                  ...item,
                  metric: item.metric || defaultMatch.metric || 'count',
                  log_pattern: defaultMatch.log_pattern,
                  log_patterns: defaultMatch.log_patterns || [{ key: `pat_${Date.now()}`, template: defaultMatch.log_pattern }],
                }
              }
            }
            return item
          })
          if (modified) {
            localStorage.setItem('contract-agent:admin-objpool', JSON.stringify(merged))
          }
          return merged
        }
      }
    } catch {}
    return OBJECTIVE_POOL
  })

  // Verification Queue
  const [verificationQueue, setVerificationQueue] = useState<VerificationQueueItem[]>([])

  // Participants
  const [participants, setParticipants] = useState<Participant[]>([])

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)

  // Registered Users Directory
  const [users, setUsers] = useState<AdminUserRecord[]>([])

  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null)

  // Rewards Ledger (Including Partial Awards)
  const [rewardsHistory, setRewardsHistory] = useState<RewardRecord[]>([])

  // Alerts & Issues
  const [alerts, setAlerts] = useState<AdminAlert[]>([])

  // Announcements & Live Notch Banner
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([])

  // Suspicious Activity
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivityItem[]>([])

  // System Health
  const [systemHealth] = useState<SystemHealthMetrics>({
    tornApi: 'operational',
    verificationEngine: 'operational',
    database: 'operational',
    rewardSystem: 'operational',
    authentication: 'operational',
    backgroundJobs: 'operational',
    webSocket: 'operational',
    apiRequestsToday: 0,
    failedRequests: 0,
    verificationErrors: 0,
    avgVerificationTime: '1.2 ms',
  })

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])

  // Platform Statistics from Database
  const [stats, setStats] = useState<AdminPlatformStats>({
    registeredUsers: 0,
    activeUsers: 0,
    activeContractors: 0,
    contractsCompleted: 0,
    totalRewardsDistributed: '$0',
  })

  const refreshStats = async () => {
    try {
      const res = await adminApi.getStats()
      if (res) {
        setStats({
          registeredUsers: res.registeredUsers,
          activeUsers: res.activeUsers,
          activeContractors: res.activeContractors,
          contractsCompleted: res.contractsCompleted,
          totalRewardsDistributed: res.totalRewardsDistributed,
        })
      }
    } catch (e) {
      console.warn('Failed to refresh stats:', e)
    }
  }

  // Contracts list in Admin
  const [contractsList, setContractsList] = useState<any[]>([])

  const refreshContracts = async () => {
    try {
      const list = await adminApi.getContracts()
      if (list && Array.isArray(list)) {
        setContractsList(list)
      }
    } catch (e) {
      console.warn('Failed to refresh contracts list:', e)
    }
  }

  const selectContract = async (id: number) => {
    try {
      const c = await adminApi.getContractById(id)
      if (c) {
        setContract({
          number: c.id,
          status: c.status,
          type: c.type,
          winnerConfig: c.winnerConfig,
          startDate: c.starts_at,
          endsAt: c.endsAt,
          remainingMs: c.remainingMs,
          participants: c.participants,
          rewards: c.rewards,
          objectives: c.objectives || [],
          partialRewardsEnabled: false,
          partialRewardPerObjective: 0,
          winnerStatus: c.winnerStatus,
          declaredWinner: c.declaredWinner,
        })
      }
    } catch (e) {
      console.warn('Failed to load contract by ID:', e)
    }
  }

  // On mount, query live backend API if available
  useEffect(() => {
    refreshStats()
    refreshContracts()

    adminApi.getContract().then((res) => {
      if (res) {
        setContract((prev) => ({
          ...prev,
          number: res.id || prev.number,
          status: res.status || prev.status,
          type: res.type || prev.type,
          winnerConfig: res.winnerConfig || res.winner_count || prev.winnerConfig,
          startDate: res.starts_at || prev.startDate,
          endsAt: res.endsAt || prev.endsAt,
          remainingMs: res.remainingMs,
          participants: res.participants || prev.participants,
          rewards: res.rewards || prev.rewards,
          winnerStatus: res.winnerStatus || prev.winnerStatus,
          declaredWinner: res.declaredWinner || prev.declaredWinner,
          objectives: res.objectives || [],
          partialRewardsEnabled: false,
          partialRewardPerObjective: 0,
        }))
      }
    })

    adminApi.getAnnouncements().then((res) => {
      if (res && Array.isArray(res)) {
        setAnnouncements(
          res.map((a: any) => ({
            id: a.id,
            title: a.title,
            message: a.message,
            type: a.type,
            target: a.target,
            publishedAt: a.published_at || 'Just now',
            isActive: a.is_active,
          }))
        )
      }
    })

    adminApi.getParticipants().then((res) => {
      if (res && Array.isArray(res)) {
        setParticipants(
          res.map((p: any) => ({
            id: p.id,
            name: p.torn_username,
            tornId: p.torn_user_id,
            rank: p.current_rank || 1,
            completedCount: p.progress || 0,
            totalCount: p.total_objectives || 10,
            partialRewardsEarned: p.partial_rewards_earned || 0,
            lastActive: p.last_activity_at || 'Just now',
            status: p.status || 'active',
            objectivesProgress: (p.objectives || initialToday.objectives).map((o: any, idx: number) => ({
              id: o.id || idx + 1,
              title: o.title,
              category: o.category,
              difficulty: o.difficulty,
              current: idx < (p.progress || 0) ? (o.target || 1) : 0,
              target: o.target || 1,
              partialReward: o.partialReward || 500000,
              partialRewardStatus: idx < (p.progress || 0) ? 'credited' : 'unearned',
            })),
          }))
        )
      }
    })

    adminApi.getRewards().then((res) => {
      if (res && Array.isArray(res)) {
        setRewardsHistory(
          res.map((r: any) => ({
            id: r.id,
            contractNumber: r.contract_id,
            recipient: r.torn_username,
            tornId: r.torn_user_id,
            rank: r.rank || (r.reward_type === 'final_winner' ? '#1' : 'Partial'),
            reward: r.reward_type === 'final_winner' ? '$10,000,000 + 1× Xanax' : `$${((r.amount_cash || 0) / 1000).toFixed(0)}k (${r.description})`,
            rewardType: r.reward_type,
            amountCash: r.amount_cash,
            status: r.status ? (r.status.toLowerCase() as any) : 'delivered',
            txId: r.tx_id,
            date: r.issued_at || 'Today',
          }))
        )
      }
    })

    adminApi.getUsers().then((res) => {
      if (res && Array.isArray(res)) {
        // Prevent duplicate entries by Torn ID
        const seen = new Set<number>()
        const uniqueUsers: AdminUserRecord[] = []
        for (const u of res) {
          const tid = u.torn_user_id || u.tornId
          if (tid && seen.has(tid)) continue
          if (tid) seen.add(tid)
          uniqueUsers.push({
            id: u.id,
            name: u.torn_username || u.name,
            tornId: tid,
            registeredDate: u.registered_at || u.created_at || 'Recently',
            lastActive: u.last_active_at || 'Just now',
            status: u.status || 'active',
            apiStatus: u.api_key_valid ? 'working' : u.api_status ? u.api_status : u.has_api_key ? 'working' : 'missing',
            hasActiveContract: Boolean(u.has_active_contract || u.active_contract_id || (u.contracts_entered && u.contracts_entered > u.contracts_completed)),
            activeContractNumber: u.active_contract_number || u.active_contract_id || null,
            contractsEntered: u.contracts_entered || 0,
            contractsCompleted: u.contracts_completed || 0,
            wins: u.wins || 0,
            top3: u.top3 || 0,
            completionRate: u.completion_rate || '0.0%',
            contractHistory: [],
          })
        }
        setUsers(uniqueUsers)
      }
    })

    adminApi.getSuspicious().then((res) => {
      if (res && Array.isArray(res)) {
        setSuspiciousActivity(
          res.map((s: any) => ({
            id: s.id,
            playerName: s.player_name || 'Agent',
            tornId: s.torn_user_id || 0,
            contractNumber: s.contract_id || 1848,
            event: s.event_description || s.event || 'Flagged anomaly',
            riskLevel: s.risk_level || 'Medium',
            timestamp: s.timestamp || 'Just now',
            status: s.status || 'investigating',
          }))
        )
      }
    })

    adminApi.getAlerts().then((res) => {
      if (res && Array.isArray(res)) {
        setAlerts(
          res.map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            type: a.type || 'verification',
            severity: a.severity || 'warning',
            resolved: Boolean(a.resolved),
            timestamp: a.timestamp || 'Just now',
          }))
        )
      }
    })
  }, [])

  // Save helper
  const saveContract = (next: AdminContractSettings) => {
    setContract(next)
    try {
      localStorage.setItem('contract-agent:admin-contract-v3', JSON.stringify(next))
    } catch {}
    adminApi.updateContract({
      status: next.status,
      type: next.type,
      winner_count: next.winnerConfig,
      max_objectives: next.maxObjectives,
      partial_rewards_enabled: next.partialRewardsEnabled,
      partial_reward_per_objective: next.partialRewardPerObjective,
      objectives: next.objectives,
    })
  }

  const addAuditLog = (
    action: string,
    target: string,
    details: string,
    tone: AuditLogEntry['tone'] = 'normal'
  ) => {
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}`,
      admin: 'Admin01',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action,
      target,
      details,
      tone,
    }
    setAuditLogs((prev) => [newEntry, ...prev])
  }

  // Contract controls
  const updateStatus = (status: AdminContractStatus) => {
    saveContract({ ...contract, status })
    addAuditLog('Status Changed', `#${contract.number}`, `Contract status shifted to ${status.toUpperCase()}.`, status === 'paused' || status === 'cancelled' ? 'warning' : 'normal')
  }

  const updateType = (type: ContractType) => {
    saveContract({ ...contract, type })
    addAuditLog('Type Changed', `#${contract.number}`, `Contract configuration updated to ${type.toUpperCase()}.`)
  }

  const updateWinnerConfig = (winnerConfig: WinnerConfig) => {
    saveContract({ ...contract, winnerConfig })
    addAuditLog('Winner Config Updated', `#${contract.number}`, `Winner rule set to: ${winnerConfig}.`)
  }

  const updateContractNumber = (num: number) => {
    saveContract({ ...contract, number: num })
    addAuditLog('Contract ID Updated', `#${num}`, `Contract sequence updated.`)
  }

  const updateRewards = (rewards: Reward[]) => {
    saveContract({ ...contract, rewards })
    addAuditLog('Rewards Updated', `#${contract.number}`, `Updated ${rewards.length} prize tiers.`)
  }

  const updateObjectives = (objectives: Objective[]) => {
    saveContract({ ...contract, objectives })
    addAuditLog('Objectives Updated', `#${contract.number}`, `Active objectives array customized.`)
  }

  const updateMaxObjectives = (max: number) => {
    saveContract({ ...contract, maxObjectives: max })
    addAuditLog('Max Tasks Limit Changed', `#${contract.number}`, `Max tasks set to ${max}.`, 'warning')
  }

  const addObjectiveToContract = (newObj: Omit<Objective, 'id' | 'current'> & { log_pattern?: string; logPattern?: string; log_patterns?: any[]; objId?: string }) => {
    const currentObjs = contract.objectives || []
    const max = contract.maxObjectives || 10
    if (currentObjs.length >= max) {
      alert(`Cannot add more than ${max} objectives. Increase max tasks limit first.`)
      return
    }

    // Resolve log pattern from newObj or fallback to objectivePool by title/objId
    let pattern = newObj.log_pattern || newObj.logPattern || (newObj.log_patterns && newObj.log_patterns[0]?.template)
    if (!pattern) {
      const matchInPool = objectivePool.find(
        (p) => p.title.trim().toLowerCase() === newObj.title.trim().toLowerCase() || (newObj.objId && p.objId === newObj.objId)
      )
      if (matchInPool?.log_pattern) {
        pattern = matchInPool.log_pattern
      }
    }
    const finalPattern = (pattern || '').trim()
    const finalPatterns = newObj.log_patterns && newObj.log_patterns.length > 0
      ? newObj.log_patterns
      : (finalPattern ? [{ key: `pat_${Date.now()}`, template: finalPattern }] : [])

    const created: Objective = {
      id: currentObjs.length + 1,
      title: newObj.title,
      name: newObj.title,
      category: newObj.category,
      difficulty: newObj.difficulty,
      complexity: newObj.complexity || (newObj.difficulty as any),
      current: 0,
      target: newObj.target,
      bounty: newObj.bounty ?? newObj.partialReward ?? 500000,
      partialReward: newObj.partialReward ?? newObj.bounty ?? 500000,
      agent_note: newObj.agent_note || '',
      log_pattern: finalPattern,
      log_patterns: finalPatterns,
      metric: newObj.metric || 'count',
      verification: newObj.verification || 'log',
    }

    const nextObjectives = [...currentObjs, created]
    saveContract({ ...contract, objectives: nextObjectives })
    addAuditLog('Task Added to Contract', `#${contract.number}`, `Added task: "${created.title}" with log syntax.`, 'success')
  }

  const editObjectiveInContract = (index: number, updated: Partial<Objective>) => {
    const currentObjs = [...contract.objectives]
    if (index >= 0 && index < currentObjs.length) {
      currentObjs[index] = {
        ...currentObjs[index],
        ...updated,
        complexity: (updated.complexity || updated.difficulty || currentObjs[index].complexity || currentObjs[index].difficulty) as any,
        bounty: updated.bounty ?? updated.partialReward ?? currentObjs[index].bounty,
        partialReward: updated.partialReward ?? updated.bounty ?? currentObjs[index].partialReward,
      }
      saveContract({ ...contract, objectives: currentObjs })
      addAuditLog('Task Edited in Contract', `#${contract.number}`, `Updated task #${index + 1}: "${currentObjs[index].title}".`)
    }
  }

  const deleteObjectiveFromContract = (index: number) => {
    const currentObjs = contract.objectives.filter((_, idx) => idx !== index)
    // Re-index remaining
    const reindexed = currentObjs.map((o, idx) => ({ ...o, id: idx + 1 }))
    saveContract({ ...contract, objectives: reindexed })
    addAuditLog('Task Deleted from Contract', `#${contract.number}`, `Removed task #${index + 1} from active contract.`, 'danger')
  }

  // Agent Progress Override & Extra Bounty (Req 8)
  const manualOverrideTask = async (
    userId: string,
    objectiveId: string,
    action: 'mark_completed' | 'mark_uncompleted' | 'reset' | 'delete',
    reason: string
  ): Promise<boolean> => {
    try {
      const res = await adminApi.taskOverride({
        userId,
        contractId: contract.number,
        contractObjectiveId: objectiveId,
        action,
        reason,
      })
      if (res?.success) {
        addAuditLog(`Agent Task ${action}`, userId, `Overrode objective ${objectiveId}. Reason: ${reason}`, 'warning')
        // Refresh participants
        const updated = await adminApi.getParticipants()
        if (updated && Array.isArray(updated)) {
          setParticipants(
            updated.map((p: any) => ({
              id: p.id,
              name: p.torn_username,
              tornId: p.torn_user_id,
              rank: p.current_rank || 1,
              completedCount: p.progress || 0,
              totalCount: p.total_objectives || 10,
              partialRewardsEarned: p.partial_rewards_earned || 0,
              lastActive: p.last_activity_at || 'Just now',
              status: p.status || 'active',
              objectivesProgress: contract.objectives.map((o, idx) => ({
                id: o.id,
                title: o.title,
                category: o.category,
                difficulty: o.difficulty,
                current: idx < (p.progress || 0) ? o.target : 0,
                target: o.target,
                partialReward: o.partialReward || o.bounty || 500000,
                partialRewardStatus: idx < (p.progress || 0) ? 'credited' : 'unearned',
              })),
            }))
          )
        }
        return true
      }
    } catch (e) {
      console.error('Failed manual override:', e)
    }
    return false
  }

  const addExtraBounty = async (userId: string, amount: number, reason: string): Promise<boolean> => {
    try {
      const newReward: RewardRecord = {
        id: `rw-bonus-${Date.now()}`,
        contractNumber: contract.number,
        recipient: userId,
        tornId: 0,
        rank: 'Bonus',
        reward: `+$${(amount / 1000).toFixed(0)}k (Admin Bonus: ${reason})`,
        rewardType: 'threshold_bonus',
        amountCash: amount,
        status: 'delivered',
        date: 'Today',
        txId: `TX-BONUS-${Math.floor(10000 + Math.random() * 90000)}`,
      }
      setRewardsHistory((prev) => [newReward, ...prev])
      addAuditLog('Extra Bounty Granted', userId, `Awarded +$${amount.toLocaleString()} extra bounty. Reason: ${reason}`, 'success')
      return true
    } catch (e) {
      console.error('Failed to grant extra bounty:', e)
      return false
    }
  }

  const togglePartialRewards = (enabled: boolean) => {
    saveContract({ ...contract, partialRewardsEnabled: enabled })
    addAuditLog('Partial Rewards Toggled', `#${contract.number}`, `Partial objective bounties set to ${enabled ? 'ENABLED' : 'DISABLED'}.`, 'normal')
  }

  const createContract = async (newContract: Partial<AdminContractSettings>) => {
    const created: AdminContractSettings = {
      number: newContract.number || 1848,
      status: newContract.status || 'draft',
      type: newContract.type || 'standard',
      winnerConfig: newContract.winnerConfig || '1 winner',
      startDate: newContract.startDate || new Date().toISOString(),
      endsAt: newContract.endsAt || (Date.now() + 24 * 3600 * 1000),
      participants: 0,
      rewards: newContract.rewards || [{ place: '1st', reward: '$10,000,000 + 1× Xanax' }],
      objectives: newContract.objectives || [],
      maxObjectives: newContract.maxObjectives || 10,
      partialRewardsEnabled: false,
      partialRewardPerObjective: 0,
    }
    saveContract(created)
    await adminApi.createContract({
      number: created.number,
      type: created.type,
      status: created.status,
      winnerConfig: created.winnerConfig,
      rewards: created.rewards,
      starts_at: created.startDate,
      ends_at: created.endsAt,
      max_objectives: created.maxObjectives,
      partial_rewards_enabled: false,
    })
    await refreshContracts()
    addAuditLog('Contract Created', `#${created.number}`, `Created new ${created.type.toUpperCase()} contract tagged as ${created.status.toUpperCase()}.`, 'success')
  }

  const deleteContractFromDirectory = async (id: number): Promise<boolean> => {
    try {
      const res = await adminApi.deleteContract(id)
      if (res?.success) {
        addAuditLog('Contract Deleted', `#${id}`, `Deleted contract #${id} from the contracts directory.`, 'danger')
        await refreshContracts()
        // If the deleted contract was the currently active view, select the newest remaining contract
        if (contract.number === id) {
          const updatedList = await adminApi.getContracts()
          if (updatedList && updatedList.length > 0) {
            await selectContract(updatedList[0].id)
          }
        }
        return true
      }
    } catch (e) {
      console.error('Failed to delete contract:', e)
    }
    return false
  }

  // Objectives
  const addObjectiveToPool = (newObj: Omit<ObjectivePoolItem, 'objId'>): string => {
    // Generate next OBJ ID
    let maxNum = 0
    objectivePool.forEach((o) => {
      const match = o.objId.match(/OBJ-(\d+)/)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n > maxNum) maxNum = n
      }
    })
    const nextNum = maxNum + 1
    const objId = `OBJ-${String(nextNum).padStart(3, '0')}`
    const item: ObjectivePoolItem = {
      ...newObj,
      objId,
      enabled: newObj.enabled ?? true,
      verificationMethod: newObj.verificationMethod || 'TORN API / Log',
      eligibleForRng: newObj.eligibleForRng ?? true,
      consecutiveAllowed: newObj.consecutiveAllowed ?? true,
      weight: newObj.weight ?? 1.0,
      partialReward: newObj.partialReward || 500000,
    }
    const updated = [...objectivePool, item]
    setObjectivePool(updated)
    try {
      localStorage.setItem('contract-agent:admin-objpool', JSON.stringify(updated))
    } catch {}
    addAuditLog('Objective Added to Pool', objId, `Created new pool objective "${item.title}".`, 'success')
    return objId
  }

  const toggleObjectiveEnabled = (objId: string) => {
    const updated = objectivePool.map((o) => (o.objId === objId ? { ...o, enabled: !o.enabled } : o))
    setObjectivePool(updated)
    try {
      localStorage.setItem('contract-agent:admin-objpool', JSON.stringify(updated))
    } catch {}
    addAuditLog('Objective Toggled', objId, `Objective enabled state changed.`)
  }

  const updateObjectiveInPool = (objId: string, updatedFields: Partial<ObjectivePoolItem>) => {
    const updated = objectivePool.map((o) => (o.objId === objId ? { ...o, ...updatedFields } : o))
    setObjectivePool(updated)
    try {
      localStorage.setItem('contract-agent:admin-objpool', JSON.stringify(updated))
    } catch {}

    // Reflect changes everywhere: if this objective is active in the contract, update it as well
    const poolItem = updated.find((o) => o.objId === objId)
    if (poolItem && contract && Array.isArray(contract.objectives)) {
      let contractChanged = false
      const updatedContractObjs = contract.objectives.map((co) => {
        const matches =
          (co.agent_note && co.agent_note.includes(objId)) ||
          co.title.trim().toLowerCase() === (updatedFields.title || poolItem.title).trim().toLowerCase()
        if (matches) {
          contractChanged = true
          return {
            ...co,
            title: updatedFields.title ?? poolItem.title,
            name: updatedFields.title ?? poolItem.title,
            category: updatedFields.category ?? poolItem.category,
            difficulty: updatedFields.difficulty ?? poolItem.difficulty,
            complexity: (updatedFields.difficulty ?? poolItem.difficulty) as any,
            target: updatedFields.target ?? poolItem.target,
            bounty: updatedFields.partialReward ?? poolItem.partialReward ?? co.bounty,
            partialReward: updatedFields.partialReward ?? poolItem.partialReward ?? co.partialReward,
            metric: updatedFields.metric ?? poolItem.metric ?? co.metric,
            log_pattern: updatedFields.log_pattern ?? poolItem.log_pattern,
            log_patterns: updatedFields.log_patterns ?? poolItem.log_patterns,
          }
        }
        return co
      })

      if (contractChanged) {
        saveContract({ ...contract, objectives: updatedContractObjs })
      }
    }

    addAuditLog('Objective Configured', objId, `Objective properties and syntax pattern updated.`)
  }

  const replaceObjective = (index: number, newObj: Omit<Objective, 'id' | 'current'> & { partialReward?: number }) => {
    const updated = [...contract.objectives]
    const oldTitle = updated[index]?.title || `Objective #${index + 1}`
    updated[index] = {
      ...newObj,
      id: index + 1,
      current: 0,
      partialReward: newObj.partialReward || 500000,
    }
    saveContract({ ...contract, objectives: updated })
    addAuditLog('Objective Swapped', `#${contract.number}`, `Replaced "${oldTitle}" with "${newObj.title}".`)
  }

  const invalidateObjective = (index: number, reason: string = 'Verification issue') => {
    const poolAvailable = objectivePool.filter((p) => p.enabled && !contract.objectives.some((o) => o.title === p.title))
    const targetDiff = contract.objectives[index]?.difficulty || 'medium'
    const match = poolAvailable.find((p) => p.difficulty === targetDiff) || poolAvailable[0]
    if (match) {
      replaceObjective(index, match)
      addAuditLog('Emergency Invalidation', `Obj #${index + 1}`, `Invalidated (${reason}). Replaced with "${match.title}".`, 'danger')
    }
  }

  const randomizeBalancedObjectives = () => {
    const easies = objectivePool.filter((o) => o.enabled && o.difficulty === 'easy').sort(() => 0.5 - Math.random())
    const mediums = objectivePool.filter((o) => o.enabled && o.difficulty === 'medium').sort(() => 0.5 - Math.random())
    const hards = objectivePool.filter((o) => o.enabled && o.difficulty === 'hard').sort(() => 0.5 - Math.random())
    const extremes = objectivePool.filter((o) => o.enabled && o.difficulty === 'extreme').sort(() => 0.5 - Math.random())

    const chosen = [
      ...easies.slice(0, 4),
      ...mediums.slice(0, 3),
      ...hards.slice(0, 2),
      ...extremes.slice(0, 1),
    ]

    const newObjs = chosen.map((o, idx) => ({
      id: idx + 1,
      title: o.title,
      name: o.title,
      category: o.category,
      difficulty: o.difficulty,
      complexity: o.difficulty as any,
      target: o.target,
      current: 0,
      bounty: o.partialReward || 500000,
      partialReward: o.partialReward || 500000,
      metric: o.metric || 'count',
      verification: 'log' as const,
      log_pattern: o.log_pattern || '',
      log_patterns: o.log_patterns || (o.log_pattern ? [{ key: `pat_${Date.now()}_${idx + 1}`, template: o.log_pattern }] : []),
      agent_note: `Generated from Pool (${o.objId})`,
    }))

    saveContract({ ...contract, objectives: newObjs })
    adminApi.generateBalancedObjectives(contract.number)
    addAuditLog('Balanced RNG Generation', `#${contract.number}`, 'Generated 10 objectives (4 Easy, 3 Med, 2 Hard, 1 Ext) with partial bounties.', 'success')
  }

  // Controls
  const startContract = async () => {
    updateStatus('active')
    const res = await adminApi.executeControl('start', { contractId: contract.number })
    if (res?.contract) {
      setContract((prev) => ({
        ...prev,
        status: 'active',
        endsAt: res.contract.ends_at,
        remainingMs: res.contract.remaining_ms,
      }))
    }
    await refreshContracts()
  }
  const pauseContract = async () => {
    const currentRemaining = Math.max(0, contract.endsAt - Date.now())
    setContract((prev) => ({
      ...prev,
      status: 'paused',
      remainingMs: currentRemaining,
    }))
    const res = await adminApi.executeControl('pause', { contractId: contract.number })
    if (res?.contract) {
      setContract((prev) => ({
        ...prev,
        status: 'paused',
        endsAt: res.contract.ends_at,
        remainingMs: res.contract.remaining_ms !== null && res.contract.remaining_ms !== undefined ? res.contract.remaining_ms : currentRemaining,
      }))
    }
    await refreshContracts()
    addAuditLog('Status Changed', `#${contract.number}`, 'Contract status shifted to PAUSED.', 'warning')
  }
  const resumeContract = async () => {
    updateStatus('active')
    const res = await adminApi.executeControl('resume', { contractId: contract.number })
    if (res?.contract) {
      setContract((prev) => ({
        ...prev,
        status: 'active',
        endsAt: res.contract.ends_at,
        remainingMs: res.contract.remaining_ms,
      }))
    }
    await refreshContracts()
  }
  const extendDeadlineMinutes = async (minutes: number) => {
    const res = await adminApi.executeControl('extend', { contractId: contract.number, data: { minutes } })
    if (res?.contract) {
      setContract((prev) => ({
        ...prev,
        endsAt: res.contract.ends_at,
        remainingMs: res.contract.remaining_ms,
      }))
    } else {
      const nextEndsAt = contract.endsAt + minutes * 60 * 1000
      saveContract({ ...contract, endsAt: nextEndsAt })
    }
    await refreshContracts()
    addAuditLog('Deadline Extended', `#${contract.number}`, `Extended duration by +${minutes} minutes.`, 'warning')
  }
  const endContract = async (winnerName?: string) => {
    updateStatus('completed')
    const res = await adminApi.executeControl('end', { contractId: contract.number, data: { winnerName } })
    if (res?.contract) {
      setContract((prev) => ({
        ...prev,
        status: 'completed',
        declaredWinner: res.contract.declared_winner,
        winnerStatus: res.contract.winner_status,
        remainingMs: 0,
      }))
    }
    await refreshContracts()
    addAuditLog('Ended Contract', `#${contract.number}`, `Contract marked completed. Winner: ${winnerName || 'None'}.`, 'success')
  }
  const cancelContract = async () => {
    updateStatus('cancelled')
    const res = await adminApi.executeControl('cancel', { contractId: contract.number })
    if (res?.contract) {
      setContract((prev) => ({
        ...prev,
        status: 'cancelled',
        remainingMs: 0,
      }))
    }
    await refreshContracts()
    addAuditLog('Cancelled Contract', `#${contract.number}`, 'Contract tagged as CANCELLED.', 'danger')
  }
  const resetContractProgress = async () => {
    await adminApi.executeControl('reset', { contractId: contract.number })
    const parts = await adminApi.getParticipants()
    if (parts && Array.isArray(parts)) setParticipants(parts)
    addAuditLog('Reset Progress', `#${contract.number}`, 'Reset all participant contract progress to 0 across the platform.', 'danger')
  }
  const invalidateContract = async (reason = 'API telemetry mismatch') => {
    saveContract({ ...contract, status: 'invalid' })
    await adminApi.executeControl('invalidate', { contractId: contract.number, reason })
    await refreshContracts()
    addAuditLog('Contract Invalidated', `#${contract.number}`, `Voided: ${reason}`, 'danger')
  }
  const declareWinner = async (winnerName: string) => {
    saveContract({ ...contract, status: 'completed', declaredWinner: winnerName, winnerStatus: 'Verified Winner' })
    await adminApi.executeControl('declare_winner', { contractId: contract.number, data: { winnerName } })
    await refreshContracts()
    addAuditLog('Winner Declared', `#${contract.number}`, `Declared ${winnerName} as official winner.`, 'success')
  }

  // Verification queue actions
  const retryVerification = (id: string) => {
    setVerificationQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'processing', timestamp: 'Just now' } : q)))
    setTimeout(() => {
      setVerificationQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'verified', timestamp: 'Just now' } : q)))
    }, 1500)
    addAuditLog('Retry Verification', id, 'Triggered re-check on verification node.')
  }

  const manuallyVerify = (id: string) => {
    setVerificationQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'verified', timestamp: 'Manually verified' } : q)))
    addAuditLog('Manual Verification', id, 'Admin manually flagged objective as verified.', 'warning')
  }

  const rejectVerification = (id: string) => {
    setVerificationQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'failed', timestamp: 'Rejected by admin' } : q)))
    addAuditLog('Reject Completion', id, 'Admin rejected objective submission.', 'danger')
  }

  // User management
  const suspendUser = (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'suspended' } : u)))
    adminApi.setUserStatus(userId, 'suspended')
    addAuditLog('User Suspended', userId, 'Player suspended from active contracts.', 'warning')
  }

  const banUser = (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'banned' } : u)))
    adminApi.setUserStatus(userId, 'banned')
    addAuditLog('User Banned', userId, 'Player banned permanently.', 'danger')
  }

  const restoreUser = (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u)))
    adminApi.setUserStatus(userId, 'active')
    addAuditLog('User Restored', userId, 'Player status restored to active.', 'success')
  }

  const deleteUser = async (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    await adminApi.deleteUser(userId)
    addAuditLog('User Deleted', userId, 'Player removed from platform directory.', 'danger')
  }

  const refreshUsers = async () => {
    const res = await adminApi.getUsers()
    if (res && Array.isArray(res)) {
      const seen = new Set<number>()
      const uniqueUsers: AdminUserRecord[] = []
      for (const u of res) {
        const tid = u.torn_user_id || u.tornId
        if (tid && seen.has(tid)) continue
        if (tid) seen.add(tid)
        uniqueUsers.push({
          id: u.id,
          name: u.torn_username || u.name,
          tornId: tid,
          registeredDate: u.registered_at || u.created_at || 'Recently',
          lastActive: u.last_active_at || 'Just now',
          status: u.status || 'active',
          apiStatus: u.api_key_valid ? 'working' : u.api_status ? u.api_status : u.has_api_key ? 'working' : 'missing',
          hasActiveContract: Boolean(u.has_active_contract || u.active_contract_id || (u.contracts_entered && u.contracts_entered > u.contracts_completed)),
          activeContractNumber: u.active_contract_number || u.active_contract_id || null,
          contractsEntered: u.contracts_entered || 0,
          contractsCompleted: u.contracts_completed || 0,
          wins: u.wins || 0,
          top3: u.top3 || 0,
          completionRate: u.completion_rate || '0.0%',
          contractHistory: [],
        })
      }
      setUsers(uniqueUsers)
    }
  }

  const refreshUserApiKey = async (userId: string) => {
    const res = await adminApi.checkUserApiKey(userId)
    if (res) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                apiStatus: res.valid ? 'working' : (res.status as any) || 'paused',
              }
            : u
        )
      )
    }
    return res
  }

  // Rewards
  const issueReward = (id: string) => {
    setRewardsHistory((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'delivered', txId: `TX-${Date.now().toString().slice(-5)}-TN` } : r)))
    adminApi.executeRewardAction(id, 'issue')
    addAuditLog('Issued Reward', id, 'Admin manually disbursed prize funds.', 'success')
  }

  const retryReward = (id: string) => {
    issueReward(id)
  }

  const cancelReward = (id: string) => {
    setRewardsHistory((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)))
    adminApi.executeRewardAction(id, 'cancel')
    addAuditLog('Cancelled Reward', id, 'Admin cancelled prize delivery.', 'danger')
  }

  // Alerts
  const resolveAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)))
    adminApi.resolveAlert(id)
    addAuditLog('Alert Resolved', id, 'Admin resolved system alert.')
  }

  const investigateSuspicious = (id: string) => {
    setSuspiciousActivity((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'investigating' } : s)))
    adminApi.executeSuspiciousAction(id, 'investigate')
    addAuditLog('Investigating Anomaly', id, 'Opened investigation on flagged player event.')
  }

  const clearSuspicious = (id: string) => {
    setSuspiciousActivity((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'cleared' } : s)))
    adminApi.executeSuspiciousAction(id, 'clear')
    addAuditLog('Cleared Suspicion', id, 'Flag cleared by admin review.', 'success')
  }

  // Announcements & Live Notch Banner
  const publishAnnouncement = (
    ann: Omit<AdminAnnouncement, 'id' | 'publishedAt' | 'isActive'>
  ) => {
    const newAnn: AdminAnnouncement = {
      id: `ann-${Date.now()}`,
      ...ann,
      publishedAt: 'Just now',
      isActive: true,
    }
    setAnnouncements((prev) => [newAnn, ...prev.map((a) => ({ ...a, isActive: false }))])
    adminApi.publishAnnouncement(ann)
    addAuditLog('Published Announcement', ann.target, `"${ann.title}" broadcasted across platform.`, 'success')
  }

  const toggleAnnouncementActive = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    )
    adminApi.toggleAnnouncement(id)
  }

  const dismissActiveAnnouncement = () => {
    setAnnouncements((prev) => prev.map((a) => ({ ...a, isActive: false })))
  }

  const deleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    adminApi.deleteAnnouncement(id)
    addAuditLog('Deleted Announcement', id, 'Removed announcement from history.')
  }

  const activeAnnouncement = announcements.find((a) => a.isActive) || null

  const resetToDefault = () => {
    const defaultData: AdminContractSettings = {
      number: initialToday.number,
      status: 'active',
      type: initialToday.type,
      winnerConfig: '1 winner',
      startDate: 'Oct 7, 2026 — 12:00 AM',
      endsAt: initialToday.endsAt,
      participants: initialToday.participants,
      rewards: initialToday.rewards,
      objectives: initialToday.objectives.map((o) => ({ ...o, partialReward: 500000 })),
      partialRewardsEnabled: true,
      partialRewardPerObjective: 500000,
      winnerStatus: 'Awaiting Final Verification',
    }
    saveContract(defaultData)
    adminApi.executeControl('reset')
    addAuditLog('System Reset', 'System', 'Reset configuration to factory defaults.', 'warning')
  }

  return (
    <AdminContext.Provider
      value={{
        stats,
        refreshStats,

        contract,
        contractsList,
        refreshContracts,
        selectContract,
        updateStatus,
        updateType,
        updateWinnerConfig,
        updateContractNumber,
        updateRewards,
        updateObjectives,
        updateMaxObjectives,
        togglePartialRewards,
        createContract,
        deleteContractFromDirectory,

        addObjectiveToContract,
        editObjectiveInContract,
        deleteObjectiveFromContract,
        manualOverrideTask,
        addExtraBounty,

        objectivePool,
        addObjectiveToPool,
        toggleObjectiveEnabled,
        updateObjectiveInPool,
        replaceObjective,
        invalidateObjective,
        randomizeBalancedObjectives,

        startContract,
        pauseContract,
        resumeContract,
        extendDeadlineMinutes,
        endContract,
        cancelContract,
        resetContractProgress,
        invalidateContract,
        declareWinner,

        verificationQueue,
        retryVerification,
        manuallyVerify,
        rejectVerification,

        participants,
        selectedParticipant,
        setSelectedParticipant,
        users,
        selectedUser,
        setSelectedUser,
        suspendUser,
        banUser,
        restoreUser,
        deleteUser,
        refreshUsers,
        refreshUserApiKey,

        rewardsHistory,
        issueReward,
        retryReward,
        cancelReward,

        alerts,
        resolveAlert,
        suspiciousActivity,
        investigateSuspicious,
        clearSuspicious,

        announcements,
        activeAnnouncement,
        publishAnnouncement,
        toggleAnnouncementActive,
        dismissActiveAnnouncement,
        deleteAnnouncement,

        systemHealth,
        auditLogs,
        addAuditLog,
        resetToDefault,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
