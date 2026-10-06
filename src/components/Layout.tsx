import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Archive,
  Fingerprint,
  LayoutDashboard,
  Menu,
  ScrollText,
  Trophy,
  User,
  X,
} from 'lucide-react'
import { standings, today } from '../data/mock'
import { useNow } from '../hooks/useNow'
import { hms } from '../lib/format'
import { useContractState } from '../state/contract'
import { SegmentedBar } from './ui'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contract', label: 'Contract', icon: ScrollText, end: false },
  { to: '/archive', label: 'Archive', icon: Archive, end: false },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
]

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden
        className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink"
      >
        <Fingerprint className="size-5" strokeWidth={2.25} />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">
          The Contract Agent
        </div>
        <div className="text-xs text-muted">TORN companion</div>
      </div>
    </div>
  )
}

function StandingCard() {
  const now = useNow()
  const { started } = useContractState()
  const done = today.objectives.filter((o) => o.current >= o.target).length
  const you = standings.find((s) => s.isYou)!

  if (!started) {
    return (
      <div className="rounded-xl border border-line bg-surface p-3.5">
        <p className="text-xs text-muted">Contract #{today.number}</p>
        <p className="mt-1 text-sm font-medium">Not started</p>
        <p className="tabular mt-1 text-xs text-muted">
          {hms(today.endsAt - now)} left
        </p>
      </div>
    )
  }

  return (
    <Link
      to="/contract"
      className="block rounded-xl border border-line bg-surface p-3.5 hover:border-line-strong"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted">Your position</span>
        <span className="text-sm font-semibold">#{you.rank}</span>
      </div>
      <div className="mt-2.5">
        <SegmentedBar done={done} total={today.objectives.length} />
      </div>
      <div className="tabular mt-2.5 flex justify-between text-xs text-muted">
        <span>
          {done} / {today.objectives.length}
        </span>
        <span>{hms(today.endsAt - now)} left</span>
      </div>
    </Link>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="min-h-dvh lg:p-3">
      <div className="relative flex min-h-dvh flex-col bg-bg lg:h-[calc(100dvh-1.5rem)] lg:min-h-0 lg:flex-row lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur lg:hidden">
          <Brand />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="grid size-10 place-items-center rounded-lg border border-line text-muted hover:text-fg"
          >
            <Menu className="size-5" />
          </button>
        </header>

        {/* Overlay (mobile) */}
        {open && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          data-open={open}
          className="fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col gap-6 border-r border-line bg-bg p-4 transition-transform duration-150 data-[open=true]:translate-x-0 lg:static lg:z-auto lg:w-60 lg:shrink-0 lg:translate-x-0"
        >
          <div className="flex items-center justify-between">
            <Brand />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="grid size-9 place-items-center rounded-lg text-muted hover:text-fg lg:hidden"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav aria-label="Primary" className="flex flex-col gap-1">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-raised font-medium text-fg'
                      : 'text-muted hover:bg-surface hover:text-fg'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`size-[18px] ${isActive ? 'text-accent' : ''}`}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto">
            <StandingCard />
          </div>
        </aside>

        <main
          ref={mainRef}
          className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:overflow-y-auto lg:px-8"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
