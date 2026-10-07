-- ==============================================================================
-- THE CONTRACT AGENT - SUPABASE / POSTGRESQL SCHEMA
-- Built in accordance with TORN_The_Contract_Backend_Architecture.pdf
-- Supports: Contracts, Balanced Objectives, Live Verification, Partial Award System
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    torn_user_id BIGINT UNIQUE NOT NULL,
    torn_username VARCHAR(100) NOT NULL,
    torn_level INT NOT NULL DEFAULT 1,
    role VARCHAR(20) NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'admin', 'moderator')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. OBJECTIVE DEFINITIONS (Global Pool for RNG generation)
CREATE TABLE IF NOT EXISTS objective_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obj_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('combat', 'travel', 'energy', 'economy', 'general', 'faction')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
    default_target NUMERIC NOT NULL DEFAULT 1,
    default_partial_reward NUMERIC NOT NULL DEFAULT 500000, -- Default $500k partial bounty
    verification_method VARCHAR(255) NOT NULL,
    eligible_for_rng BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CONTRACTS TABLE
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled', 'invalid')),
    type VARCHAR(30) NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'elite', 'black', 'survival')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    max_objectives INT NOT NULL DEFAULT 10,
    winner_count VARCHAR(50) NOT NULL DEFAULT '1 winner',
    created_by VARCHAR(100) NOT NULL DEFAULT 'System',
    reward_configuration JSONB NOT NULL DEFAULT '[{"place": "1st (Grand Winner)", "reward": "$10,000,000 + 1× Xanax"}]'::jsonb,
    partial_rewards_enabled BOOLEAN NOT NULL DEFAULT true,
    partial_reward_per_objective NUMERIC NOT NULL DEFAULT 500000,
    settings JSONB NOT NULL DEFAULT '{"tie_breaking": "fastest_time"}'::jsonb,
    generation_method VARCHAR(50) NOT NULL DEFAULT 'random_balanced',
    published_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    winner_status VARCHAR(50) DEFAULT 'Awaiting Final Verification',
    declared_winner VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CONTRACT OBJECTIVES (Assigned 10 objectives per contract)
CREATE TABLE IF NOT EXISTS contract_objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id INT REFERENCES contracts(id) ON DELETE CASCADE,
    objective_definition_id UUID REFERENCES objective_definitions(id) ON DELETE SET NULL,
    objective_order INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    target_value NUMERIC NOT NULL,
    partial_reward NUMERIC NOT NULL DEFAULT 500000,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (verification_status IN ('active', 'quarantined', 'replaced')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CONTRACT PARTICIPANTS
CREATE TABLE IF NOT EXISTS contract_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id INT REFERENCES contracts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    torn_user_id BIGINT NOT NULL,
    torn_username VARCHAR(100) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'inactive', 'suspicious', 'error', 'disqualified')),
    current_rank INT NOT NULL DEFAULT 0,
    progress INT NOT NULL DEFAULT 0,
    total_objectives INT NOT NULL DEFAULT 10,
    partial_rewards_earned NUMERIC NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    suspicious_reason TEXT,
    UNIQUE(contract_id, user_id)
);

-- 6. PARTICIPANT OBJECTIVES (Individual progress on each objective)
CREATE TABLE IF NOT EXISTS participant_objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES contract_participants(id) ON DELETE CASCADE,
    contract_id INT REFERENCES contracts(id) ON DELETE CASCADE,
    contract_objective_id UUID REFERENCES contract_objectives(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('pending', 'in_progress', 'verified', 'failed')),
    current_value NUMERIC NOT NULL DEFAULT 0,
    target_value NUMERIC NOT NULL,
    partial_reward NUMERIC NOT NULL DEFAULT 0,
    partial_reward_status VARCHAR(30) NOT NULL DEFAULT 'unearned' CHECK (partial_reward_status IN ('unearned', 'credited', 'distributed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verification_attempts INT NOT NULL DEFAULT 0,
    UNIQUE(participant_id, contract_objective_id)
);

-- 7. PLAYER EVENTS (Idempotent telemetry ingestion)
CREATE TABLE IF NOT EXISTS player_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    torn_user_id BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(100) NOT NULL DEFAULT 'torn_api',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. REWARD TRANSACTIONS (Prizes & Partial Bounties)
CREATE TABLE IF NOT EXISTS reward_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    torn_user_id BIGINT NOT NULL,
    torn_username VARCHAR(100) NOT NULL,
    contract_id INT REFERENCES contracts(id) ON DELETE SET NULL,
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('final_winner', 'partial_objective', 'threshold_bonus')),
    rank VARCHAR(50),
    description TEXT NOT NULL,
    amount_cash NUMERIC NOT NULL DEFAULT 0,
    items VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    error TEXT,
    tx_id VARCHAR(100)
);

