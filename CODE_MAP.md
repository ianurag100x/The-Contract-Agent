# Code Map & Function Index (> 500 Lines)

This document tracks all files exceeding 500 lines of code in the codebase, detailing their major interfaces, components, functions, endpoints, and exact line ranges. 

> [!NOTE]
> Per project workflow, whenever modifications are made to any of these files, this document is updated to provide rapid lookup and eliminate the need to view massive files.

---

## 1. `server/src/db.ts` (~656 lines)
**Role**: In-memory database, seed generator, file persister, and schema definitions.

| Symbol / Item | Type | Lines | Description |
| :--- | :--- | :--- | :--- |
| `User` | Interface | L5–L14 | User record schema |
| `ObjectiveDefinition` | Interface | L18–L35 | Master objective template (log patterns, complexity, bounty) |
| `ContractObjective` | Interface | L37–L57 | Active contract task schema with log pattern verification |
| `Contract` | Interface | L59–L79 | Contract record schema |
| `ContractParticipant` | Interface | L80–L96 | Participant telemetry and progression |
| `ParticipantObjective` | Interface | L97–L115 | Specific participant task verification state |
| `PlayerEvent` | Interface | L116–L126 | Idempotent event stream payload |
| `RewardTransaction` | Interface | L128–L144 | Payout ledger transaction |
| `AdminAuditLog` | Interface | L146–L159 | System and overseer audit record |
| `DatabaseSchema` | Interface | L196–L210 | Composite database structure |
| `Database` | Class | L218–L653 | Database container |
| `Database.constructor` | Method | L221–L224 | Initializes data directory and loads/seeds database |
| `Database.loadOrSeed` | Method | L232–L244 | Reads `db.json` from disk or seeds defaults |
| `Database.saveData` | Method | L246–L248 | Flushes database state to disk |
| `Database.get` / `set` | Methods | L252–L260 | Strongly-typed table accessors |
| `Database.getSeedData` | Method | L265–L652 | Generates default users, contract #1847, and objectives |
| `db` | Export | L655 | Exported singleton instance |

---

## 2. `server/src/routes.ts` (~980 lines)
**Role**: HTTP API request router implementing overseer endpoints, player progression, and SQLite storage.

| Route / Symbol | Method | Lines | Description |
| :--- | :--- | :--- | :--- |
| `handleApiRoute` | Function | L11–L980 | Main async request dispatcher |
| `logAudit` | Helper | L18–L32 | Records overseer audit log directly to SQLite |
| `GET /api/health` | Route | L35–L55 | Subsystem health diagnostics and SQLite status |
| `GET /api/admin/stats` | Route | L58–L80 | Platform stats queried directly from SQLite |
| `GET /api/admin/contract` | Route | L83–L125 | Queries latest active contract and tasks from SQLite |
| `PUT /api/admin/contract` | Route | L127–L136 | Updates active contract properties |
| `POST /api/admin/contract/create` | Route | L139–L165 | Schedules or drafts a new contract |
| `POST /api/admin/contract/controls` | Route | L168–L218 | Emergency controls (pause, resume, extend, declare winner) |
| `GET /api/admin/objectives/pool` | Route | L221–L224 | Returns master library definitions |
| `POST /api/admin/objectives/generate` | Route | L226–L233 | Generates 10 balanced objectives (4E/3M/2H/1X) |
| `POST /api/admin/objectives/swap` | Route | L235–L255 | Replaces an active objective with a pool definition |
| `POST /api/admin/objectives/invalidate` | Route | L257–L278 | Quarantines corrupted objective and substitutes replacement |
| `GET /api/admin/participants` | Route | L281–L314 | Telemetry and progression for all contractors from SQLite |
| `GET /api/admin/rewards` | Route | L317–L320 | Rewards distribution history |
| `POST /api/admin/rewards/action` | Route | L322–L346 | Disburses, retries, or cancels pending payouts |
| `GET /api/admin/users` | Route | L349–L352 | Contractor user accounts directory |
| `POST /api/admin/users/:id/status` | Route | L354–L368 | Suspends, bans, or restores contractor accounts |
| `GET /api/admin/suspicious` | Route | L371–L374 | Telemetry anomaly flags |
| `GET /api/admin/alerts` | Route | L385–L388 | System critical alerts |
| `POST /api/admin/alerts/:id/resolve` | Route | L390–L403 | Acknowledges and clears alert |
| `GET /api/admin/announcements` | Route | L406–L409 | Top notch broadcast announcements |
| `POST /api/admin/announcements` | Route | L411–L427 | Publishes announcement to player notification notch |
| `POST /api/admin/patterns/test` | Route | L460–L500 | Pattern Compiler & Tester (§6.8) |
| `POST /api/admin/torn/sync-user` | Route | L503–L544 | Ingests Torn v2 logs and evaluates pattern engine |
| `POST /api/admin/participants/task-override` | Route | L575–L648 | Manual task override with mandatory audit reason (SQLite) |
| `POST /api/admin/participants/extra-bounty` | Route | L650–L678 | Awards extra bounty to contractor (SQLite) |
| `GET /api/dashboard/stats` | Route | L685–L728 | Player dashboard telemetry & live event stream from SQLite |
| `GET /api/contracts/active` | Route | L731–L800 | Full contract details and user objective progress from SQLite |
| `POST /api/player/verify-objective` | Route | L803–L860 | Verifies objective and credits partial bounty (SQLite) |
| `GET /api/contracts/history` | Route | L863–L885 | Historical contracts archive |
| `GET /api/leaderboard` | Route | L888–L915 | Overall contractor standings and champions list |
| `GET /api/player/profile` | Route | L918–L945 | User profile and statistics |

