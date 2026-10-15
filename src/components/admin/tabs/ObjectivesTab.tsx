import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Dices,
  DollarSign,
  Plus,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { Card, DifficultyBadge, buttonClass } from '../../ui'
import type { AdminContractSettings, ObjectivePoolItem, AdminNavSection } from '../types'

interface ObjectivesTabProps {
  contract: AdminContractSettings
  hasActiveContract: boolean
  isContractCancelled: boolean
  objectivePool: ObjectivePoolItem[]
  poolActionAlert: { type: 'error' | 'warning' | 'success'; message: string } | null
  setPoolActionAlert: (alert: { type: 'error' | 'warning' | 'success'; message: string } | null) => void
  handleAddTaskFromPool: (poolObj: ObjectivePoolItem) => void
  randomizeBalancedObjectives: () => void
  updateMaxObjectives: (max: number) => void
  deleteObjectiveFromContract: (idx: number) => void
  setActiveSection: (sec: AdminNavSection) => void
  setTaskModalMode: (mode: 'create' | 'edit') => void
  setEditingTaskIndex: (idx: number) => void
  setTaskTitle: (title: string) => void
  setTaskCategory: (cat: any) => void
  setTaskComplexity: (comp: any) => void
  setTaskTarget: (tgt: number) => void
  setTaskBounty: (bty: number) => void
  setTaskMetric: (metric: any) => void
  setTaskLogPattern: (pat: string) => void
  setTaskAgentNote: (note: string) => void
  setTaskError: (err: string) => void
  setEditingObjective: (obj: ObjectivePoolItem) => void
}

