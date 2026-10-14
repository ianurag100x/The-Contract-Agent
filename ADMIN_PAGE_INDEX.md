# Index & Function Map: `src/pages/AdminPage.tsx`
> Total Lines: ~2898 | File Path: `src/pages/AdminPage.tsx`

Use this index to quickly locate specific tabs, modals, states, and event handlers without reading through the full 2,800+ lines.

---

## 1. Imports, Types & State Hooks

| Lines | Item | Details |
| :--- | :--- | :--- |
| **L1–L70** | Imports | React hooks, Lucide icons, `useAdmin`, format helpers, meta maps |
| **L71–L86** | `AdminNavSection` | Union of all tab IDs: `'dashboard' \| 'contracts' \| 'objectives' \| 'patterns' \| 'torn-sync' \| 'participants' \| 'rewards' \| 'archive' \| 'users' \| 'suspicious' \| 'alerts' \| 'announcements' \| 'activity' \| 'settings'` |
| **L88–L165** | `useAdmin()` Destructure | `stats`, `contract`, `objectivePool`, `verificationQueue`, `participants`, `users`, `rewardsHistory`, `alerts`, `announcements`, `auditLogs`, and all contract/task mutation functions |
| **L166–L180** | Modal Visibility States | `showCreateContractModal`, `showAnnouncementModal`, `showWinnerModal`, `participantFilter`, `userSearch` |
| **L181–L188** | Contract Wizard States | `newContractNumber`, `newContractType`, `newWinnerConfig`, `newPrize`, `newPartialBounty` |
| **L189–L197** | Pattern Tester States | `testTemplate`, `testMetric`, `testTarget`, `testValueCapture`, `testSamples`, `isTestingPattern`, `patternTestResult` |
| **L198–L205** | Torn API Sync States | `syncApiKey`, `syncUserTarget`, `syncLimit`, `isSyncingTorn`, `syncResult` |
| **L206–L218** | Task CRUD States | `taskModalMode` (`'create' | 'edit'`), `editingTaskIndex`, `taskTitle`, `taskCategory`, `taskComplexity`, `taskTarget`, `taskBounty`, `taskMetric`, `taskLogPattern`, `taskAgentNote`, `taskError` |
| **L219–L223** | Extra Bounty States | `extraBountyTarget`, `extraBountyAmount`, `extraBountyReason` |
| **L224–L233** | Manual Override States | `overrideModal` (`participantId`, `userId`, `objId`, `objTitle`, `action`), `overrideReason` |
| **L234–L246** | Filtered Lists | `filteredParticipants` and `filteredUsers` search filters |

---

## 2. Navigation & Top Header

| Lines | Section | Elements |
| :--- | :--- | :--- |
| **L250–L275** | Header Banner | Title "Overseer Control Center", status indicator (`contract.status`), platform description |
| **L276–L310** | Top Quick Action Buttons | "Create Contract" button (switches to `contracts` section), "Objectives" quick jump, "Participants" jump, "Notch Broadcasts" jump |
| **L312–L364** | Tab Navigation Bar | Horizontal scrolling bar with 14 tab buttons with icon, label, and live numeric notification badges |

---

## 3. Tab Views (`activeSection`)

### Tab 1: Dashboard (`activeSection === 'dashboard'`)
* **L370–L398**: Top Platform Statistics KPI row (Registered users, active users, active contractors, contracts completed, total distributed cash from SQLite)
* **L400–L468**: Active Contract Overview Card (Type, status, remaining time, participants, grand prize, pause/resume buttons)
* **L470–L530**: System Health & Subsystems Status (TORN API, Verification Engine, Database WAL, WebSockets, failed request counters)
* **L535–L610**: Critical System Alerts Widget (Warning/danger notifications with "Resolve" buttons)
* **L612–L692**: Live Real-Time Objective Verification Queue table (Retry, Verify, Reject action triggers)

### Tab 2: Pattern Tester (`activeSection === 'patterns'`)
* **L696–L865**: Interactive Log Pattern Compiler Lab (§6.8). Admin inputs syntax template with placeholders (`{energy:int}`, `{opponent:text}`), selects metric, tests against multiline sample log lines, and inspects token captures.

