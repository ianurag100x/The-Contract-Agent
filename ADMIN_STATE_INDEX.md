# Index & Function Map: `src/state/admin.tsx`
> Total Lines: ~1290 | File Path: `src/state/admin.tsx`

Use this index to quickly locate specific context types, state management logic, mutation handlers, and persistence hooks without inspecting the full 1,200+ lines.

---

## 1. Type & Interface Definitions

| Lines | Interface / Type | Purpose |
| :--- | :--- | :--- |
| **L18–L26** | `AdminContractStatus` | Lifecycle states: `'draft' \| 'scheduled' \| 'active' \| 'paused' \| 'completed' \| 'cancelled' \| 'invalid'` |
| **L27–L33** | `WinnerConfig` | Winner rule presets: `'1 winner' \| 'Top 3' \| 'Top 5' \| 'Top 10' \| 'Everyone who completes'` |
| **L34–L42** | `AuditLogEntry` | Overseer audit event record |
| **L44–L52** | `VerificationQueueItem` | Telemetry verification queue item schema |
| **L54–L68** | `Participant` | Contractor progression state and partial rewards total |
| **L69–L76** | `ObjectivePoolItem` | Library task schema with weights and rng eligibility |
| **L77–L90** | `RewardRecord` | Payout history record |
| **L91–L102** | `AdminUserRecord` | Contractor account overview and lifetime stats |
| **L104–L112** | `AdminAlert` | Health and critical alert item |
| **L114–L123** | `AdminAnnouncement` | Top notch announcement broadcast schema |
| **L125–L132** | `SuspiciousActivityItem` | Telemetry fraud detection item |
| **L134–L150** | `SystemHealthMetrics` | Status of all subsystems |
| **L220–L235** | `AdminContractSettings` | Composite contract state (number, status, type, objectives, maxObjectives, partialRewards) |
| **L236–L243** | `AdminPlatformStats` | Live statistics summary (`registeredUsers`, `activeUsers`, `activeContractors`, `contractsCompleted`, `totalRewardsDistributed`) |
| **L245–L320** | `AdminContextType` | Full contract of properties and actions returned by `useAdmin()` |

---

## 2. Default Seed Constants

| Lines | Item | Details |
| :--- | :--- | :--- |
| **L70–L217** | `OBJECTIVE_POOL` | 25+ default objective library items spanning Combat, Travel, Energy, Economy, General, and Faction |

---

## 3. `AdminProvider` State Initializers

| Lines | State Hook | Default Source / Initial State |
| :--- | :--- | :--- |
| **L325–L345** | `[contract, setContract]` | Initialized from localStorage `contract-agent:admin-contract-v3` or `initialToday` fallback |
| **L347–L354** | `[objectivePool, setObjectivePool]` | Initialized from localStorage `contract-agent:admin-objpool` or `OBJECTIVE_POOL` |
| **L356–L363** | `[verificationQueue, setVerificationQueue]` | 5 default telemetry verification items (PlayerA to PlayerE) |
| **L365–L445** | `[participants, setParticipants]` | 5 default participants with full 10-objective progress arrays |
| **L450–L553** | `[users, setUsers]` | 5 default contractor user records with past contract history |
| **L557–L565** | `[rewardsHistory, setRewardsHistory]` | Delivered and pending reward transaction records |
| **L567–L572** | `[alerts, setAlerts]` | Critical system alerts |
| **L574–L585** | `[announcements, setAnnouncements]` | Broadcast announcements |
| **L587–L591** | `[suspiciousActivity, setSuspiciousActivity]` | Rapid objective and anomaly detection entries |
| **L593–L605** | `[systemHealth]` | Operational flags for Torn API, Verification, and SQLite DB |
| **L620–L624** | `[auditLogs, setAuditLogs]` | Action ledger logs |
| **L626–L633** | `[stats, setStats]` | Live SQLite platform statistics |

---