export function ObjectivesTab({
  contract,
  hasActiveContract,
  isContractCancelled,
  objectivePool,
  poolActionAlert,
  setPoolActionAlert,
  handleAddTaskFromPool,
  randomizeBalancedObjectives,
  updateMaxObjectives,
  deleteObjectiveFromContract,
  setActiveSection,
  setTaskModalMode,
  setEditingTaskIndex,
  setTaskTitle,
  setTaskCategory,
  setTaskComplexity,
  setTaskTarget,
  setTaskBounty,
  setTaskMetric,
  setTaskLogPattern,
  setTaskAgentNote,
  setTaskError,
  setEditingObjective,
}: ObjectivesTabProps) {
  return (
    <div className="space-y-6">
      {/* Active Contract Tasks */}
      <Card
        title={hasActiveContract ? `Contract #${contract.number} Tasks (${(contract.objectives || []).length}/${contract.maxObjectives ?? 10})` : 'Active Contract Tasks'}
        action={
          hasActiveContract ? (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted font-medium">Max Tasks:</label>
              <input
                type="number"
                min={1}
                max={25}
                disabled={isContractCancelled}
                value={contract.maxObjectives ?? 10}
                onChange={(e) => updateMaxObjectives(Math.max(1, parseInt(e.target.value, 10) || 10))}
                className={`w-14 rounded-lg border px-2 py-1 text-xs text-fg ${
                  isContractCancelled ? 'border-line bg-surface/50 opacity-40 cursor-not-allowed' : 'border-line bg-surface'
                }`}
              />
              {!isContractCancelled && (
                <button
                  type="button"
                  onClick={() => {
                    setTaskModalMode('create')
                    setEditingTaskIndex(-1)
                    setTaskTitle('')
                    setTaskCategory('combat')
                    setTaskComplexity('easy')
                    setTaskTarget(10)
                    setTaskBounty(500000)
                    setTaskMetric('count')
                    setTaskLogPattern('')
                    setTaskAgentNote('')
                    setTaskError('')
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink hover:bg-accent/90"
                >
                  <Plus className="size-4" /> Add Task
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          {!hasActiveContract ? (
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-3">
              <div className="size-12 rounded-full bg-raised/80 grid place-items-center border border-line">
                <AlertOctagon className="size-6 text-muted" />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg">No Active Contract Selected</h3>
                <p className="mt-1 text-xs text-muted max-w-sm">
                  There is currently no ongoing contract to manage tasks for. You can configure individual previous or scheduled contracts via the Contracts Directory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('contracts')}
                className={`${buttonClass('secondary')} text-xs py-1.5 px-3`}
              >
                Go to Contracts Directory
              </button>
            </div>
          ) : (
            <>
              {isContractCancelled && (
                <div className="mb-4 rounded-xl border border-extreme/40 bg-extreme/10 p-3 text-xs text-extreme flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="size-4 shrink-0" />
                    <span>Contract #{contract.number} is <strong>CANCELLED</strong>. Tasks and configurations are permanently locked from modifications.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('participants')}
                    className="shrink-0 rounded bg-extreme/20 px-2.5 py-1 text-[11px] font-bold text-extreme hover:bg-extreme/30"
                  >
                    View Agent Progress →
                  </button>
                </div>
              )}
              <p className="text-xs text-muted mb-4">
                {isContractCancelled
                  ? 'Viewing finalized tasks for this cancelled contract. Modifying log syntax, complexity, or bounties is disabled.'
                  : 'Configure task objectives, required log syntax for real-time verification, complexity tier, bounty rewards, and agent directives.'}
              </p>

              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-raised/50 text-muted">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Task Objective</th>
                      <th className="px-3 py-2.5">Complexity</th>
                      <th className="px-3 py-2.5">Target & Metric</th>
                      <th className="px-3 py-2.5">Bounty</th>
                      <th className="px-4 py-2.5">Log Syntax Pattern (Required)</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(contract.objectives || []).map((obj, idx) => {
                      const complexity = obj.complexity || (obj.difficulty as any) || 'easy'
                      const patternStr = obj.log_pattern || (obj.log_patterns && obj.log_patterns[0]?.template) || '—'
                      return (
                        <tr key={obj.id || idx} className="hover:bg-raised/20">
                          <td className="tabular px-3 py-3 font-bold text-muted">#{idx + 1}</td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-fg">{obj.title || obj.name}</p>
                            <span className="text-[10px] uppercase tracking-wider text-faint">{obj.category}</span>
                            {obj.agent_note && (
                              <p className="mt-0.5 text-[10px] text-muted italic">Note: {obj.agent_note}</p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <DifficultyBadge difficulty={complexity as any} />
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-medium text-fg">{(obj.target ?? 0).toLocaleString()}</span>
                            <span className="ml-1 text-[10px] text-muted">({obj.metric || 'count'})</span>
                          </td>
                          <td className="tabular px-3 py-3 font-bold text-accent">
                            ${(((obj.bounty ?? obj.partialReward) || 500000) / 1000).toFixed(0)}k
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="space-y-1">
                              {(obj.log_patterns && obj.log_patterns.length > 0
                                ? obj.log_patterns.map((p: any) => p.template || p)
                                : [patternStr]
                              ).filter((p: string) => p && p !== '—').map((pat: string, pIdx: number) => (
                                <code key={pIdx} className="block rounded bg-raised px-2 py-0.5 font-mono text-[10px] text-accent truncate" title={pat}>
                                  {pat}
                                </code>
                              ))}
                              {patternStr === '—' && (
                                <span className="text-muted text-[11px]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isContractCancelled ? (
                              <span className="text-[11px] text-muted italic">Locked</span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTaskModalMode('edit')
                                    setEditingTaskIndex(idx)
                                    setTaskTitle(obj.title || obj.name || '')
                                    setTaskCategory(obj.category)
                                    setTaskComplexity(complexity)
                                    setTaskTarget(obj.target)
                                    setTaskBounty(obj.bounty || obj.partialReward || 500000)
                                    setTaskMetric((obj.metric as any) || 'count')
                                    const allPatterns = obj.log_patterns && obj.log_patterns.length > 0
                                      ? obj.log_patterns.map((p: any) => p.template || p).join('\n')
                                      : (patternStr === '—' ? '' : patternStr)
                                    setTaskLogPattern(allPatterns)
                                    setTaskAgentNote(obj.agent_note || '')
                                    setTaskError('')
                                  }}
                                  className="rounded border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-fg hover:border-accent hover:text-accent"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Remove task "${obj.title || obj.name}" from Contract #${contract.number}?`)) {
                                      deleteObjectiveFromContract(idx)
                                    }
                                  }}
                                  className="rounded border border-line bg-surface p-1 text-muted hover:border-extreme hover:text-extreme"
                                  title="Delete Task"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Master Library */}
      <Card
        title="Objective Master Pool (Library)"
        action={
          <button
            type="button"
            disabled={isContractCancelled}
            onClick={randomizeBalancedObjectives}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              isContractCancelled
                ? 'border-line bg-surface/50 text-muted opacity-40 cursor-not-allowed'
                : 'bg-raised text-fg border-line hover:border-line-strong'
            }`}
          >
            <Dices className="size-4 text-accent" /> Populate Balanced Tasks
          </button>
        }
      >
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          {poolActionAlert && (
            <div
              className={`mb-4 flex items-center justify-between rounded-xl border p-3 text-xs ${
                poolActionAlert.type === 'error'
                  ? 'border-crimson/40 bg-crimson/10 text-crimson'
                  : poolActionAlert.type === 'warning'
                    ? 'border-hard/40 bg-hard/10 text-hard'
                    : 'border-accent/40 bg-accent/10 text-accent'
              }`}
            >
              <div className="flex items-center gap-2">
                {poolActionAlert.type === 'error' ? (
                  <AlertOctagon className="size-4 shrink-0" />
                ) : poolActionAlert.type === 'warning' ? (
                  <AlertTriangle className="size-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0" />
                )}
                <span>{poolActionAlert.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setPoolActionAlert(null)}
                className="p-1 hover:opacity-75"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs">
            <span className="text-muted">Formula Distribution:</span>
            <span className="font-semibold text-fg">4 Easy + 3 Medium + 2 Hard + 1 Extreme</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {objectivePool.map((obj) => {
              const isAlreadyInContract = (contract.objectives || []).some(
                (o) => o.title.trim().toLowerCase() === obj.title.trim().toLowerCase()
              )

              return (
                <div
                  key={obj.objId}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-xs transition-colors ${
                    isAlreadyInContract ? 'border-accent/30 bg-raised/50' : 'border-line bg-raised/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-faint">{obj.objId}</span>
                      <DifficultyBadge difficulty={obj.difficulty} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-fg">{obj.title}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      Category: <span className="text-fg">{obj.category}</span> · Target: <span className="tabular font-medium">{(obj.target ?? 0).toLocaleString()}</span>
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
                      disabled={isAlreadyInContract || isContractCancelled}
                      onClick={() => handleAddTaskFromPool(obj)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                        isAlreadyInContract
                          ? 'bg-accent/15 text-accent border border-accent/30 cursor-default'
                          : isContractCancelled
                            ? 'bg-surface text-muted border border-line opacity-40 cursor-not-allowed'
                            : 'bg-accent text-bg hover:opacity-90 shadow-sm'
                      }`}
                    >
                      {isAlreadyInContract ? (
                        <>
                          <CheckCircle2 className="size-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="size-3.5" /> Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
