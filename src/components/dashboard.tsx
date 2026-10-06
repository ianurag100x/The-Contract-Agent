import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  ArrowUp,
  Bell,
  CheckCircle2,
  ChevronRight,
  Flame,
  ListChecks,
  Medal,
  ScrollText,
  Target,
  Trophy,
  TriangleAlert,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  achievements,
  activity,
  agentStats,
  announcements,
  type AchievementIcon,
  type ActivityKind,
} from '../data/agent'
import { standings, today } from '../data/mock'
import { useNow } from '../hooks/useNow'
import { hm, hms } from '../lib/format'
import { contractTypeMeta } from '../lib/meta'
import { useContractState } from '../state/contract'
import { buttonClass, Card, MiniBar, Pill, SegmentedBar } from './ui'

const total = today.objectives.length
const doneCount = () => today.objectives.filter((o) => o.current >= o.target).length

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-raised/50 p-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

/* ---------- 2 + 3. Current contract / no active contract ---------- */

export function ContractHero() {
  const { started, setStarted } = useContractState()
  const now = useNow()
  const remaining = today.endsAt - now
  const type = contractTypeMeta[today.type]
  const done = doneCount()
  const leader = standings[0]
  const you = standings.find((s) => s.isYou)!

  if (!started) {
    return (
      <Card className="p-5 sm:p-6">
        <Pill>Not started</Pill>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          No Active Contract
        </h2>
        <p className="mt-1 text-sm text-muted">
          You haven&apos;t started today&apos;s contract yet.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Tile label="Contract">
            <p className="tabular text-xl font-semibold">#{today.number}</p>
            <p className="mt-0.5 text-xs text-muted">{total} Objectives</p>
          </Tile>
          <Tile label="Remaining">
            <p className="tabular text-xl font-semibold">{hms(remaining)}</p>
          </Tile>
          <div className="sm:col-span-2">
            <Tile label="Prize">
              <p className="text-xl font-semibold">{today.rewards[0].reward}</p>
            </Tile>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStarted(true)}
            className={`${buttonClass()} w-full sm:w-auto`}
          >
            Start Contract
          </button>
          <Link
            to="/contract"
            className={`${buttonClass('secondary')} w-full sm:w-auto`}
          >
            View Objectives
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5 sm:p-6">
      <Pill tone="accent">
        <span aria-hidden className="size-1.5 rounded-full bg-accent" />
        {type.label.toUpperCase()} • ACTIVE
      </Pill>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        Contract #{today.number}
      </h2>
      <p className="mt-1 text-sm text-muted">
        One contract. Ten objectives. One winner.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Tile label="Your Progress">
          <p className="tabular text-3xl font-semibold tracking-tight">
            {done} <span className="text-muted">/ {total}</span>
          </p>
          <div className="mt-3">
            <SegmentedBar done={done} total={total} />
          </div>
        </Tile>
        <Tile label="Time Remaining">
          <p className="tabular text-3xl font-semibold tracking-tight">
            {hms(remaining)}
          </p>
        </Tile>
        <Tile label="Current Position">
          <p className="tabular text-3xl font-semibold tracking-tight">
            #{you.rank}
          </p>
        </Tile>
        <Tile label="Current Leader">
          <p className="truncate text-3xl font-semibold tracking-tight">
            {leader.name}
          </p>
          <p className="tabular mt-0.5 text-xs text-muted">
            {leader.completed}/{total} objectives
          </p>
        </Tile>
      </div>

      <div className="mt-5">
        <Link to="/contract" className={`${buttonClass()} w-full sm:w-auto`}>
          Continue Contract
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Card>
  )
}

/* ---------- 4. Contract preview (before starting) ---------- */

