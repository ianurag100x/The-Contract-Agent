import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface User {
  id: string
  torn_user_id: number
  torn_username: string
  torn_level: number
  created_at: string
  last_seen_at: string
  status: 'active' | 'suspended' | 'banned'
  role: 'agent' | 'admin'
}

export interface ObjectiveDefinition {
  id: string
  obj_code: string
  name: string
  category: 'combat' | 'travel' | 'energy' | 'economy' | 'general' | 'faction'
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  default_target: number
  default_partial_reward: number
  verification_method: string
  eligible_for_rng: boolean
  is_active: boolean
}

export interface ContractObjective {
  id: string
  contract_id: number
  objective_definition_id: string
  objective_order: number
  title: string
  category: 'combat' | 'travel' | 'energy' | 'economy' | 'general' | 'faction'
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  target_value: number
  partial_reward: number // e.g. $500,000 per objective
  verification_status: 'active' | 'quarantined' | 'replaced'
  created_at: string
}

export interface Contract {
  id: number
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled' | 'invalid'
  type: 'standard' | 'elite' | 'black' | 'survival'
  starts_at: string
  ends_at: number
  max_objectives: number
  winner_count: string
  created_by: string
  created_at: string
  reward_configuration: { place: string; reward: string }[]
  partial_rewards_enabled: boolean
  partial_reward_per_objective: number
  settings: Record<string, unknown>
  generation_method: 'random_balanced' | 'manual' | 'hybrid'
  published_at?: string
  completed_at?: string
  winner_status?: 'Awaiting Final Verification' | 'Verified Winner' | 'Reward Distributed'
  declared_winner?: string
}

export interface ContractParticipant {
  id: string
  contract_id: number
  user_id: string
  torn_user_id: number
  torn_username: string
  started_at: string
  completed_at?: string
  status: 'active' | 'completed' | 'inactive' | 'suspicious' | 'error'
  current_rank: number
  progress: number // count of verified objectives
  total_objectives: number
  partial_rewards_earned: number // sum of partial payouts earned
  last_activity_at: string
  suspicious_reason?: string
}

export interface ParticipantObjective {
  id: string
  participant_id: string
  contract_id: number
  contract_objective_id: string
  title: string
  category: string
  difficulty: string
  status: 'pending' | 'in_progress' | 'verified' | 'failed'
  current_value: number
  target_value: number
  partial_reward: number
  partial_reward_status: 'unearned' | 'credited' | 'distributed'
  started_at: string
  completed_at?: string
  verified_at?: string
  verification_attempts: number
}

export interface PlayerEvent {
  id: string
  user_id: string
  torn_user_id: number
  event_type: string
  event_time: string
  source: string
  payload: Record<string, unknown>
  idempotency_key: string
  created_at: string
}

export interface RewardTransaction {
  id: string
  user_id: string
  torn_user_id: number
  torn_username: string
  contract_id: number
  reward_type: 'final_winner' | 'partial_objective' | 'threshold_bonus'
  rank?: string
  description: string
  amount_cash: number
  items?: string
  status: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED' | 'CANCELLED'
  issued_at: string
  delivered_at?: string
  error?: string
  tx_id?: string
}

export interface AdminAuditLog {
  id: string
  admin_id: string
  admin_name: string
  action: string
  entity_type: string
  entity_id: string
  old_value?: unknown
  new_value?: unknown
  details: string
  ip: string
  created_at: string
  tone?: 'normal' | 'warning' | 'danger' | 'success'
}

export interface SecurityEvent {
  id: string
  user_id: string
  torn_user_id: number
  torn_username: string
  contract_id: number
  event_type: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  description: string
  metadata?: Record<string, unknown>
  created_at: string
  resolved_at?: string
  status: 'investigating' | 'cleared' | 'flagged'
}

export interface SystemAnnouncement {
  id: string
  title: string
  message: string
  type: 'Information' | 'Warning' | 'Important' | 'Maintenance'
  target: 'Dashboard' | 'Contract page' | 'All users'
  published_at: string
  is_active: boolean
}

export interface SystemAlert {
  id: string
  title: string
  description: string
  type: 'verification' | 'reward' | 'objective' | 'api' | 'security'
  severity: 'warning' | 'danger' | 'info'
  resolved: boolean
  timestamp: string
}

