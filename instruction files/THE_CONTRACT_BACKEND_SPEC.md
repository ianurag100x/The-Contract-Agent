# The Contract Agent: Backend Build Specification

> **Purpose.** This document is the single source of truth for building and setting up the backend of *The Contract Agent* (TORN: The Contract). It is written so a developer, or an AI coding agent, can implement it end to end without further questions. Anything uncertain is listed in **§19 Open questions** instead of being guessed.
>
> **Conventions.** MUST / MUST NOT / SHOULD / MAY are used in the RFC 2119 sense. "Agent" means a player. "Task" and "objective" are the same thing (the UI says *task* in places, the schema says *objective*). Times are **TCT (UTC)** everywhere in storage and the API.

---

## 0. Decisions & assumptions (read first)

| # | Decision | Why |
|---|---|---|
| D1 | Backend is a **standalone Node.js + TypeScript service** (API + worker), not Nuxt server routes. | The two existing frontends in this repo (`the-contract-agent`, `the-contract-agent-admin`) are Vite + React SPAs. A separate service is framework-agnostic and keeps the polling worker out of serverless limits. The earlier architecture PDF suggested Nuxt; if the team still moves to Nuxt, only the frontends change. |
| D2 | **PostgreSQL on Supabase** for DB, Auth and Realtime. Hosting: frontends on Vercel, backend + worker on Railway. | Matches the Backend Architecture PDF. |
| D3 | Job queue is **pg-boss** (Postgres-backed). No Redis in v1. | PDF: "you don't need Redis… initially." |
| D4 | **Raw log lines are stored**, and progress is *derived* from them. | Lets admins edit a task's log syntax mid-contract and rebuild everyone's progress, and makes every number auditable. |
| D5 | Progress is **recomputed from matches, never incremented.** | Makes processing idempotent (same log twice = same result). |
| D6 | Completion order is ranked by **in-game log time**, not by when we detected it. A winner is *provisional* until a short finalization window passes. | Polling is every 60 s and staggered; ranking by detection time would reward whoever happened to be polled first. |
| D7 | Per-task **bounty** is a **ledger** entry, released per contract setting (`immediate` or `on_contract_complete`, default `on_contract_complete`). | The earlier product notes warned that paying per task lets people take rewards and quit; this keeps per-task bounty while preserving the incentive to finish. |
| D8 | v1 has **no automated in-game payout.** Bounties and prizes go to a payout queue that admins mark as paid. | The Torn API is read-oriented; confirm in §19. |
| D9 | Logs count from **`contract.starts_at`** by default (configurable per contract: `contract_start` or `participant_start`). | Server-side Torn timestamps are trustworthy, so late joiners are credited retroactively. |
| D10 | Max tasks per contract is **configurable** (default 10, hard cap 50 via settings). The number 10 MUST NOT appear in code except as that default. | Requirement 6. |

---

## 1. Requirements traceability

| Req | Requirement (from product owner) | Where specified |
|---|---|---|
| 1 | Admin panel can create contracts | §9, §11.2 |
| 2 | Tasks are verified from the agent's in-game logs received via the in-game API | §7, §8 |
| 3 | API calls are made every 1 minute | §7.1 |
| 4 | Every task has its own log pattern (gym line, attack line, …) | §6, §5 (`log_patterns`) |
| 5 | Admin enters the log syntax when creating a task; logs are checked against it and the task progresses | §6, §9.1, §11.2 |
| 6 | Admin can delete / edit / add tasks in any contract; max task count is changeable | §9.2–9.4 |
| 7 | Each task has complexity, a bounty value, and an agent-facing note | §5 (`contract_objectives`), §9.1 |
| 8 | Admin can inspect any agent's task progress; manually mark complete / uncomplete, delete or reset tasks; add extra bounty to an individual agent | §10 |

---

## 2. Stack & architecture

| Layer | Choice |
|---|---|
| Runtime | Node.js 22 LTS, TypeScript (strict) |
| HTTP | Fastify + `zod` validation (`fastify-type-provider-zod`) |
| DB access | Kysely (typed SQL) + plain `.sql` migrations (`node-pg-migrate` or Supabase CLI migrations) |
| Queue / scheduler | pg-boss |
| Regex engine for admin patterns | **RE2** (`re2` npm package): linear-time, no catastrophic backtracking |
| Auth | Supabase Auth (JWT verified by the API); admin role from `admin_users` |
| Realtime | Supabase Realtime on selected tables (RLS-scoped) |
| Crypto | AES-256-GCM envelope encryption for API keys |
| Tests | Vitest, Testcontainers (Postgres), a fake Torn server (Fastify) |
| Observability | pino JSON logs (with key redaction), Sentry, `/healthz` + `/readyz` |

```
                    ┌──────────────┐
                    │  TORN API    │  (1 call / agent / minute)
                    └──────▲───────┘
                           │
┌────────────┐   ┌─────────┴───────────────────────────────┐   ┌──────────────┐
│ Player SPA │◄─►│  API service (Fastify)                   │◄─►│ Admin SPA    │
└─────▲──────┘   │   /api/v1/*   /api/v1/admin/*            │   └──────────────┘
      │          └─────────┬───────────────────────────────┘
      │ Realtime           │ SQL
      │          ┌─────────▼────────┐        ┌──────────────────────────────┐
      └──────────┤ Postgres         │◄───────┤ Worker (same codebase)       │
                 │ (Supabase)       │        │  sync.tick → sync.user       │
                 └──────────────────┘        │  engine.evaluate             │
                                             │  contract.finalize / close   │
                                             │  rebuild.objective           │
                                             └──────────────────────────────┘
```

**Principle (from the architecture PDF, unchanged):** the frontend never decides whether something happened. The backend verifies it from logs; the database owns state.

---

## 3. Repository layout & local setup

Create the backend as a new sibling project:

```
the-contract-agent-backend/
├─ package.json
├─ tsconfig.json
├─ .env.example
├─ docker-compose.yml            # local Postgres (or use `supabase start`)
├─ migrations/
│  ├─ 0001_core.sql
│  ├─ 0002_engine.sql
│  ├─ 0003_admin_ledger_audit.sql
│  ├─ 0004_views_rls.sql
│  └─ 0005_seed_settings.sql
├─ src/
│  ├─ config/env.ts              # zod-validated env
│  ├─ db/{client.ts,types.ts}
│  ├─ http/{server.ts,auth.ts,errors.ts,routes/**}
│  ├─ patterns/                  # §6: parse, compile, test, validate
│  │  ├─ template.ts  regex.ts  conditions.ts  tester.ts
│  ├─ torn/                      # §7
│  │  ├─ client.ts  normalize.ts  errors.ts  rateLimiter.ts
│  ├─ engine/                    # §8
│  │  ├─ evaluate.ts  complete.ts  rank.ts  finalize.ts  rebuild.ts
│  ├─ admin/                     # §9, §10
│  │  ├─ contracts.ts  objectives.ts  participants.ts  overrides.ts  bounty.ts
│  ├─ jobs/{boss.ts,syncTick.ts,syncUser.ts,evaluate.ts,finalize.ts,close.ts,rebuild.ts}
│  ├─ security/{crypto.ts,redact.ts,audit.ts}
│  ├─ worker.ts                  # entry: starts pg-boss workers + schedules
│  └─ server.ts                  # entry: starts the HTTP API
├─ test/{unit,integration,fixtures}/
└─ scripts/{seed.ts,fake-torn.ts,loadtest.ts}
```

### 3.1 Environment variables (`.env.example`)

