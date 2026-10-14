import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
// Node 22.5+ includes built-in node:sqlite
import { DatabaseSync } from 'node:sqlite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_DIR = path.resolve(__dirname, '../data')
const SQLITE_FILE = path.join(DB_DIR, 'contract_local.db')

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

export const sqliteDb = new DatabaseSync(SQLITE_FILE)

// Enable foreign keys and WAL mode for reliability and concurrency
sqliteDb.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  -- 1. Users Table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    torn_user_id INTEGER UNIQUE NOT NULL,
    torn_username TEXT NOT NULL,
    torn_level INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    role TEXT DEFAULT 'agent',
    created_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT 'Just now'
  );

  -- 2. Objective Definitions (Master Library)
  CREATE TABLE IF NOT EXISTS objective_definitions (
    id TEXT PRIMARY KEY,
    obj_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    complexity TEXT DEFAULT 'easy',
    default_target INTEGER NOT NULL,
    default_partial_reward INTEGER NOT NULL,
    bounty INTEGER DEFAULT 500000,
    agent_note TEXT DEFAULT '',
    verification_method TEXT DEFAULT 'TORN API / Log Telemetry',
    verification TEXT DEFAULT 'log',
    metric TEXT DEFAULT 'count',
    log_pattern TEXT DEFAULT '',
    eligible_for_rng INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1
  );

  -- 3. Contracts Table
  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'active',
    type TEXT NOT NULL DEFAULT 'standard',
    starts_at TEXT NOT NULL,
    ends_at INTEGER NOT NULL,
    max_objectives INTEGER DEFAULT 10,
    winner_count TEXT DEFAULT '1 winner',
    created_by TEXT DEFAULT 'Overseer',
    reward_configuration TEXT NOT NULL, -- JSON string
    partial_rewards_enabled INTEGER DEFAULT 1,
    partial_reward_per_objective INTEGER DEFAULT 500000,
    generation_method TEXT DEFAULT 'random_balanced',
    winner_status TEXT DEFAULT 'Awaiting Final Verification',
    declared_winner TEXT,
    remaining_ms INTEGER DEFAULT 86400000,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );

  -- 4. Contract Objectives Table
  CREATE TABLE IF NOT EXISTS contract_objectives (
    id TEXT PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    objective_definition_id TEXT,
    objective_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    complexity TEXT DEFAULT 'easy',
    target_value INTEGER NOT NULL,
    partial_reward INTEGER NOT NULL,
    bounty INTEGER DEFAULT 500000,
    agent_note TEXT DEFAULT '',
    metric TEXT DEFAULT 'count',
    verification TEXT DEFAULT 'log',
    log_pattern TEXT DEFAULT '',
    verification_status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );

  -- 5. Contract Participants Table
  CREATE TABLE IF NOT EXISTS contract_participants (
    id TEXT PRIMARY KEY,
    contract_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    torn_user_id INTEGER NOT NULL,
    torn_username TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    current_rank INTEGER DEFAULT 1,
    progress INTEGER DEFAULT 0,
    total_objectives INTEGER DEFAULT 10,
    partial_rewards_earned INTEGER DEFAULT 0,
    last_activity_at TEXT DEFAULT 'Just now',
    suspicious_reason TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY(contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- 6. Participant Objectives Progression Table
  CREATE TABLE IF NOT EXISTS participant_objectives (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    contract_id INTEGER NOT NULL,
    contract_objective_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    status TEXT DEFAULT 'in_progress',
    current_value INTEGER DEFAULT 0,
    target_value INTEGER NOT NULL,
    partial_reward INTEGER DEFAULT 500000,
    partial_reward_status TEXT DEFAULT 'unearned',
    started_at TEXT DEFAULT (datetime('now')),
    verified_at TEXT,
    verification_attempts INTEGER DEFAULT 0,
    FOREIGN KEY(participant_id) REFERENCES contract_participants(id) ON DELETE CASCADE,
    FOREIGN KEY(contract_objective_id) REFERENCES contract_objectives(id) ON DELETE CASCADE
  );

  -- 7. Reward Transactions Table
  CREATE TABLE IF NOT EXISTS reward_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    torn_user_id INTEGER NOT NULL,
    torn_username TEXT NOT NULL,
    contract_id INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    rank TEXT,
    description TEXT NOT NULL,
    amount_cash INTEGER NOT NULL DEFAULT 0,
    items TEXT,
    status TEXT DEFAULT 'DELIVERED',
    tx_id TEXT,
    issued_at TEXT DEFAULT (datetime('now')),
    delivered_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  -- 8. Admin Audit Logs
  CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT DEFAULT 'usr-admin-1',
    admin_name TEXT DEFAULT 'Admin Overseer',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL,
    ip TEXT DEFAULT '127.0.0.1',
    tone TEXT DEFAULT 'normal',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 9. System Announcements
  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'Information',
    target TEXT DEFAULT 'All users',
    published_at TEXT DEFAULT 'Just now',
    is_active INTEGER DEFAULT 1
  );

  -- 10. System Alerts
  CREATE TABLE IF NOT EXISTS system_alerts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'verification',
    severity TEXT DEFAULT 'warning',
    resolved INTEGER DEFAULT 0,
    timestamp TEXT DEFAULT 'Just now'
  );

  -- 11. Player Events (Idempotent Raw Ingest Stream)
  CREATE TABLE IF NOT EXISTS player_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    torn_user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_time TEXT NOT NULL,
    source TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON string
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- 12. Security Events (Anti-Cheat & Anomaly Flags)
  CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    torn_user_id INTEGER NOT NULL,
    torn_username TEXT NOT NULL,
    contract_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    risk_level TEXT DEFAULT 'Medium',
    severity TEXT DEFAULT 'Medium',
    description TEXT NOT NULL,
    metadata TEXT, -- JSON string
    status TEXT DEFAULT 'investigating',
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- 13. System Settings
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`)

// Safe column migrations
try {
  const pragmaContracts = sqliteDb.prepare("PRAGMA table_info(contracts)").all() as any[]
  if (!pragmaContracts.some(col => col.name === 'remaining_ms')) {
    sqliteDb.exec('ALTER TABLE contracts ADD COLUMN remaining_ms INTEGER DEFAULT 86400000;')
  }
} catch (e) {
  console.error('Migration warning (remaining_ms):', e)
}

// Seed initial data if tables are empty
function seedSqliteIfEmpty() {
  // If database already exists, ensure co-9 log_pattern has both patterns if currently default
  try {
    const existingCo9 = sqliteDb.prepare("SELECT log_pattern FROM contract_objectives WHERE id = 'co-9'").get() as any
    if (existingCo9 && existingCo9.log_pattern && !existingCo9.log_pattern.includes('shoplifting')) {
      sqliteDb.prepare(`
        UPDATE contract_objectives 
        SET log_pattern = ? 
        WHERE id = 'co-9'
      `).run('You used {nerve:int} nerve successfully shoplifting from the {store:text} gaining {items:text}\nYou used {nerve:int} nerve successfully responding to a {scam:text}')
    }
  } catch {}

  const userCount = (sqliteDb.prepare('SELECT count(*) as count FROM users').get() as any)?.count
  if (userCount && userCount > 0) {
    return
  }

  console.log('[SQLite] Database is empty. Seeding initial data...')

  // Insert Users
  const insertUser = sqliteDb.prepare(`
    INSERT INTO users (id, torn_user_id, torn_username, torn_level, status, role, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertUser.run('usr-1', 1948201, 'PlayerA', 68, 'active', 'agent', '2025-05-14T00:00:00Z', 'Just now')
  insertUser.run('usr-2', 2391048, 'PlayerD', 54, 'active', 'agent', '2025-08-19T00:00:00Z', '31 sec ago')
  insertUser.run('usr-3', 1820491, 'PlayerB', 71, 'active', 'agent', '2025-06-02T00:00:00Z', '1 min ago')
  insertUser.run('usr-4', 2849102, 'Anurag', 48, 'active', 'agent', '2025-09-01T00:00:00Z', 'Just now')
  insertUser.run('usr-5', 4401928, 'PlayerX', 32, 'suspended', 'agent', '2026-10-01T00:00:00Z', '45 sec ago')
  insertUser.run('usr-admin-1', 1000001, 'Admin Overseer', 100, 'active', 'admin', '2024-01-01T00:00:00Z', 'Just now')

  // Insert Objective Definitions
  const insertDef = sqliteDb.prepare(`
    INSERT INTO objective_definitions 
    (id, obj_code, name, category, difficulty, complexity, default_target, default_partial_reward, bounty, agent_note, verification_method, verification, metric, log_pattern)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const definitions = [
    ['def-1', 'OBJ-001', 'Defeat 5 players in attacks', 'combat', 'easy', 'easy', 5, 250000, 250000, 'Torn attacks', 'TORN API / Attacks', 'log', 'count', 'You used {energy:int} energy attacking {opponent:text} and defeated them'],
    ['def-2', 'OBJ-002', 'Defeat 10 players in attacks', 'combat', 'medium', 'medium', 10, 500000, 500000, 'Hospitalize or mug', 'TORN API / Attacks', 'log', 'count', 'You used {energy:int} energy attacking {opponent:text} and [hospitalized|mugged|defeated] them'],
    ['def-3', 'OBJ-003', 'Defeat 25 players in attacks', 'combat', 'hard', 'hard', 25, 1000000, 1000000, 'Chain attacks', 'TORN API / Attacks', 'log', 'count', 'You used {energy:int} energy attacking {opponent:text} and defeated them'],
    ['def-4', 'OBJ-010', 'Travel to Mexico', 'travel', 'easy', 'easy', 1, 200000, 200000, 'South border flight', 'TORN API / Travel', 'log', 'count', 'You travelled to Mexico'],
    ['def-5', 'OBJ-011', 'Travel to 3 different foreign countries', 'travel', 'medium', 'medium', 3, 500000, 500000, 'Distinct destinations', 'TORN API / Travel', 'log', 'distinct', 'You travelled to {country:word}'],
    ['def-6', 'OBJ-030', 'Consume 5 medical items', 'energy', 'easy', 'easy', 5, 200000, 200000, 'Morphine or First Aid', 'TORN API / Item Logs', 'log', 'count', 'You used a {item:text}'],
    ['def-7', 'OBJ-033', 'Use 5 Xanax', 'energy', 'medium', 'medium', 5, 500000, 500000, 'Do not overdose', 'TORN API / Personal Stats', 'log', 'count', 'You used some Xanax'],
    ['def-8', 'OBJ-040', 'Buy an item from the market', 'economy', 'easy', 'easy', 1, 200000, 200000, 'Any market item', 'TORN API / Market Logs', 'log', 'count', 'You bought {qty:int}x {item:text} from {seller:text}'],
    ['def-9', 'OBJ-043', 'Spend $2M on items or trades', 'economy', 'medium', 'medium', 2000000, 500000, 500000, 'Accumulated spending', 'TORN API / Money Logs', 'log', 'sum', 'You spent ${amount:number} on {item:text}'],
    ['def-10', 'OBJ-050', 'Complete 3 crimes', 'general', 'easy', 'easy', 3, 350000, 350000, 'Crimes 2.0', 'TORN API / Crimes 2.0', 'log', 'count', 'You used {nerve:int} nerve successfully shoplifting from the {store:text} gaining {items:text}\nYou used {nerve:int} nerve successfully responding to a {scam:text}']
  ]

  definitions.forEach((d) => insertDef.run(...d))

  // Insert Contract #1847
  const endsAt = Date.now() + 18 * 3600 * 1000
  sqliteDb.prepare(`
    INSERT INTO contracts (
      id, status, type, starts_at, ends_at, max_objectives, winner_count, created_by,
      reward_configuration, partial_rewards_enabled, partial_reward_per_objective, generation_method, winner_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    1847,
    'active',
    'standard',
    'Today 00:00 TCT',
    endsAt,
    10,
    '1 winner',
    'Overseer',
    JSON.stringify([
      { place: '1st', reward: '$10,000,000 + 1× Xanax' },
      { place: 'Top 3', reward: '$2,500,000' }
    ]),
    1,
    500000,
    'random_balanced',
    'Awaiting Final Verification'
  )

  // Insert 10 Contract Objectives for Contract #1847
  const insertCo = sqliteDb.prepare(`
    INSERT INTO contract_objectives (
      id, contract_id, objective_definition_id, objective_order, title, category, difficulty, complexity,
      target_value, partial_reward, bounty, agent_note, metric, verification, log_pattern
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const contractObjectives = [
    ['co-1', 1847, 'def-1', 1, 'Defeat 5 players in attacks', 'combat', 'easy', 'easy', 5, 250000, 250000, 'Torn attacks', 'count', 'log', 'You used {energy:int} energy attacking {opponent:text} and defeated them'],
    ['co-2', 1847, 'def-2', 2, 'Defeat 10 players in attacks', 'combat', 'medium', 'medium', 10, 500000, 500000, 'Hospitalize or mug', 'count', 'log', 'You used {energy:int} energy attacking {opponent:text} and [hospitalized|mugged|defeated] them'],
    ['co-3', 1847, 'def-4', 3, 'Travel to Mexico', 'travel', 'easy', 'easy', 1, 200000, 200000, 'South border flight', 'count', 'log', 'You travelled to Mexico'],
    ['co-4', 1847, 'def-5', 4, 'Travel to 3 different foreign countries', 'travel', 'medium', 'medium', 3, 500000, 500000, 'Distinct destinations', 'distinct', 'log', 'You travelled to {country:word}'],
    ['co-5', 1847, 'def-6', 5, 'Consume 5 medical items', 'energy', 'easy', 'easy', 5, 200000, 200000, 'Morphine or First Aid', 'count', 'log', 'You used a {item:text}'],
    ['co-6', 1847, 'def-7', 6, 'Use 5 Xanax', 'energy', 'medium', 'medium', 5, 500000, 500000, 'Do not overdose', 'count', 'log', 'You used some Xanax'],
    ['co-7', 1847, 'def-8', 7, 'Buy an item from the market', 'economy', 'easy', 'easy', 1, 200000, 200000, 'Any market item', 'count', 'log', 'You bought {qty:int}x {item:text} from {seller:text}'],
    ['co-8', 1847, 'def-9', 8, 'Spend $2M on items or trades', 'economy', 'medium', 'medium', 2000000, 500000, 500000, 'Accumulated spending', 'sum', 'log', 'You spent ${amount:number} on {item:text}'],
    ['co-9', 1847, 'def-10', 9, 'Complete 3 crimes', 'general', 'easy', 'easy', 3, 350000, 350000, 'Crimes 2.0', 'count', 'log', 'You used {nerve:int} nerve successfully shoplifting from the {store:text} gaining {items:text}\nYou used {nerve:int} nerve successfully responding to a {scam:text}'],
    ['co-10', 1847, 'def-3', 10, 'Defeat 25 players in attacks', 'combat', 'hard', 'hard', 25, 1000000, 1000000, 'Chain attacks', 'count', 'log', 'You used {energy:int} energy attacking {opponent:text} and defeated them']
  ]

  contractObjectives.forEach((co) => insertCo.run(...co))

  // Insert Participants
  const insertPart = sqliteDb.prepare(`
    INSERT INTO contract_participants (
      id, contract_id, user_id, torn_user_id, torn_username, status, current_rank, progress, total_objectives, partial_rewards_earned, last_activity_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertPart.run('part-1', 1847, 'usr-1', 1948201, 'PlayerA', 'active', 1, 9, 10, 4500000, '2 min ago')
  insertPart.run('part-2', 1847, 'usr-2', 2391048, 'PlayerD', 'active', 2, 8, 10, 3750000, '5 min ago')
  insertPart.run('part-3', 1847, 'usr-3', 1820491, 'PlayerB', 'active', 3, 7, 10, 3250000, '12 min ago')
  insertPart.run('part-4', 1847, 'usr-4', 2849102, 'Anurag', 'active', 14, 6, 10, 2850000, 'Just now')
  insertPart.run('part-5', 1847, 'usr-5', 4401928, 'PlayerX', 'suspicious', 5, 6, 10, 2500000, '45 sec ago')

  // Insert Participant Objectives Progression for Anurag (usr-4) and PlayerA (usr-1)
  const insertPo = sqliteDb.prepare(`
    INSERT INTO participant_objectives (
      id, participant_id, contract_id, contract_objective_id, title, category, difficulty, status, current_value, target_value, partial_reward, partial_reward_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  contractObjectives.forEach(([coId, , , order, title, cat, diff, , target, partial]) => {
    // Anurag has first 6 objectives completed
    const anuragDone = Number(order) <= 6
    insertPo.run(
      `po-part-4-${coId}`,
      'part-4',
      1847,
      coId,
      title,
      cat,
      diff,
      anuragDone ? 'verified' : 'in_progress',
      anuragDone ? target : Math.floor(Number(target) * 0.4),
      target,
      partial,
      anuragDone ? 'credited' : 'unearned'
    )

    // PlayerA has first 9 completed
    const playerADone = Number(order) <= 9
    insertPo.run(
      `po-part-1-${coId}`,
      'part-1',
      1847,
      coId,
      title,
      cat,
      diff,
      playerADone ? 'verified' : 'in_progress',
      playerADone ? target : Math.floor(Number(target) * 0.5),
      target,
      partial,
      playerADone ? 'credited' : 'unearned'
    )
  })

  // Insert Rewards
  const insertReward = sqliteDb.prepare(`
    INSERT INTO reward_transactions (id, user_id, torn_user_id, torn_username, contract_id, reward_type, rank, description, amount_cash, items, status, tx_id, issued_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertReward.run('rw-1', 'usr-1', 1948201, 'PlayerA', 1847, 'final_winner', '#1', '$10M + 1x Xanax (Grand Prize)', 10000000, '1x Xanax', 'DELIVERED', 'TX-WIN-84909', 'Today')
  insertReward.run('rw-2', 'usr-1', 1948201, 'PlayerA', 1847, 'partial_objective', '#1', 'Partial Bounty: 9 Objectives Verified', 4500000, null, 'DELIVERED', 'TX-PRT-84910', 'Today')
  insertReward.run('rw-3', 'usr-4', 2849102, 'Anurag', 1847, 'partial_objective', '#14', 'Partial Bounty: 6 Objectives Verified', 2850000, null, 'DELIVERED', 'TX-PRT-84911', 'Today')

  // Insert Announcements
  const insertAnn = sqliteDb.prepare(`
    INSERT INTO announcements (id, title, message, type, target, published_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  insertAnn.run('ann-1', 'Contract Ending Soon', 'Only 60 minutes remain to verify today’s objectives for Contract #1847.', 'Warning', 'All users', '12 min ago', 1)
  insertAnn.run('ann-2', 'Live SQLite Database Online', 'Server running with embedded SQLite database engine (WAL Mode).', 'Information', 'All users', 'Just now', 1)

  // Insert Audit Log
  const insertLog = sqliteDb.prepare(`
    INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, entity_type, entity_id, details, ip, tone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertLog.run('log-1', 'usr-admin-1', 'Admin Overseer', 'Database Initialized', 'system', 'sqlite', 'Embedded SQLite schema created and loaded with Contract #1847.', '127.0.0.1', 'success')

  // Insert Security Events
  const insertSec = sqliteDb.prepare(`
    INSERT INTO security_events (id, user_id, torn_user_id, torn_username, contract_id, event_type, risk_level, severity, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertSec.run('sec-1', 'usr-5', 4401928, 'PlayerX', 1847, 'Rapid Objective Verification', 'Critical', 'Critical', 'Completed 4 distinct objectives in under 4 seconds without network latency.', 'investigating')
  insertSec.run('sec-2', 'usr-2', 2391048, 'PlayerD', 1847, 'Frequent IP Switching', 'Medium', 'Medium', 'Session IP rotated 5 times across 3 subnets in 10 minutes.', 'investigating')

  // Insert Settings
  const insertSetting = sqliteDb.prepare(`
    INSERT INTO settings (key, value, description)
    VALUES (?, ?, ?)
  `)
  insertSetting.run('daily_reset_time', '00:00:00 TCT', 'Daily reset time in Torn City Time')
  insertSetting.run('default_contract_duration', '24 Hours', 'Default duration for contracts')
  insertSetting.run('max_objectives_daily', '10', 'Maximum objectives allowed per daily contract')
  insertSetting.run('api_polling_interval', '5 seconds', 'Polling interval for live player telemetry sync')

  console.log('[SQLite] Seeding complete!')
}

seedSqliteIfEmpty()