export interface DatabaseSchema {
  users: User[]
  contracts: Contract[]
  objective_definitions: ObjectiveDefinition[]
  contract_objectives: ContractObjective[]
  contract_participants: ContractParticipant[]
  participant_objectives: ParticipantObjective[]
  player_events: PlayerEvent[]
  reward_transactions: RewardTransaction[]
  admin_audit_logs: AdminAuditLog[]
  security_events: SecurityEvent[]
  announcements: SystemAnnouncement[]
  system_alerts: SystemAlert[]
  settings: Record<string, unknown>
}

// Compute database storage path
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_DIR = path.resolve(__dirname, '../data')
const DB_PATH = path.join(DB_DIR, 'db.json')

class Database {
  private data: DatabaseSchema

  constructor() {
    this.ensureDir()
    this.data = this.loadOrSeed()
  }

  private ensureDir() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
  }

  private loadOrSeed(): DatabaseSchema {
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8')
        return JSON.parse(raw) as DatabaseSchema
      } catch (err) {
        console.error('Error reading db.json, re-seeding database:', err)
      }
    }
    const seeded = this.getSeedData()
    this.saveData(seeded)
    return seeded
  }

  private saveData(data: DatabaseSchema) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
  }

  public persist() {
    this.saveData(this.data)
  }

  public get<K extends keyof DatabaseSchema>(table: K): DatabaseSchema[K] {
    return this.data[table]
  }

  public set<K extends keyof DatabaseSchema>(table: K, value: DatabaseSchema[K]) {
    this.data[table] = value
    this.persist()
  }

  private getSeedData(): DatabaseSchema {
    const defaultObjectiveDefinitions: ObjectiveDefinition[] = [
      { id: 'def-1', obj_code: 'OBJ-001', name: 'Use 1,500 Energy', category: 'energy', difficulty: 'medium', default_target: 1500, default_partial_reward: 500000, verification_method: 'TORN API / User Stats', eligible_for_rng: true, is_active: true },
      { id: 'def-2', obj_code: 'OBJ-002', name: 'Fly to Switzerland twice', category: 'travel', difficulty: 'hard', default_target: 2, default_partial_reward: 750000, verification_method: 'TORN API / Travel', eligible_for_rng: true, is_active: true },
      { id: 'def-3', obj_code: 'OBJ-003', name: 'Lose 5 attacks', category: 'combat', difficulty: 'easy', default_target: 5, default_partial_reward: 250000, verification_method: 'TORN API / Attacks', eligible_for_rng: true, is_active: true },
      { id: 'def-4', obj_code: 'OBJ-004', name: 'Defeat a player 5+ levels above you', category: 'combat', difficulty: 'extreme', default_target: 1, default_partial_reward: 1000000, verification_method: 'TORN API / Battle Log', eligible_for_rng: true, is_active: true },
      { id: 'def-5', obj_code: 'OBJ-005', name: 'Complete 3 crimes', category: 'general', difficulty: 'easy', default_target: 3, default_partial_reward: 350000, verification_method: 'TORN API / Crimes 2.0', eligible_for_rng: true, is_active: true },
      { id: 'def-6', obj_code: 'OBJ-006', name: 'Use 5 medical items', category: 'energy', difficulty: 'easy', default_target: 5, default_partial_reward: 200000, verification_method: 'TORN API / Items', eligible_for_rng: true, is_active: true },
      { id: 'def-7', obj_code: 'OBJ-007', name: 'Travel to 3 different countries', category: 'travel', difficulty: 'medium', default_target: 3, default_partial_reward: 500000, verification_method: 'TORN API / Travel', eligible_for_rng: true, is_active: true },
      { id: 'def-8', obj_code: 'OBJ-008', name: 'Make 10 successful attacks', category: 'combat', difficulty: 'medium', default_target: 10, default_partial_reward: 750000, verification_method: 'TORN API / Attacks', eligible_for_rng: true, is_active: true },
      { id: 'def-9', obj_code: 'OBJ-009', name: 'Sell an item through the item market', category: 'economy', difficulty: 'easy', default_target: 1, default_partial_reward: 300000, verification_method: 'TORN API / Market', eligible_for_rng: true, is_active: true },
      { id: 'def-10', obj_code: 'OBJ-010', name: 'Gain 5,000 faction respect', category: 'faction', difficulty: 'hard', default_target: 5000, default_partial_reward: 1000000, verification_method: 'TORN API / Respect', eligible_for_rng: true, is_active: true },
      // Pool overflow
      { id: 'def-11', obj_code: 'OBJ-011', name: 'Hospitalize 10 players', category: 'combat', difficulty: 'hard', default_target: 10, default_partial_reward: 800000, verification_method: 'TORN API / Attacks', eligible_for_rng: true, is_active: true },
      { id: 'def-12', obj_code: 'OBJ-012', name: 'Spend $2M in market', category: 'economy', difficulty: 'medium', default_target: 2000000, default_partial_reward: 500000, verification_method: 'TORN API / Money', eligible_for_rng: true, is_active: true },
      { id: 'def-13', obj_code: 'OBJ-013', name: 'Train 1,000 stat points', category: 'general', difficulty: 'medium', default_target: 1000, default_partial_reward: 500000, verification_method: 'TORN API / Gym', eligible_for_rng: true, is_active: true },
      { id: 'def-14', obj_code: 'OBJ-014', name: 'Donate to your faction', category: 'faction', difficulty: 'easy', default_target: 1, default_partial_reward: 200000, verification_method: 'TORN API / Faction', eligible_for_rng: true, is_active: true },
    ]

    const defaultContract: Contract = {
      id: 1847,
      status: 'active',
      type: 'standard',
      starts_at: 'Oct 7, 2026 — 12:00 AM',
      ends_at: Date.now() + (17 * 3600 + 39 * 60 + 45) * 1000,
      max_objectives: 10,
      winner_count: '1 winner',
      created_by: 'Admin01',
      created_at: new Date().toISOString(),
      reward_configuration: [{ place: '1st (Grand Winner)', reward: '$10,000,000 + 1× Xanax' }],
      partial_rewards_enabled: true,
      partial_reward_per_objective: 500000,
      settings: { tie_breaking: 'fastest_time' },
      generation_method: 'random_balanced',
      winner_status: 'Awaiting Final Verification',
    }

    const pastContracts: Contract[] = [
      { id: 1846, status: 'completed', type: 'elite', starts_at: 'Oct 6, 2026', ends_at: Date.now() - 86400000, max_objectives: 10, winner_count: '1 winner', created_by: 'Admin01', created_at: '2026-10-06T00:00:00Z', reward_configuration: [{ place: '1st', reward: '$25,000,000' }], partial_rewards_enabled: true, partial_reward_per_objective: 750000, settings: {}, generation_method: 'random_balanced', declared_winner: 'PlayerA', completed_at: '2h 18m' },
      { id: 1845, status: 'completed', type: 'black', starts_at: 'Oct 5, 2026', ends_at: Date.now() - 172800000, max_objectives: 10, winner_count: '1 winner', created_by: 'Admin01', created_at: '2026-10-05T00:00:00Z', reward_configuration: [{ place: '1st', reward: '$50,000,000' }], partial_rewards_enabled: true, partial_reward_per_objective: 1000000, settings: {}, generation_method: 'random_balanced', declared_winner: 'PlayerB', completed_at: '1h 51m' },
      { id: 1844, status: 'completed', type: 'standard', starts_at: 'Oct 4, 2026', ends_at: Date.now() - 259200000, max_objectives: 10, winner_count: '1 winner', created_by: 'Admin01', created_at: '2026-10-04T00:00:00Z', reward_configuration: [{ place: '1st', reward: '$10,000,000' }], partial_rewards_enabled: true, partial_reward_per_objective: 500000, settings: {}, generation_method: 'random_balanced', declared_winner: 'PlayerC', completed_at: '5h 07m' },
      { id: 1843, status: 'completed', type: 'survival', starts_at: 'Oct 3, 2026', ends_at: Date.now() - 345600000, max_objectives: 10, winner_count: '1 winner', created_by: 'Admin01', created_at: '2026-10-03T00:00:00Z', reward_configuration: [{ place: '1st', reward: '$30,000,000' }], partial_rewards_enabled: true, partial_reward_per_objective: 600000, settings: {}, generation_method: 'random_balanced', declared_winner: 'PlayerA', completed_at: '1h 36m' },
      { id: 1842, status: 'completed', type: 'standard', starts_at: 'Oct 2, 2026', ends_at: Date.now() - 432000000, max_objectives: 10, winner_count: '1 winner', created_by: 'Admin01', created_at: '2026-10-02T00:00:00Z', reward_configuration: [{ place: '1st', reward: '$10,000,000' }], partial_rewards_enabled: true, partial_reward_per_objective: 500000, settings: {}, generation_method: 'random_balanced', declared_winner: 'PlayerE', completed_at: '3h 08m' },
      { id: 1841, status: 'completed', type: 'elite', starts_at: 'Oct 1, 2026', ends_at: Date.now() - 518400000, max_objectives: 10, winner_count: '1 winner', created_by: 'Admin01', created_at: '2026-10-01T00:00:00Z', reward_configuration: [{ place: '1st', reward: '$20,000,000' }], partial_rewards_enabled: true, partial_reward_per_objective: 750000, settings: {}, generation_method: 'random_balanced', declared_winner: 'PlayerB', completed_at: '2h 32m' },
      { id: 1840, status: 'completed', type: 'standard', starts_at: 'Sep 30, 2026', ends_at: Date.now() - 604800000, max_objectives: 10, winner_count: '1 winner', created_by: 'Admin01', created_at: '2026-09-30T00:00:00Z', reward_configuration: [{ place: '1st', reward: '$10,000,000' }], partial_rewards_enabled: true, partial_reward_per_objective: 500000, settings: {}, generation_method: 'random_balanced', declared_winner: 'PlayerD', completed_at: '3h 44m' },
    ]

    const defaultContractObjectives: ContractObjective[] = defaultObjectiveDefinitions.slice(0, 10).map((def, idx) => ({
      id: `co-${idx + 1}`,
      contract_id: 1847,
      objective_definition_id: def.id,
      objective_order: idx + 1,
      title: def.name,
      category: def.category,
      difficulty: def.difficulty,
      target_value: def.default_target,
      partial_reward: def.default_partial_reward,
      verification_status: 'active',
      created_at: new Date().toISOString(),
    }))

    const defaultUsers: User[] = [
      { id: 'usr-1', torn_user_id: 1948201, torn_username: 'PlayerA', torn_level: 68, created_at: '2025-05-14T00:00:00Z', last_seen_at: 'Just now', status: 'active', role: 'agent' },
      { id: 'usr-2', torn_user_id: 2391048, torn_username: 'PlayerD', torn_level: 54, created_at: '2025-08-19T00:00:00Z', last_seen_at: '31 sec ago', status: 'active', role: 'agent' },
      { id: 'usr-3', torn_user_id: 1820491, torn_username: 'PlayerB', torn_level: 71, created_at: '2025-06-02T00:00:00Z', last_seen_at: '1 min ago', status: 'active', role: 'agent' },
      { id: 'usr-4', torn_user_id: 2849102, torn_username: 'Anurag', torn_level: 48, created_at: '2025-09-01T00:00:00Z', last_seen_at: '2 min ago', status: 'active', role: 'agent' },
      { id: 'usr-5', torn_user_id: 4401928, torn_username: 'PlayerX', torn_level: 32, created_at: '2026-10-01T00:00:00Z', last_seen_at: '45 sec ago', status: 'suspended', role: 'agent' },
      { id: 'usr-admin-1', torn_user_id: 1000001, torn_username: 'Admin Overseer', torn_level: 100, created_at: '2024-01-01T00:00:00Z', last_seen_at: 'Just now', status: 'active', role: 'admin' },
    ]

    const defaultParticipants: ContractParticipant[] = [
      { id: 'part-1', contract_id: 1847, user_id: 'usr-1', torn_user_id: 1948201, torn_username: 'PlayerA', started_at: 'Today 00:05:12', status: 'active', current_rank: 1, progress: 9, total_objectives: 10, partial_rewards_earned: 4500000, last_activity_at: '10 sec ago' },
      { id: 'part-2', contract_id: 1847, user_id: 'usr-2', torn_user_id: 2391048, torn_username: 'PlayerD', started_at: 'Today 00:06:40', status: 'active', current_rank: 2, progress: 9, total_objectives: 10, partial_rewards_earned: 4500000, last_activity_at: '31 sec ago' },
      { id: 'part-3', contract_id: 1847, user_id: 'usr-3', torn_user_id: 1820491, torn_username: 'PlayerB', started_at: 'Today 00:08:19', status: 'active', current_rank: 3, progress: 8, total_objectives: 10, partial_rewards_earned: 3800000, last_activity_at: '1 min ago' },
      { id: 'part-4', contract_id: 1847, user_id: 'usr-4', torn_user_id: 2849102, torn_username: 'Anurag', started_at: 'Today 00:15:30', status: 'active', current_rank: 14, progress: 6, total_objectives: 10, partial_rewards_earned: 2850000, last_activity_at: '2 min ago' },
      { id: 'part-5', contract_id: 1847, user_id: 'usr-5', torn_user_id: 4401928, torn_username: 'PlayerX', started_at: 'Today 01:20:00', status: 'suspicious', current_rank: 4, progress: 8, total_objectives: 10, partial_rewards_earned: 4000000, last_activity_at: '45 sec ago', suspicious_reason: 'Completed 6 objectives within 12 seconds.' },
    ]

    const defaultParticipantObjectives: ParticipantObjective[] = []
    defaultParticipants.forEach((p) => {
      defaultContractObjectives.forEach((co, idx) => {
        const isDone = idx < p.progress
        defaultParticipantObjectives.push({
          id: `po-${p.id}-${co.id}`,
          participant_id: p.id,
          contract_id: 1847,
          contract_objective_id: co.id,
          title: co.title,
          category: co.category,
          difficulty: co.difficulty,
          status: isDone ? 'verified' : 'in_progress',
          current_value: isDone ? co.target_value : Math.floor(co.target_value * 0.4),
          target_value: co.target_value,
          partial_reward: co.partial_reward,
          partial_reward_status: isDone ? 'credited' : 'unearned',
          started_at: p.started_at,
          verified_at: isDone ? 'Verified recently' : undefined,
          verification_attempts: isDone ? 1 : 0,
        })
      })
    })

    return {
      users: defaultUsers,
      contracts: [defaultContract, ...pastContracts],
      objective_definitions: defaultObjectiveDefinitions,
      contract_objectives: defaultContractObjectives,
      contract_participants: defaultParticipants,
      participant_objectives: defaultParticipantObjectives,
      player_events: [],
      reward_transactions: [
        { id: 'rw-1', user_id: 'usr-1', torn_user_id: 1948201, torn_username: 'PlayerA', contract_id: 1847, reward_type: 'final_winner', rank: '#1', description: '$10M + 1x Xanax (Grand Prize)', amount_cash: 10000000, items: '1x Xanax', status: 'PENDING', issued_at: 'Today' },
        { id: 'rw-2', user_id: 'usr-1', torn_user_id: 1948201, torn_username: 'PlayerA', contract_id: 1847, reward_type: 'partial_objective', description: 'Partial Bounty: 9 Objectives Verified', amount_cash: 4500000, status: 'DELIVERED', issued_at: 'Today', delivered_at: 'Today', tx_id: 'TX-PRT-84910' },
        { id: 'rw-3', user_id: 'usr-4', torn_user_id: 2849102, torn_username: 'Anurag', contract_id: 1847, reward_type: 'partial_objective', description: 'Partial Bounty: 6 Objectives Verified', amount_cash: 2850000, status: 'DELIVERED', issued_at: 'Today', delivered_at: 'Today', tx_id: 'TX-PRT-84911' },
      ],
      admin_audit_logs: [
        { id: 'log-1', admin_id: 'usr-admin-1', admin_name: 'Admin Overseer', action: 'System Initialization', entity_type: 'system', entity_id: 'root', details: 'Backend database initialized with partial reward system.', ip: '127.0.0.1', created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), tone: 'success' },
      ],
      security_events: [
        { id: 'sec-1', user_id: 'usr-5', torn_user_id: 4401928, torn_username: 'PlayerX', contract_id: 1847, event_type: 'RAPID_OBJECTIVE_COMPLETION', severity: 'High', description: 'Completed 6 objectives within 12 seconds.', created_at: '45 sec ago', status: 'investigating' },
      ],
      announcements: [
        { id: 'ann-1', title: 'Contract Ending Soon', message: 'Only 60 minutes remain to verify today’s objectives for Contract #1847.', type: 'Warning', target: 'All users', published_at: '12 min ago', is_active: true },
      ],
      system_alerts: [
        { id: 'alt-1', title: '3 Verification Failures', description: 'Objective verification failed multiple times for Combat API endpoints.', type: 'verification', severity: 'danger', resolved: false, timestamp: '14 min ago' },
      ],
      settings: {
        dailyResetTime: '00:00:00 TCT',
        contractDurationHours: 24,
        maxObjectives: 10,
        defaultContractType: 'standard',
        partialRewardsEnabled: true,
      },
    }
  }
}

export const db = new Database()
