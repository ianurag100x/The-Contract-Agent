import { useState } from 'react'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Archive,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Dices,
  DollarSign,
  Eye,
  FileCheck,
  FileSpreadsheet,
  Filter,
  Flame,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
  Megaphone,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  StopCircle,
  Trash2,
  Trophy,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  Wrench,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  useAdmin,
  type AdminContractStatus,
  type ObjectivePoolItem,
  type Participant,
  type WinnerConfig,
  type AdminUserRecord,
} from '../state/admin'
import { useNow } from '../hooks/useNow'
import { duration, hms } from '../lib/format'
import { categoryMeta, difficultyMeta } from '../lib/meta'
import type { Category, ContractType, Difficulty, Objective, Reward } from '../types'
import {
  buttonClass,
  Card,
  DifficultyBadge,
  PageHeader,
  Pill,
  SegmentedBar,
} from '../components/ui'

type AdminNavSection =
  | 'dashboard'
  | 'contracts'
  | 'objectives'
  | 'participants'
  | 'rewards'
  | 'archive'
  | 'users'
  | 'suspicious'
  | 'alerts'
  | 'announcements'
  | 'activity'
  | 'settings'

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<AdminNavSection>('dashboard')
  const {
    contract,
    updateStatus,
    updateType,
    updateWinnerConfig,
    updateContractNumber,
    updateRewards,
    updateObjectives,
    togglePartialRewards,
    createContract,

    objectivePool,
    toggleObjectiveEnabled,
    updateObjectiveInPool,
    replaceObjective,
    invalidateObjective,
    randomizeBalancedObjectives,

    startContract,
    pauseContract,
    resumeContract,
    extendDeadlineMinutes,
    endContract,
    cancelContract,
    invalidateContract,
    declareWinner,

    verificationQueue,
    retryVerification,
    manuallyVerify,
    rejectVerification,

    participants,
    selectedParticipant,
    setSelectedParticipant,
    users,
    selectedUser,
    setSelectedUser,
    suspendUser,
    banUser,
    restoreUser,

    rewardsHistory,
    issueReward,
    retryReward,
    cancelReward,

    alerts,
    resolveAlert,
    suspiciousActivity,
    investigateSuspicious,
    clearSuspicious,

    announcements,
    activeAnnouncement,
    publishAnnouncement,
    toggleAnnouncementActive,
    dismissActiveAnnouncement,
    deleteAnnouncement,

    systemHealth,
    auditLogs,
    addAuditLog,
    resetToDefault,
  } = useAdmin()

  const now = useNow(1000)
  const remaining = Math.max(0, contract.endsAt - now)

  // Modals & Action States
  const [showCreateContractModal, setShowCreateContractModal] = useState(false)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [winnerNameInput, setWinnerNameInput] = useState('PlayerA')
  const [editingObjective, setEditingObjective] = useState<ObjectivePoolItem | null>(null)
  const [participantFilter, setParticipantFilter] = useState<'all' | 'active' | 'inactive' | 'completed' | 'suspicious' | 'error'>('all')
  const [userSearch, setUserSearch] = useState('')

  // Create Contract Form State
  const [newContractNumber, setNewContractNumber] = useState(contract.number + 1)
  const [newContractType, setNewContractType] = useState<ContractType>('standard')
  const [newWinnerConfig, setNewWinnerConfig] = useState<WinnerConfig>('1 winner')
  const [newObjSelection, setNewObjSelection] = useState<'Random' | 'Manual' | 'Hybrid'>('Random')
  const [newPrize, setNewPrize] = useState('$10,000,000 + 1× Xanax')
  const [newPartialBounty, setNewPartialBounty] = useState(500000)

  // Announcement Form State
  const [announcementTitle, setAnnouncementTitle] = useState('Contract Ending Soon')
  const [announcementMsg, setAnnouncementMsg] = useState('Only 60 minutes remain to verify today’s objectives for Contract #1847.')
  const [announcementType, setAnnouncementType] = useState<'Information' | 'Warning' | 'Important' | 'Maintenance'>('Warning')
  const [announcementTarget, setAnnouncementTarget] = useState<'Dashboard' | 'Contract page' | 'All users'>('All users')

  // Filtered Participants
  const filteredParticipants = participants.filter((p) => {
    if (participantFilter === 'all') return true
    return p.status === participantFilter
  })

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    return (
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      String(u.tornId).includes(userSearch)
    )
  })

  const activeAlertsCount = alerts.filter((a) => !a.resolved).length

  return (
    <div className="space-y-6">
      {/* 22. Top Header & Quick Actions */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-hard/20 text-hard border border-hard/30">
              <Shield className="size-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Overseer Control Center
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                contract.status === 'active'
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : contract.status === 'paused'
                    ? 'bg-hard/15 text-hard border border-hard/30'
                    : 'bg-raised text-muted border border-line'
              }`}
            >
              ● {contract.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Platform oversight, participant telemetry, objective verification, partial bounties & backend sync.
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateContractModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent/90"
          >
            <Plus className="size-3.5" />
            Create Contract
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('objectives')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-raised"
          >
            <Layers className="size-3.5 text-muted" />
            Objectives
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('participants')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-raised"
          >
            <Users className="size-3.5 text-muted" />
            Participants
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('announcements')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-raised"
          >
            <Megaphone className="size-3.5 text-accent" />
            Notch Broadcasts
          </button>
        </div>
      </div>

      {/* Admin Navigation Bar */}
      <nav aria-label="Admin Navigation" className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1 rounded-xl border border-line bg-surface p-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'contracts', label: 'Contracts', icon: Sliders },
            { id: 'objectives', label: 'Objectives', icon: Layers },
            { id: 'participants', label: 'Participants', icon: Users, badge: contract.participants },
            { id: 'rewards', label: 'Rewards & Partial', icon: Trophy },
            { id: 'archive', label: 'Archive', icon: Archive },
            { id: 'users', label: 'Users', icon: UserCheck },
            { id: 'suspicious', label: 'Suspicious', icon: ShieldAlert, badge: suspiciousActivity.filter(s => s.status === 'investigating').length, badgeTone: 'danger' },
            { id: 'alerts', label: 'Alerts & Health', icon: AlertTriangle, badge: activeAlertsCount, badgeTone: 'warning' },
            { id: 'announcements', label: 'Announcements', icon: Megaphone, badge: activeAnnouncement ? 'LIVE' : undefined, badgeTone: 'accent' },
            { id: 'activity', label: 'Activity Logs', icon: History },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(({ id, label, icon: Icon, badge, badgeTone }) => {
            const active = activeSection === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id as AdminNavSection)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-raised text-fg shadow-sm'
                    : 'text-muted hover:bg-raised/50 hover:text-fg'
                }`}
              >
                <Icon className={`size-3.5 ${active ? (id === 'suspicious' || id === 'alerts' ? 'text-hard' : 'text-accent') : ''}`} />
                {label}
                {badge !== undefined && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      badgeTone === 'danger'
                        ? 'bg-extreme/20 text-extreme'
                        : badgeTone === 'warning'
                          ? 'bg-hard/20 text-hard'
                          : badgeTone === 'accent'
                            ? 'bg-accent/20 text-accent animate-pulse'
                            : 'bg-raised text-muted'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* SECTION 1: ADMIN DASHBOARD OVERVIEW (Matching exact layout from PDF pg 5) */}
      {/* ========================================================================= */}
      {activeSection === 'dashboard' && (
        <div className="space-y-5">
          {/* 1. Platform Statistics Top KPI Row */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
            <div className="bg-surface px-4 py-3.5">
              <dt className="text-xs text-muted">Total Registered Users</dt>
              <dd className="tabular mt-1 text-xl font-bold">12,482</dd>
              <p className="mt-0.5 text-[11px] text-faint">All players registered</p>
            </div>
            <div className="bg-surface px-4 py-3.5">
              <dt className="text-xs text-muted">Active Users</dt>
              <dd className="tabular mt-1 text-xl font-bold">1,284</dd>
              <p className="mt-0.5 text-[11px] text-faint">Interacted recently</p>
            </div>
            <div className="bg-surface px-4 py-3.5">
              <dt className="text-xs text-muted">Active Contractors</dt>
              <dd className="tabular mt-1 text-xl font-bold text-accent">482</dd>
              <p className="mt-0.5 text-[11px] text-faint">In active contract</p>
            </div>
            <div className="bg-surface px-4 py-3.5">
              <dt className="text-xs text-muted">Contracts Completed</dt>
              <dd className="tabular mt-1 text-xl font-bold">1,847</dd>
              <p className="mt-0.5 text-[11px] text-faint">Since launch</p>
            </div>
            <div className="bg-surface px-4 py-3.5 col-span-2 sm:col-span-1">
              <dt className="text-xs text-muted">Total Rewards Distributed</dt>
              <dd className="tabular mt-1 text-xl font-bold text-medium">$4.82B</dd>
              <p className="mt-0.5 text-[11px] text-faint">Grand + partial payouts</p>
            </div>
          </div>

          {/* Row 2: Current Contract & System Health */}
          <div className="grid gap-5 lg:grid-cols-12">
            {/* 2. Current Contract Card */}
            <Card className="p-5 lg:col-span-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Pill tone="accent">
                    {contract.type.toUpperCase()} • {contract.status.toUpperCase()}
                  </Pill>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Contract #{contract.number}
                  </h2>
                  <p className="text-xs text-muted">
                    One contract. Ten objectives. {contract.winnerConfig}.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted">Time Remaining</span>
                  <p className="tabular text-xl font-bold text-accent">{hms(remaining)}</p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-line bg-raised/50 p-3">
                  <dt className="text-[11px] text-muted">Participants</dt>
                  <dd className="tabular mt-0.5 text-base font-semibold">{contract.participants}</dd>
                </div>
                <div className="rounded-xl border border-line bg-raised/50 p-3">
                  <dt className="text-[11px] text-muted">Winners</dt>
                  <dd className="tabular mt-0.5 text-base font-semibold">{contract.winnerConfig}</dd>
                </div>
                <div className="rounded-xl border border-line bg-raised/50 p-3">
                  <dt className="text-[11px] text-muted">Partial Bounties</dt>
                  <dd className="truncate text-xs font-semibold mt-1 text-accent">
                    {contract.partialRewardsEnabled ? '$500k / obj' : 'Disabled'}
                  </dd>
                </div>
                <div className="rounded-xl border border-line bg-raised/50 p-3">
                  <dt className="text-[11px] text-muted">Grand Prize</dt>
                  <dd className="truncate text-xs font-semibold mt-1 text-medium">{contract.rewards[0]?.reward || '$10M + Xanax'}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2 pt-1 border-t border-line">
                <button
                  type="button"
                  onClick={() => setActiveSection('contracts')}
                  className={`${buttonClass()} text-xs py-1.5 px-3 min-h-8`}
                >
                  Manage Contract
                  <ArrowRight className="size-3.5" />
                </button>
                {contract.status === 'active' ? (
                  <button
                    type="button"
                    onClick={pauseContract}
                    className="flex items-center gap-1.5 rounded-lg border border-hard/40 bg-hard/10 px-3 py-1.5 text-xs font-semibold text-hard hover:bg-hard/20"
                  >
                    <Pause className="size-3.5" /> Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resumeContract}
                    className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20"
                  >
                    <Play className="size-3.5" /> Resume
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => extendDeadlineMinutes(60)}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:bg-raised"
                >
                  <Clock className="size-3.5 text-muted" /> +1h Buffer
                </button>
              </div>
            </Card>

            {/* 15. System Health Card */}
            <Card title="System Health & API" className="lg:col-span-5">
              <div className="p-4 pt-0 space-y-3 sm:p-5 sm:pt-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['TORN API', systemHealth.tornApi],
                    ['Verification Engine', systemHealth.verificationEngine],
                    ['Database', systemHealth.database],
                    ['Reward System', systemHealth.rewardSystem],
                    ['Authentication', systemHealth.authentication],
                    ['Background Jobs', systemHealth.backgroundJobs],
                    ['WebSocket Updates', systemHealth.webSocket],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-lg border border-line bg-raised/40 px-2.5 py-1.5">
                      <span className="text-muted truncate pr-2">{k}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                        <span className="size-1.5 rounded-full bg-accent" />
                        OK
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-line text-center text-xs">
                  <div className="rounded-lg bg-raised/30 p-2">
                    <p className="text-[10px] text-muted">API Requests</p>
                    <p className="tabular font-bold mt-0.5">182.4k</p>
                  </div>
                  <div className="rounded-lg bg-raised/30 p-2">
                    <p className="text-[10px] text-muted">Failed Reqs</p>
                    <p className="tabular font-bold mt-0.5 text-hard">23</p>
                  </div>
                  <div className="rounded-lg bg-raised/30 p-2">
                    <p className="text-[10px] text-muted">Avg Verif</p>
                    <p className="tabular font-bold mt-0.5 text-accent">1.8s</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 3: Live Participants & Admin Alerts */}
          <div className="grid gap-5 lg:grid-cols-12">
            {/* 8. Live Participants Stream with Partial Rewards */}
            <Card
              title="Live Active Contractors"
              action={
                <button
                  type="button"
                  onClick={() => setActiveSection('participants')}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  View All (482) →
                </button>
              }
              className="lg:col-span-7"
            >
              <div className="p-4 pt-0 sm:p-5 sm:pt-0">
                <ul className="divide-y divide-line rounded-xl border border-line bg-raised/30">
                  {participants.slice(0, 4).map((p) => (
                    <li
                      key={p.id}
                      onClick={() => setSelectedParticipant(p)}
                      className="flex cursor-pointer items-center justify-between p-3 text-xs transition-colors hover:bg-raised/60"
                    >
                      <div className="flex items-center gap-3">
                        <span className="tabular font-bold w-6 text-muted">#{p.rank}</span>
                        <div>
                          <p className="font-semibold text-fg">{p.name}</p>
                          <p className="text-[11px] text-muted">
                            Torn ID: #{p.tornId} · <span className="text-accent font-medium">+${((p.partialRewardsEarned || 0) / 1e6).toFixed(2)}M partial</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="tabular font-bold text-accent">{p.completedCount}/{p.totalCount}</span>
                        <span className="text-[11px] text-faint">{p.lastActive}</span>
                        <ChevronRight className="size-4 text-faint" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* 16. Admin Alerts & Issues */}
            <Card
              title="Admin Alerts & Issues"
              action={
                <span className="rounded-full bg-hard/20 px-2 py-0.5 text-[10px] font-bold text-hard">
                  {activeAlertsCount} Action Required
                </span>
              }
              className="lg:col-span-5"
            >
              <div className="p-4 pt-0 space-y-2.5 sm:p-5 sm:pt-0">
                {alerts.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-3 text-xs space-y-1 ${
                      a.resolved
                        ? 'border-line bg-surface opacity-60'
                        : a.severity === 'danger'
                          ? 'border-extreme/30 bg-extreme/5'
                          : 'border-hard/30 bg-hard/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-fg flex items-center gap-1.5">
                        <AlertTriangle className={`size-3.5 ${a.severity === 'danger' ? 'text-extreme' : 'text-hard'}`} />
                        {a.title}
                      </p>
                      <span className="text-[10px] text-faint">{a.timestamp}</span>
                    </div>
                    <p className="text-muted leading-relaxed text-[11px]">{a.description}</p>
                    {!a.resolved && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => resolveAlert(a.id)}
                          className="rounded bg-surface border border-line px-2 py-1 text-[11px] font-semibold text-accent hover:border-accent"
                        >
                          Resolve Issue
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row 4: 7. Objective Verification Monitor */}
          <Card
            title="Objective Verification Queue (Real-Time)"
            action={
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                Telemetry Live
              </span>
            }
          >
            <div className="p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-raised/50 text-muted">
                    <tr>
                      <th className="px-4 py-2.5">Player</th>
                      <th className="px-3 py-2.5">Objective</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {verificationQueue.map((vq) => (
                      <tr key={vq.id} className="hover:bg-raised/30">
                        <td className="px-4 py-3 font-semibold text-fg">{vq.playerName}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-fg">{vq.objectiveTitle}</p>
                          <span className="text-[10px] text-faint">{vq.objectiveId}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              vq.status === 'verified'
                                ? 'bg-accent/15 text-accent'
                                : vq.status === 'processing'
                                  ? 'bg-medium/15 text-medium'
                                  : vq.status === 'error'
                                    ? 'bg-extreme/20 text-extreme'
                                    : 'bg-raised text-muted'
                            }`}
                          >
                            {vq.status === 'verified' && <CheckCircle2 className="size-3" />}
                            {vq.status === 'error' && <AlertTriangle className="size-3" />}
                            {vq.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="tabular px-3 py-3 text-muted">{vq.timestamp}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => retryVerification(vq.id)}
                              className="rounded border border-line bg-surface px-2 py-1 text-[11px] font-medium hover:border-line-strong"
                            >
                              Retry
                            </button>
                            <button
                              type="button"
                              onClick={() => manuallyVerify(vq.id)}
                              className="rounded bg-accent/10 border border-accent/30 px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent hover:text-accent-ink"
                            >
                              Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectVerification(vq.id)}
                              className="rounded bg-extreme/10 border border-extreme/30 px-2 py-1 text-[11px] font-semibold text-extreme hover:bg-extreme hover:text-white"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CONTRACTS & CREATION (Sections 2, 3, 4)                       */}
      {/* ========================================================================= */}
      {activeSection === 'contracts' && (
        <div className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Contract Controls & Lifecycle */}
            <Card title="3. Primary Contract Controls & Partial Awards" className="lg:col-span-6">
              <div className="p-4 pt-0 space-y-4 sm:p-5 sm:pt-0">
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
                  <div className="flex items-center gap-2.5">
                    <Coins className="size-5 text-accent" />
                    <div>
                      <p className="text-xs font-semibold text-fg">Partial Objective Bounties</p>
                      <p className="text-[11px] text-muted">Award cash per verified objective</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePartialRewards(!contract.partialRewardsEnabled)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      contract.partialRewardsEnabled
                        ? 'bg-accent text-accent-ink'
                        : 'bg-raised text-muted border border-line'
                    }`}
                  >
                    {contract.partialRewardsEnabled ? 'ENABLED ($500k/obj)' : 'DISABLED'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {contract.status !== 'active' ? (
                    <button
                      type="button"
                      onClick={startContract}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs font-semibold text-accent hover:bg-accent/20"
                    >
                      <Play className="size-4" /> Start / Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseContract}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-hard/40 bg-hard/10 p-3 text-xs font-semibold text-hard hover:bg-hard/20"
                    >
                      <Pause className="size-4" /> Pause Contract
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => extendDeadlineMinutes(60)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-raised/50 p-3 text-xs font-semibold hover:border-line-strong"
                  >
                    <Clock className="size-4 text-accent" /> Extend (+1h)
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowWinnerModal(true)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-medium/40 bg-medium/10 p-3 text-xs font-semibold text-medium hover:bg-medium/20"
                  >
                    <Trophy className="size-4" /> End & Declare
                  </button>

                  <button
                    type="button"
                    onClick={() => invalidateContract('Administrative override')}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-hard/30 bg-hard/10 p-3 text-xs font-semibold text-hard hover:bg-hard/20"
                  >
                    <AlertTriangle className="size-4" /> Invalidate
                  </button>

                  <button
                    type="button"
                    onClick={cancelContract}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-extreme/40 bg-extreme/10 p-3 text-xs font-semibold text-extreme hover:bg-extreme/20"
                  >
                    <XCircle className="size-4" /> Cancel Contract
                  </button>

                  <button
                    type="button"
                    onClick={resetToDefault}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface p-3 text-xs font-semibold text-muted hover:text-fg"
                  >
                    <RotateCcw className="size-4" /> Reset Factory
                  </button>
                </div>
              </div>
            </Card>

            {/* 4. Contract Creation Wizard */}
            <Card title="4. Contract Creation Wizard" className="lg:col-span-6">
              <div className="p-4 pt-0 space-y-3.5 sm:p-5 sm:pt-0">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted">Contract Name / #</label>
                    <input
                      type="number"
                      value={newContractNumber}
                      onChange={(e) => setNewContractNumber(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-line bg-raised/60 px-3 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted">Contract Type</label>
                    <select
                      value={newContractType}
                      onChange={(e) => setNewContractType(e.target.value as ContractType)}
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
                    >
                      <option value="standard">Standard (1 Winner)</option>
                      <option value="elite">Top 3 (Elite)</option>
                      <option value="black">Top 10 (Black)</option>
                      <option value="survival">Everyone (Survival)</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted">Grand Prize</label>
                    <input
                      type="text"
                      value={newPrize}
                      onChange={(e) => setNewPrize(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-raised/60 px-3 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted">Partial Bounty / Obj ($)</label>
                    <input
                      type="number"
                      value={newPartialBounty}
                      onChange={(e) => setNewPartialBounty(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-line bg-raised/60 px-3 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => {
                      createContract({
                        number: newContractNumber,
                        type: newContractType,
                        rewards: [{ place: '1st', reward: newPrize }],
                        partialRewardsEnabled: true,
                        partialRewardPerObjective: newPartialBounty,
                        status: 'scheduled',
                      })
                      setActiveSection('dashboard')
                    }}
                    className={`${buttonClass()} text-xs py-1.5`}
                  >
                    Schedule Contract #{newContractNumber}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      createContract({
                        number: newContractNumber,
                        type: newContractType,
                        rewards: [{ place: '1st', reward: newPrize }],
                        partialRewardsEnabled: true,
                        partialRewardPerObjective: newPartialBounty,
                        status: 'draft',
                      })
                    }}
                    className={`${buttonClass('secondary')} text-xs py-1.5`}
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: OBJECTIVES & CONFIGURATION (Sections 5, 6)                     */}
      {/* ========================================================================= */}
      {activeSection === 'objectives' && (
        <div className="space-y-6">
          <Card
            title="5. Objective Library & Partial Bounties"
            action={
              <button
                type="button"
                onClick={randomizeBalancedObjectives}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent/90"
              >
                <Dices className="size-4" /> Balanced Generator (4E/3M/2H/1X)
              </button>
            }
          >
            <div className="p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs">
                <span className="text-muted">Formula Distribution:</span>
                <span className="font-semibold text-fg">4 Easy + 3 Medium + 2 Hard + 1 Extreme</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {objectivePool.map((obj) => (
                  <div
                    key={obj.objId}
                    className={`flex flex-col justify-between rounded-xl border p-3.5 text-xs transition-colors ${
                      obj.enabled ? 'border-line bg-raised/40' : 'border-line/50 bg-surface opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-faint">{obj.objId}</span>
                        <DifficultyBadge difficulty={obj.difficulty} />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-fg">{obj.title}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        Category: <span className="text-fg">{obj.category}</span> · Target: <span className="tabular font-medium">{obj.target.toLocaleString()}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-accent font-semibold flex items-center gap-1">
                        <DollarSign className="size-3 text-accent" /> Partial Bounty: ${(obj.partialReward || 500000).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-line">
                      <button
                        type="button"
                        onClick={() => setEditingObjective(obj)}
                        className="text-xs font-semibold text-accent hover:underline"
                      >
                        Configure →
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleObjectiveEnabled(obj.objId)}
                        className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                          obj.enabled ? 'bg-accent/15 text-accent' : 'bg-raised text-muted'
                        }`}
                      >
                        {obj.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: PARTICIPANTS TRACKER (Sections 8, 9)                           */}
      {/* ========================================================================= */}
      {activeSection === 'participants' && (
        <div className="space-y-6">
          <Card
            title="8. Live Participants Telemetry & Partial Earnings"
            action={
              <div className="flex items-center gap-1.5">
                {(['all', 'active', 'inactive', 'completed', 'suspicious', 'error'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setParticipantFilter(f)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors ${
                      participantFilter === f
                        ? 'bg-raised text-fg border border-line-strong'
                        : 'text-muted hover:text-fg'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          >
            <div className="p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-raised/50 text-muted">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-3 py-3">Contractor</th>
                      <th className="px-3 py-3">Progress</th>
                      <th className="px-3 py-3">Partial Payouts</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredParticipants.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedParticipant(p)}
                        className="cursor-pointer hover:bg-raised/40"
                      >
                        <td className="tabular px-4 py-3 font-bold text-muted">#{p.rank}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-fg">{p.name}</p>
                          <p className="text-[10px] text-faint">Torn ID: #{p.tornId}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="tabular font-bold">{p.completedCount}/{p.totalCount}</span>
                            <div className="w-16">
                              <SegmentedBar done={p.completedCount} total={p.totalCount} />
                            </div>
                          </div>
                        </td>
                        <td className="tabular px-3 py-3 font-semibold text-accent">
                          +${((p.partialRewardsEarned || 0) / 1e6).toFixed(2)}M
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              p.status === 'active'
                                ? 'bg-accent/15 text-accent'
                                : p.status === 'suspicious'
                                  ? 'bg-extreme/20 text-extreme'
                                  : p.status === 'error'
                                    ? 'bg-hard/20 text-hard'
                                    : 'bg-raised text-muted'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="text-xs font-medium text-accent hover:underline"
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: WINNER & REWARDS (Sections 10, 11)                             */}
      {/* ========================================================================= */}
      {activeSection === 'rewards' && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs text-muted">Total Distributed</p>
              <p className="tabular mt-1 text-2xl font-bold text-medium">$4.82B</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs text-muted">Grand Prize Pool</p>
              <p className="tabular mt-1 text-2xl font-bold text-fg">$10.0M</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs text-muted">Partial Bounties Pool</p>
              <p className="tabular mt-1 text-2xl font-bold text-accent">$17.5M</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-xs text-muted">Failed Deliveries</p>
              <p className="tabular mt-1 text-2xl font-bold text-extreme">2</p>
            </div>
          </div>

          <Card title="11. Reward Distribution Ledger (Grand & Partial Bounties)">
            <div className="p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-raised/50 text-muted">
                    <tr>
                      <th className="px-4 py-3">Contract</th>
                      <th className="px-3 py-3">Recipient</th>
                      <th className="px-3 py-3">Type / Category</th>
                      <th className="px-3 py-3">Reward Package</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rewardsHistory.map((r) => (
                      <tr key={r.id} className="hover:bg-raised/30">
                        <td className="tabular px-4 py-3 font-semibold text-fg">#{r.contractNumber}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-fg">{r.recipient}</p>
                          <p className="text-[10px] text-faint">Torn ID: #{r.tornId}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              r.rewardType === 'partial_objective'
                                ? 'bg-accent/15 text-accent'
                                : 'bg-medium/20 text-medium'
                            }`}
                          >
                            {r.rewardType === 'partial_objective' ? 'Partial Bounty' : 'Grand Prize'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-medium text-fg">{r.reward}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              r.status === 'delivered'
                                ? 'bg-accent/15 text-accent'
                                : r.status === 'pending'
                                  ? 'bg-medium/15 text-medium'
                                  : 'bg-extreme/20 text-extreme'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {r.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => issueReward(r.id)}
                                className="rounded bg-accent px-2 py-1 text-[11px] font-bold text-accent-ink hover:bg-accent/90"
                              >
                                Issue Reward
                              </button>
                            )}
                            {r.status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => retryReward(r.id)}
                                className="rounded bg-hard px-2 py-1 text-[11px] font-bold text-black hover:bg-hard/90"
                              >
                                Retry
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => cancelReward(r.id)}
                              className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:text-extreme"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: USER MANAGEMENT & HISTORY (Sections 18, 19)                    */}
      {/* ========================================================================= */}
      {activeSection === 'users' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="text-xs text-muted">Total Registered</p>
              <p className="tabular mt-1 text-xl font-bold">12,482</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="text-xs text-muted">Active Today</p>
              <p className="tabular mt-1 text-xl font-bold text-accent">1,284</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="text-xs text-muted">Active This Week</p>
              <p className="tabular mt-1 text-xl font-bold">3,742</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="text-xs text-muted">Banned</p>
              <p className="tabular mt-1 text-xl font-bold text-extreme">14</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="text-xs text-muted">Suspended</p>
              <p className="tabular mt-1 text-xl font-bold text-hard">6</p>
            </div>
          </div>

          <Card
            title="18. Registered Users Directory"
            action={
              <div className="relative w-48">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface py-1 pl-8 pr-2 text-xs text-fg focus:border-accent focus:outline-none"
                />
              </div>
            }
          >
            <div className="p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-raised/50 text-muted">
                    <tr>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-3 py-3">Contracts Entered</th>
                      <th className="px-3 py-3">Completed</th>
                      <th className="px-3 py-3">Wins / Top 3</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-raised/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-fg">{u.name}</p>
                          <p className="text-[10px] text-faint">Torn ID: #{u.tornId} · Joined {u.registeredDate}</p>
                        </td>
                        <td className="tabular px-3 py-3">{u.contractsEntered}</td>
                        <td className="tabular px-3 py-3 font-semibold text-accent">{u.contractsCompleted}</td>
                        <td className="tabular px-3 py-3">{u.wins} / {u.top3}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              u.status === 'active'
                                ? 'bg-accent/15 text-accent'
                                : u.status === 'suspended'
                                  ? 'bg-hard/20 text-hard'
                                  : 'bg-extreme/20 text-extreme'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedUser(u)}
                              className="rounded border border-line bg-surface px-2.5 py-1 text-[11px] font-medium hover:border-accent"
                            >
                              History
                            </button>
                            {u.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => suspendUser(u.id)}
                                className="rounded border border-hard/30 bg-hard/10 px-2.5 py-1 text-[11px] font-semibold text-hard hover:bg-hard/20"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => restoreUser(u.id)}
                                className="rounded border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: SUSPICIOUS ACTIVITY (Section 17)                               */}
      {/* ========================================================================= */}
      {activeSection === 'suspicious' && (
        <div className="space-y-6">
          <Card
            title="17. Anti-Abuse & Suspicious Activity Tracker"
            action={<Pill tone="neutral">Server-Side Telemetry Guard</Pill>}
          >
            <div className="p-4 pt-0 sm:p-5 sm:pt-0 space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                Automated detection flags abnormal patterns such as sub-second objective sequences, rapid IP alterations, or verification checksum mismatches.
              </p>

              <div className="space-y-3">
                {suspiciousActivity.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 text-xs space-y-2 ${
                      item.riskLevel === 'Critical' || item.riskLevel === 'High'
                        ? 'border-extreme/30 bg-extreme/5'
                        : 'border-hard/30 bg-hard/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-fg">{item.playerName}</span>
                        <span className="text-faint">#{item.tornId}</span>
                        <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted">
                          Contract #{item.contractNumber}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          item.riskLevel === 'Critical'
                            ? 'bg-extreme text-white'
                            : item.riskLevel === 'High'
                              ? 'bg-extreme/20 text-extreme'
                              : 'bg-hard/20 text-hard'
                        }`}
                      >
                        {item.riskLevel} Risk
                      </span>
                    </div>

                    <p className="text-muted leading-relaxed font-mono text-[11px] bg-bg/50 p-2 rounded-lg border border-line">
                      Event: {item.event}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-faint">{item.timestamp}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => investigateSuspicious(item.id)}
                          className="rounded bg-surface border border-line px-2.5 py-1 font-semibold text-fg hover:border-hard"
                        >
                          Investigate
                        </button>
                        <button
                          type="button"
                          onClick={() => clearSuspicious(item.id)}
                          className="rounded bg-accent/15 text-accent border border-accent/30 px-2.5 py-1 font-semibold hover:bg-accent hover:text-accent-ink"
                        >
                          Clear Flag
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8: ALERTS & HEALTH (Sections 15, 16)                              */}
      {/* ========================================================================= */}
      {activeSection === 'alerts' && (
        <div className="space-y-6">
          <Card title="15 & 16. Alerts, Issues & System Health Diagnostics">
            <div className="p-4 pt-0 space-y-4 sm:p-5 sm:pt-0">
              <div className="space-y-3">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-4 text-xs space-y-2 ${
                      a.resolved
                        ? 'border-line bg-surface opacity-60'
                        : a.severity === 'danger'
                          ? 'border-extreme/40 bg-extreme/5'
                          : 'border-hard/40 bg-hard/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-fg flex items-center gap-2 text-sm">
                        <AlertTriangle className={`size-4 ${a.severity === 'danger' ? 'text-extreme' : 'text-hard'}`} />
                        {a.title}
                      </p>
                      <span className="text-xs text-faint">{a.timestamp}</span>
                    </div>
                    <p className="text-muted leading-relaxed">{a.description}</p>
                    <div className="flex justify-end pt-1">
                      {!a.resolved ? (
                        <button
                          type="button"
                          onClick={() => resolveAlert(a.id)}
                          className="rounded bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink hover:bg-accent/90"
                        >
                          Resolve Issue
                        </button>
                      ) : (
                        <span className="text-xs text-accent font-semibold">✓ Resolved</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: 13. ANNOUNCEMENTS & NOTCH BROADCAST MANAGEMENT                 */}
      {/* ========================================================================= */}
      {activeSection === 'announcements' && (
        <div className="space-y-6">
          <Card
            title="13. Top Notch Server Broadcasts & Announcements"
            action={
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent/90"
              >
                <Plus className="size-3.5" />
                New Broadcast
              </button>
            }
          >
            <div className="p-4 pt-0 sm:p-5 sm:pt-0 space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                Broadcast vital server news, maintenance notices, and contract updates directly into the top dynamic notch bar visible across all screens.
              </p>

              {/* Active Broadcast Preview */}
              {activeAnnouncement ? (
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-accent" />
                      </span>
                      <span className="text-xs font-bold text-accent uppercase tracking-wider">
                        Currently Broadcasting in Notch
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={dismissActiveAnnouncement}
                      className="text-xs text-muted hover:text-extreme font-medium"
                    >
                      Turn Off Broadcast
                    </button>
                  </div>
                  <div className="mt-2.5 space-y-1">
                    <p className="text-sm font-bold text-fg">{activeAnnouncement.title}</p>
                    <p className="text-xs text-muted leading-relaxed">{activeAnnouncement.message}</p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-faint">
                      <span>Type: <strong className="text-fg">{activeAnnouncement.type}</strong></span>
                      <span>Target: <strong className="text-fg">{activeAnnouncement.target}</strong></span>
                      <span>Published: {activeAnnouncement.publishedAt}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-surface p-4 text-center text-xs text-muted">
                  No active broadcast currently broadcasting. Select an announcement below or create a new one to show in the top notch bar.
                </div>
              )}

              {/* Announcements History & Toggles */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-semibold text-muted">Announcement History</h3>
                <div className="space-y-2.5">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 text-xs sm:flex-row sm:items-center ${
                        ann.isActive
                          ? 'border-accent/40 bg-raised/60'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              ann.type === 'Important'
                                ? 'bg-extreme/20 text-extreme'
                                : ann.type === 'Warning'
                                  ? 'bg-hard/20 text-hard'
                                  : ann.type === 'Maintenance'
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'bg-accent/15 text-accent'
                            }`}
                          >
                            {ann.type}
                          </span>
                          <span className="font-bold text-fg truncate">{ann.title}</span>
                          <span className="text-[10px] text-faint">{ann.publishedAt}</span>
                        </div>
                        <p className="text-muted leading-relaxed line-clamp-1">{ann.message}</p>
                        <p className="text-[10px] text-faint">Audience: {ann.target}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleAnnouncementActive(ann.id)}
                          className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                            ann.isActive
                              ? 'bg-accent text-accent-ink hover:bg-accent/90'
                              : 'border border-line bg-raised text-muted hover:text-fg'
                          }`}
                        >
                          {ann.isActive ? '● Broadcasting' : 'Broadcast'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAnnouncement(ann.id)}
                          className="rounded p-1.5 text-muted hover:text-extreme"
                          title="Delete announcement"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 10: ACTIVITY & AUDIT LOGS (Sections 14, 20)                       */}
      {/* ========================================================================= */}
      {activeSection === 'activity' && (
        <div className="space-y-6">
          <Card title="20. Admin Activity & Operations Ledger">
            <div className="p-4 pt-0 sm:p-5 sm:pt-0">
              <ul className="divide-y divide-line rounded-xl border border-line bg-raised/30">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex items-start justify-between gap-4 p-3.5 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-accent">{log.admin}</span>
                        <span className="text-muted">→</span>
                        <span className="font-semibold text-fg">{log.action}</span>
                        <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted">
                          {log.target}
                        </span>
                      </div>
                      <p className="text-muted leading-relaxed">{log.details}</p>
                    </div>
                    <span className="tabular shrink-0 text-[11px] text-faint">
                      {log.timestamp}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 11: SETTINGS (Section 21)                                         */}
      {/* ========================================================================= */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          <Card title="21. Global System & Competition Settings">
            <div className="p-4 pt-0 space-y-6 sm:p-5 sm:pt-0">
              {/* General */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-fg">General Settings</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-muted">Daily Reset Time</label>
                    <input
                      type="text"
                      defaultValue="00:00:00 TCT"
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted">Contract Duration</label>
                    <input
                      type="text"
                      defaultValue="24 Hours"
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted">Max Objectives / Day</label>
                    <input
                      type="number"
                      defaultValue={10}
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                    />
                  </div>
                </div>
              </div>

              {/* Competition */}
              <div className="space-y-3 pt-3 border-t border-line">
                <h3 className="text-sm font-semibold text-fg">Competition & Verification</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-muted">API Polling Interval</label>
                    <input
                      type="text"
                      defaultValue="5 seconds"
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted">Retry Limit on Error</label>
                    <input
                      type="number"
                      defaultValue={3}
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted">Leaderboard Visibility</label>
                    <select className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg">
                      <option>Public / Live</option>
                      <option>Delayed by 5m</option>
                      <option>Private</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => alert('Settings saved successfully.')}
                  className={`${buttonClass()} text-xs py-1.5 px-4`}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: 9. PARTICIPANT DETAILS DRAWER / MODAL                             */}
      {/* ========================================================================= */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{selectedParticipant.name}</h3>
                  <span className="text-xs text-muted">#{selectedParticipant.tornId}</span>
                  <Pill tone={selectedParticipant.status === 'active' ? 'accent' : 'neutral'}>
                    Rank #{selectedParticipant.rank}
                  </Pill>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Progress: {selectedParticipant.completedCount}/{selectedParticipant.totalCount} · Partial Earnings: <strong className="text-accent">${((selectedParticipant.partialRewardsEarned || 0) / 1e6).toFixed(2)}M</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedParticipant(null)}
                className="rounded-lg p-1.5 text-muted hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </div>

            {selectedParticipant.suspiciousReason && (
              <div className="rounded-xl border border-extreme/40 bg-extreme/10 p-3 text-xs text-extreme flex items-center gap-2">
                <AlertOctagon className="size-4 shrink-0" />
                <span>Flagged Anomaly: {selectedParticipant.suspiciousReason}</span>
              </div>
            )}

            {/* 10 Objectives Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted">Objectives Telemetry Breakdown & Partial Bounties</h4>
              <ul className="space-y-2">
                {selectedParticipant.objectivesProgress.map((op, idx) => {
                  const done = op.current >= op.target
                  return (
                    <li
                      key={op.id}
                      className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                        op.isSuspicious
                          ? 'border-extreme/40 bg-extreme/10'
                          : done
                            ? 'border-accent/30 bg-accent/5'
                            : 'border-line bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="tabular font-bold w-5 text-muted">#{idx + 1}</span>
                        <div>
                          <p className="font-semibold text-fg">{op.title}</p>
                          <p className="text-[10px] text-muted">
                            {op.category} · {op.difficulty} · <span className="text-accent font-medium">Bounty: ${(op.partialReward || 500000).toLocaleString()}</span>
                          </p>
                        </div>
                      </div>
                      <span className="tabular font-semibold">
                        {done ? '✓ Verified (+Credited)' : `${op.current}/${op.target}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-line">
              <span className="text-xs text-faint">Manual verification available for overseers</span>
              <button
                type="button"
                onClick={() => setSelectedParticipant(null)}
                className={`${buttonClass('secondary')} text-xs py-1.5`}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: 13. ANNOUNCEMENT CREATION MODAL                                  */}
      {/* ========================================================================= */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="size-4 text-accent" />
                <h3 className="text-base font-bold">Publish Notch Announcement</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="rounded-lg p-1.5 text-muted hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-muted">Title (Headline)</label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-muted">Message Body</label>
                <textarea
                  rows={3}
                  value={announcementMsg}
                  onChange={(e) => setAnnouncementMsg(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-muted">Type / Tone</label>
                  <select
                    value={announcementType}
                    onChange={(e) => setAnnouncementType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                  >
                    <option value="Warning">Warning (Amber)</option>
                    <option value="Important">Important (Red)</option>
                    <option value="Maintenance">Maintenance (Blue)</option>
                    <option value="Information">Information (Green)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-muted">Display Target</label>
                  <select
                    value={announcementTarget}
                    onChange={(e) => setAnnouncementTarget(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                  >
                    <option value="All users">All users (Top Notch)</option>
                    <option value="Dashboard">Dashboard</option>
                    <option value="Contract page">Contract page</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className={`${buttonClass('secondary')} text-xs py-1.5`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  publishAnnouncement({
                    title: announcementTitle.trim() || 'Server Notice',
                    message: announcementMsg.trim() || 'Important system update.',
                    type: announcementType,
                    target: announcementTarget,
                  })
                  setShowAnnouncementModal(false)
                }}
                className={`${buttonClass()} text-xs py-1.5`}
              >
                Broadcast to Notch Bar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: 10. DECLARE WINNER MODAL                                         */}
      {/* ========================================================================= */}
      {showWinnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-medium" />
                <h3 className="text-base font-bold">10. Winner Management</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className="rounded-lg p-1.5 text-muted hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Verify completion logs and disburse rewards for Contract #{contract.number}.
            </p>

            <div>
              <label className="block text-xs font-medium text-muted">Confirmed Winner Name</label>
              <input
                type="text"
                value={winnerNameInput}
                onChange={(e) => setWinnerNameInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className={`${buttonClass('secondary')} text-xs py-1.5`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  declareWinner(winnerNameInput.trim() || 'PlayerA')
                  setShowWinnerModal(false)
                }}
                className="flex items-center gap-1.5 rounded-lg bg-medium px-3 py-1.5 text-xs font-bold text-black hover:bg-medium/90"
              >
                <CheckCircle2 className="size-4" /> Declare & Distribute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: 6. OBJECTIVE CONFIGURATION DRAWER                                */}
      {/* ========================================================================= */}
      {editingObjective && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold">6. Objective Configuration</h3>
                <span className="text-xs text-muted">{editingObjective.objId} — {editingObjective.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingObjective(null)}
                className="rounded-lg p-1.5 text-muted hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <label className="block text-muted font-medium">Objective Title</label>
                <input
                  type="text"
                  value={editingObjective.title}
                  onChange={(e) => setEditingObjective({ ...editingObjective, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
                />
              </div>
              <div>
                <label className="block text-muted font-medium">Category</label>
                <select
                  value={editingObjective.category}
                  onChange={(e) => setEditingObjective({ ...editingObjective, category: e.target.value as Category })}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
                >
                  <option value="combat">Combat</option>
                  <option value="travel">Travel</option>
                  <option value="energy">Energy</option>
                  <option value="economy">Economy</option>
                  <option value="general">General</option>
                  <option value="faction">Faction</option>
                </select>
              </div>
              <div>
                <label className="block text-muted font-medium">Difficulty</label>
                <select
                  value={editingObjective.difficulty}
                  onChange={(e) => setEditingObjective({ ...editingObjective, difficulty: e.target.value as Difficulty })}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="extreme">Extreme</option>
                </select>
              </div>
              <div>
                <label className="block text-muted font-medium">Required Target</label>
                <input
                  type="number"
                  value={editingObjective.target}
                  onChange={(e) => setEditingObjective({ ...editingObjective, target: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-muted font-medium">Partial Bounty ($)</label>
                <input
                  type="number"
                  value={editingObjective.partialReward || 500000}
                  onChange={(e) => setEditingObjective({ ...editingObjective, partialReward: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-fg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setEditingObjective(null)}
                className={`${buttonClass('secondary')} text-xs py-1.5`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateObjectiveInPool(editingObjective.objId, editingObjective)
                  setEditingObjective(null)
                }}
                className={`${buttonClass()} text-xs py-1.5`}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: 19. USER CONTRACT HISTORY MODAL                                  */}
      {/* ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold">{selectedUser.name} — Historical Record</h3>
                <p className="text-xs text-muted">Torn ID: #{selectedUser.tornId} · Joined {selectedUser.registeredDate}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-1.5 text-muted hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-raised/40 p-2">
                <p className="text-[10px] text-muted">Entered</p>
                <p className="font-bold text-sm">{selectedUser.contractsEntered}</p>
              </div>
              <div className="rounded-lg bg-raised/40 p-2">
                <p className="text-[10px] text-muted">Completed</p>
                <p className="font-bold text-sm text-accent">{selectedUser.contractsCompleted}</p>
              </div>
              <div className="rounded-lg bg-raised/40 p-2">
                <p className="text-[10px] text-muted">Wins</p>
                <p className="font-bold text-sm text-medium">{selectedUser.wins}</p>
              </div>
              <div className="rounded-lg bg-raised/40 p-2">
                <p className="text-[10px] text-muted">Win Rate</p>
                <p className="font-bold text-sm">{selectedUser.completionRate}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted">Past Contract Participations</h4>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {selectedUser.contractHistory.map((ch) => (
                  <li key={ch.contractNumber} className="flex items-center justify-between p-3 text-xs">
                    <span className="font-bold text-fg">Contract #{ch.contractNumber}</span>
                    <span className="font-semibold text-medium">{ch.rank}</span>
                    <span className="text-muted">{ch.completionTime || 'In Progress'}</span>
                    <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                      {ch.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className={`${buttonClass('secondary')} text-xs py-1.5`}
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
