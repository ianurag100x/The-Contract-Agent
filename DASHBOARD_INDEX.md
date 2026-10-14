# DASHBOARD.TSX Index & Function Map

File path: `src/components/dashboard.tsx`  
Total lines: 555 lines

This document provides a concise reference for all helper functions, components, state hooks, and navigation elements in `src/components/dashboard.tsx`. Refer to this document before editing to minimize full-file reads.

---

## 1. Imports and Sub-components

- **Lines 1-36**: React imports (`useEffect`, `useState`), Router (`Link`), Lucide Icons (`Trophy`, `Flame`, `ScrollText`, `Bell`, `Zap`, `CheckCircle2`, `TriangleAlert`, etc.), mock and agent data (`agentStats`, `announcements`, `activity`), API client (`dashboardApi`), formatters (`hm`, `hms`), and UI building blocks (`Card`, `MiniBar`, `Pill`, `SegmentedBar`).
- **Lines 38-45**: `Tile({ label, children })`
  - Internal layout helper for dashboard metric cards and boxes.

---

## 2. Exported Dashboard Components

### `ContractHero`
- **Lines 49-155**
- **State & Data**:
  - `started`, `setStarted` via `useContractState()`
  - `contract` via `useAdmin()`
  - `now` via `useNow()`
  - Remaining time calculation via `hms(remaining)`
- **Render States**:
  - `!started`: Renders "No Active Contract", contract number, objectives count, remaining time, prize, and "Start Contract" action.
  - `started`: Renders active badge, contract number, "Your Progress" with `SegmentedBar`, time remaining, current position/leader, and "Continue Contract" link.

---

### `ContractPreview`
- **Lines 159-188**
- **Purpose**: Quick snapshot of today's contract parameters (Type, Total Objectives, Winners rule, Prize, Participant count, Time remaining) before or alongside contract participation.

---

### `ProgressCard`
- **Lines 192-240**
- **Purpose**: Displays the user's incomplete objectives sorted by completion ratio.
- **Render Details**:
  - Renders progress bar (`MiniBar`) for objectives with target > 1.
  - Deep-links to `/contract`.

---

### `HistoryCard`
- **Lines 244-287**
- **Props**: `{ showLink?: boolean }`
- **Purpose**: Displays quick agent history metrics (Contracts Entered, Completed, Wins, Top 3 Finishes, Best Finish, Fastest Completion).

---

### `StatsCard`
- **Lines 291-330**
- **Purpose**: Tabular summary of lifetime statistics (Contracts Started, Completed, Wins, Top 3, Objectives Completed, Completion Rate, Average Completion Time, Fastest).

---

### `AchievementsCard`
- **Lines 341-362**
- **Helper Map**: `achievementIcons` (lines 334-339)
- **Purpose**: Lists recent player achievements with trophy, flame, speed, or target icons.

---

### `AnnouncementsCard`
- **Lines 366-437**
- **State & Integration**:
  - Fetches dynamic announcements from `dashboardApi.getStats()` (lines 371-381).
  - Dynamically injects emergency warnings if contract is ending within 60 minutes or if admin paused verification.

---

### `ActivityCard`
- **Lines 448-489**
- **Helper Map**: `activityIcons` (lines 441-446)
- **State & Integration**:
  - Live activity feed fetched from `dashboardApi.getStats()` (lines 451-461).
  - Shows recent player completions, rank improvements, or contract wins.

---

### `QuickNav`
- **Lines 525-554**
- **Data Array**: `destinations` (lines 493-523)
- **Purpose**: 4-column shortcut cards linking to `/contract`, `/archive`, `/leaderboard`, and `/profile`.
