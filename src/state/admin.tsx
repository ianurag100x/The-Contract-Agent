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
  { objId: 'OBJ-001', title: 'Win 5 attacks', category: 'combat', difficulty: 'easy', target: 5, enabled: true, verificationMethod: 'TORN API / Attacks', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 250000 },
  { objId: 'OBJ-002', title: 'Lose 5 attacks', category: 'combat', difficulty: 'easy', target: 5, enabled: true, verificationMethod: 'TORN API / Attacks', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 250000 },
  { objId: 'OBJ-003', title: 'Achieve 3 critical hits', category: 'combat', difficulty: 'medium', target: 3, enabled: true, verificationMethod: 'TORN API / Battle Log', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 500000 },
  { objId: 'OBJ-004', title: 'Make 10 successful attacks', category: 'combat', difficulty: 'medium', target: 10, enabled: true, verificationMethod: 'TORN API / Attacks', eligibleForRng: true, consecutiveAllowed: true, weight: 1.2, partialReward: 750000 },
  { objId: 'OBJ-005', title: 'Make 20 attacks', category: 'combat', difficulty: 'medium', target: 20, enabled: true, verificationMethod: 'TORN API / Attacks', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 750000 },
  { objId: 'OBJ-006', title: 'Hospitalize 10 players', category: 'combat', difficulty: 'hard', target: 10, enabled: true, verificationMethod: 'TORN API / Attacks', eligibleForRng: true, consecutiveAllowed: false, weight: 0.8, partialReward: 1000000 },
  { objId: 'OBJ-007', title: 'Win an attack without temporary weapon', category: 'combat', difficulty: 'hard', target: 1, enabled: true, verificationMethod: 'TORN API / Battle Log', eligibleForRng: true, consecutiveAllowed: false, weight: 0.8, partialReward: 1000000 },
  { objId: 'OBJ-008', title: 'Defeat a player 5+ levels above you', category: 'combat', difficulty: 'extreme', target: 1, enabled: true, verificationMethod: 'TORN API / Attacks + Profile', eligibleForRng: true, consecutiveAllowed: false, weight: 0.5, partialReward: 1500000 },
  { objId: 'OBJ-009', title: 'Defeat a player with higher battle stats', category: 'combat', difficulty: 'extreme', target: 1, enabled: true, verificationMethod: 'TORN API / Battle Log', eligibleForRng: true, consecutiveAllowed: false, weight: 0.5, partialReward: 1500000 },

  // Travel
  { objId: 'OBJ-020', title: 'Fly using a specific airport', category: 'travel', difficulty: 'easy', target: 1, enabled: true, verificationMethod: 'TORN API / Travel Logs', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 250000 },
  { objId: 'OBJ-021', title: 'Travel to Japan', category: 'travel', difficulty: 'medium', target: 1, enabled: true, verificationMethod: 'TORN API / Travel', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 500000 },
  { objId: 'OBJ-022', title: 'Travel to 3 different countries', category: 'travel', difficulty: 'medium', target: 3, enabled: true, verificationMethod: 'TORN API / Travel', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 500000 },
  { objId: 'OBJ-024', title: 'Fly to Switzerland twice', category: 'travel', difficulty: 'hard', target: 2, enabled: true, verificationMethod: 'TORN API / Travel', eligibleForRng: true, consecutiveAllowed: false, weight: 0.8, partialReward: 750000 },
  { objId: 'OBJ-025', title: 'Spend 6 hours outside Torn', category: 'travel', difficulty: 'hard', target: 6, enabled: true, verificationMethod: 'TORN API / Travel Timers', eligibleForRng: true, consecutiveAllowed: false, weight: 0.8, partialReward: 750000 },

  // Energy / Items
  { objId: 'OBJ-030', title: 'Use 5 medical items', category: 'energy', difficulty: 'easy', target: 5, enabled: true, verificationMethod: 'TORN API / Inventory & Events', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 200000 },
  { objId: 'OBJ-031', title: 'Consume 3 booster items', category: 'energy', difficulty: 'easy', target: 3, enabled: true, verificationMethod: 'TORN API / Item Logs', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 250000 },
  { objId: 'OBJ-032', title: 'Use 1,500 Energy', category: 'energy', difficulty: 'medium', target: 1500, enabled: true, verificationMethod: 'TORN API / User Stats', eligibleForRng: true, consecutiveAllowed: true, weight: 1.2, partialReward: 500000 },
  { objId: 'OBJ-033', title: 'Use 5 Xanax', category: 'energy', difficulty: 'medium', target: 5, enabled: true, verificationMethod: 'TORN API / Personal Stats', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 500000 },
  { objId: 'OBJ-034', title: 'Use 1,000 Energy without overdosing', category: 'energy', difficulty: 'hard', target: 1000, enabled: true, verificationMethod: 'TORN API / Telemetry', eligibleForRng: true, consecutiveAllowed: false, weight: 0.8, partialReward: 1000000 },

  // Economy
  { objId: 'OBJ-040', title: 'Buy an item from the market', category: 'economy', difficulty: 'easy', target: 1, enabled: true, verificationMethod: 'TORN API / Market Logs', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 200000 },
  { objId: 'OBJ-041', title: 'Complete a trade', category: 'economy', difficulty: 'easy', target: 1, enabled: true, verificationMethod: 'TORN API / Trades', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 250000 },
  { objId: 'OBJ-042', title: 'Sell an item through the item market', category: 'economy', difficulty: 'easy', target: 1, enabled: true, verificationMethod: 'TORN API / Market Logs', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 300000 },
  { objId: 'OBJ-043', title: 'Spend $2M', category: 'economy', difficulty: 'medium', target: 2_000_000, enabled: true, verificationMethod: 'TORN API / Money Logs', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 500000 },
  { objId: 'OBJ-044', title: 'Make $1M from item sales', category: 'economy', difficulty: 'medium', target: 1_000_000, enabled: true, verificationMethod: 'TORN API / Market Logs', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 500000 },
  { objId: 'OBJ-045', title: 'Earn $5M', category: 'economy', difficulty: 'hard', target: 5_000_000, enabled: true, verificationMethod: 'TORN API / Money Logs', eligibleForRng: true, consecutiveAllowed: false, weight: 0.8, partialReward: 1000000 },

  // General Torn
  { objId: 'OBJ-050', title: 'Complete 3 crimes', category: 'general', difficulty: 'easy', target: 3, enabled: true, verificationMethod: 'TORN API / Crimes 2.0', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 350000 },
  { objId: 'OBJ-051', title: 'Complete 3 missions', category: 'general', difficulty: 'easy', target: 3, enabled: true, verificationMethod: 'TORN API / Missions', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 250000 },
  { objId: 'OBJ-052', title: 'Visit a specific location', category: 'general', difficulty: 'easy', target: 1, enabled: true, verificationMethod: 'TORN API / Events', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 200000 },
  { objId: 'OBJ-053', title: 'Complete 5 crimes', category: 'general', difficulty: 'medium', target: 5, enabled: true, verificationMethod: 'TORN API / Crimes 2.0', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 500000 },
  { objId: 'OBJ-054', title: 'Train 1,000 stat points', category: 'general', difficulty: 'medium', target: 1000, enabled: true, verificationMethod: 'TORN API / Gym Trains', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 500000 },
  { objId: 'OBJ-055', title: 'Complete an education course', category: 'general', difficulty: 'hard', target: 1, enabled: true, verificationMethod: 'TORN API / Education', eligibleForRng: true, consecutiveAllowed: false, weight: 0.8, partialReward: 750000 },

  // Faction
  { objId: 'OBJ-060', title: 'Donate to your faction', category: 'faction', difficulty: 'easy', target: 1, enabled: true, verificationMethod: 'TORN API / Faction Vault', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 200000 },
  { objId: 'OBJ-061', title: 'Make 10 faction attacks', category: 'faction', difficulty: 'medium', target: 10, enabled: true, verificationMethod: 'TORN API / Faction Warfare', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 750000 },
  { objId: 'OBJ-062', title: 'Participate in a war', category: 'faction', difficulty: 'medium', target: 1, enabled: true, verificationMethod: 'TORN API / Faction Warfare', eligibleForRng: true, consecutiveAllowed: true, weight: 1.0, partialReward: 750000 },
  { objId: 'OBJ-063', title: 'Gain 5,000 faction respect', category: 'faction', difficulty: 'hard', target: 5000, enabled: true, verificationMethod: 'TORN API / Faction Respect', eligibleForRng: true, consecutiveAllowed: false, weight: 0.8, partialReward: 1000000 },
  { objId: 'OBJ-064', title: 'Complete a faction-related action', category: 'faction', difficulty: 'hard', target: 1, enabled: true, verificationMethod: 'TORN API / Faction Logs', eligibleForRng: true, consecutiveAllowed: false, weight: 0.8, partialReward: 1000000 },
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
  objectives: (Objective & { partialReward?: number })[]
  partialRewardsEnabled?: boolean
  partialRewardPerObjective?: number
  winnerStatus?: 'Awaiting Final Verification' | 'Verified Winner' | 'Reward Distributed'
  declaredWinner?: string
}