### Tab 3: Torn API Log Sync (`activeSection === 'torn-sync'`)
* **L870–L998**: Torn API v2 Live Ingestion & Sync Pipeline (§7). Ingests real log streams from `GET /v2/user/log`, strips timestamps, executes the pattern engine, and credits partial bounties.

### Tab 4: Contracts & Wizard (`activeSection === 'contracts'`)
* **L1002–L1090**: Primary Contract Controls (Enable/disable partial objective bounties, pause, resume, extend +1h, invalidate, cancel, factory reset)
* **L1092–L1180**: Contract Creation Wizard (Contract number, type standard/elite/black/survival, grand prize, partial bounty per task, schedule/save draft)

### Tab 5: Objectives & Contract Tasks (`activeSection === 'objectives'`)
* **L1185–L1315**: Active Contract Tasks Management. Displays tasks in current contract, Max Tasks limit input, Add Task button, table showing Task Name, Complexity Badge, Target, Bounty, Log Syntax Pattern, and Edit/Delete controls.
* **L1289–L1352**: Master Objective Pool Library. Balanced generator button (4E/3M/2H/1X), grid of 25+ pool tasks with category, target, partial bounty, configure and enable/disable toggles.

### Tab 6: Participants Telemetry (`activeSection === 'participants'`)
* **L1358–L1448**: Live Participants Leaderboard. Filters (all, active, completed, suspicious), Rank, Contractor Name, Torn ID, Progress segmented bar, Partial payouts, Status, and "Inspect →" drawer opener.

### Tab 7: Rewards & Ledger (`activeSection === 'rewards'`)
* **L1453–L1530**: Financial prize pool KPIs (Total distributed cash, grand prize pool, partial bounty pool, failed deliveries) and reward transaction history table.

### Tab 8: Archive (`activeSection === 'archive'`)
* **L1535–L1595**: Historical contracts archive table (past winners, duration, participants).

### Tab 9: User Directory (`activeSection === 'users'`)
* **L1600–L1675**: Contractor user accounts directory with search filter, contracts entered/completed, win rate, and suspend/restore buttons.

### Tab 10: Suspicious Anomaly Flags (`activeSection === 'suspicious'`)
* **L1680–L1740**: Telemetry anti-fraud monitor with investigate/clear buttons.

### Tab 11: Announcements & Broadcasts (`activeSection === 'announcements'`)
* **L1745–L1840**: Notch broadcast banner publisher, active broadcasting status indicator, and broadcast history toggle list.

### Tab 12: Activity & Audit Logs (`activeSection === 'activity'`)
* **L1845–L1900**: Immutable operations ledger detailing timestamps, admin IP, actions, and entities.

### Tab 13: Settings (`activeSection === 'settings'`)
* **L1905–L1965**: Platform global options (daily reset time, default contract duration, API rate limits).

---

## 4. Modals & Configuration Drawers

| Lines | Modal | Purpose |
| :--- | :--- | :--- |
| **L1970–L2050** | Create Contract Modal | Schedule or draft a new contract sequence |
| **L2055–L2223** | Participant Telemetry Drawer | Deep inspection of an agent's objective progression with **Manual Override buttons** (Complete, Incomplete, Reset, Delete) and **Award Extra Bounty** trigger |
| **L2228–L2321** | Announcement Creation Modal | Form to compose and broadcast notch alerts across all user sessions |
| **L2326–L2370** | Declare Winner Modal | Final winner validation and grand prize disbursal |
| **L2375–L2475** | Objective Library Config Modal | Edit master pool item target, category, difficulty, bounty |
| **L2477–L2540** | User Contract History Modal | Displays lifetime contract track record and finish times |
| **L2545–L2685** | Task Create / Edit Modal | **Mandatory fields**: Title, Category, Complexity, Target, Metric, Bounty ($), and **Log Syntax Template** |
| **L2690–L2770** | Manual Task Override Modal | Prompt requiring **mandatory audit reason** before applying override |
| **L2775–L2894** | Extra Bounty Modal | Disburses custom dollar bonus to an individual agent with grant reason |
