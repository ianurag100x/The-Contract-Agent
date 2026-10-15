import React from 'react'
import {
  X,
  ArrowLeft,
  Users,
  Sliders,
  Pause,
  Play,
  Clock,
  Trophy,
  XCircle,
  RotateCcw,
  Trash2,
  DollarSign,
  Shield,
  RefreshCw,
} from 'lucide-react'
import { buttonClass, SegmentedBar } from '../../ui'
import { adminApi } from '../../../lib/api'
import type { Participant } from '../types'

interface ManagingContractModalProps {
  managingContractModal: any
  setManagingContractModal: React.Dispatch<React.SetStateAction<any>>
  managedModalTab: 'agents' | 'controls'
  setManagedModalTab: (tab: 'agents' | 'controls') => void
  managedParticipants: Participant[]
  isLoadingManagedParticipants: boolean
  fetchManagedParticipants: (contractId: number) => Promise<void>
  setSelectedParticipant: (p: Participant | null) => void
  setExtraBountyTarget: (target: { id: string; name: string } | null) => void
  setExtraBountyAmount: (amt: number) => void
  setExtraBountyReason: (reason: string) => void
  refreshContracts: () => Promise<void>
  deleteContractFromDirectory: (contractId: number) => Promise<void>
}

export const ManagingContractModal: React.FC<ManagingContractModalProps> = ({
  managingContractModal,
  setManagingContractModal,
  managedModalTab,
  setManagedModalTab,
  managedParticipants,
  isLoadingManagedParticipants,
  fetchManagedParticipants,
  setSelectedParticipant,
  setExtraBountyTarget,
  setExtraBountyAmount,
  setExtraBountyReason,
  refreshContracts,
  deleteContractFromDirectory,
}) => {
  const [isPullingLogs, setIsPullingLogs] = React.useState(false)
  const [pullSyncResult, setPullSyncResult] = React.useState<string | null>(null)

  if (!managingContractModal) return null

  const handlePullAllLogs = async () => {
    setIsPullingLogs(true)
    setPullSyncResult(null)
    try {
      const res = await adminApi.syncAllLogs(managingContractModal.id)
      if (res?.success) {
        setPullSyncResult(
          `Synced ${res.syncedAgents} agents with keys (${res.logsScanned} logs scanned, ${res.matchesFound} pattern matches, ${res.objectivesCompleted} objectives verified).`
        )
        await fetchManagedParticipants(managingContractModal.id)
      } else {
        setPullSyncResult('Sync completed with no updates.')
      }
    } catch (e: any) {
      setPullSyncResult(`Sync error: ${e.message || String(e)}`)
    } finally {
      setIsPullingLogs(false)
      setTimeout(() => setPullSyncResult(null), 6000)
    }
  }

  const handleDeleteParticipant = async (p: Participant) => {
    if (
      !confirm(
        `Are you sure you want to remove agent "${p.name}" (#${p.tornId}) from Contract #${managingContractModal.id}? All their progress and task verifications in this contract will be deleted.`
      )
    ) {
      return
    }

    try {
      const res = await adminApi.deleteParticipant(p.id)
      if (res?.success) {
        setPullSyncResult(`Removed ${p.name} from contract.`)
        await fetchManagedParticipants(managingContractModal.id)
      } else {
        alert('Failed to remove participant.')
      }
    } catch (err: any) {
      alert(`Error deleting participant: ${err.message || String(err)}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-2xl border border-line bg-bg p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Top Modal Navigation: Back & Close Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <Shield className="size-5 text-accent" />
            <div>
              <h3 className="text-base font-bold text-fg">
                Manage Contract #{managingContractModal.id}
              </h3>
              <p className="text-xs text-muted">
                Telemetry, agent progress, and controls for {managingContractModal.status.toUpperCase()} contract.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setManagingContractModal(null)}
              className="rounded-lg p-1.5 text-muted hover:text-fg hover:bg-surface"
              title="Close Modal"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Contract Summary Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 text-xs">
          <div>
            <p className="font-bold text-fg">
              Status: <span className="uppercase text-accent">{managingContractModal.status}</span> · Type: <span className="capitalize">{managingContractModal.type}</span>
            </p>
            <p className="mt-0.5 text-muted">
              Rule: {managingContractModal.winnerConfig} · Registered Agents: <strong className="text-fg">{managedParticipants.length || managingContractModal.participants || 0}</strong>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted">Tasks in Contract</span>
            <p className="text-base font-bold text-fg">{managingContractModal.objectivesCount ?? 0}</p>
          </div>
        </div>

        {managingContractModal.status === 'cancelled' && (
          <div className="rounded-xl border border-extreme/40 bg-extreme/10 p-3 text-xs text-extreme">
            <p className="font-bold">Contract is Cancelled</p>
            <p className="mt-0.5 text-muted">
              This contract has been permanently cancelled. All timers and automated progressions are halted. Overseers can inspect and manually review past agent submissions.
            </p>
          </div>
        )}

        {/* Tabs Navigation: Agent Telemetry vs Contract Controls */}
        <div className="flex items-center gap-2 border-b border-line pb-2 text-xs">
          <button
            type="button"
            onClick={() => setManagedModalTab('agents')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors ${
              managedModalTab === 'agents'
                ? 'bg-accent text-accent-ink shadow-sm'
                : 'bg-surface text-muted hover:text-fg border border-line'
            }`}
          >
            <Users className="size-3.5" />
            Agent Progress & Manipulation ({managedParticipants.length})
          </button>
          <button
            type="button"
            onClick={() => setManagedModalTab('controls')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-colors ${
              managedModalTab === 'controls'
                ? 'bg-accent text-accent-ink shadow-sm'
                : 'bg-surface text-muted hover:text-fg border border-line'
            }`}
          >
            <Sliders className="size-3.5" />
            Lifecycle Controls
          </button>
        </div>

        {/* TAB 1: AGENT PROGRESS & MANIPULATION */}
        {managedModalTab === 'agents' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted font-medium">
                Participating agents and progression telemetry for Contract #{managingContractModal.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPullingLogs}
                  onClick={handlePullAllLogs}
                  className="inline-flex items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 disabled:opacity-50 transition-colors"
                  title="Check Torn API logs for all agents in this contract to verify completions"
                >
                  <RefreshCw className={`size-3 ${isPullingLogs ? 'animate-spin' : ''}`} />
                  {isPullingLogs ? 'Pulling Logs...' : 'Pull & Sync All Logs'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchManagedParticipants(managingContractModal.id)}
                  className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent"
                >
                  Refresh Agents
                </button>
              </div>
            </div>

            {pullSyncResult && (
              <div className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
                {pullSyncResult}
              </div>
            )}

            {isLoadingManagedParticipants ? (
              <div className="rounded-xl border border-line bg-surface/50 p-8 text-center text-xs text-muted">
                Loading agent progression telemetry...
              </div>
            ) : managedParticipants.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface/50 p-8 text-center text-xs text-muted">
                No participating agents found for this contract.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 border-b border-line bg-raised text-muted">
                    <tr>
                      <th className="px-3 py-2.5">Rank</th>
                      <th className="px-3 py-2.5">Agent</th>
                      <th className="px-3 py-2.5">Progress</th>
                      <th className="px-3 py-2.5">Partial Bounty</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {managedParticipants.map((p) => (
                      <tr key={p.id} className="hover:bg-raised/40">
                        <td className="tabular px-3 py-2.5 font-bold text-muted">#{p.rank}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-fg">{p.name}</p>
                          <p className="text-[10px] text-faint">Torn ID: #{p.tornId}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="tabular font-bold">{p.completedCount}/{p.totalCount}</span>
                            <div className="w-14">
                              <SegmentedBar done={p.completedCount} total={p.totalCount} />
                            </div>
                          </div>
                        </td>
                        <td className="tabular px-3 py-2.5 font-semibold text-accent">
                          +${((p.partialRewardsEarned || 0) / 1e6).toFixed(2)}M
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              p.status === 'active'
                                ? 'bg-accent/15 text-accent'
                                : p.status === 'suspicious'
                                  ? 'bg-extreme/20 text-extreme'
                                  : 'bg-raised text-muted'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedParticipant(p)}
                              className="rounded border border-line bg-raised px-2 py-1 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent"
                              title="Inspect and manipulate agent tasks"
                            >
                              Inspect & Override →
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setExtraBountyTarget({ id: p.id, name: p.name })
                                setExtraBountyAmount(250000)
                                setExtraBountyReason(`Bonus grant for Contract #${managingContractModal.id}`)
                              }}
                              className="rounded border border-line bg-raised p-1 text-muted hover:text-accent hover:border-accent"
                              title="Award extra bounty"
                            >
                              <DollarSign className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteParticipant(p)}
                              className="rounded border border-line bg-raised p-1 text-muted hover:text-extreme hover:border-extreme"
                              title="Remove agent from contract"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIFECYCLE CONTROLS */}
        {managedModalTab === 'controls' && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted">Contract Controls & Actions</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {managingContractModal.status === 'active' ? (
                <button
                  type="button"
                  onClick={async () => {
                    await adminApi.executeControl('pause', { contractId: managingContractModal.id })
                    await refreshContracts()
                    setManagingContractModal((prev: any) => prev ? { ...prev, status: 'paused' } : null)
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-hard/40 bg-hard/10 p-2.5 font-semibold text-hard hover:bg-hard/20"
                >
                  <Pause className="size-3.5" /> Pause Contract
                </button>
              ) : managingContractModal.status === 'paused' || managingContractModal.status === 'draft' || managingContractModal.status === 'scheduled' ? (
                <button
                  type="button"
                  onClick={async () => {
                    await adminApi.executeControl('resume', { contractId: managingContractModal.id })
                    await refreshContracts()
                    setManagingContractModal((prev: any) => prev ? { ...prev, status: 'active' } : null)
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 p-2.5 font-semibold text-accent hover:bg-accent/20"
                >
                  <Play className="size-3.5" /> Start / Resume
                </button>
              ) : null}

              {managingContractModal.status !== 'cancelled' && managingContractModal.status !== 'completed' && (
                <button
                  type="button"
                  onClick={async () => {
                    await adminApi.executeControl('extend', { contractId: managingContractModal.id, data: { minutes: 60 } })
                    await refreshContracts()
                    alert(`Added +60 minutes to Contract #${managingContractModal.id}`)
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface p-2.5 font-semibold text-fg hover:border-accent hover:text-accent"
                >
                  <Clock className="size-3.5 text-accent" /> Extend +1h
                </button>
              )}

              {managingContractModal.status !== 'cancelled' && managingContractModal.status !== 'completed' && (
                <button
                  type="button"
                  onClick={async () => {
                    const wName = prompt('Enter Winner Name (optional):', '')
                    if (wName !== null) {
                      await adminApi.executeControl('end', { contractId: managingContractModal.id, data: { winnerName: wName.trim() } })
                      await refreshContracts()
                      setManagingContractModal((prev: any) => prev ? { ...prev, status: 'completed' } : null)
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-medium/40 bg-medium/10 p-2.5 font-semibold text-medium hover:bg-medium/20"
                >
                  <Trophy className="size-3.5" /> End & Declare
                </button>
              )}

              {managingContractModal.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Cancel Contract #${managingContractModal.id}? This will terminate all ongoing agent progression.`)) {
                      await adminApi.executeControl('cancel', { contractId: managingContractModal.id })
                      await refreshContracts()
                      setManagingContractModal((prev: any) => prev ? { ...prev, status: 'cancelled' } : null)
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-extreme/40 bg-extreme/10 p-2.5 font-semibold text-extreme hover:bg-extreme/20"
                >
                  <XCircle className="size-3.5" /> Cancel Contract
                </button>
              )}

              {managingContractModal.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Reset progress to 0 for Contract #${managingContractModal.id}?`)) {
                      await adminApi.executeControl('reset', { contractId: managingContractModal.id })
                      await refreshContracts()
                      await fetchManagedParticipants(managingContractModal.id)
                      alert(`Reset progress for Contract #${managingContractModal.id}`)
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface p-2.5 font-semibold text-muted hover:text-hard hover:border-hard"
                >
                  <RotateCcw className="size-3.5" /> Reset Progress
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Delete Contract #${managingContractModal.id} permanently?`)) {
                    await deleteContractFromDirectory(managingContractModal.id)
                    setManagingContractModal(null)
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface p-2.5 font-semibold text-muted hover:text-extreme hover:border-extreme"
              >
                <Trash2 className="size-3.5" /> Delete Contract
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-line">
          <button
            type="button"
            onClick={() => setManagingContractModal(null)}
            className={`${buttonClass('secondary')} text-xs py-1.5 px-3`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