export function ContractPreview() {
  const now = useNow()
  const type = contractTypeMeta[today.type]
  const rows: [string, string][] = [
    ['Contract', `#${today.number}`],
    ['Type', type.label.toUpperCase()],
    ['Objectives', String(total)],
    ['Winners', type.winners],
    ['Prize', '$10M + 1× Xanax'],
    ['Agents', today.participants.toLocaleString('en-US')],
    ['Time Remaining', hm(today.endsAt - now)],
  ]
  return (
    <Card title="Today's Contract">
      <dl className="px-4 pb-4 sm:px-5">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-3 border-t border-line py-2.5 first:border-t-0 text-sm"
          >
            <dt className="text-muted">{k}</dt>
            <dd className="tabular text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

/* ---------- 5. Your contract progress (navigate to contract) ---------- */

export function ProgressCard() {
  const remaining = today.objectives
    .filter((o) => o.current < o.target)
    .sort((a, b) => b.current / b.target - a.current / a.target)

  return (
    <Card
      title="Your Contract Progress"
      action={
        <span className="tabular text-xs text-muted">
          {remaining.length} remaining
        </span>
      }
    >
      <ul className="flex flex-col gap-2 px-4 pb-3 sm:px-5">
        {remaining.map((o) => (
          <li
            key={o.id}
            className="rounded-lg border border-line bg-raised/50 px-3 py-2.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[13px] font-medium">{o.title}</p>
              <span className="tabular shrink-0 text-xs text-muted">
                {o.target > 1
                  ? `${o.current.toLocaleString('en-US')} / ${o.target.toLocaleString('en-US')}`
                  : 'Not started'}
              </span>
            </div>
            {o.target > 1 && (
              <div className="mt-2">
                <MiniBar value={o.current} max={o.target} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="px-4 pb-4 sm:px-5">
        <Link
          to="/contract"
          className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
        >
          Open contract
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Card>
  )
}

/* ---------- 6. History snapshot ---------- */

export function HistoryCard({ showLink = true }: { showLink?: boolean }) {
  const items: [string, ReactNode][] = [
    ['Contracts Entered', agentStats.started],
    ['Contracts Completed', agentStats.completed],
    ['Wins', agentStats.wins],
    ['Top 3 Finishes', agentStats.top3],
    [
      'Best Finish',
      <span key="b" className="inline-flex items-center gap-1.5">
        <Medal className="size-4 text-medium" aria-hidden />
        {agentStats.bestFinish}
      </span>,
    ],
    ['Fastest Completion', agentStats.fastest],
  ]
  return (
    <Card
      title="Your History"
      action={
        showLink && (
          <Link
            to="/profile"
            className="inline-flex min-h-9 items-center gap-1 text-[13px] font-medium text-accent hover:underline"
          >
            View History
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )
      }
    >
      <dl className="grid grid-cols-2 gap-2 px-4 pb-4 sm:px-5">
        {items.map(([k, v]) => (
          <div
            key={k}
            className="rounded-lg border border-line bg-raised/50 px-3 py-2.5"
          >
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="tabular mt-0.5 text-base font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

/* ---------- 7. Personal statistics ---------- */

export function StatsCard() {
  const rows: [string, string | number][] = [
    ['Contracts Started', agentStats.started],
    ['Contracts Completed', agentStats.completed],
    ['Contract Wins', agentStats.wins],
    ['Top 3 Finishes', agentStats.top3],
    ['Objectives Completed', agentStats.objectives],
    ['Completion Rate', agentStats.completionRate],
    ['Average Completion Time', agentStats.avgTime],
    ['Fastest Completion', agentStats.fastest],
  ]
  return (
    <Card title="Your Stats">
      <table className="w-full text-sm">
        <caption className="sr-only">Your personal statistics</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Statistic</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-line">
              <th
                scope="row"
                className="py-2.5 pr-3 pl-4 text-left font-normal text-muted sm:pl-5"
              >
                {k}
              </th>
              <td className="tabular py-2.5 pr-4 text-right font-medium sm:pr-5">
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

/* ---------- 8. Achievements ---------- */

const achievementIcons: Record<AchievementIcon, LucideIcon> = {
  trophy: Trophy,
  speed: Zap,
  perfect: Target,
  streak: Flame,
}

export function AchievementsCard() {
  return (
    <Card title="Recent Achievements">
      <ul className="flex flex-col gap-2 px-4 pb-4 sm:px-5">
        {achievements.map((a) => {
          const Icon = achievementIcons[a.icon]
          return (
            <li key={a.id} className="flex items-start gap-3 py-1">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted">{a.description}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ---------- 9. Announcements ---------- */

export function AnnouncementsCard() {
  const now = useNow(30_000)
  const minsLeft = (today.endsAt - now) / 60000
  const items = [
    ...(minsLeft <= 60
      ? [
          {
            id: 'ending',
            title: 'Contract Ending Soon',
            body: `Only ${Math.max(1, Math.ceil(minsLeft))} minutes remain.`,
            ago: 'now',
            warn: true,
          },
        ]
      : []),
    ...announcements.map((a) => ({ ...a, warn: false })),
  ]
  return (
    <Card title="Announcements">
      <ul className="flex flex-col gap-3 px-4 pb-4 sm:px-5">
        {items.map((a) => (
          <li key={a.id} className="flex items-start gap-3">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                a.warn ? 'bg-hard/15 text-hard' : 'bg-raised text-muted'
              }`}
            >
              {a.warn ? (
                <TriangleAlert className="size-[18px]" aria-hidden />
              ) : (
                <Bell className="size-[18px]" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{a.title}</p>
                <span className="shrink-0 text-xs text-faint">{a.ago}</span>
              </div>
              <p className="text-xs text-muted">{a.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ---------- 10. Live activity ---------- */

const activityIcons: Record<ActivityKind, LucideIcon> = {
  objective: CheckCircle2,
  rank: ArrowUp,
  progress: ListChecks,
  win: Trophy,
}

export function ActivityCard() {
  return (
    <Card
      title="Live Activity"
      action={
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          Live
        </span>
      }
    >
      <ul className="flex flex-col gap-3 px-4 pb-4 sm:px-5">
        {activity.map((a) => {
          const Icon = activityIcons[a.kind]
          return (
            <li key={a.id} className="flex items-center gap-3 text-sm">
              <Icon className="size-4 shrink-0 text-muted" aria-hidden />
              <p className="min-w-0 flex-1 text-muted">
                <span className="font-medium text-fg">{a.who}</span> {a.text}
              </p>
              <span className="shrink-0 text-xs text-faint">{a.ago}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ---------- 15. Navigation from dashboard ---------- */

const destinations: {
  to: string
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    to: '/contract',
    label: 'Contract',
    description: 'Current active contract and objectives.',
    icon: ScrollText,
  },
  {
    to: '/archive',
    label: 'Archive',
    description: 'Past contracts, winners and results.',
    icon: Archive,
  },
  {
    to: '/leaderboard',
    label: 'Leaderboard',
    description: 'Overall agent rankings.',
    icon: Trophy,
  },
  {
    to: '/profile',
    label: 'Profile',
    description: 'Personal statistics, achievements and history.',
    icon: User,
  },
]

export function QuickNav() {
  return (
    <nav aria-label="Dashboard shortcuts">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {destinations.map(({ to, label, description, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex h-full items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raised/60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-raised text-accent">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {description}
                </span>
              </span>
              <ChevronRight
                className="mt-1 size-4 shrink-0 text-faint"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
