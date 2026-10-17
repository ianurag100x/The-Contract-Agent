import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Pool } = pg

// Ensure .env is read if not already loaded into process.env
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '../.env')

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  })
}

const connectionString = process.env.DATABASE_URL || ''

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  console.error('[Postgres Pool Error]', err)
})

/**
 * Helper tagged template / query wrapper matching SQLite-style convenience
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return res.rows as T[]
  } finally {
    client.release()
  }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

export async function execute(text: string, params?: any[]): Promise<{ rowCount: number }> {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return { rowCount: res.rowCount || 0 }
  } finally {
    client.release()
  }
}

/**
 * Helper to ensure Postgres tables have extra columns and initial data seeded if empty
 */
export async function initPostgresDatabase() {
  if (!connectionString) {
    console.warn('[Postgres] DATABASE_URL is not set. Database operations will fail.')
    return
  }

  try {
    console.log('[Postgres] Testing database connection...')
    const nowResult = await queryOne<{ now: string }>('SELECT NOW() as now')
    console.log('[Postgres] Connected successfully to Supabase Postgres. Server time:', nowResult?.now)

    // Ensure columns exist on Supabase tables
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS torn_api_key TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_valid INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_last_verified TEXT;

      ALTER TABLE objective_definitions ADD COLUMN IF NOT EXISTS complexity VARCHAR(20) DEFAULT 'easy';
      ALTER TABLE objective_definitions ADD COLUMN IF NOT EXISTS bounty NUMERIC DEFAULT 500000;
      ALTER TABLE objective_definitions ADD COLUMN IF NOT EXISTS agent_note TEXT DEFAULT '';
      ALTER TABLE objective_definitions ADD COLUMN IF NOT EXISTS verification VARCHAR(20) DEFAULT 'log';
      ALTER TABLE objective_definitions ADD COLUMN IF NOT EXISTS metric VARCHAR(20) DEFAULT 'count';
      ALTER TABLE objective_definitions ADD COLUMN IF NOT EXISTS log_pattern TEXT DEFAULT '';

      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS remaining_ms BIGINT DEFAULT 86400000;

      ALTER TABLE contract_objectives ADD COLUMN IF NOT EXISTS complexity VARCHAR(20) DEFAULT 'easy';
      ALTER TABLE contract_objectives ADD COLUMN IF NOT EXISTS bounty NUMERIC DEFAULT 500000;
      ALTER TABLE contract_objectives ADD COLUMN IF NOT EXISTS agent_note TEXT DEFAULT '';
      ALTER TABLE contract_objectives ADD COLUMN IF NOT EXISTS metric VARCHAR(20) DEFAULT 'count';
      ALTER TABLE contract_objectives ADD COLUMN IF NOT EXISTS verification VARCHAR(20) DEFAULT 'log';
      ALTER TABLE contract_objectives ADD COLUMN IF NOT EXISTS log_pattern TEXT DEFAULT '';

      ALTER TABLE security_events ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'Medium';
    `)

    // Seed mock/live users & contract #1847 if empty
    const userCount = await queryOne<{ count: string }>('SELECT count(*) as count FROM users')
    if (userCount && parseInt(userCount.count, 10) === 0) {
      console.log('[Postgres] Database is empty. Seeding users and initial contract...')
      await seedPostgresData()
    } else {
      // Check if contracts table has Contract #1847
      const contract1847 = await queryOne('SELECT id FROM contracts WHERE id = 1847')
      if (!contract1847) {
        console.log('[Postgres] Seeding initial Contract #1847...')
        await seedInitialContract()
      }
    }
  } catch (err: any) {
    console.error('[Postgres] Error initializing database:', err.message)
  }
}

async function seedPostgresData() {
  await pool.query(`
    INSERT INTO users (id, torn_user_id, torn_username, torn_level, status, role, created_at, last_seen_at)
    VALUES
      ('00000000-0000-0000-0000-000000000001', 1948201, 'PlayerA', 68, 'active', 'agent', NOW(), NOW()),
      ('00000000-0000-0000-0000-000000000002', 2391048, 'PlayerD', 54, 'active', 'agent', NOW(), NOW()),
      ('00000000-0000-0000-0000-000000000003', 1820491, 'PlayerB', 71, 'active', 'agent', NOW(), NOW()),
      ('00000000-0000-0000-0000-000000000004', 2849102, 'Anurag', 48, 'active', 'agent', NOW(), NOW()),
      ('00000000-0000-0000-0000-000000000005', 4401928, 'PlayerX', 32, 'suspended', 'agent', NOW(), NOW()),
      ('00000000-0000-0000-0000-000000000099', 1000001, 'Admin Overseer', 100, 'active', 'admin', NOW(), NOW())
    ON CONFLICT (torn_user_id) DO NOTHING;
  `)
  await seedInitialContract()
}

async function seedInitialContract() {
  const endsAt = new Date(Date.now() + 18 * 3600 * 1000).toISOString()
  
  await pool.query(`
    INSERT INTO contracts (
      id, status, type, starts_at, ends_at, max_objectives, winner_count, created_by,
      reward_configuration, partial_rewards_enabled, partial_reward_per_objective, generation_method, winner_status
    ) VALUES (
      1847, 'active', 'standard', NOW(), $1, 10, '1 winner', 'Overseer',
      $2::jsonb, true, 500000, 'random_balanced', 'Awaiting Final Verification'
    ) ON CONFLICT (id) DO NOTHING;
  `, [
    endsAt,
    JSON.stringify([
      { place: '1st', reward: '$10,000,000 + 1× Xanax' },
      { place: 'Top 3', reward: '$2,500,000' }
    ])
  ])

  const objectives = [
    ['def-1', 1, 'Defeat 5 players in attacks', 'combat', 'easy', 5, 250000, 'You used {energy:int} energy attacking {opponent:text} and defeated them'],
    ['def-2', 2, 'Defeat 10 players in attacks', 'combat', 'medium', 10, 500000, 'You used {energy:int} energy attacking {opponent:text} and [hospitalized|mugged|defeated] them'],
    ['def-3', 3, 'Travel to Mexico', 'travel', 'easy', 1, 200000, 'You travelled to Mexico'],
    ['def-4', 4, 'Travel to 3 different foreign countries', 'travel', 'medium', 3, 500000, 'You travelled to {country:word}'],
    ['def-5', 5, 'Consume 5 medical items', 'energy', 'easy', 5, 200000, 'You used a {item:text}'],
    ['def-6', 6, 'Use 5 Xanax', 'energy', 'medium', 5, 500000, 'You used some Xanax'],
    ['def-7', 7, 'Buy an item from the market', 'economy', 'easy', 1, 200000, 'You bought {qty:int}x {item:text} from {seller:text}'],
    ['def-8', 8, 'Spend $2M on items or trades', 'economy', 'medium', 2000000, 500000, 'You spent ${amount:number} on {item:text}'],
    ['def-9', 9, 'Complete 3 crimes', 'general', 'easy', 3, 350000, 'You used {nerve:int} nerve successfully shoplifting from the {store:text} gaining {items:text}\nYou used {nerve:int} nerve successfully responding to a {scam:text}'],
    ['def-10', 10, 'Defeat 25 players in attacks', 'combat', 'hard', 25, 1000000, 'You used {energy:int} energy attacking {opponent:text} and defeated them']
  ]

  for (const [code, order, title, cat, diff, target, partial, pattern] of objectives) {
    const coId = `00000000-0000-0000-0000-0000000000${(Number(order) < 10 ? '0' : '') + order}`
    await pool.query(`
      INSERT INTO contract_objectives (
        id, contract_id, objective_order, title, category, difficulty, target_value, partial_reward,
        verification_status, metric, verification, log_pattern
      ) VALUES (
        $1, 1847, $2, $3, $4, $5, $6, $7, 'active', 'count', 'log', $8
      ) ON CONFLICT (id) DO NOTHING;
    `, [coId, order, title, cat, diff, target, partial, pattern])
  }

  // Contract Participants
  const participants = [
    ['00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 1948201, 'PlayerA', 'active', 1, 9, 10, 4500000],
    ['00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 2391048, 'PlayerD', 'active', 2, 8, 10, 3750000],
    ['00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000003', 1820491, 'PlayerB', 'active', 3, 7, 10, 3250000],
    ['00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000004', 2849102, 'Anurag', 'active', 14, 6, 10, 2850000],
    ['00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000005', 4401928, 'PlayerX', 'suspicious', 5, 6, 10, 2500000],
  ]

  for (const [id, uid, tornId, name, status, rank, prog, tot, rewards] of participants) {
    await pool.query(`
      INSERT INTO contract_participants (
        id, contract_id, user_id, torn_user_id, torn_username, status, current_rank, progress, total_objectives, partial_rewards_earned
      ) VALUES ($1, 1847, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (contract_id, user_id) DO NOTHING;
    `, [id, uid, tornId, name, status, rank, prog, tot, rewards])
  }

  // Insert rewards
  await pool.query(`
    INSERT INTO reward_transactions (id, user_id, torn_user_id, torn_username, contract_id, reward_type, rank, description, amount_cash, items, status, tx_id)
    VALUES
      ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 1948201, 'PlayerA', 1847, 'final_winner', '#1', '$10M + 1x Xanax (Grand Prize)', 10000000, '1x Xanax', 'DELIVERED', 'TX-WIN-84909'),
      ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 1948201, 'PlayerA', 1847, 'partial_objective', '#1', 'Partial Bounty: 9 Objectives Verified', 4500000, NULL, 'DELIVERED', 'TX-PRT-84910'),
      ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000004', 2849102, 'Anurag', 1847, 'partial_objective', '#14', 'Partial Bounty: 6 Objectives Verified', 2850000, NULL, 'DELIVERED', 'TX-PRT-84911')
    ON CONFLICT (id) DO NOTHING;
  `)

  // Announcements
  await pool.query(`
    INSERT INTO announcements (id, title, message, type, target, is_active)
    VALUES
      ('00000000-0000-0000-0000-000000000031', 'Contract Ending Soon', 'Only 60 minutes remain to verify today’s objectives for Contract #1847.', 'Warning', 'All users', true),
      ('00000000-0000-0000-0000-000000000032', 'Supabase Postgres Online', 'Backend connected completely to Supabase Postgres database cluster.', 'Information', 'All users', true)
    ON CONFLICT (id) DO NOTHING;
  `)
}