```bash
NODE_ENV=development
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:54322/contract
SUPABASE_URL=...
SUPABASE_JWT_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...        # server only

# Key encryption (32 random bytes, base64). Rotate via KEK_ID.
KEY_ENCRYPTION_KEK=...
KEY_ENCRYPTION_KEK_ID=v1

# Torn
TORN_API_BASE=https://api.torn.com
TORN_GLOBAL_RPS=20                   # global ceiling on outbound requests/second
TORN_WORKER_CONCURRENCY=10

# CORS
PLAYER_ORIGIN=https://contract.example.com
ADMIN_ORIGIN=https://admin.contract.example.com

SENTRY_DSN=
LOG_LEVEL=info
```

### 3.2 Scripts (`package.json`)

```
dev:api      tsx watch src/server.ts
dev:worker   tsx watch src/worker.ts
build        tsc -p .
start:api    node dist/server.js
start:worker node dist/worker.js
migrate      node-pg-migrate up
seed         tsx scripts/seed.ts
fake-torn    tsx scripts/fake-torn.ts      # local stand-in for the Torn API
test         vitest run
lint         eslint . && tsc --noEmit
```

**"Done" for setup:** `docker compose up -d && npm run migrate && npm run seed && npm run fake-torn & npm run dev:api & npm run dev:worker` brings up a working system where a seeded agent's fake logs progress a seeded contract.

### 3.3 Deployment

Two processes from one image: **api** (scale horizontally) and **worker** (run **exactly one** scheduler instance; pg-boss guarantees singleton cron, but keep `replicas=1` for the worker until load requires more, in which case only job processing scales). Migrations run as a release step.

---

## 4. Glossary

- **Contract**: a timed competition with N tasks. Everyone gets the same tasks.
- **Task / objective**: one goal inside a contract, verified from log lines.
- **Objective definition**: reusable library entry; copied into a contract as a **contract objective** (snapshot), so later library edits never change past or running contracts.
- **Log pattern**: the syntax an admin enters; matched against an agent's log lines.
- **Metric**: how matches become progress: `count`, `sum`, or `distinct`.
- **Complexity**: `easy | medium | hard | extreme` (the admin UI currently calls this "difficulty"; rename to *complexity*).
- **Bounty**: cash value attached to a task (and, separately, ad-hoc bonuses an admin gives an agent). Tracked in the **bounty ledger**.
- **Override**: an admin's manual decision on one agent's task that takes precedence over automatic verification.

---

## 5. Data model

PostgreSQL 15+. All timestamps `timestamptz`. Money is `bigint` (whole dollars). Add a generic `updated_at` trigger to every table that has the column.