---

## 3. `src/state/admin.tsx` (~1250 lines)
**Role**: React Context provider for admin state, contract settings, and overseer controls.

| Symbol / Item | Type | Lines | Description |
| :--- | :--- | :--- | :--- |
| `AdminContractSettings` | Interface | L219–L234 | Contract properties including maxObjectives and partial rewards |
| `AdminContextType` | Interface | L236–L320 | State methods and values exposed to Admin views |
| `initialObjectivePool` | Constant | L70–L217 | 25+ default objective library items |
| `AdminProvider` | Component | L325–L1233 | Root provider handling live sync and operations |
| `updateStatus` / `updateType` | Functions | L730–L738 | Modifies contract lifecycle |
| `updateMaxObjectives` | Function | L760–L764 | Updates max task limit on active contract |
| `addObjectiveToContract` | Function | L765–L798 | Adds task with log syntax, complexity, and bounty |
| `editObjectiveInContract` | Function | L800–L820 | Edits existing task properties and pattern |
| `deleteObjectiveFromContract` | Function | L822–L835 | Removes task from active contract |
| `manualOverrideTask` | Function | L837–L870 | Calls `/api/admin/participants/task-override` |
| `addExtraBounty` | Function | L872–L895 | Calls `/api/admin/participants/extra-bounty` |
| `useAdmin` | Hook | L1236–L1242 | Convenience hook for accessing `AdminContext` |

---

## 4. `src/pages/AdminPage.tsx` (~2890 lines)
**Role**: Master Overseer Control Center dashboard, tabs, and interactive configuration drawers.

| Section / Modal | Key Lines | Description |
| :--- | :--- | :--- |
| **Nav & Header** | L220–L350 | Overseer Header, contract status badge, quick actions |
| **Tab 1: Dashboard** | L360–L690 | High-level KPI tiles, verification queue, alerts |
| **Tab 2: Contracts** | L695–L1150 | Contract controls, deadline extension, wizard |
| **Tab 3: Objectives** | L1155–L1310 | Active tasks table (log syntax, complexity, edit/delete) & pool |
| **Tab 4: Pattern Tester** | L1315–L1450 | Interactive regex pattern test lab (§6.8) |
| **Tab 5: Torn Sync** | L1455–L1560 | Live Torn API log fetcher and validation |
| **Tab 6: Participants** | L1565–L1650 | Live participants leaderboard and inspection trigger |
| **Tab 7: Rewards** | L1655–L1780 | Financial prize tiers and partial bounty distribution |
| **Tab 8: Archive** | L1785–L1840 | Historical contracts |
| **Tab 9: Users** | L1845–L1950 | User management, suspension, and ban actions |
| **Tab 10: Suspicious** | L1955–L2030 | Telemetry anomaly investigation |
| **Tab 11: Announcements**| L2035–L2130 | Top notch broadcast banner publisher |
| **Tab 12: Audit Logs** | L2135–L2200 | Immutable operation history ledger |
| **Modal: Participant Detail** | L2250–L2430 | Telemetry inspection drawer with manual override buttons |
| **Modal: Task Add / Edit** | L2545–L2685 | Form specifying Title, Category, Complexity, Bounty, and Log Syntax |
| **Modal: Manual Override** | L2690–L2770 | Mandatory audit reason prompt before applying task override |
| **Modal: Extra Bounty** | L2775–L2845 | Modal for awarding custom dollar bounties to agents |

---

## 5. `src/components/dashboard.tsx` (~555 lines)
**Role**: Agent player dashboard widgets and live contract status cards.

| Component | Lines | Description |
| :--- | :--- | :--- |
| `ContractHero` | L49–L155 | Hero card displaying remaining time, contract #, and start/continue action |
| `ContractPreview` | L159–L188 | Preview parameters before starting contract |
| `ProgressCard` | L192–L240 | Unfinished objective progress bars for the current agent |
| `HistoryCard` | L244–L287 | Lifetime contracts entered, completed, and win totals |
| `StatsCard` | L291–L330 | Personal agent statistics breakdown |
| `AchievementsCard` | L341–L362 | Badges and accomplishment icons |
| `AnnouncementsCard` | L366–L437 | Notification card pulling broadcasts from SQLite backend |
| `ActivityCard` | L448–L489 | Real-time agent event stream |
| `QuickNav` | L525–L554 | Shortcut navigation grid to Contract, Archive, Leaderboard, Profile |
