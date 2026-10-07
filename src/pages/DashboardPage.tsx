import { useEffect, useState } from 'react'
import {
  AchievementsCard,
  ActivityCard,
  AnnouncementsCard,
  ContractHero,
  ContractPreview,
  HistoryCard,
  ProgressCard,
  QuickNav,
  StatsCard,
} from '../components/dashboard'
import { PageHeader, StatStrip } from '../components/ui'
import { globalStats as defaultStats } from '../data/agent'
import { dashboardApi } from '../lib/api'
import { useContractState } from '../state/contract'

/** Lets reviewers flip between the two dashboard states from the product sheet. */
function DemoToggle() {
  const { started, setStarted } = useContractState()
  const opt = (label: string, value: boolean) => (
    <button
      type="button"
      aria-pressed={started === value}
      onClick={() => setStarted(value)}
      className={`min-h-9 rounded-md px-3 text-xs font-medium transition-colors ${
        started === value ? 'bg-raised text-fg' : 'text-muted hover:text-fg'
      }`}
    >
      {label}
    </button>
  )
  return (
    <div
      role="group"
      aria-label="Demo: preview dashboard state"
      className="flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5"
    >
      <span className="px-2 text-[11px] uppercase tracking-wide text-faint">
        Demo
      </span>
      {opt('Active', true)}
      {opt('Not started', false)}
    </div>
  )
}

export default function DashboardPage() {
  const { started } = useContractState()
  const [stats, setStats] = useState<any>(defaultStats)
  const [dbSource, setDbSource] = useState<string>('connecting...')
  const fmt = (n: number) => (n ?? 0).toLocaleString('en-US')

  useEffect(() => {
    let mounted = true

    const fetchStats = () => {
      dashboardApi.getStats().then((data) => {
        if (mounted && data?.globalStats) {
          setStats(data.globalStats)
          setDbSource((data.globalStats as any).source === 'supabase' ? 'Supabase Live' : 'Database Active')
        }
      })
    }

    fetchStats()
    // Poll every 3 seconds for real-time live database updates
    const timer = setInterval(fetchStats, 3000)

    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          <span className="flex items-center gap-2">
            <span>How The Contract is doing, what is happening now, and what to do next.</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              {dbSource}
            </span>
          </span>
        }
        right={<DemoToggle />}
      />

      <StatStrip
        items={[
          { label: 'Registered Agents', value: fmt(stats.registered) },
          { label: 'Active Agents', value: fmt(stats.active) },
          { label: 'Contracts Completed', value: fmt(stats.completed) },
          { label: 'Total Rewards Paid', value: stats.rewardsPaid },
        ]}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ContractHero />
        {started ? <ProgressCard /> : <ContractPreview />}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
        <HistoryCard />
        <StatsCard />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2 lg:grid-cols-3 md:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <AchievementsCard />
        <AnnouncementsCard />
        <ActivityCard />
      </div>

      <QuickNav />
    </>
  )
}
