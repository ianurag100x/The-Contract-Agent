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
import { standings, today } from '../data/mock'
import { useNow } from '../hooks/useNow'
import { duration, hms } from '../lib/format'
import { contractTypeMeta } from '../lib/meta'
import { useContractState } from '../state/contract'

export default function ContractPage() {
  const now = useNow()
  const { started, setStarted } = useContractState()
  const type = contractTypeMeta[today.type]
  const done = today.objectives.filter((o) => o.current >= o.target).length
  const leader = standings[0]
  const you = standings.find((s) => s.isYou)!
  const visibleStandings = started ? standings : standings.filter((s) => !s.isYou)

  return (
    <>
      <PageHeader
        title={`Contract #${today.number}`}
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
            value: hms(today.endsAt - now),
          },
          {
            label: 'Your progress',
            value: started ? (
              <>
                {done} <span className="text-muted">/ {today.objectives.length}</span>
              </>
            ) : (
              '—'
            ),
          },
          {
            label: 'Current leader',
            value: (
              <>
                {leader.name}{' '}
                <span className="text-sm font-normal text-muted">
                  {duration(leader.minutes)}
                </span>
              </>
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
                {done} of {today.objectives.length} verified
              </span>
            )
          }
        >
          {started && (
            <div className="px-4 pb-4 sm:px-5">
              <SegmentedBar done={done} total={today.objectives.length} />
            </div>
          )}
          <ObjectiveList objectives={today.objectives} preview={!started} />
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Prize">
            <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5">
              {today.rewards.map((r) => (
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
                <span className="font-medium text-fg">{type.winners}.</span>{' '}
                {type.blurb} Only fully verified contracts count.
              </p>
              <p className="tabular text-xs text-faint">
                {today.participants.toLocaleString('en-US')} agents
              </p>
            </div>
          </Card>

          <Card title="Live standings">
            <ul className="flex flex-col gap-1 px-2 pb-3 sm:px-3">
              {visibleStandings.map((s) => (
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
