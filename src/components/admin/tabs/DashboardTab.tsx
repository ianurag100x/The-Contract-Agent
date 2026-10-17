import {
  ArrowRight,
  Clock,
  Pause,
  Play,
  Plus,
  ChevronRight,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react'
import { Card, Pill, buttonClass } from '../../ui'
import type {
  AdminContractSettings,
  AdminPlatformStats,
  SystemHealthMetrics,
  Participant,
  AdminAlert,
  VerificationQueueItem,
  AdminNavSection,
} from '../types'

interface DashboardTabProps {
  stats: AdminPlatformStats
  contract: AdminContractSettings
  hasActiveContract: boolean
  contractTimer: { label: string; text: string }
  systemHealth: SystemHealthMetrics
  participants: Participant[]
  alerts: AdminAlert[]
  activeAlertsCount: number
  verificationQueue: VerificationQueueItem[]
  setActiveSection: (section: AdminNavSection) => void
  setShowCreateContractModal: (show: boolean) => void
  pauseContract: () => void
  resumeContract: () => void
  extendDeadlineMinutes?: (minutes: number) => void
  setSelectedParticipant: (p: Participant) => void
  resolveAlert: (id: string) => void
  retryVerification: (id: string) => void
  manuallyVerify: (id: string) => void
  rejectVerification: (id: string) => void
}

export function DashboardTab({
  stats,
  contract,
  hasActiveContract,
  contractTimer,
  systemHealth,
  participants,
  alerts,
  activeAlertsCount,
  verificationQueue,
  setActiveSection,
  setShowCreateContractModal,
  pauseContract,
  resumeContract,
  extendDeadlineMinutes,
  setSelectedParticipant,
  resolveAlert,
  retryVerification,
  manuallyVerify,
  rejectVerification,
}: DashboardTabProps) {
  return (
    <div className="space-y-5">
      {/* 1. Platform Statistics Top KPI Row (Dynamic Live Database) */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
        <div className="bg-surface px-4 py-3.5">
          <dt className="text-xs text-muted">Total Registered Users</dt>
          <dd className="tabular mt-1 text-xl font-bold">{stats?.registeredUsers?.toLocaleString() || '6'}</dd>
          <p className="mt-0.5 text-[11px] text-faint">SQLite live accounts</p>
        </div>
        <div className="bg-surface px-4 py-3.5">
          <dt className="text-xs text-muted">Active Users</dt>
          <dd className="tabular mt-1 text-xl font-bold">{stats?.activeUsers?.toLocaleString() || '4'}</dd>
          <p className="mt-0.5 text-[11px] text-faint">Interacted recently</p>
        </div>
        <div className="bg-surface px-4 py-3.5">
          <dt className="text-xs text-muted">Active Contractors</dt>
          <dd className="tabular mt-1 text-xl font-bold text-accent">{contract.participants || stats?.activeContractors || 4}</dd>
          <p className="mt-0.5 text-[11px] text-faint">In Contract #{contract.number}</p>
        </div>
        <div className="bg-surface px-4 py-3.5">
          <dt className="text-xs text-muted">Contracts Completed</dt>
          <dd className="tabular mt-1 text-xl font-bold">{stats?.contractsCompleted?.toLocaleString() || '1'}</dd>
          <p className="mt-0.5 text-[11px] text-faint">Verified & archived</p>
        </div>
        <div className="bg-surface px-4 py-3.5 col-span-2 sm:col-span-1">
          <dt className="text-xs text-muted">Total Rewards Distributed</dt>
          <dd className="tabular mt-1 text-xl font-bold text-medium">{stats?.totalRewardsDistributed || '$17.4M'}</dd>
          <p className="mt-0.5 text-[11px] text-faint">Delivered ledger cash</p>
        </div>
      </div>

      {/* Row 2: Current Contract & System Health */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* 2. Current Contract Card */}
        <Card className="p-5 lg:col-span-7">
          {!hasActiveContract ? (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-3">
              <div className="size-12 rounded-full bg-raised/80 grid place-items-center border border-line">
                <AlertOctagon className="size-6 text-muted" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-fg">No Active Contracts</h2>
                <p className="mt-1 text-xs text-muted max-w-sm">
                  There is currently no ongoing contract sequence active. You can schedule or start a new contract from the contracts directory.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateContractModal(true)}
                  className={`${buttonClass()} text-xs py-1.5 px-3 min-h-8`}
                >
                  <Plus className="size-3.5" /> Create Contract
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('contracts')}
                  className={`${buttonClass('secondary')} text-xs py-1.5 px-3 min-h-8`}
                >
                  View Contracts Directory
                </button>
              </div>
            </div>
          ) : (
            <>
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
                  <span className="text-[11px] text-muted">{contractTimer.label}</span>
                  <p className={`tabular text-xl font-bold ${contract.status === 'paused' ? 'text-hard' : contract.status === 'cancelled' ? 'text-extreme' : 'text-accent'}`}>
                    {contractTimer.text}
                  </p>
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
              </div>
            </>
          )}
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
              ].map(([k, status]) => (
                <div key={k as string} className="flex items-center justify-between rounded-lg border border-line bg-raised/40 px-2.5 py-1.5">
                  <span className="text-muted truncate pr-2">{k}</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${status ? 'text-accent' : 'text-extreme'}`}>
                    <span className={`size-1.5 rounded-full ${status ? 'bg-accent' : 'bg-extreme'}`} />
                    {status ? 'OK' : 'FAIL'}
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

      {/* Row 3: Admin Alerts & Issues */}
      <div className="grid gap-5">
        {/* 16. Admin Alerts & Issues */}
        <Card
          title="Admin Alerts & Issues"
          action={
            <span className="rounded-full bg-hard/20 px-2 py-0.5 text-[10px] font-bold text-hard">
              {activeAlertsCount} Action Required
            </span>
          }
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
  )
}