-- 9. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id VARCHAR(100) NOT NULL,
    admin_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    details TEXT NOT NULL,
    ip VARCHAR(50) NOT NULL DEFAULT '127.0.0.1',
    tone VARCHAR(20) DEFAULT 'normal' CHECK (tone IN ('normal', 'warning', 'danger', 'success')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SECURITY EVENTS
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    torn_user_id BIGINT NOT NULL,
    torn_username VARCHAR(100) NOT NULL,
    contract_id INT REFERENCES contracts(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating', 'cleared', 'flagged')),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ANNOUNCEMENTS (Top Notch Broadcast Bar)
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'Information' CHECK (type IN ('Information', 'Warning', 'Important', 'Maintenance')),
    target VARCHAR(50) NOT NULL DEFAULT 'All users',
    is_active BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. SYSTEM ALERTS
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('verification', 'reward', 'objective', 'api', 'security')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'danger')),
    resolved BOOLEAN NOT NULL DEFAULT false,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_participants_contract ON contract_participants(contract_id, status);
CREATE INDEX IF NOT EXISTS idx_part_obj_participant ON participant_objectives(participant_id);
CREATE INDEX IF NOT EXISTS idx_reward_tx_user ON reward_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_player_events_idempotency ON player_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active announcements and contracts
CREATE POLICY "Public read active contracts" ON contracts FOR SELECT USING (status != 'draft');
CREATE POLICY "Public read active announcements" ON announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Public read contract objectives" ON contract_objectives FOR SELECT USING (true);
CREATE POLICY "Service role full access" ON contracts FOR ALL USING (true);

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================
INSERT INTO objective_definitions (obj_code, name, category, difficulty, default_target, default_partial_reward, verification_method, eligible_for_rng, is_active)
VALUES
    ('OBJ-001', 'Use 1,500 Energy', 'energy', 'medium', 1500, 500000, 'TORN API / User Stats', true, true),
    ('OBJ-002', 'Fly to Switzerland twice', 'travel', 'hard', 2, 750000, 'TORN API / Travel', true, true),
    ('OBJ-003', 'Lose 5 attacks', 'combat', 'easy', 5, 250000, 'TORN API / Attacks', true, true),
    ('OBJ-004', 'Defeat a player 5+ levels above you', 'combat', 'extreme', 1, 1000000, 'TORN API / Battle Log', true, true),
    ('OBJ-005', 'Complete 3 crimes', 'general', 'easy', 3, 350000, 'TORN API / Crimes 2.0', true, true),
    ('OBJ-006', 'Use 5 medical items', 'energy', 'easy', 5, 200000, 'TORN API / Items', true, true),
    ('OBJ-007', 'Travel to 3 different countries', 'travel', 'medium', 3, 500000, 'TORN API / Travel', true, true),
    ('OBJ-008', 'Make 10 successful attacks', 'combat', 'medium', 10, 750000, 'TORN API / Attacks', true, true),
    ('OBJ-009', 'Sell an item through the item market', 'economy', 'easy', 1, 300000, 'TORN API / Market', true, true),
    ('OBJ-010', 'Gain 5,000 faction respect', 'faction', 'hard', 5000, 1000000, 'TORN API / Respect', true, true),
    ('OBJ-011', 'Hospitalize 10 players', 'combat', 'hard', 10, 800000, 'TORN API / Attacks', true, true),
    ('OBJ-012', 'Spend $2M in market', 'economy', 'medium', 2000000, 500000, 'TORN API / Money', true, true),
    ('OBJ-013', 'Train 1,000 stat points', 'general', 'medium', 1000, 500000, 'TORN API / Gym', true, true),
    ('OBJ-014', 'Donate to your faction', 'faction', 'easy', 1, 200000, 'TORN API / Faction', true, true)
ON CONFLICT (obj_code) DO NOTHING;

INSERT INTO settings (key, value)
VALUES
    ('dailyResetTime', '"00:00:00 TCT"'::jsonb),
    ('contractDurationHours', '24'::jsonb),
    ('maxObjectives', '10'::jsonb),
    ('defaultContractType', '"standard"'::jsonb),
    ('partialRewardsEnabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
