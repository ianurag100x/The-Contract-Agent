import { useEffect, useState } from 'react'
import { Coins, Crown, Trophy } from 'lucide-react'
import ObjectiveList from '../components/ObjectiveList'
import {
  buttonClass,
  Card,
  PageHeader,
  Pill,
  SegmentedBar,
  StatStrip,
} from '../components/ui'
import { standings as defaultStandings } from '../data/mock'
import { useNow } from '../hooks/useNow'
import { contractApi } from '../lib/api'
import { duration, hms } from '../lib/format'
import { contractTypeMeta } from '../lib/meta'
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
  }, [])

  const contract = activeData?.contract || adminContract
  const participant = activeData?.participant || { progress: 6, partialRewardsEarned: 2850000, rank: 14 }
  const standings = activeData?.standings || defaultStandings

  const type = contractTypeMeta[contract.type] || contractTypeMeta.standard
  const done = participant.progress || contract.objectives.filter((o: any) => o.current >= o.target).length
  const leader = standings[0] || { name: 'PlayerA', minutes: 197, completed: 9 }
  const you = standings.find((s: any) => s.isYou) || { rank: 14 }
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
            {started ? (
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

      {!started && (
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
            label: 'Time remaining',
            value: hms(Math.max(0, (contract.endsAt || Date.now() + 60000000) - now)),
          },
          {
            label: 'Your progress',
            value: started ? (
              <>
                {done} <span className="text-muted">/ {contract.objectives.length}</span>
              </>
            ) : (
              '—'
            ),
          },
          {
            label: 'Partial Bounties',
            value: started ? (
              <span className="text-accent font-semibold flex items-center gap-1">
                <Coins className="size-4" />
                ${((participant.partialRewardsEarned || 0) / 1000).toFixed(0)}k
              </span>
            ) : (
              '—'
            ),
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
                {done} of {contract.objectives.length} verified
              </span>
            )
          }
        >
          {started && (
            <div className="px-4 pb-4 sm:px-5">
              <SegmentedBar done={done} total={contract.objectives.length} />
            </div>
          )}
          <ObjectiveList
            objectives={contract.objectives}
            preview={!started}
            onVerify={handleVerify}
          />
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Prize & Partial Bounties">
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

              <div className="rounded-xl border border-accent/20 bg-accent/5 p-3.5 text-xs">
                <p className="font-semibold text-fg flex items-center gap-1.5">
                  <Coins className="size-4 text-accent" />
                  Partial Objective Bounty
                </p>
                <p className="mt-1 text-muted">
                  Receive <span className="font-medium text-accent">+$500,000</span> for every verified objective even if you don't take 1st place!
                </p>
              </div>

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
          </Card>
        </div>
      </div>
    </>
  )
}