```sql
create extension if not exists pgcrypto;

-- ───────────── enums
create type user_status        as enum ('active','suspended','banned');
create type admin_role         as enum ('moderator','admin','super_admin');
create type complexity         as enum ('easy','medium','hard','extreme');
create type objective_category as enum ('combat','travel','energy','economy','general','faction');
create type verification_mode  as enum ('log','manual');
create type metric_kind        as enum ('count','sum','distinct');
create type contract_status    as enum ('draft','scheduled','active','paused','completed','cancelled','invalid');
create type winner_mode        as enum ('first_n','everyone');
create type count_from_mode    as enum ('contract_start','participant_start');
create type bounty_release     as enum ('immediate','on_contract_complete');
create type participant_status as enum ('in_progress','completed','withdrawn','disqualified');
create type task_status        as enum ('not_started','in_progress','completed');
create type task_source        as enum ('logs','admin');
create type task_override      as enum ('force_complete','force_incomplete');
create type key_status         as enum ('valid','invalid','low_access','paused','disabled','unchecked');
create type ledger_type        as enum ('task','manual_bonus','adjustment','reversal');
create type ledger_status      as enum ('pending','released','paid','cancelled','failed');

-- ───────────── identity
create table users (
  id               uuid primary key default gen_random_uuid(),
  auth_user_id     uuid unique,                        -- Supabase auth.users.id
  torn_user_id     bigint not null unique,             -- stable identity (never username)
  torn_username    text   not null,
  torn_level       int,
  status           user_status not null default 'active',
  created_at       timestamptz not null default now(),
  last_seen_at     timestamptz
);

create table admin_users (
  user_id    uuid primary key references users(id),
  role       admin_role not null default 'admin',
  created_at timestamptz not null default now()
);

-- One Torn API key per agent. Never returned by any endpoint.
create table torn_api_keys (
  user_id          uuid primary key references users(id) on delete cascade,
  key_ciphertext   bytea not null,
  key_nonce        bytea not null,
  kek_id           text  not null,
  key_last4        text  not null,                     -- display only, e.g. "••••a1b2"
  status           key_status not null default 'unchecked',
  last_error_code  int,
  consented_at     timestamptz not null,               -- explicit consent to read logs
  last_checked_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ───────────── task library (reusable definitions)
create table objective_definitions (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,               -- e.g. 'OBJ-024'
  name             text not null,
  category         objective_category not null,
  complexity       complexity not null,
  bounty           bigint not null default 0 check (bounty >= 0),
  agent_note       text   not null default '' check (char_length(agent_note) <= 500),
  verification     verification_mode not null default 'log',
  metric           metric_kind not null default 'count',
  target           numeric not null check (target > 0),
  log_patterns     jsonb not null default '[]',        -- schema in §6.6
  enabled          boolean not null default true,      -- eligible for random selection
  created_by       uuid references users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ───────────── contracts
create sequence contract_number_seq start 1848;

create table contracts (
  id                  uuid primary key default gen_random_uuid(),
  number              int  not null unique default nextval('contract_number_seq'),
  name                text not null,
  status              contract_status not null default 'draft',
  winner_mode         winner_mode not null default 'first_n',
  winner_count        int  not null default 1 check (winner_count >= 1),
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,            -- includes extensions / pause compensation
  paused_at           timestamptz,
  max_objectives      int  not null,                   -- ADMIN-EDITABLE (D10)
  objective_selection text not null default 'manual' check (objective_selection in ('manual','random','hybrid')),
  count_from          count_from_mode not null default 'contract_start',
  bounty_release      bounty_release  not null default 'on_contract_complete',
  finalization_delay_seconds int not null default 180,
  reward_configuration jsonb not null default '[]',    -- [{place:1,cash:10000000,items:"1× Xanax"}, ...]
  note                text,
  created_by          uuid references users(id),
  created_at          timestamptz not null default now(),
  published_at        timestamptz,
  completed_at        timestamptz,
  cancelled_reason    text,
  updated_at          timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on contracts (status, starts_at);

-- A task as it exists inside one contract (snapshot + per-contract overrides).
create table contract_objectives (
  id               uuid primary key default gen_random_uuid(),
  contract_id      uuid not null references contracts(id) on delete cascade,
  definition_id    uuid references objective_definitions(id) on delete set null,
  position         int  not null,
  name             text not null,
  category         objective_category not null,
  complexity       complexity not null,                -- Req 7
  bounty           bigint not null default 0 check (bounty >= 0),   -- Req 7
  agent_note       text   not null default '' check (char_length(agent_note) <= 500), -- Req 7
  verification     verification_mode not null default 'log',
  metric           metric_kind not null default 'count',
  target           numeric not null check (target > 0),
  log_patterns     jsonb not null default '[]',        -- Req 4/5, schema in §6.6
  version          int  not null default 1,            -- bump when patterns/metric/target change
  removed_at       timestamptz,                        -- soft delete (Req 6)
  removed_by       uuid references users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on contract_objectives (contract_id) where removed_at is null;

-- ───────────── participation & per-agent progress
create table contract_participants (
  id               uuid primary key default gen_random_uuid(),
  contract_id      uuid not null references contracts(id) on delete cascade,
  user_id          uuid not null references users(id),
  status           participant_status not null default 'in_progress',
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,                        -- in-game time of the log that finished the last task
  detected_at      timestamptz,                        -- when we noticed
  completion_seq   bigint,                             -- tie-break, from a sequence under an advisory lock
  final_rank       int,
  rank_finalized   boolean not null default false,
  last_activity_at timestamptz,
  unique (contract_id, user_id)
);

create table participant_objectives (
  id                    uuid primary key default gen_random_uuid(),
  participant_id        uuid not null references contract_participants(id) on delete cascade,
  contract_objective_id uuid not null references contract_objectives(id) on delete cascade,
  status                task_status not null default 'not_started',
  current_value         numeric not null default 0,
  completed_at          timestamptz,                   -- in-game time the target was crossed (or now() for admin completes)
  verified_at           timestamptz,                   -- when we confirmed it
  source                task_source not null default 'logs',
  override              task_override,                 -- §10: beats automatic verification
  counting_from         timestamptz,                   -- set by Reset; logs before this are ignored
  evaluated_version     int not null default 1,        -- contract_objectives.version last evaluated
  deleted_at            timestamptz,                   -- removed for THIS agent only (§10)
  updated_at            timestamptz not null default now(),
  unique (participant_id, contract_objective_id)
);

-- ───────────── ingested logs & matches
create table torn_log_entries (
  id            bigserial primary key,
  user_id       uuid not null references users(id) on delete cascade,
  external_id   text not null,                         -- API entry id, or sha256(user|ts|text) fallback
  occurred_at   timestamptz not null,
  category      text,
  raw_text      text not null,                         -- canonical line, e.g. "You used 25 energy attacking …"
  raw           jsonb,                                 -- full API record
  ingested_at   timestamptz not null default now(),
  unique (user_id, external_id)                        -- idempotency (D5)
);
create index on torn_log_entries (user_id, occurred_at);

create table objective_log_matches (
  id                      bigserial primary key,
  participant_objective_id uuid not null references participant_objectives(id) on delete cascade,
  log_entry_id            bigint not null references torn_log_entries(id) on delete cascade,
  pattern_key             text not null,
  value                   numeric not null,            -- 1 for count; captured number for sum
  distinct_key            text,                        -- normalized capture for 'distinct'
  captures                jsonb not null,
  objective_version       int not null,
  occurred_at             timestamptz not null,        -- copied from the log for fast ordering
  created_at              timestamptz not null default now(),
  unique (participant_objective_id, log_entry_id, pattern_key)
);
create index on objective_log_matches (participant_objective_id, occurred_at);

-- ───────────── sync bookkeeping
create table sync_state (
  user_id              uuid primary key references users(id) on delete cascade,
  cursor_ts            timestamptz,                    -- newest log time we have fully ingested
  last_success_at      timestamptz,
  last_attempt_at      timestamptz,
  consecutive_failures int not null default 0,
  next_due_at          timestamptz not null default now(),
  slot_offset_s        smallint not null default 0     -- 0–49, spreads load across the minute
);

create table sync_runs (                               -- keep 7 days
  id              bigserial primary key,
  user_id         uuid not null references users(id) on delete cascade,
  started_at      timestamptz not null default now(),
  duration_ms     int,
  http_status     int,
  torn_error_code int,
  entries_fetched int,
  entries_new     int
);

-- ───────────── money
create table bounty_ledger (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references users(id),
  contract_id              uuid not null references contracts(id),
  contract_objective_id    uuid references contract_objectives(id),
  participant_objective_id uuid references participant_objectives(id),
  type                     ledger_type not null,
  amount                   bigint not null check (amount <> 0),
  status                   ledger_status not null,
  reason                   text,                       -- required for manual_bonus / adjustment / reversal
  reverses_id              uuid references bounty_ledger(id),
  created_by_admin         uuid references users(id),
  idempotency_key          text not null unique,       -- 'task:{participant_objective_id}' etc.
  created_at               timestamptz not null default now(),
  released_at              timestamptz,
  paid_at                  timestamptz,
  payout_reference         text
);
create index on bounty_ledger (user_id, contract_id);

create table reward_transactions (                     -- contract prizes (winner places)
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid not null references contracts(id),
  user_id        uuid not null references users(id),
  place          int  not null,
  cash           bigint not null default 0,
  items          text   not null default '',
  status         text not null default 'PENDING'
                 check (status in ('PENDING','PROCESSING','DELIVERED','FAILED','CANCELLED')),
  error          text,
  issued_at      timestamptz not null default now(),
  delivered_at   timestamptz,
  unique (contract_id, user_id)
);

-- ───────────── governance
create table admin_audit_logs (
  id           bigserial primary key,
  admin_id     uuid not null references users(id),
  action       text not null,                          -- e.g. 'objective.add', 'override.mark_complete'
  entity_type  text not null,
  entity_id    text not null,
  contract_id  uuid,
  user_id      uuid,                                   -- the affected agent, if any
  old_value    jsonb,
  new_value    jsonb,
  reason       text,
  ip           inet,
  created_at   timestamptz not null default now()
);
create index on admin_audit_logs (contract_id, created_at desc);
create index on admin_audit_logs (user_id, created_at desc);
-- Append-only: REVOKE UPDATE, DELETE on this table from the application role.

create table security_events (
  id          bigserial primary key,
  user_id     uuid references users(id),
  event_type  text not null,   -- DUPLICATE_EVENT, RAPID_OBJECTIVE_COMPLETION, MANUAL_VERIFICATION, …
  severity    text not null check (severity in ('info','warn','high')),
  description text,
  metadata    jsonb,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create table contract_events (                         -- feeds realtime + activity feed
  id          bigserial primary key,
  contract_id uuid not null references contracts(id) on delete cascade,
  user_id     uuid references users(id),
  type        text not null,  -- objective_completed, rank_changed, contract_completed, admin_adjustment, …
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
-- seeds: default_max_objectives=10, hard_max_objectives=50, sync_interval_seconds=60,
--        sync_overlap_seconds=120, log_retention_days=30, sync_while_paused=true,
--        manual_bonus_super_admin_threshold=50000000
```

### 5.1 Leaderboard view

```sql
create view contract_leaderboard as
with prog as (
  select p.id participant_id, p.contract_id, p.user_id, p.completed_at, p.completion_seq,
         count(*) filter (where po.status = 'completed')   as done,
         max(po.completed_at) filter (where po.status = 'completed') as last_progress_at
  from contract_participants p
  left join participant_objectives po
         on po.participant_id = p.id and po.deleted_at is null
  left join contract_objectives co
         on co.id = po.contract_objective_id
  where p.status in ('in_progress','completed')
    and (po.id is null or co.removed_at is null)
  group by p.id
)
select *,
  row_number() over (
    partition by contract_id
    order by (completed_at is null), completed_at, completion_seq,
             done desc, last_progress_at nulls last, user_id
  ) as rank
from prog;
```

### 5.2 Retention

`torn_log_entries`: delete rows older than `log_retention_days` (default 30) **unless** referenced by `objective_log_matches` of a non-archived contract. Matched rows keep `raw_text` indefinitely for auditability. `sync_runs`: 7 days. Nightly job `maintenance.purge`.

---

## 6. Log pattern language (the core of Req 4 & 5)

