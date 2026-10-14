import { useEffect, useState } from 'react'
import { Crown, Trophy } from 'lucide-react'
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
import { contractApi } from '../lib/api'
import { hms } from '../lib/format'
import { contractTypeMeta } from '../lib/meta'
import type { ContractType } from '../types'
import { useAdmin } from '../state/admin'
import { useContractState } from '../state/contract'

export default function ContractPage() {
  const now = useNow()
  const { started, setStarted } = useContractState()
  const { contract: adminContract } = useAdmin()
  const [activeData, setActiveData] = useState<any>(null)

  const loadActive = () => {
    contractApi.getActive().then((res) => {
      if (res) {
        setActiveData(res)
      }
    })
  }

  useEffect(() => {
    loadActive()
    const interval = setInterval(loadActive, 2500)
    return () => clearInterval(interval)
  }, [])

  const contract = activeData?.contract || adminContract
  const participant = activeData?.participant || { progress: 0, partialRewardsEarned: 0, rank: 1 }
  const standings = activeData?.standings !== undefined ? activeData.standings : []

  const contractTypeKey = (contract.type || 'standard') as ContractType
  const type = contractTypeMeta[contractTypeKey] || contractTypeMeta.standard
  const done = participant.progress || contract.objectives?.filter((o: any) => o.current >= o.target).length || 0
  const you = standings.find((s: any) => s.isYou) || { rank: 1 }
  const visibleStandings = started ? standings : standings.filter((s: any) => !s.isYou)

  const handleVerify = async (idx: number) => {
    const res = await contractApi.verifyObjective(idx)
    if (res?.success) {
      loadActive()
    }
  }

  return (
    <>
      <PageHeader
        title={`Contract #${contract.number || contract.id || 1847}`}
        subtitle="One contract. Ten objectives. One winner."
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
              <Pill tone="accent">
                <span aria-hidden className="size-1.5 rounded-full bg-accent" />
                Active
              </Pill>
            ) : (
              <Pill>Not started</Pill>
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
            label: contract.status === 'paused' ? 'Time (PAUSED)' : 'Time remaining',
            value: contract.status === 'paused'
              ? `${hms(contract.remainingMs !== undefined ? contract.remainingMs : Math.max(0, (contract.endsAt || 0) - now))} (PAUSED)`
              : contract.status === 'completed'
                ? 'COMPLETED'
                : contract.status === 'cancelled'
                  ? 'CANCELLED'
                  : hms(Math.max(0, (contract.endsAt || Date.now() + 60000000) - now)),
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
          <ObjectiveList
            objectives={contract.objectives || []}
            preview={!started || contract.status === 'paused' || contract.status === 'completed' || contract.status === 'cancelled'}
            onVerify={handleVerify}
          />
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
                      {s.completed}/10
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
