import type {
  Category,
  ContractType,
  Difficulty,
  Objective,
  Reward,
} from '../../types'

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
  partialRewardsEarned?: number
  lastActive: string
  status: 'active' | 'inactive' | 'completed' | 'suspicious' | 'error'
  objectivesProgress: {
    id: number
    title: string
    category: Category
    difficulty: Difficulty
    current: number
    target: number
    partialReward?: number
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

export type AdminNavSection =
  | 'dashboard'
  | 'contracts'
  | 'objectives'
  | 'patterns'
  | 'torn-sync'
  | 'participants'
  | 'rewards'
  | 'archive'
  | 'users'
  | 'suspicious'
  | 'alerts'
  | 'announcements'
  | 'activity'
  | 'settings'