Every task owns **one or more log patterns**. A log line counts toward the task only if it matches one of its patterns (and passes that pattern's conditions).

### 6.1 What a log line looks like

The agent's raw lines look like this (timestamp prefix, then the message):

```
23:41:35 - 13/10/26 You used 400 energy and 199 happiness training your strength 16 times in Frontline Fitness increasing it by 1,028,034.09 to 354,344,706.74
19:24:45 - 12/10/26 You used 25 energy attacking Hardbasta and defeated them
```

Prefix format: `HH:MM:SS - DD/MM/YY ` (TCT; `DD/MM/YY`, as `13/10/26` proves). **Patterns are written against the message only.** The matcher strips the prefix first. If the Torn API provides a numeric timestamp, use that for `occurred_at` and treat the text prefix as informational; otherwise parse it (`20YY`).

### 6.2 Template syntax (default, admin-friendly)

Admins write the message with **placeholders**. Everything outside placeholders is matched literally.

| Syntax | Meaning | Regex fragment |
|---|---|---|
| `{name:int}` | whole number, commas allowed | `(?P<name>\d[\d,]*)` |
| `{name:number}` | decimal, commas allowed | `(?P<name>\d[\d,]*(?:\.\d+)?)` |
| `{name:word}` | one run of non-space characters | `(?P<name>\S+)` |
| `{name:text}` (also `{name}`) | any text, shortest match | `(?P<name>.+?)` |
| `{...}` | anonymous wildcard (not captured) | `.*?` |
| `[abc]` | optional literal (e.g. `time[s]`) | `(?:abc)?` |
| `\{`, `\}`, `\[`, `\]` | literal brace/bracket | escaped |

Rules: the whole message must match (anchored `^…$`); spaces match `\s+`; matching is **case-sensitive** unless `case_insensitive: true`; capture names are `[a-z][a-z0-9_]{0,31}` and unique within a pattern; max template length 500 characters.

**Worked examples (these MUST be unit tests):**

*Gym:*
```
You used {energy:int} energy and {happiness:int} happiness training your {stat:word} {times:int} times in {gym:text} increasing it by {gain:number} to {total:number}
```
Against the gym line above → `energy=400, happiness=199, stat=strength, times=16, gym="Frontline Fitness", gain=1028034.09, total=354344706.74`.

*Attack (win):*
```
You used {energy:int} energy attacking {opponent:text} and defeated them
```
Against the attack line above → `energy=25, opponent="Hardbasta"`.

*Attack (loss), travel, crimes, etc.:* each is simply another pattern. **The exact wording of every other in-game log line must come from real samples** (see §16, §19); never invent log text.

### 6.3 Advanced mode (regex)

`mode: "regex"` lets power users supply a full regular expression with **named groups** `(?P<name>…)`. It runs on **RE2**, so lookaheads/backreferences are rejected at save time. Limits: ≤ 500 chars, ≤ 20 groups. Same prefix stripping and anchoring rules apply (the system adds `^…$` if absent).

### 6.4 Metrics (how matches become progress)

An objective has one `metric` and a `target`; each pattern declares where its value comes from.

| metric | Each match contributes | Needs `value_capture` | Example |
|---|---|---|---|
| `count` | `1` | no | "Make 10 successful attacks" → target 10 |
| `sum` | the captured number | yes (numeric capture) | "Use 1,500 Energy" → target 1500, patterns: gym line (`energy`), attack line (`energy`), … all feeding `energy` |
| `distinct` | `1` per **distinct** captured value (case-folded, trimmed) | yes | "Defeat 5 different players" / "Visit 3 different countries" |

Progress = `SUM(value)` for `count`/`sum`; `COUNT(DISTINCT distinct_key)` for `distinct`, **across all patterns of the objective**. Decimals are kept exactly (`numeric`); commas are stripped before parsing.

### 6.5 Conditions (optional per pattern)

A pattern may add AND-ed conditions on its captures:

```json
{"capture":"energy","op":">=","value":25}
{"capture":"gym","op":"equals","value":"Frontline Fitness"}
{"capture":"opponent","op":"not_equals","value":"Hardbasta"}
```
Numeric ops: `= != > >= < <=`. Text ops: `equals not_equals contains starts_with` (case-insensitive).

### 6.6 Stored shape of `log_patterns` (validate with zod)

```json
[
  {
    "key": "attack_win",
    "label": "Attack, won",
    "mode": "template",
    "template": "You used {energy:int} energy attacking {opponent:text} and defeated them",
    "case_insensitive": false,
    "value_capture": null,
    "conditions": []
  },
  {
    "key": "gym_train",
    "mode": "template",
    "template": "You used {energy:int} energy and {happiness:int} happiness training your {stat:word} {times:int} times in {gym:text} increasing it by {gain:number} to {total:number}",
    "value_capture": "energy",
    "conditions": []
  }
]
```
`key` is a stable id unique within the objective (`[a-z0-9_]+`) used in `objective_log_matches.pattern_key`.

### 6.7 Save-time validation (reject with a precise 422)

1. Template/regex compiles under RE2.
2. `value_capture` exists in the pattern when metric ≠ `count`, and its type is numeric (for `sum`).
3. Every condition's `capture` exists.
4. At least one pattern when `verification = 'log'`; none required for `manual`.
5. **Warnings** (non-blocking, returned in the response): pattern is a pure wildcard / matches > 20 % of the last 24 h of stored logs ("too broad"); pattern matches **zero** stored logs in the last 7 days ("never matched, check wording").

### 6.8 Pattern tester (admin tool)

`POST /admin/patterns/test` takes `{ patterns, metric, target, samples: string[] }` and returns, per sample, whether it matched, which pattern, the captures, the contribution to progress and any failed condition. A second mode, `{ dry_run_contract_id }`, replays **stored logs from the last 24 h** and reports how many agents would be complete / partial for that objective. The admin UI MUST encourage testing before saving, and SHOULD offer "paste a sample log line and highlight parts to turn them into placeholders."

### 6.9 Tasks that cannot be verified from log text alone

Some goals (for example "defeat a player 5+ levels above you", "higher battle stats", "gain 5,000 faction respect") may not be derivable from one log line. For these, set `verification = 'manual'` (admin marks via §10) or implement an **enrichment** step later (extra Torn API calls). Do not guess: the objective library seed marks these `manual` until a verified log pattern exists.

---

## 7. TORN synchronization pipeline (Req 2 & 3)

### 7.1 Schedule: every 1 minute

pg-boss cron `sync.tick` runs `* * * * *`.

**Tick** (`syncTick.ts`):
1. Select **eligible agents**: users with a `contract_participants` row in a contract whose status is `active` or `paused`, `users.status = 'active'`, `torn_api_keys.status = 'valid'`, and `sync_state.next_due_at <= now()`.
2. For each, enqueue `sync.user { userId }` with `singletonKey = userId` (never two syncs for one agent) and `startAfter = slot_offset_s` seconds. `slot_offset_s = hash(userId) % 50` spreads load across the minute instead of a burst at :00.
3. Record tick metrics (due count, enqueued count).

**Latency promise:** an in-game action is reflected in progress **within ~1–2 minutes** (≤ 60 s wait + fetch + evaluate). The UI MUST show "Last synced Ns ago" per agent (`sync_state.last_success_at`).

### 7.2 Per-agent sync (`syncUser.ts`)

```
1. Load key → decrypt in memory (never log it).
2. from = (cursor_ts ?? backfill_start) − sync_overlap_seconds     # default 120 s overlap
   backfill_start = contract.starts_at (count_from = contract_start) or participant.started_at
3. Call Torn log endpoint for that window (see §7.3). Page until exhausted
   (max 5 pages per cycle; max 20 on first backfill; remainder carries to next cycle).
4. Normalize each record → { external_id, occurred_at, category, raw_text, raw }.
5. INSERT … ON CONFLICT (user_id, external_id) DO NOTHING RETURNING id   # idempotent
6. If any new rows: run engine.evaluate(userId, newIds) (§8) in its own transaction.
7. UPDATE sync_state: cursor_ts = max(occurred_at seen), last_success_at = now(),
   consecutive_failures = 0, next_due_at = now() + interval '60 seconds'.
8. Insert sync_runs row (duration, status, counts).
```
The overlap plus the unique constraint make polling safe against clock skew and late-arriving log lines.

While a contract is `paused`, syncing **continues** (no gaps) but `engine.evaluate` defers matching; on resume, `rebuild` runs for all participants (§8.5).

### 7.3 Torn client (`torn/client.ts`)

- Base URL from env. The API key is sent exactly as Torn requires. **The key may travel in the query string, so the HTTP client, logger and Sentry MUST redact query strings** (see §13).
- The agent's own data needs no target ID. Selections, `from`/`to` filtering, log categories and the exact record shape of the `log` selection **must be confirmed against the live Torn API docs / Swagger** before coding `normalize.ts` (§19, Q1). The normalizer is the *only* place that knows the response shape; everything downstream consumes `{external_id, occurred_at, raw_text}`.
- `external_id`: use the API's own entry id/key if present; otherwise `sha256(userId | occurred_at_epoch | raw_text)`.
- Timeout 10 s; one retry on network error with jitter; global token-bucket limiter `TORN_GLOBAL_RPS` plus per-agent budget.

### 7.4 Rate budget

Torn documents **100 requests per minute per user across all of that user's keys**. This design uses ~1 request/agent/minute (up to 5 with paging), well within budget, leaving room for the agent's other tools. Never raise per-agent frequency above the setting without checking this.

### 7.5 Error handling (map Torn error codes)

| Torn error | Meaning | Action |
|---|---|---|
| 2 | Incorrect key | key → `invalid`; **stop polling that agent immediately** (repeated invalid-key calls risk an IP ban); notify agent in-app |
| 13 | Key disabled (owner inactive) / 18 key paused / 10 federal jail | key → `disabled`/`paused`; stop polling; notify agent |
| 16 | Access level too low | key → `low_access`; notify agent how to fix |
| 5 | Too many requests | back off 60 s; raise `system_alert` (we should never hit this) |
| 8 | IP blocked | **global circuit breaker:** pause all syncing 5 min, alert admins |
| 9, 24, 17, 0, 15 | System disabled / closed / backend / unknown | per-agent exponential backoff 1, 2, 4 … max 10 min; if > 20 % of agents fail in a tick, circuit-break + alert |
| 14 | Daily read limit | back off to next day (UTC), alert admins |
| 3, 4, 6, 7, 21, 22, 23, 28 | Our request is wrong | treat as a **bug**: do not retry; alert admins |

Keep `consecutive_failures`; after 10, raise a security/system event. Always record `torn_error_code` in `sync_runs`.

### 7.6 Key onboarding

`POST /me/api-key`: body `{ key, consent: true }`. The server calls the Torn "basic" selection with the key to learn the **torn_user_id + name** (the key itself proves identity), checks the logs selection works (detects low access), encrypts and stores it, creates/links the `users` row, and creates `sync_state`. **Recommend a custom key with only the `log` selection, limited to the log categories the contract tasks need** (Torn lets custom keys be restricted to chosen categories). Show exactly what is read and why before the agent consents. `DELETE /me/api-key` removes the key and stops syncing immediately.

---

## 8. Task verification engine

### 8.1 `engine.evaluate(userId, newLogIds)`

For each contract the agent participates in that is `active` (not `paused`):

```
for each contract_objective co in the contract where removed_at is null and verification = 'log':
  po = participant_objective(participant, co)   # skip if po.deleted_at is not null
  window_start = max( po.counting_from,
                      contract.starts_at  if count_from = contract_start
                      participant.started_at otherwise )
  window_end   = contract.ends_at

  for log in new logs ordered by occurred_at, with window_start <= occurred_at <= window_end:
    for pattern in co.log_patterns:
      m = compile(pattern).match(strip_prefix(log.raw_text))
      if m and conditions pass:
         value = 1 | captured number | (1, distinct_key)
         INSERT objective_log_matches … ON CONFLICT DO NOTHING

  recompute po.current_value from matches            # D5: derived, not incremented
  apply status rules (§8.2)
completion check (§8.3)
```
Run per agent inside a transaction; take `pg_advisory_xact_lock(hashtext(participant_id))` so two evaluations for one agent never interleave.

### 8.2 Status rules for a task

1. If `override = 'force_complete'` → `completed` (source `admin`). Engine never changes it.
2. If `override = 'force_incomplete'` → never `completed`; `status` = `in_progress` if `current_value > 0` else `not_started`. Engine keeps recording matches.
3. Otherwise: `current_value >= target` → `completed`; `> 0` → `in_progress`; else `not_started`.

On first crossing the target: set `completed_at` to the **in-game time of the log that crossed it** (ordered running total over `objective_log_matches`), `verified_at = now()`, source `logs`, and insert the bounty ledger entry (§10.4) with `idempotency_key = 'task:' || po.id`. Emit a `contract_events` row (`objective_completed`).

If a rebuild lowers progress below target (pattern edited, matches removed) the task reverts to `in_progress`, `completed_at` clears, and its pending bounty is cancelled / released bounty reversed (§10.4).

### 8.3 Contract completion

The required set for an agent = their `participant_objectives` where `deleted_at is null` **and** the contract objective is not removed. If the set is non-empty and every item is `completed`:

```
BEGIN;
  SELECT pg_advisory_xact_lock(hashtext(contract_id::text));   -- serialize ranking per contract
  participant.status        = 'completed'
  participant.completed_at  = max(po.completed_at)             -- in-game time
  participant.detected_at   = now()
  participant.completion_seq = nextval('completion_seq')
  recompute provisional ranks from contract_leaderboard
  schedule job contract.finalize (see 8.4)
COMMIT;
emit event 'agent_completed' (+ 'rank_changed')
```
If a previously completed agent no longer satisfies the required set (a task was un-completed or added with `reopen` policy), revert: `status = 'in_progress'`, clear `completed_at`/seq, recompute ranks.

### 8.4 Ranking & finalization (D6)

- **Order:** `completed_at` (in-game) asc → `completion_seq` asc.
- A completion is **provisional** until finalized. Finalize rank *k* (k ≤ `winner_count`) when **both**: (a) `finalization_delay_seconds` (default 180 s) have passed since it was detected, **and** (b) every still-incomplete agent with a `valid` key has `sync_state.last_success_at >= completed_at` of that completion (so nobody with an earlier in-game finish is still un-synced). Agents with invalid keys cannot contest.
- On finalization set `final_rank`, `rank_finalized = true`, and (for `first_n` contracts, rank ≤ `winner_count`) create `reward_transactions` (`PENDING`). `winner_mode = 'everyone'` creates rewards for every completed agent when the contract closes.
- The UI labels unfinalized winners "provisional" and the final leaderboard "official".

### 8.5 `contract.close` and rebuild

- **`contract.close`** (scheduled at `ends_at`): one last sync sweep after a short grace (default 2 min), evaluate, finalize every outstanding rank, create rewards, release `on_contract_complete` bounties for agents who completed, set status `completed`, `completed_at`. A completed contract is **immutable** (enforce with DB triggers rejecting writes to its objectives/participants, except the payout fields).
- **`rebuild.objective { contract_objective_id }`** (also per-agent): delete the objective's matches, re-run matching over stored `torn_log_entries` for each affected participant, recompute statuses, completion and ranks. Triggered by pattern/target/metric edits (§9.3), resume-after-pause, and admin "recalculate". Must be resumable and chunked (≈200 agents per job) and idempotent.

---

## 9. Admin: creating and managing contracts and tasks

All admin endpoints require an `admin`+ role, write an `admin_audit_logs` row (with `reason` where noted), and return the updated resource. Destructive or high-impact actions take `?dry_run=true` and return an **impact preview** (`affected_agents`, `would_complete`, `would_uncomplete`, `bounty_delta`) so the UI can show it before confirming.

### 9.1 Create a contract (Req 1) and its tasks (Req 5, 7)

`POST /admin/contracts`:

```json
{
  "name": "Contract #1848",
  "winner_mode": "first_n",
  "winner_count": 3,
  "starts_at": "2026-10-15T00:00:00Z",
  "duration_hours": 24,
  "max_objectives": 10,
  "objective_selection": "manual",
  "count_from": "contract_start",
  "bounty_release": "on_contract_complete",
  "finalization_delay_seconds": 180,
  "reward_configuration": [
    {"place":1,"cash":10000000,"items":"2× Xanax"},
    {"place":2,"cash":7500000,"items":"1× Xanax"},
    {"place":3,"cash":5000000,"items":""}
  ]
}
```
Creates a `draft`. Then add tasks (§9.2). `POST /admin/contracts/{id}/schedule` validates and moves to `scheduled`; a scheduler flips it to `active` at `starts_at`.

**Task fields the admin must provide** (`POST /admin/contracts/{id}/objectives`):

```json
{
  "name": "Make 10 successful attacks",
  "category": "combat",
  "complexity": "medium",
  "bounty": 750000,
  "agent_note": "Only attacks you win count. Losses and escapes don't.",
  "verification": "log",
  "metric": "count",
  "target": 10,
  "log_patterns": [
    { "key": "attack_win", "mode": "template",
      "template": "You used {energy:int} energy attacking {opponent:text} and defeated them" }
  ],
  "position": 8,
  "from_definition_id": null
}
```
Required: `name`, `category`, `complexity`, `bounty` (≥ 0), `target`, and (for `log`) at least one valid pattern. `agent_note` optional, ≤ 500 chars, **plain text** (escape when rendering). A task can be created from the library (`from_definition_id`, which snapshots then lets the admin override fields) or from scratch; "save to library" is optional.

**Schedule-time validation:** 1 ≤ active tasks ≤ `max_objectives`; no two identical tasks; every log task has a valid pattern; `ends_at > starts_at > now()`; reward config has ≥ 1 non-empty place (or one "everyone" reward). **Warning only:** the suggested complexity mix (4 easy / 3 medium / 2 hard / 1 extreme) when `max_objectives = 10`.

Other contract endpoints: `GET` list/detail, `PATCH` settings, `POST …/clone`, `DELETE` (drafts only), and the controls from the admin product sheet (`start | pause | resume | extend | end | cancel | invalidate`, each with a required reason and confirmation).
Pause sets `paused_at`; resume adds the paused duration to `ends_at` and triggers rebuild; extend adds minutes to `ends_at`.

### 9.2 Add / edit / delete / replace tasks in **any** contract (Req 6)

| Operation | Endpoint |
|---|---|
| Add | `POST /admin/contracts/{id}/objectives` |
| Edit | `PATCH /admin/contracts/{id}/objectives/{oid}` |
| Delete | `DELETE /admin/contracts/{id}/objectives/{oid}` (soft: sets `removed_at`) |
| Replace | `POST /admin/contracts/{id}/objectives/{oid}/replace` (delete + add atomically, in the same position) |
| Reorder | `PUT /admin/contracts/{id}/objectives/order` |
| Restore removed | `POST …/objectives/{oid}/restore` |

Contract status decides what is allowed: `draft`/`scheduled`: all edits, no side effects. `active`/`paused`: allowed with the rules in §9.3. `completed`/`cancelled`/`invalid`: **no task edits** (immutable archive).

### 9.3 Mid-contract edit semantics (active/paused)

| Change | What the system does |
|---|---|
| **Add task** | Allowed only if active task count < `max_objectives`. Creates a `participant_objectives` row for **every** participant (and for future joiners), backfills from stored logs, evaluates. Agents who already completed the contract: `policy` = **`grandfather`** (default: stay completed and keep rank) or `reopen` (they become incomplete again). |
| **Edit patterns / metric / target** | Bump `version`; enqueue `rebuild.objective` for the contract objective; completed/uncompleted states can flip. **Dry-run preview is mandatory in the UI** before confirming. |
| **Edit complexity / agent note** | Metadata only; no recalculation. |
| **Edit bounty** | `apply_to`: `future_completions` (default) or `all` (adjusts pending/released ledger entries with `adjustment` rows). |
| **Delete task** | Soft delete. The required set shrinks, so agents who had finished everything else become **complete immediately** (completion recorded with `completed_at = now()`, ranks recomputed in one transaction). Earned bounty for the removed task: `bounty_on_remove` = `keep_earned` (default) or `cancel`. |
| **Replace task** | Delete + add in one transaction; `carry_over_progress` is always `false` (the new task starts from stored logs). |
| **Change `max_objectives`** | `PATCH /admin/contracts/{id}` with the new number. Must be ≥ current active task count (the admin must remove tasks first) and ≤ `settings.hard_max_objectives`. Lowering below the count returns 409 with the offending count. |

All changes post a `contract_events` row of type `admin_adjustment` so agents see "Task 7 was replaced by an admin" in their activity feed, and an announcement can be attached (`announce: true`).

### 9.4 Max tasks (global and per contract)

`settings.default_max_objectives` (default 10) prefills new contracts; `contracts.max_objectives` is the real limit and is editable until the contract completes; `settings.hard_max_objectives` (default 50, super_admin editable) is the safety ceiling. The agent-facing API always returns `{ completed, total }` computed from actual tasks. Frontends MUST NOT hard-code 10.

---

## 10. Admin: inspecting agents and manual overrides (Req 8)

### 10.1 Inspect

- `GET /admin/contracts/{id}/participants?search=&status=&sort=&page=` → list with rank, `done/total`, status, `last_synced_at`, key status, flags (suspicious, sync error).
- `GET /admin/contracts/{id}/participants/{userId}` → per-task detail:
  `{ objective, status, current_value, target, completed_at, verified_at, source (logs|admin), override, counting_from, deleted, bounty_earned, matches_count }`, the agent's recent **matched log lines** (`GET …/tasks/{poId}/matches`), their ledger, and the admin action history (from `admin_audit_logs`).
- `GET /admin/users/{userId}/contracts` → history across contracts.

### 10.2 Override actions (per task, per agent)

`POST /admin/contracts/{id}/participants/{userId}/tasks/{poId}/actions` with `{ "action": "...", "reason": "...", ... }`. **`reason` is mandatory** and saved to the audit log.

| `action` | Effect |
|---|---|
| `mark_completed` | `override = 'force_complete'`, `status = 'completed'`, `source = 'admin'`, `completed_at = now()`, `verified_at = now()`. Optional `award_bounty` (default `true`) creates the task ledger entry. Runs the completion check; if this finishes the agent and they would land inside the winning places of an active contract, **require `super_admin`** and log a `MANUAL_VERIFICATION` security event. |
| `mark_uncompleted` | `override = 'force_incomplete'`; status becomes `in_progress`/`not_started` by `current_value`; clears `completed_at`; cancels the pending bounty or adds a `reversal` row for released/paid ones. If the agent had completed the contract they revert to `in_progress` and ranks recompute. If they were a **finalized winner**: blocked unless `super_admin` and the reward is not yet delivered (the reward is then `CANCELLED`). |
| `reset` | Deletes this task's matches for the agent, `current_value = 0`, `status = 'not_started'`, `override = null`, **`counting_from = now()`** (older logs are ignored from now on), reverses/cancels its bounty. |
| `recalculate` | Deletes matches and rebuilds from stored logs (does not move `counting_from`; keeps any override unless `clear_override: true`). |
| `delete` | Removes the task **for this agent only** (`deleted_at = now()`); the required set shrinks and may complete them (same rules as `mark_completed` for winners). Bounty: `keep_earned` (default) or `cancel`. |
| `restore` | Undo `delete`. |
| `clear_override` | `override = null`; the engine re-evaluates from logs on its next run (immediately triggered). |

Bulk helpers (same rules, one audit row each): `POST …/participants/{userId}/actions` with `reset_all` or `recalculate_all`.

**Override precedence rule (important):** automatic verification MUST NOT undo a manual decision. A `force_incomplete` task stays incomplete across every future sync, and a `force_complete` task stays complete, until an admin runs `clear_override`. The agent-facing API labels these "Adjusted by admin".

### 10.3 Roles & guardrails

| Role | Can |
|---|---|
| `moderator` | Read everything (inspect agents, logs, ledger) |
| `admin` | Everything above plus overrides, task edits, contract controls, manual bounty up to `manual_bonus_super_admin_threshold` |
| `super_admin` | Winner-affecting overrides, larger bonuses, negative adjustments, settings, hard cap, admin management |

Rate limit overrides (e.g. 60/min per admin) and require a typed confirmation word in the UI for `reset_all`, finalized-winner changes and cancels.

### 10.4 Bounty ledger and manual extra bounty

**Task bounty.** When a task becomes completed the engine inserts `bounty_ledger { type:'task', amount: contract_objectives.bounty, status:'pending', idempotency_key:'task:<po_id>' }`. `bounty_release = 'immediate'` marks it `released` at once; `on_contract_complete` releases all of an agent's task bounties when they complete the contract (or never, if they don't; they're cancelled at close). Un-completing a task cancels a `pending` entry or inserts a negative `reversal` for `released`/`paid` ones (flagged for manual recovery).

**Extra bounty for an individual agent.**
`POST /admin/contracts/{id}/participants/{userId}/bounty`
```json
{ "amount": 2000000, "reason": "Compensation for objective 7 verification outage", "release": "immediate" }
```
Creates `{ type:'manual_bonus', status:'released'|'pending', created_by_admin, reason }`. Rules: `amount > 0` for bonuses; negative values (`type:'adjustment'`) need `super_admin`; amounts above `manual_bonus_super_admin_threshold` need `super_admin`; `reason` required; visible to the agent as "Admin bonus: <reason>" (the admin may mark the reason private).
`GET …/bounty` lists the ledger; `DELETE …/bounty/{entryId}` cancels an entry that isn't `paid` (creates the audit trail; never hard-deletes).

**Payouts (D8).** `GET /admin/payouts?status=released` lists unpaid released bounties and prizes grouped by agent; `POST /admin/payouts/mark-paid { entryIds, reference }` sets `paid` + `payout_reference` and notifies the agent. If Torn ever exposes an automated transfer, add a payout worker behind the same statuses.

An agent's displayed total bounty = sum of `pending` + `released` + `paid` ledger entries for that contract, broken down by task and by admin bonus.

---

## 11. API reference (summary)

Base path `/api/v1`. Auth: `Authorization: Bearer <Supabase JWT>`. JSON in/out. Errors: `{ "error": { "code": "...", "message": "...", "details": {} } }` with proper 4xx/5xx. Pagination: `?page=&page_size=` (default 25, max 100). Mutations accept an `Idempotency-Key` header.

### 11.1 Agent (player) endpoints

| Method & path | Purpose |
|---|---|
| `GET /me` | Profile, key status (`valid`/…, **never the key**), last sync time |
| `POST /me/api-key` · `DELETE /me/api-key` | Onboard / remove key (§7.6) |
| `GET /dashboard` | Platform stats, current contract hero data (active or not-started state), personal stats, announcements, activity |
| `GET /contracts/current` | Today's contract: type, status, time remaining, prize, participants, tasks (`name, category, complexity, bounty, agent_note, target`) |
| `POST /contracts/{id}/start` | Join / start the contract (creates participant + per-task rows, kicks off backfill) |
| `GET /contracts/{id}/progress` | My tasks with `current_value/target`, status, `adjusted_by_admin`, bounty earned, `last_synced_at`, my rank |
| `GET /contracts/{id}/leaderboard` | Live standings (provisional flagged) |
| `GET /archive` · `GET /archive/{number}` | Past contracts and detail |
| `GET /leaderboard/champions` | Hall of fame |
| `GET /me/profile` | Stats, history, achievements |
| `GET /announcements` · `GET /activity` | Feeds |

An agent can only ever read their own progress; leaderboards expose only username, `done/total`, completion time.

### 11.2 Admin endpoints (`/api/v1/admin`)

| Area | Endpoints |
|---|---|
| Contracts | `GET/POST /contracts`, `GET/PATCH/DELETE /contracts/{id}`, `POST /contracts/{id}/{schedule\|start\|pause\|resume\|extend\|end\|cancel\|invalidate\|clone}` |
| Tasks in a contract | `POST /contracts/{id}/objectives`, `PATCH/DELETE …/{oid}`, `POST …/{oid}/replace`, `…/{oid}/restore`, `PUT …/order` (all accept `?dry_run=true`) |
| Library | `GET/POST /objective-definitions`, `PATCH/DELETE /objective-definitions/{id}` |
| Patterns | `POST /patterns/test` (§6.8), `POST /patterns/validate` |
| Agents | `GET /contracts/{id}/participants`, `GET …/{userId}`, `GET …/{userId}/tasks/{poId}/matches`, `POST …/{userId}/tasks/{poId}/actions`, `POST …/{userId}/actions`, `GET /users/{userId}/contracts` |
| Bounty | `GET/POST …/participants/{userId}/bounty`, `DELETE …/bounty/{entryId}`, `GET /payouts`, `POST /payouts/mark-paid` |
| Governance | `GET /audit-logs?contract_id=&user_id=&action=`, `GET /security-events`, `PATCH /settings` |
| Ops | `GET /system/health`, `GET /sync/status` (§14) |

---

## 12. Realtime & notifications

- Supabase Realtime subscriptions (RLS-enforced): an agent subscribes to *their own* `participant_objectives` and to `contract_leaderboard` for the active contract; admins to `contract_events` and sync status.
- `contract_events` is the single feed for: task completed, rank changed, provisional/official winner, admin adjustments, contract state changes, key problems.
- Agent notifications (in-app first): key invalid/low access, task adjusted by admin, bonus received, contract ending in 60 minutes.

---

## 13. Security, privacy, audit

1. **API keys:** AES-256-GCM, unique nonce per key, KEK from env/KMS with `kek_id` for rotation; decrypt only inside worker/API process memory; never selected by endpoints; never logged. **Redact `key=` query parameters** in HTTP client logs, pino serializers and Sentry `beforeSend`.
2. **Least privilege & consent:** recommend a custom key restricted to the `log` selection and needed categories; explicit consent captured (`consented_at`); `DELETE /me/api-key` honoured immediately and stops sync.
3. **Data minimization:** store only log lines inside a participant's contract window; purge per §5.2; matched lines keep `raw_text` for audit.
4. **Server-side truth:** the frontend can never mark anything complete; only the engine and audited admin actions can.
5. **Admin patterns are untrusted input:** compile on RE2, cap size and group count, run with a per-match time budget, never `eval`, never build SQL from them.
6. **Authorization:** role checks in middleware **and** RLS on every table exposed to Realtime; agents see only their own rows.
7. **Audit:** every admin mutation writes `admin_audit_logs` (admin, action, entity, old/new JSON, reason, IP). The table is append-only (no UPDATE/DELETE grant). Overrides, bonuses, winner changes and cancellations are additionally surfaced in the admin activity view.
8. **Anti-abuse signals** (`security_events`): `RAPID_OBJECTIVE_COMPLETION` (e.g. ≥ 6 tasks in 12 s), `DUPLICATE_EVENT`, conflicting/odd log sequences, `MANUAL_VERIFICATION` on winner-affecting overrides, repeated sync failures.
9. Web: strict CORS to the two origins, security headers, request size limits, rate limiting per user/IP, zod validation on every input, parameterized SQL only.

---

## 14. Observability & health

Expose `/healthz` (process up) and `/readyz` (DB + queue reachable). `GET /admin/system/health` returns: Torn API status (recent success rate), verification (average sync+evaluate duration), DB, background jobs (last `sync.tick` age; alert if > 2 min), realtime, plus counters (requests today, failed requests, verification errors, agents with invalid keys, agents currently backing off). Metrics to emit: tick due/enqueued, sync duration p50/p95, Torn error codes by count, engine matches/min, rebuild queue depth, ledger pending total. Sentry for exceptions; structured logs with correlation ids (`tick_id`, `sync_run_id`, `user_id`).

---

## 15. Changes required in the existing frontends

**Admin app (`the-contract-agent-admin`):** replace the local Zustand/mock store with an API client (TanStack Query). Rename *difficulty* → *complexity*. Task form gains: **log pattern editor + tester** (§6.8), metric/target, **bounty**, **agent note**; contract form gains `max_objectives`, `count_from`, `bounty_release`; show an **impact preview** for any mid-contract edit; new **Participants** area (list → agent detail → per-task override actions, matched-log viewer, ledger, **Add bounty** button); payouts view; real system health. Keep the existing emergency controls but send reasons to the API. Remove the "Reset demo data" control.

**Player app (`the-contract-agent`):** replace `src/data/*` mocks with API calls; remove the Demo toggle; add an API-key onboarding screen with the consent explanation; show each task's **complexity, bounty and agent note**; show "Last synced Ns ago", "Adjusted by admin" badges and provisional/official rank; replace every hard-coded `10` with `total` from the API.

---

## 16. Seed data

`npm run seed` creates: the settings in §5; one `super_admin`; ~5 fake agents with fake keys for local use against `fake-torn`; and the objective library migrated from the admin app's pool (38 entries).

**Log patterns in the seed:** only the two verified examples ship with real templates (gym line, attack-win line, §6.2). Every other library objective is seeded with `verification = 'manual'` and an empty pattern list, and is listed in `docs/pattern-todo.md` ("needs a real log sample") until the admin supplies the exact in-game wording. `fake-torn` serves scripted lines, including the two examples, so the pipeline can be exercised end to end.

---

## 17. Testing & acceptance criteria

### 17.1 Unit

- **Template compiler:** both worked examples (§6.2) produce exactly the listed captures; `[s]` optional; escaped braces; rejects duplicate capture names, > 500 chars, bad types; regex mode rejects lookaheads/backrefs.
- Number parsing: `1,028,034.09 → 1028034.09`; ints with commas.
- Prefix stripping and `DD/MM/YY` parsing (`13/10/26` → 2026-10-13).
- Conditions: numeric and text operators.
- Metrics: `count`, `sum` across two patterns (gym 400 + attack 25 = 425 toward "Use 1,500 energy"), `distinct` case-folding.
- Status rules including override precedence; `completed_at` = in-game time of the crossing log.
- Ranking order and tie-break; leaderboard view.

### 17.2 Integration (Postgres via Testcontainers + fake Torn)

1. **Idempotency:** feed the same log batch twice → identical progress, one ledger entry, no duplicate matches.
2. **1-minute cycle:** with a fake clock, an agent's new line appears in progress within one tick + fetch.
3. **Overlap/late line:** a line with an older timestamp arriving next cycle is still counted.
4. **Window:** logs before `starts_at` (and before `counting_from` after a reset) are ignored; logs after `ends_at` are ignored.
5. **Mid-contract edit:** editing a pattern triggers rebuild and flips affected agents; **dry run** reports the same numbers the real run produces.
6. **Add task** with `grandfather` keeps completed agents completed; with `reopen` reverts them.
7. **Delete task** instantly completes an agent who had everything else; ranks update atomically.
8. **Replace task** is atomic (kill the process mid-way → either old or new, never both/neither).
9. **Max tasks:** cannot add beyond `max_objectives` (409); cannot lower below the active count; cannot exceed the hard cap.
10. **Overrides:** `mark_uncompleted` survives later syncs; `clear_override` restores automatic; `reset` ignores older logs; `delete` removes the task for one agent only; winner-affecting overrides require `super_admin` and emit `MANUAL_VERIFICATION`.
11. **Bounty:** task bounty ledger entry created once; reversal on un-complete; manual bonus appears with reason; threshold/role enforcement; cancel of a `paid` entry refused.
12. **Concurrency:** two agents completing within the same second rank by in-game time then sequence; 50 parallel completions produce unique ranks.
13. **Finalization:** a slower-synced agent with an *earlier* in-game completion overtakes within the window; after finalization ranks are frozen and rewards created exactly once.
14. **Errors:** each Torn error code in §7.5 produces the specified state change; invalid key stops polling after one call; circuit breaker trips on code 8.
15. **Security:** an agent cannot read another agent's progress; keys never appear in any response or log line (grep test over captured logs).

### 17.3 Load

Simulate 2,000 agents polling once a minute: tick enqueue < 2 s, p95 sync+evaluate < 3 s, DB CPU stable, no burst above `TORN_GLOBAL_RPS`.

### 17.4 Definition of done

- All migrations apply from scratch and are re-runnable in CI.
- Every endpoint in §11 implemented with zod schemas and covered by at least one integration test.
- All §17.2 scenarios pass in CI.
- `docker compose up` + the scripts in §3.2 give a working local environment; README documents setup, env vars and the fake Torn server.
- No secrets in the repo; `.env.example` complete.
- Both frontends run against the real API with the mock data removed.

---

## 18. Build order

| Phase | Deliverable | Maps to |
|---|---|---|
| 1 Foundation | Repo, env, migrations 0001–0005, auth, roles, key onboarding + encryption, audit logger, health endpoints | Req 2 prerequisite |
| 2 Patterns | Template/regex compiler on RE2, conditions, metrics, tester endpoints + unit tests | Req 4, 5 |
| 3 Contracts & tasks | Contract + task CRUD with all fields, schedule/validation, `max_objectives`, lifecycle scheduler | Req 1, 6, 7 |
| 4 Sync | pg-boss tick, per-agent sync, Torn client + normalizer (after §19 Q1), error handling, fake Torn | Req 2, 3 |
| 5 Engine | Evaluate, statuses, completion, ranking, finalization, close, rebuild | Req 2, 4 |
| 6 Ledger | Task bounty, manual bonus, payouts queue, prizes | Req 7, 8 |
| 7 Admin agent tools | Participants list/detail, override actions, bulk actions, matched-log viewer | Req 8 |
| 8 Realtime & feeds | Realtime channels, events, announcements, notifications | UX |
| 9 Hardening | Load test, retention job, circuit breakers, Sentry, security review | Quality |
| 10 Frontend wiring | §15 changes in both apps | Delivery |

---

## 19. Open questions (resolve before/while building)

1. **Log endpoint shape.** Confirm in the Torn API docs / Swagger: the exact `log` selection (API v1 vs v2), whether `from`/`to` apply to logs, paging/limits per call, and the record structure (is there one text line per entry, or structured `title`/`data` we must render into the text the admin sees?). This only affects `torn/client.ts` and `normalize.ts`.
2. **Real log wording** for every task type (attack loss, flights, crimes, medical items, item market, faction respect, …). Needed from the admin before those objectives can leave `manual`.
3. **Key policy.** Is a *Full Access* key required, or can a *custom* key with only logs (and specific categories) work? The Torn docs describe custom keys limited by category; confirm that `log` is allowed on custom keys.
4. **Payouts.** Is delivery of cash/items in-game manual (assumed, D8) or is there an automatable path?
5. **`count_from` default** (D9) and **`bounty_release` default** (D7): confirm these two product choices.
6. **Rank on ties** beyond the in-game second plus sequence: is that acceptable, or should truly simultaneous finishes share a rank?
7. **Frontend framework:** the architecture PDF mentioned Nuxt; the repos use React. This spec assumes React SPAs (D1).

---

*Torn API facts used in this spec (rate limit of 100 requests/minute per user across keys, custom keys restricted by log category, error-code list, Full Access as the preset that includes logs) come from the official Torn API page and a key-levels reference; Torn states limits may change without notice, so re-check before launch.*
