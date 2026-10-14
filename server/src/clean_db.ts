import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.resolve(__dirname, '../data/contract_local.db')

const db = new DatabaseSync(dbPath)

// 1. Foreign keys OFF
db.exec('PRAGMA foreign_keys = OFF;')

// 2. Clear contracts and contract objectives
db.exec('DELETE FROM contracts;')
db.exec('DELETE FROM contract_objectives;')

// 3. Clear participants and tasks progress
db.exec('DELETE FROM contract_participants;')
db.exec('DELETE FROM participant_objectives;')

// 4. Clear rewards and telemetry
db.exec('DELETE FROM reward_transactions;')
db.exec('DELETE FROM player_events;')
db.exec('DELETE FROM security_events;')

// 5. Delete other players/agents, preserving Anurag and Admin Overseer
db.exec("DELETE FROM users WHERE torn_username != 'Anurag' AND role != 'admin';")

// 6. Reset Anurag user record to clean status
db.exec("UPDATE users SET torn_level = 48, status = 'active' WHERE torn_username = 'Anurag';")

// Foreign keys back ON
db.exec('PRAGMA foreign_keys = ON;')

console.log('Database clean complete:')
console.log('Remaining Users:')
console.table(db.prepare('SELECT id, torn_user_id, torn_username, torn_level, role, status FROM users').all())
console.log('Contracts count:', db.prepare('SELECT count(*) as c FROM contracts').get().c)
console.log('Contract objectives count:', db.prepare('SELECT count(*) as c FROM contract_objectives').get().c)
console.log('Participants count:', db.prepare('SELECT count(*) as c FROM contract_participants').get().c)
console.log('Participant objectives count:', db.prepare('SELECT count(*) as c FROM participant_objectives').get().c)
console.log('Reward transactions count:', db.prepare('SELECT count(*) as c FROM reward_transactions').get().c)
console.log('Objective definitions count (master pool):', db.prepare('SELECT count(*) as c FROM objective_definitions').get().c)
