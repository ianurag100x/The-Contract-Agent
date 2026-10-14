# The Contract Agent — Architecture & Codebase Map

A high-performance web application designed for competitive contract tracking, objective verification, participant telemetry, and automated reward lifecycle in Torn City.

---

## 1. System Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND (React + Vite)                           |
|  - Pages: Dashboard, Contract, Admin, Leaderboard, Archive, Profile, Login       |
|  - Global State: AuthProvider, ContractProvider, AdminProvider                   |
|  - Polling & Hooks: useNow (timer ticks), real-time sync with API                 |
+-----------------------------------------------------------------------------------+
                                        |  HTTP REST (/api/...)
                                        v
+-----------------------------------------------------------------------------------+
|                             BACKEND SERVER (Node.js 22+)                          |
|  server/src/index.ts       -> HTTP Server, CORS, Router, World Clock Scheduler     |
|  server/src/routes.ts      -> REST Endpoints & Route Handlers                     |
|  server/src/engine.ts      -> Contract Engine & Balanced RNG Objective Generator  |
|  server/src/patterns.ts    -> Regex Telemetry Parser for Torn Logs               |
|  server/src/torn.ts        -> Torn API Integration Layer                          |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                        DATABASE (SQLite WAL Mode: Node 22 native)                 |
|  server/src/sqlite.ts      -> 13 Relational Tables (WAL, Foreign Keys, Cascades)  |
|  server/data/contract_local.db                                                    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Backend Files & Functions (`server/src/`)

### `server/src/index.ts`
- **Purpose**: Backend server entry point and background world clock ticker.
- **Key Components**:
  - `server.listen(3001)`: Native HTTP server with CORS headers for frontend integration (`localhost:5173`).
  - **World Clock Scheduler (`setInterval(10_000)`)**: Checks SQLite every 10s for `scheduled` contracts reaching `starts_at`. Once reached, it:
    1. Sets any currently active or paused contract to `completed`.
    2. Activates the scheduled contract (`status = 'active'`).
    3. Auto-registers active agents into `contract_participants`.

### `server/src/sqlite.ts`
- **Purpose**: Schema initialization, database connection, and automatic column migrations.
- **Database Engine**: Uses Node.js native `DatabaseSync` (`node:sqlite`) with `WAL` journal mode and foreign keys enabled.
- **Tables (13 total)**:
  1. `users`: Players and admins (`torn_user_id`, `torn_username`, `torn_level`, `role`).
  2. `objective_definitions`: Master library/catalog of 14+ Torn objectives.
  3. `contracts`: Contracts with `status`, `starts_at`, `ends_at`, `remaining_ms`, `winner_status`, `declared_winner`.
  4. `contract_objectives`: Specific objectives assigned to a contract.
  5. `contract_participants`: Individual player progress and ranks per contract.
  6. `participant_objectives`: Per-objective progress tracking and timestamps.
  7. `reward_transactions`: Payout ledger (`DELIVERED`/`PENDING`).
  8. `admin_audit_logs`: Detailed administrative action audit trail.
  9. `announcements`: Platform broadcast announcements.
  10. `system_alerts`: Automated system alerts and issue reporting.
  11. `player_events`: Idempotent stream of raw API/telemetry logs.
  12. `security_events`: Anti-cheat and abnormal activity flags.
  13. `settings`: Key-value system configuration.

### `server/src/routes.ts`
- **Purpose**: Core API route dispatcher (`handleApiRoute`).
- **Primary Endpoints & Handlers**:
  - `GET /api/health`: Health status of sub-engines (DB, Torn API, WebSocket, Background Jobs).
  - `GET /api/admin/stats`: Aggregates active players, registered count, completions, and rewards.
  - `GET /api/admin/contract`: Returns latest contract with tasks, participant count, and `remainingMs`.
  - `GET /api/admin/contracts`: Returns full list of contracts for the admin directory table.
  - `GET /api/admin/contracts/:id`: Returns specific contract by ID.
  - `PUT /api/admin/contract`: Updates parameters and tasks of a contract.
  - `POST /api/admin/contract/create`: Creates draft or scheduled contract with manual ID and no auto objectives.
  - `POST /api/admin/contract/controls`:
    - `pause`: Computes `remaining_ms = ends_at - now` and stores in SQLite.
    - `resume`: Restores timer `ends_at = now + remaining_ms` with zero lost time.
    - `extend`: Adds minutes to `ends_at` (or `remaining_ms` if paused).
    - `end` / `declare_winner`: Completes contract, records optional winner, sets `remaining_ms = 0`.
    - `cancel`: Cancels contract and halts timer.
    - `reset`: Resets player progress to 0 across the database.
  - `GET /api/contracts/active`: Returns active contract and current player position for agent view.
  - `POST /api/player/verify-objective`: Telemetry verification to advance player progress.
  - `GET /api/contracts/history`: Lists completed contracts for `/archive`.
  - `GET /api/leaderboard`: Hall of Fame calculated dynamically from SQLite.
  - `GET /api/admin/participants`: Lists all participants for the active contract with task overrides.
  - `POST /api/admin/participants/override`: Admin override for task completion or reset.

### `server/src/engine.ts`
- **Purpose**: Business logic for RNG balancing and contract operations.
- **Functions**:
  - `generateBalancedObjectives(contractId)`: Generates 10 balanced objectives (4 Easy, 3 Medium, 2 Hard, 1 Extreme) from `objective_definitions`.
  - `evaluateLogPattern(rawText, pattern, metric)`: Compares raw Torn log lines against tokenized templates (`{energy:int}`, `{opponent:text}`).