## 4. API Fetching & Synchronization

| Lines | Function / Hook | Details |
| :--- | :--- | :--- |
| **L634–L649** | `refreshStats` | Async query to `adminApi.getStats()` updating `stats` state |
| **L651–L700** | `useEffect (mount)` | Queries backend on launch: `refreshStats()`, `adminApi.getContract()`, `adminApi.getAnnouncements()`, `adminApi.getParticipants()`, `adminApi.getRewards()` |
| **L703–L715** | `saveContract` | Updates React state, syncs to `localStorage`, and calls `adminApi.updateContract` |
| **L717–L732** | `addAuditLog` | Appends new entry to local audit ledger with timestamp |

---

## 5. Contract Controls & Task Management Handlers

| Lines | Function | Details |
| :--- | :--- | :--- |
| **L735–L745** | `updateStatus` | Changes contract status (`active`, `paused`, etc.) and logs audit |
| **L746–L754** | `updateType` | Changes contract type (`standard`, `elite`, `black`, `survival`) |
| **L755–L760** | `updateWinnerConfig` | Updates winner rule (`1 winner`, `Top 3`, etc.) |
| **L761–L764** | `updateContractNumber` | Increments/decrements contract sequence ID |
| **L765–L769** | `updateRewards` | Replaces reward tiers array |
| **L770–L774** | `updateObjectives` | Replaces active contract objectives array |
| **L775–L779** | `updateMaxObjectives` | Adjusts `maxObjectives` ceiling for contract tasks |
| **L780–L815** | `addObjectiveToContract` | Inserts new task enforcing log syntax, complexity, target, metric, and bounty |
| **L817–L835** | `editObjectiveInContract` | Updates specific objective at index in active contract |
| **L837–L850** | `deleteObjectiveFromContract` | Removes objective from active contract array |
| **L852–L875** | `manualOverrideTask` | Invokes `/api/admin/participants/task-override` with mandatory audit reason |
| **L877–L905** | `addExtraBounty` | Invokes `/api/admin/participants/extra-bounty` and updates contractor totals |
| **L907–L925** | `toggleObjectiveEnabled` | Enables or disables pool definition |
| **L927–L935** | `updateObjectiveInPool` | Saves modified library definition |
| **L937–L955** | `replaceObjective` | Substitutes an active contract task |
| **L957–L975** | `invalidateObjective` | Quarantines corrupted objective |
| **L977–L1010** | `randomizeBalancedObjectives` | Generates 4 Easy, 3 Medium, 2 Hard, 1 Extreme distribution |
| **L1012–L1050** | `startContract`, `pauseContract`, `resumeContract` | Emergency control triggers |
| **L1052–L1060** | `extendDeadlineMinutes` | Adds extra minutes to contract `endsAt` |
| **L1062–L1080** | `endContract`, `cancelContract`, `declareWinner` | Winner finalization & reward distribution |
| **L1085–L1120** | `retryVerification`, `manuallyVerify`, `rejectVerification` | Verification queue handlers |
| **L1122–L1150** | `suspendUser`, `banUser`, `restoreUser` | Account moderation handlers |
| **L1152–L1180** | `issueReward`, `retryReward`, `cancelReward` | Ledger transaction control handlers |
| **L1182–L1200** | `resolveAlert`, `investigateSuspicious`, `clearSuspicious` | Anti-fraud & issue handlers |
| **L1202–L1235** | `publishAnnouncement`, `toggleAnnouncementActive`, `deleteAnnouncement` | Notch broadcasts handlers |
| **L1237–L1250** | `resetToDefault` | Restores default factory parameters |

---

## 6. Provider Value Export & Hook

| Lines | Item | Details |
| :--- | :--- | :--- |
| **L1252–L1320** | `AdminContext.Provider` | Passes all state values and handlers to children |
| **L1322–L1328** | `useAdmin()` | Exported hook with validation check |
