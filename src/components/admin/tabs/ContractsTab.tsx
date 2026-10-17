import {
  AlertOctagon,
  Clock,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react'
import { Card, buttonClass } from '../../ui'
import type { AdminContractSettings, AdminNavSection } from '../types'

interface ContractsTabProps {
  contract: AdminContractSettings
  hasActiveContract: boolean
  contractTimer: { label: string; text: string }
  contractsList: any[]
  setShowCreateContractModal: (show: boolean) => void
  setShowExtendModal?: (show: boolean) => void
  setShowWinnerModal: (show: boolean) => void
  setWinnerNameInput: (name: string) => void
  setManagingContractModal: (c: any) => void
  setActiveSection: (section: AdminNavSection) => void
  resumeContract: () => void
  pauseContract: () => void
  cancelContract: () => void
  resetContractProgress: () => void
  refreshContracts: () => Promise<void>
  deleteContractFromDirectory: (id: number) => Promise<boolean>
}

export function ContractsTab({
  contract,
  hasActiveContract,
  contractTimer,
  contractsList,
  setShowCreateContractModal,
  setShowExtendModal,
  setShowWinnerModal,
  setWinnerNameInput,
  setManagingContractModal,
  setActiveSection,
  resumeContract,
  pauseContract,
  cancelContract,
  resetContractProgress,
  refreshContracts,
  deleteContractFromDirectory,
}: ContractsTabProps) {
  return (
    <div className="space-y-6">
      {/* 1. Active Target Contract Overview & Emergency Controls */}
      <Card
        title={hasActiveContract ? `Active Target Contract: Contract #${contract.number}` : 'Active Target Contract'}
        action={
          <button
            type="button"
            onClick={() => setShowCreateContractModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink hover:bg-accent/90"
          >
            <Plus className="size-3.5" /> Create New Contract
          </button>
        }
      >
        <div className="p-4 pt-0 space-y-4 sm:p-5 sm:pt-0">
          {!hasActiveContract ? (
            <div className="flex flex-col items-center justify-center text-center py-6 space-y-3">
              <div className="size-12 rounded-full bg-raised/80 grid place-items-center border border-line">
                <AlertOctagon className="size-6 text-muted" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight text-fg">No Active Contracts</h2>
                <p className="mt-1 text-xs text-muted max-w-sm">
                  There is currently no ongoing contract sequence active. You can start, schedule, or manage previous and drafted contracts from the directory table below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateContractModal(true)}
                className={`${buttonClass()} text-xs py-1.5 px-3 min-h-8`}
              >
                <Plus className="size-3.5" /> Create New Contract
              </button>
            </div>
          ) : (
            <>
              {contract.status === 'cancelled' && (
                <div className="rounded-xl border border-extreme/40 bg-extreme/10 p-3.5 text-xs text-extreme">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                    <XCircle className="size-4" /> Contract Cancelled
                  </div>
                  <p className="mt-1 text-muted">
                    This contract has been cancelled by administration. Task editing, deadline extensions, and player progress verification are permanently locked. You can only view participant progress or delete this contract.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-fg">
                      Contract #{contract.number}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        contract.status === 'active'
                          ? 'bg-accent/15 text-accent border border-accent/30'
                          : contract.status === 'paused'
                            ? 'bg-hard/15 text-hard border border-hard/30'
                            : contract.status === 'scheduled'
                              ? 'bg-medium/15 text-medium border border-medium/30'
                              : contract.status === 'cancelled'
                                ? 'bg-extreme/15 text-extreme border border-extreme/30'
                                : 'bg-raised text-muted'
                      }`}
                    >
                      ● {contract.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Type: <strong className="capitalize text-fg">{contract.type}</strong> · Winners: <strong className="text-fg">{contract.winnerConfig}</strong> · Participants: <strong className="text-fg">{contract.participants}</strong> · Tasks: <strong className="text-fg">{(contract.objectives || []).length}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted">{contractTimer.label}</span>
                  <p className={`tabular text-xl font-bold ${contract.status === 'paused' ? 'text-hard' : contract.status === 'cancelled' ? 'text-extreme' : 'text-accent'}`}>
                    {contractTimer.text}
                  </p>
                </div>
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
                {contract.status === 'cancelled' ? (
                  <button
                    type="button"
                    disabled
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface/50 p-3 text-xs font-semibold text-muted opacity-40 cursor-not-allowed"
                    title="Contract is cancelled"
                  >
                    <Play className="size-4" /> Start / Resume
                  </button>
                ) : contract.status !== 'active' ? (
                  <button
                    type="button"
                    onClick={resumeContract}
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
                  disabled={contract.status === 'cancelled'}
                  onClick={() => {
                    setWinnerNameInput(contract.declaredWinner || '')
                    setShowWinnerModal(true)
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold ${
                    contract.status === 'cancelled'
                      ? 'border-line bg-surface/50 text-muted opacity-40 cursor-not-allowed'
                      : 'border-medium/40 bg-medium/10 text-medium hover:bg-medium/20'
                  }`}
                  title={contract.status === 'cancelled' ? 'Contract already cancelled' : 'End and declare winner'}
                >
                  <Trophy className="size-4" /> End & Declare
                </button>

                <button
                  type="button"
                  disabled={contract.status === 'cancelled'}
                  onClick={cancelContract}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold ${
                    contract.status === 'cancelled'
                      ? 'border-line bg-surface/50 text-muted opacity-40 cursor-not-allowed'
                      : 'border-extreme/40 bg-extreme/10 text-extreme hover:bg-extreme/20'
                  }`}
                >
                  <XCircle className="size-4" /> Cancel Contract
                </button>

                <button
                  type="button"
                  disabled={contract.status === 'cancelled'}
                  onClick={() => {
                    if (confirm('Reset contract progress for ALL players/agents back to 0?')) {
                      resetContractProgress()
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold ${
                    contract.status === 'cancelled'
                      ? 'border-line bg-surface/50 text-muted opacity-40 cursor-not-allowed'
                      : 'border-line bg-surface text-muted hover:text-hard hover:border-hard'
                  }`}
                >
                  <RotateCcw className="size-4" /> Reset Progress
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection(contract.status === 'cancelled' ? 'participants' : 'objectives')}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface p-3 text-xs font-semibold text-muted hover:text-fg"
                >
                  {contract.status === 'cancelled' ? (
                    <>
                      <Users className="size-4 text-accent" /> View Progress
                    </>
                  ) : (
                    <>
                      <Plus className="size-4 text-accent" /> Configure Tasks
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const matchInList = contractsList.find((c) => c.id === contract.number) || {
                      id: contract.number,
                      status: contract.status,
                      type: contract.type,
                      winnerConfig: contract.winnerConfig,
                      participants: contract.participants,
                      objectivesCount: (contract.objectives || []).length,
                      objectives: contract.objectives,
                      rewards: contract.rewards,
                      endsAt: contract.endsAt,
                      declaredWinner: contract.declaredWinner,
                    }
                    setManagingContractModal(matchInList)
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface p-3 text-xs font-semibold text-accent hover:border-accent hover:bg-accent/5 transition-colors"
                  title={`Open management controls and live agent telemetry for Contract #${contract.number}`}
                >
                  <Sliders className="size-4 text-accent" /> Manage Contract...
                </button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* 2. All Contracts Directory (Previous / Scheduled / Draft / Cancelled) */}
      <Card
        title="Contracts Directory"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateContractModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink hover:bg-accent/90"
            >
              <Plus className="size-3" /> New Contract
            </button>
            <button
              type="button"
              onClick={refreshContracts}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:text-fg"
            >
              <RotateCcw className="size-3" /> Refresh
            </button>
          </div>
        }
      >
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          <p className="text-xs text-muted mb-3">
            Overview of all contracts across the platform. Click <strong>Manage Contract...</strong> to inspect or trigger controls for that contract. Cancelled contracts are locked from task updates and can be deleted.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-raised/50 text-muted">
                <tr>
                  <th className="px-4 py-2.5">ID / #</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Type & Winners</th>
                  <th className="px-3 py-2.5">Created Date</th>
                  <th className="px-3 py-2.5">Schedule / Ends</th>
                  <th className="px-3 py-2.5">Tasks</th>
                  <th className="px-3 py-2.5">Agents</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {contractsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-muted">
                      No contracts found. Click <strong>Create New Contract</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  contractsList.map((c: any) => {
                    const isSelected = contract.number === c.id
                    const isCancelled = c.status === 'cancelled'
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-raised/30 transition-colors ${
                          isSelected ? 'bg-accent/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-fg">
                          <span className="flex items-center gap-1.5">
                            #{c.id}
                            {isSelected && (
                              <span className="rounded bg-accent/20 px-1.5 py-0.2 text-[9px] font-bold uppercase text-accent">
                                Active View
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              c.status === 'active'
                                ? 'bg-accent/15 text-accent border border-accent/30'
                                : c.status === 'scheduled'
                                  ? 'bg-medium/15 text-medium border border-medium/30'
                                  : c.status === 'draft'
                                    ? 'bg-surface text-muted border border-line'
                                    : c.status === 'paused'
                                      ? 'bg-hard/15 text-hard border border-hard/30'
                                      : c.status === 'completed'
                                        ? 'bg-surface text-fg border border-line'
                                        : 'bg-extreme/15 text-extreme border border-extreme/30'
                            }`}
                          >
                            <span className="size-1 rounded-full bg-current" />
                            {c.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-medium capitalize">
                          {c.type} · <span className="text-muted">{c.winnerConfig}</span>
                        </td>
                        <td className="px-3 py-3 text-muted">{c.createdAt || 'Recently'}</td>
                        <td className="tabular px-3 py-3 text-muted">
                          {c.status === 'scheduled'
                            ? `Starts: ${c.starts_at || 'TBD'}`
                            : isCancelled
                              ? 'Cancelled'
                              : `Ends: ${new Date(c.endsAt).toLocaleDateString()}`}
                        </td>
                        <td className="tabular px-3 py-3 font-semibold text-fg">
                          {c.objectivesCount ?? 0}
                        </td>
                        <td className="tabular px-3 py-3 text-muted">{c.participants ?? 0}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setManagingContractModal(c)}
                              className="rounded border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent transition-colors"
                              title={`Open separate management controls and inspect Contract #${c.id}`}
                            >
                              Manage Contract...
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete Contract #${c.id} from the contracts directory? This will remove all associated tasks and participant progress.`)) {
                                  await deleteContractFromDirectory(c.id)
                                }
                              }}
                              className="rounded border border-line bg-surface p-1 text-muted hover:border-extreme hover:text-extreme"
                              title={`Delete Contract #${c.id}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}