### `server/src/patterns.ts`
- **Purpose**: Pattern matcher for Torn activity log strings.
- **Functions**:
  - `parsePatternTemplate(template)`: Converts curly-brace templates into regular expressions.
  - `extractVariables(rawLog, template)`: Extracts dynamic integers/strings (e.g. crimes, energy, items).

### `server/src/torn.ts`
- **Purpose**: Torn City API wrapper.
- **Functions**:
  - `fetchUserEvents(apiKey, fromTimestamp)`: Queries Torn API for player logs.
  - `verifyApiKey(apiKey)`: Validates API keys and retrieves player profile.

---

## 3. Frontend Pages (`src/pages/`)

| Page | File | Description |
|---|---|---|
| **Dashboard** | `src/pages/DashboardPage.tsx` | Main hub. Features `ContractHero`, active announcements, quick stats, live activity feed, and recent contracts. |
| **Contract** | `src/pages/ContractPage.tsx` | Player contract view. Shows 10 objectives, progress segmented bar, live timer, and manual verification triggers. Polled every 2.5s. |
| **Admin** | `src/pages/AdminPage.tsx` | Comprehensive Overseer Control Center with 10 sections: Dashboard, Contracts & Creation, Objectives Pool, Pattern Tester, Torn Sync, Participants, Rewards, Alerts, and Audit Logs. |
| **Leaderboard** | `src/pages/LeaderboardPage.tsx` | Permanent Hall of Fame showing champion agents, total contract wins, top 3 placements, and completion records. Polled every 3s. |
| **Archive** | `src/pages/ArchivePage.tsx` | Historical registry of all completed contracts, clearance dates, winners, and completion durations. Polled every 3s. |
| **Archive Detail** | `src/pages/ArchiveDetailPage.tsx` | Detailed breakdown of a specific past contract and all cleared tasks. |
| **Profile** | `src/pages/ProfilePage.tsx` | Agent profile page with level, rank, completed contracts, badges, and prize transaction history. |
| **Login** | `src/pages/LoginPage.tsx` | Authentication and Torn API key sign-in screen. |

---

## 4. Frontend State Management (`src/state/`)

### `src/state/admin.tsx` (`AdminProvider`)
- Central administrative state container:
  - `contract`: Current selected/active contract parameters (`number`, `status`, `endsAt`, `remainingMs`, `winnerStatus`, `declaredWinner`).
  - `contractsList`: Full directory list from `GET /api/admin/contracts`.
  - `pauseContract()`: Immediately freezes local timer and synchronizes with `/api/admin/contract/controls`.
  - `resumeContract()`: Resumes timer from stored `remainingMs`.
  - `extendDeadlineMinutes(m)`: Extends deadline by `m` minutes.
  - `endContract(winner)`: Terminates contract and saves declared winner.
  - `cancelContract()`: Marks contract cancelled.
  - `resetContractProgress()`: Wipes progress back to 0 across all participants.
  - `manualOverrideTask()`: Directly marks a participant task complete/incomplete.
  - `refreshContracts()`: Reloads contract list from SQLite.

### `src/state/contract.tsx` (`ContractProvider`)
- Player contract state container:
  - `started`: Tracks whether the player clicked "Start Contract" for the day.
  - `completedCount`: Local tally of completed objectives.
  - `timeRemaining`: Hook-connected countdown.

### `src/state/auth.tsx` (`AuthProvider`)
- Player authentication state:
  - Current logged-in user (`Anurag` / `usr-4`), role (`agent` or `admin`), and session persistence.

---

## 5. UI Components & Utilities (`src/components/`, `src/lib/`)

### `src/components/`
- **`Layout.tsx`**: Application shell containing top navigation bar, active route highlighting, Torn status pill, user avatar, and announcement banner.
- **`dashboard.tsx`**:
  - `ContractHero`: The main card on the dashboard showing contract status, live/frozen timer, segmented progress bar, and winner banners.
  - `ContractPreview`: Summary card before a contract has been started.
- **`ObjectiveList.tsx`**: Renders the 10 contract tasks with difficulty badges, targets, progress bars, verification status, and manual verify buttons.
- **`NotchAnnouncementBar.tsx`**: Dynamic broadcast strip for system warnings, notices, and scheduled maintenance.
- **`ui.tsx`**: Design system components (`Card`, `Pill`, `SegmentedBar`, `DifficultyBadge`, `StatStrip`, `buttonClass`).

### `src/lib/` & `src/hooks/`
- **`src/lib/api.ts`**: Unified frontend API client. Exposes `adminApi`, `contractApi`, `leaderboardApi`, `archiveApi`, and `profileApi`.
- **`src/lib/format.ts`**: Formatting utilities:
  - `hms(ms)`: Formats milliseconds into `HH:MM:SS`.
  - `hm(ms)`: Formats milliseconds into `Xh Ym`.
  - `duration(minutes)`: Human readable duration.
- **`src/lib/meta.ts`**: Visual metadata for contract types (`standard`, `elite`, `black`, `survival`).
- **`src/hooks/useNow.ts`**: Tick hook returning `Date.now()` refreshed at customizable intervals (e.g. 1000ms) for countdown clocks.