interface AdminContextType {
  // Contract
  contract: AdminContractSettings
  updateStatus: (status: AdminContractStatus) => void
  updateType: (type: ContractType) => void
  updateWinnerConfig: (winnerConfig: WinnerConfig) => void
  updateContractNumber: (num: number) => void
  updateRewards: (rewards: Reward[]) => void
  updateObjectives: (objectives: (Objective & { partialReward?: number })[]) => void
  togglePartialRewards: (enabled: boolean) => void
  createContract: (newContract: Partial<AdminContractSettings>) => void

  // Objectives
  objectivePool: ObjectivePoolItem[]
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
  endContract: () => void
  cancelContract: () => void
  invalidateContract: (reason?: string) => void
  declareWinner: (winnerName: string) => void

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
    try {
      const stored = localStorage.getItem('contract-agent:admin-contract-v3')
      if (stored) return JSON.parse(stored)
    } catch {}
    return {
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
  })

  // Objective Pool
  const [objectivePool, setObjectivePool] = useState<ObjectivePoolItem[]>(() => {
    try {
      const stored = localStorage.getItem('contract-agent:admin-objpool')
      if (stored) return JSON.parse(stored)
    } catch {}
    return OBJECTIVE_POOL
  })

  // Verification Queue
  const [verificationQueue, setVerificationQueue] = useState<VerificationQueueItem[]>([
    { id: 'vq-1', playerName: 'PlayerA', objectiveTitle: 'Use 1,500 Energy', objectiveId: 'OBJ-032', status: 'verified', timestamp: '2 sec ago', apiData: 'Energy spent: 1500 / 1500' },
    { id: 'vq-2', playerName: 'PlayerD', objectiveTitle: 'Fly to Switzerland ×2', objectiveId: 'OBJ-024', status: 'processing', timestamp: '5 sec ago', apiData: 'Flight log check in progress' },
    { id: 'vq-3', playerName: 'PlayerB', objectiveTitle: 'Lose 5 attacks', objectiveId: 'OBJ-002', status: 'verified', timestamp: '8 sec ago', apiData: 'Attacks lost: 5/5' },
    { id: 'vq-4', playerName: 'PlayerC', objectiveTitle: 'Defeat level +5 player', objectiveId: 'OBJ-008', status: 'error', timestamp: '12 sec ago', apiData: 'API timeout connecting to Torn log' },
    { id: 'vq-5', playerName: 'PlayerE', objectiveTitle: 'Travel to 3 countries', objectiveId: 'OBJ-022', status: 'pending', timestamp: '18 sec ago' },
  ])

  // Participants
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: 'p-1',
      name: 'PlayerA',
      tornId: 1948201,
      rank: 1,
      completedCount: 9,
      totalCount: 10,
      partialRewardsEarned: 4500000,
      lastActive: '10 sec ago',
      status: 'active',
      objectivesProgress: initialToday.objectives.map((o, idx) => ({
        id: o.id,
        title: o.title,
        category: o.category,
        difficulty: o.difficulty,
        current: idx === 9 ? 4200 : o.target,
        target: o.target,
        partialReward: 500000,
        partialRewardStatus: idx < 9 ? 'credited' : 'unearned',
        verifiedAt: idx < 9 ? `${idx * 15 + 2}m after release` : undefined,
        apiEventId: idx < 9 ? `EVT-849${idx}` : undefined,
      })),
    },
    {
      id: 'p-2',
      name: 'PlayerD',
      tornId: 2391048,
      rank: 2,
      completedCount: 9,
      totalCount: 10,
      partialRewardsEarned: 4500000,
      lastActive: '31 sec ago',
      status: 'active',
      objectivesProgress: initialToday.objectives.map((o, idx) => ({
        id: o.id,
        title: o.title,
        category: o.category,
        difficulty: o.difficulty,
        current: idx === 3 ? 0 : o.target,
        target: o.target,
        partialReward: 500000,
        partialRewardStatus: idx !== 3 ? 'credited' : 'unearned',
        verifiedAt: idx !== 3 ? `${idx * 18 + 5}m after release` : undefined,
        apiEventId: idx !== 3 ? `EVT-992${idx}` : undefined,
      })),
    },
    {
      id: 'p-3',
      name: 'PlayerB',
      tornId: 1820491,
      rank: 3,
      completedCount: 8,
      totalCount: 10,
      partialRewardsEarned: 3800000,
      lastActive: '1 min ago',
      status: 'active',
      objectivesProgress: initialToday.objectives.map((o, idx) => ({
        id: o.id,
        title: o.title,
        category: o.category,
        difficulty: o.difficulty,
        current: idx >= 8 ? 0 : o.target,
        target: o.target,
        partialReward: 500000,
        partialRewardStatus: idx < 8 ? 'credited' : 'unearned',
        verifiedAt: idx < 8 ? `${idx * 20 + 8}m after release` : undefined,
        apiEventId: idx < 8 ? `EVT-711${idx}` : undefined,
      })),
    },
    {
      id: 'p-14',
      name: 'Anurag',
      tornId: 2849102,
      rank: 14,
      completedCount: 6,
      totalCount: 10,
      partialRewardsEarned: 2850000,
      lastActive: '2 min ago',
      status: 'active',
      objectivesProgress: initialToday.objectives.map((o, idx) => ({
        id: o.id,
        title: o.title,
        category: o.category,
        difficulty: o.difficulty,
        current: o.current,
        target: o.target,
        partialReward: 500000,
        partialRewardStatus: idx < 6 ? 'credited' : 'unearned',
      })),
    },
    {
      id: 'p-suspicious-1',
      name: 'PlayerX',
      tornId: 4401928,
      rank: 4,
      completedCount: 8,
      totalCount: 10,
      partialRewardsEarned: 4000000,
      lastActive: '45 sec ago',
      status: 'suspicious',
      suspiciousReason: 'Completed 6 objectives within 12 seconds.',
      objectivesProgress: initialToday.objectives.map((o, idx) => ({
        id: o.id,
        title: o.title,
        category: o.category,
        difficulty: o.difficulty,
        current: idx < 8 ? o.target : 0,
        target: o.target,
        partialReward: 500000,
        isSuspicious: idx >= 2 && idx <= 7,
      })),
    },
  ])

  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null)

  // Registered Users Directory
  const [users, setUsers] = useState<AdminUserRecord[]>([
    {
      id: 'usr-1',
      name: 'PlayerA',
      tornId: 1948201,
      registeredDate: 'May 14, 2025',
      lastActive: '10 sec ago',
      status: 'active',
      contractsEntered: 37,
      contractsCompleted: 29,
      wins: 8,
      top3: 14,
      completionRate: '78.4%',
      contractHistory: [
        { contractNumber: 1847, status: 'Active', rank: '#1', completionTime: '—' },
        { contractNumber: 1846, status: 'Completed', rank: '#3', completionTime: '4h 11m' },
        { contractNumber: 1845, status: 'Completed', rank: '#1', completionTime: '2h 32m' },
      ],
    },
    {
      id: 'usr-2',
      name: 'PlayerB',
      tornId: 1820491,
      registeredDate: 'Jun 02, 2025',
      lastActive: '1 min ago',
      status: 'active',
      contractsEntered: 32,
      contractsCompleted: 24,
      wins: 5,
      top3: 11,
      completionRate: '75.0%',
      contractHistory: [
        { contractNumber: 1847, status: 'Active', rank: '#3' },
        { contractNumber: 1846, status: 'Completed', rank: '#1', completionTime: '3h 18m' },
      ],
    },
    {
      id: 'usr-3',
      name: 'PlayerD',
      tornId: 2391048,
      registeredDate: 'Aug 19, 2025',
      lastActive: '31 sec ago',
      status: 'active',
      contractsEntered: 28,
      contractsCompleted: 21,
      wins: 3,
      top3: 9,
      completionRate: '75.0%',
      contractHistory: [
        { contractNumber: 1847, status: 'Active', rank: '#2' },
        { contractNumber: 1844, status: 'Completed', rank: '#2', completionTime: '3h 44m' },
      ],
    },
    {
      id: 'usr-4',
      name: 'PlayerX',
      tornId: 4401928,
      registeredDate: 'Oct 01, 2026',
      lastActive: '45 sec ago',
      status: 'suspended',
      contractsEntered: 4,
      contractsCompleted: 3,
      wins: 1,
      top3: 2,
      completionRate: '75.0%',
      contractHistory: [
        { contractNumber: 1847, status: 'Active', rank: '#4' },
      ],
    },
  ])

  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null)

  // Rewards Ledger (Including Partial Awards)
  const [rewardsHistory, setRewardsHistory] = useState<RewardRecord[]>([
    { id: 'rw-1', contractNumber: 1847, recipient: 'PlayerA', tornId: 1948201, rank: '#1', reward: '$10,000,000 + 1× Xanax', rewardType: 'final_winner', amountCash: 10000000, status: 'pending', date: 'Today' },
    { id: 'rw-2', contractNumber: 1847, recipient: 'PlayerA', tornId: 1948201, rank: 'Partial', reward: '$4,500,000 (9 Objectives Verified)', rewardType: 'partial_objective', amountCash: 4500000, status: 'delivered', txId: 'TX-PRT-84910', date: 'Today' },
    { id: 'rw-3', contractNumber: 1847, recipient: 'Anurag', tornId: 2849102, rank: 'Partial', reward: '$2,850,000 (6 Objectives Verified)', rewardType: 'partial_objective', amountCash: 2850000, status: 'delivered', txId: 'TX-PRT-84911', date: 'Today' },
    { id: 'rw-4', contractNumber: 1846, recipient: 'PlayerB', tornId: 1820491, rank: '#1', reward: '$10,000,000 + 1× Xanax', rewardType: 'final_winner', amountCash: 10000000, status: 'delivered', txId: 'TX-89102-TN', date: 'Oct 6' },
    { id: 'rw-5', contractNumber: 1845, recipient: 'PlayerC', tornId: 3019482, rank: '#1', reward: '$10,000,000', rewardType: 'final_winner', amountCash: 10000000, status: 'delivered', txId: 'TX-88391-TN', date: 'Oct 5' },
    { id: 'rw-6', contractNumber: 1844, recipient: 'PlayerE', tornId: 2194801, rank: '#1', reward: '$10,000,000 + 1× Xanax', rewardType: 'final_winner', amountCash: 10000000, status: 'failed', date: 'Oct 4' },
  ])

  // Alerts & Issues
  const [alerts, setAlerts] = useState<AdminAlert[]>([
    { id: 'alt-1', title: '3 Verification Failures', description: 'Objective verification failed multiple times for Combat API endpoints.', type: 'verification', severity: 'danger', resolved: false, timestamp: '14 min ago' },
    { id: 'alt-2', title: '2 Reward Delivery Failures', description: 'Reward transfers for Contract #1844 and #1843 require manual retry or vault review.', type: 'reward', severity: 'warning', resolved: false, timestamp: '1h ago' },
    { id: 'alt-3', title: '1 Objective Disabled', description: 'Objective OBJ-008 was flagged and temporarily quarantined following API schema deprecation.', type: 'objective', severity: 'warning', resolved: false, timestamp: '3h ago' },
  ])

  // Announcements & Live Notch Banner
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([
    {
      id: 'ann-1',
      title: 'Contract Ending Soon',
      message: 'Only 60 minutes remain to verify today’s objectives for Contract #1847.',
      type: 'Warning',
      target: 'All users',
      publishedAt: '12 min ago',
      isActive: true,
    },
  ])

  // Suspicious Activity
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivityItem[]>([
    { id: 'susp-1', playerName: 'PlayerX', tornId: 4401928, contractNumber: 1847, event: 'Completed 6 objectives within 12 seconds.', riskLevel: 'High', timestamp: '45 sec ago', status: 'investigating' },
    { id: 'susp-2', playerName: 'PlayerY', tornId: 2910481, contractNumber: 1847, event: 'Triggered repeated verification failures & payload collisions.', riskLevel: 'Medium', timestamp: '4 min ago', status: 'investigating' },
  ])

  // System Health
  const [systemHealth] = useState<SystemHealthMetrics>({
    tornApi: 'operational',
    verificationEngine: 'operational',
    database: 'operational',
    rewardSystem: 'operational',
    authentication: 'operational',
    backgroundJobs: 'operational',
    webSocket: 'operational',
    apiRequestsToday: 182452,
    failedRequests: 23,
    verificationErrors: 7,
    avgVerificationTime: '1.8 sec',
  })

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    { id: 'log-1', admin: 'Admin01', timestamp: 'Today 04:21', action: 'Paused Contract', target: '#1847', details: 'Contract paused for maintenance.', tone: 'warning' },
    { id: 'log-2', admin: 'Admin02', timestamp: 'Today 03:51', action: 'Issued Reward', target: 'PlayerA', details: '$10M + 1x Xanax disbursed.', tone: 'success' },
  ])

  // On mount, query live backend API if available
  useEffect(() => {
    adminApi.getContract().then((res) => {
      if (res) {
        setContract((prev) => ({
          ...prev,
          number: res.id || prev.number,
          status: res.status || prev.status,
          type: res.type || prev.type,
          winnerConfig: res.winner_count || prev.winnerConfig,
          participants: res.participants || prev.participants,
          objectives: res.objectives || prev.objectives,
          partialRewardsEnabled: res.partial_rewards_enabled ?? prev.partialRewardsEnabled,
          partialRewardPerObjective: res.partial_reward_per_objective || prev.partialRewardPerObjective,
        }))
      }
    })

    adminApi.getAnnouncements().then((res) => {
      if (res && Array.isArray(res) && res.length > 0) {
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
      if (res && Array.isArray(res) && res.length > 0) {
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
            objectivesProgress: initialToday.objectives.map((o, idx) => ({
              id: o.id,
              title: o.title,
              category: o.category,
              difficulty: o.difficulty,
              current: idx < (p.progress || 0) ? o.target : 0,
              target: o.target,
              partialReward: 500000,
              partialRewardStatus: idx < (p.progress || 0) ? 'credited' : 'unearned',
            })),
          }))
        )
      }
    })

    adminApi.getRewards().then((res) => {
      if (res && Array.isArray(res) && res.length > 0) {
        setRewardsHistory(
          res.map((r: any) => ({
            id: r.id,
            contractNumber: r.contract_id,
            recipient: r.torn_username,
            tornId: r.torn_user_id,
            rank: r.rank || (r.reward_type === 'final_winner' ? '#1' : 'Partial'),
            reward: r.reward_type === 'final_winner' ? '$10,000,000 + 1× Xanax' : `$${(r.amount_cash / 1000).toFixed(0)}k (${r.description})`,
            rewardType: r.reward_type,
            amountCash: r.amount_cash,
            status: r.status ? (r.status.toLowerCase() as any) : 'delivered',
            txId: r.tx_id,
            date: r.issued_at || 'Today',
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
      partial_rewards_enabled: next.partialRewardsEnabled,
      partial_reward_per_objective: next.partialRewardPerObjective,
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

  const updateObjectives = (objectives: (Objective & { partialReward?: number })[]) => {
    saveContract({ ...contract, objectives })
    addAuditLog('Objectives Updated', `#${contract.number}`, `Active objectives array customized.`)
  }

  const togglePartialRewards = (enabled: boolean) => {
    saveContract({ ...contract, partialRewardsEnabled: enabled })
    addAuditLog('Partial Rewards Toggled', `#${contract.number}`, `Partial objective bounties set to ${enabled ? 'ENABLED' : 'DISABLED'}.`, 'normal')
  }

  const createContract = (newContract: Partial<AdminContractSettings>) => {
    const created: AdminContractSettings = {
      number: newContract.number || contract.number + 1,
      status: newContract.status || 'scheduled',
      type: newContract.type || 'standard',
      winnerConfig: newContract.winnerConfig || '1 winner',
      startDate: newContract.startDate || 'Tomorrow — 12:00 AM',
      endsAt: Date.now() + 24 * 3600 * 1000,
      participants: 0,
      rewards: newContract.rewards || [{ place: 'Winner', reward: '$10,000,000 + 1× Xanax' }],
      objectives: newContract.objectives || contract.objectives,
      partialRewardsEnabled: true,
      partialRewardPerObjective: 500000,
    }
    saveContract(created)
    adminApi.createContract({
      number: created.number,
      type: created.type,
      winnerConfig: created.winnerConfig,
      rewards: created.rewards,
      partial_rewards_enabled: true,
    })
    addAuditLog('Contract Created', `#${created.number}`, `Created new ${created.type.toUpperCase()} contract with partial bounties.`, 'success')
  }

  // Objectives
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
    addAuditLog('Objective Configured', objId, `Objective properties updated.`)
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
      category: o.category,
      difficulty: o.difficulty,
      target: o.target,
      current: 0,
      partialReward: o.partialReward || 500000,
    }))

    saveContract({ ...contract, objectives: newObjs })
    adminApi.generateBalancedObjectives(contract.number)
    addAuditLog('Balanced RNG Generation', `#${contract.number}`, 'Generated 10 objectives (4 Easy, 3 Med, 2 Hard, 1 Ext) with partial bounties.', 'success')
  }

  // Controls
  const startContract = () => {
    updateStatus('active')
    adminApi.executeControl('start')
  }
  const pauseContract = () => {
    updateStatus('paused')
    adminApi.executeControl('pause')
  }
  const resumeContract = () => {
    updateStatus('active')
    adminApi.executeControl('resume')
  }
  const extendDeadlineMinutes = (minutes: number) => {
    const nextEndsAt = contract.endsAt + minutes * 60 * 1000
    saveContract({ ...contract, endsAt: nextEndsAt })
    adminApi.executeControl('extend', { minutes })
    addAuditLog('Deadline Extended', `#${contract.number}`, `Extended duration by +${minutes} minutes.`, 'warning')
  }
  const endContract = () => {
    updateStatus('completed')
    adminApi.executeControl('end')
  }
  const cancelContract = () => {
    updateStatus('cancelled')
    adminApi.executeControl('cancel')
  }
  const invalidateContract = (reason = 'API telemetry mismatch') => {
    saveContract({ ...contract, status: 'invalid' })
    adminApi.executeControl('invalidate', { reason })
    addAuditLog('Contract Invalidated', `#${contract.number}`, `Voided: ${reason}`, 'danger')
  }
  const declareWinner = (winnerName: string) => {
    saveContract({ ...contract, status: 'completed', declaredWinner: winnerName, winnerStatus: 'Verified Winner' })
    adminApi.executeControl('declare_winner', { winnerName })
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
        contract,
        updateStatus,
        updateType,
        updateWinnerConfig,
        updateContractNumber,
        updateRewards,
        updateObjectives,
        togglePartialRewards,
        createContract,

        objectivePool,
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
