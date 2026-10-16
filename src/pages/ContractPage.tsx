import { useEffect, useState } from 'react'
import { Crown, Trophy, Terminal, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import ObjectiveList from '../components/ObjectiveList'
import {
  buttonClass,
  Card,
  PageHeader,
  Pill,
  SegmentedBar,
  StatStrip,
} from '../components/ui'
import { useNow } from '../hooks/useNow'
import { contractApi, profileApi } from '../lib/api'
import { getContractTimerState } from '../lib/format'
import { contractTypeMeta } from '../lib/meta'
import type { ContractType } from '../types'
import { useAdmin } from '../state/admin'
import { useContractState } from '../state/contract'
import { useAuth } from '../state/auth'

export default function ContractPage() {
  const now = useNow()
  const { user } = useAuth()
  const { started, setStarted } = useContractState()
  const { contract: adminContract } = useAdmin()
  const [activeData, setActiveData] = useState<any>(null)
  const [refreshFeedback, setRefreshFeedback] = useState<string | null>(null)

  const loadActive = () => {
    contractApi.getActive(user?.id).then((res) => {
      if (res) {
        setActiveData(res)
      }
    })
  }

  useEffect(() => {
    loadActive()
    const interval = setInterval(loadActive, 2500)
    return () => clearInterval(interval)
  }, [user?.id])

  const contract = activeData?.contract || adminContract
  const participant = activeData?.participant || { progress: 0, partialRewardsEarned: 0, rank: 1 }
  const standings = activeData?.standings !== undefined ? activeData.standings : []

  const contractTypeKey = (contract.type || 'standard') as ContractType
  const type = contractTypeMeta[contractTypeKey] || contractTypeMeta.standard
  const done = participant?.progress ?? contract.objectives?.filter((o: any) => o.current >= o.target).length ?? 0
  const you = standings.find((s: any) => s.isYou) || { rank: 1 }
  const visibleStandings = started ? standings : standings.filter((s: any) => !s.isYou)

  const handleVerify = async (idx: number) => {
    const res = await contractApi.verifyObjective(idx)
    if (res?.success) {
      loadActive()
    }
  }

  const [lastPulledLogs, setLastPulledLogs] = useState<any[]>([])
  const [showLogsInspector, setShowLogsInspector] = useState(false)

  const handleRefreshObjective = async (_idx: number, _obj?: any) => {
    try {
      const res = await profileApi.checkTaskProgress(contract.number || contract.id || 1847, user?.id || 'usr-4')
      if (res?.success) {
        if (res.sampleLogs && Array.isArray(res.sampleLogs)) {
          setLastPulledLogs(res.sampleLogs)
          setShowLogsInspector(true)
        }
        if (res.evaluation?.objectivesCompleted?.length > 0) {
          setRefreshFeedback(`Success! Completed: ${res.evaluation.objectivesCompleted.join(', ')}`)
        } else {
          setRefreshFeedback(`Scanned ${res.logsScanned || 0} logs. ${res.evaluation?.matchesFound || 0} matches found.`)
        }
        loadActive()
      } else if (res?.error) {
        setRefreshFeedback(`Sync error: ${typeof res.error === 'object' ? JSON.stringify(res.error) : res.error}`)
      }
    } catch (e: any) {
      setRefreshFeedback('Failed to pull Torn logs. Please check your API key in Profile.')
    }
    setTimeout(() => {
      loadActive()
    }, 500)
    setTimeout(() => setRefreshFeedback(null), 6000)
  }


  return (
    <>
      <PageHeader
        title={`Contract #${contract.number || contract.id || 1847}`}
        subtitle={`One contract. ${contract.objectives?.length || 10} objectives. One winner.`}
        right={
          <div className="flex items-center gap-2">
            <Pill>{type.label}</Pill>
            {contract.status === 'paused' ? (
              <Pill tone="hard">
                <span aria-hidden className="size-1.5 rounded-full bg-hard" />
                Paused
              </Pill>
            ) : contract.status === 'completed' ? (
              <Pill>
                <span aria-hidden className="size-1.5 rounded-full bg-fg" />
                Completed
              </Pill>
            ) : contract.status === 'cancelled' ? (
              <Pill tone="extreme">
                <span aria-hidden className="size-1.5 rounded-full bg-extreme" />
                Cancelled
              </Pill>
            ) : contract.status === 'scheduled' ? (
              <Pill tone="medium">
                <span aria-hidden className="size-1.5 rounded-full bg-medium" />
                Scheduled
              </Pill>
            ) : started ? (
              <div className="flex items-center gap-2">
                <Pill tone="accent">
                  <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                  Active
                </Pill>
                <button
                  type="button"
                  onClick={async () => {
                    const confirmed = confirm(
                      `⚠️ WARNING: Withdrawing from Contract #${contract.number || contract.id} will permanently reset all your progress, verified objectives, and standings on this contract.\n\nAre you sure you want to leave and reset your progress?`
                    )
                    if (confirmed) {
                      setStarted(false)
                      await contractApi.leaveContract(contract.number || contract.id, user?.id)
                      // Reset local contract objective states
                      if (contract && Array.isArray(contract.objectives)) {
                        contract.objectives.forEach((o: any) => {
                          o.current = 0
                          o.status = 'in_progress'
                        })
                      }
                      loadActive()
                    }
                  }}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted hover:border-extreme hover:text-extreme transition-colors"
                  title="Withdraw from contract"
                >
                  Leave Contract
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Pill>Not started</Pill>
                <button
                  type="button"
                  onClick={async () => {
                    setStarted(true)
                    try {
                      await contractApi.startContract(contract.number || contract.id, user?.id)
                      loadActive()
                    } catch {}
                  }}
                  className={`${buttonClass()} text-xs py-1 px-3`}
                >
                  Start Contract
                </button>
              </div>
            )}
          </div>
        }
      />

      {contract.status === 'paused' && (
        <Card className="p-4 sm:p-5 bg-hard/10 border-hard/30">
          <p className="text-sm font-semibold text-hard">Contract Paused</p>
          <p className="mt-0.5 text-[13px] text-muted">
            The administrator has temporarily paused this contract. Timers and task verifications are on hold.
          </p>
        </Card>
      )}

      {contract.status === 'cancelled' && (
        <Card className="p-4 sm:p-5 bg-extreme/10 border-extreme/30">
          <p className="text-sm font-semibold text-extreme">Contract Cancelled</p>
          <p className="mt-0.5 text-[13px] text-muted">
            This contract was terminated and cancelled by administration.
          </p>
        </Card>
      )}

      {contract.status === 'completed' && (
        <Card className="p-4 sm:p-5 bg-surface border-line">
          <p className="text-sm font-semibold text-fg">Contract Completed</p>
          <p className="mt-0.5 text-[13px] text-muted">
            Winner: <strong className="text-accent">{contract.declaredWinner || 'No winner declared'}</strong>
          </p>
        </Card>
      )}

      {!started && contract.status === 'active' && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <p className="text-sm font-semibold">
              You haven&apos;t started today&apos;s contract yet.
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              Review the objectives below, then start when you&apos;re ready.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className={`${buttonClass()} w-full sm:w-auto`}
          >
            Start Contract
          </button>
        </Card>
      )}

      <StatStrip
        items={[
          {
            label: getContractTimerState(contract, now).label,
            value: getContractTimerState(contract, now).text,
          },
          {
            label: 'Your progress',
            value: started ? (
              <>
                {done} <span className="text-muted">/ {contract.objectives?.length || 10}</span>
              </>
            ) : (
              '—'
            ),
          },
          {
            label: 'Contract Status',
            value: <span className="uppercase font-bold text-accent">{contract.status || 'Active'}</span>,
          },
          { label: 'Your position', value: started ? `#${you.rank}` : '—' },
        ]}
      />

      <div
        id="objectives"
        className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
      >
        <Card
          title="Objectives"
          action={
            started && (
              <span className="tabular text-xs text-muted">
                {done} of {contract.objectives?.length || 0} verified
              </span>
            )
          }
        >
          {started && (
            <div className="px-4 pb-4 sm:px-5">
              <SegmentedBar done={done} total={contract.objectives?.length || 10} />
            </div>
          )}
          {refreshFeedback && (
            <div className="mx-4 mb-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
              {refreshFeedback}
            </div>
          )}
          <ObjectiveList
            objectives={contract.objectives || []}
            preview={!started || contract.status === 'paused' || contract.status === 'completed' || contract.status === 'cancelled'}
            onVerify={handleVerify}
            onRefresh={handleRefreshObjective}
          />

          {/* Active Logs Pulled Telemetry Section */}
          <div className="mt-4 border-t border-line px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowLogsInspector((prev) => !prev)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-fg hover:text-accent"
              >
                <Terminal className="size-3.5 text-accent" />
                <span>Active Ingested Logs Inspector ({lastPulledLogs.length} live logs)</span>
                {showLogsInspector ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
              {lastPulledLogs.length > 0 && (
                <span className="text-[11px] text-faint">
                  Latest: {lastPulledLogs[0]?.occurredAt ? new Date(lastPulledLogs[0].occurredAt).toLocaleTimeString() : 'Just now'}
                </span>
              )}
            </div>

            {showLogsInspector && (
              <div className="mt-3 space-y-2">
                {lastPulledLogs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line bg-surface/50 p-4 text-center text-xs text-muted">
                    No logs fetched yet. Click the <span className="text-accent font-semibold">Refresh</span> icon on any task to pull live Torn event logs.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-1.5 rounded-lg border border-line bg-surface/80 p-2 font-mono text-xs">
                    {lastPulledLogs.map((log: any, lIdx: number) => {
                      const isChurch = (log.text || '').toLowerCase().includes('church') || (log.category || '').toLowerCase().includes('church')
                      return (
                        <div
                          key={log.externalId || lIdx}
                          className={`flex items-start justify-between gap-3 rounded p-1.5 ${
                            isChurch ? 'bg-accent/15 border border-accent/30 text-accent font-medium' : 'bg-raised/40 text-fg'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-faint shrink-0">#{lIdx + 1}</span>
                            <span className="break-all">{log.text || log.rawText || JSON.stringify(log)}</span>
                          </div>
                          <span className="text-[10px] text-muted shrink-0 flex items-center gap-1">
                            <Clock className="size-2.5" />
                            {log.occurredAt ? new Date(log.occurredAt).toLocaleTimeString() : 'Recent'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Contract Prize">
            <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5">
              {contract.rewards?.map((r: any) => (
                <div
                  key={r.place}
                  className="flex items-center gap-3 rounded-xl border border-line bg-raised/50 p-3.5"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Trophy className="size-[18px]" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs text-muted">{r.place}</p>
                    <p className="text-sm font-semibold">{r.reward}</p>
                  </div>
                </div>
              ))}

              <p className="text-[13px] leading-relaxed text-muted">
                <span className="font-medium text-fg">{contract.winnerConfig || type.winners}.</span>{' '}
                {type.blurb} Only fully verified contracts count.
              </p>
              <p className="tabular text-xs text-faint">
                {(contract.participants || 482).toLocaleString('en-US')} agents registered
              </p>
            </div>
          </Card>

          <Card title="Live standings">
            {visibleStandings.length === 0 ? (
              <p className="px-4 py-4 text-xs text-muted text-center">
                No active participants yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-1 px-2 pb-3 sm:px-3">
                {visibleStandings.map((s: any) => (
                  <li
                    key={s.rank}
                    className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm ${
                      s.isYou ? 'bg-accent/10' : ''
                    }`}
                  >
                    <span className="tabular w-7 text-xs text-muted">
                      {s.rank === 1 ? (
                        <Crown className="size-4 text-medium" aria-label="1st" />
                      ) : (
                        `#${s.rank}`
                      )}
                    </span>
                    <span
                      className={`flex-1 truncate ${s.isYou ? 'font-semibold text-accent' : ''}`}
                    >
                      {s.name}
                    </span>
                    <span className="tabular text-xs text-muted">
                      {s.completed}/{s.total || contract.objectives?.length || 10}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
