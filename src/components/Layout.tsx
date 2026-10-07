import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Shield,
  Trophy,
  User,
  X,
  LogIn,
} from 'lucide-react'
import { standings } from '../data/mock'
import { useNow } from '../hooks/useNow'
import { hms } from '../lib/format'
import { useContractState } from '../state/contract'
import { useAuth } from '../state/auth'
import { useAdmin } from '../state/admin'
import { SegmentedBar } from './ui'
import NotchAnnouncementBar from './NotchAnnouncementBar'

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <div
        aria-hidden
        className="grid size-9 place-items-center rounded-xl bg-accent text-accent-ink"
      >
        <Fingerprint className="size-5" strokeWidth={2.25} />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-fg">
          The Contract Agent
        </div>
        <div className="text-xs text-muted">TORN companion</div>
      </div>
    </Link>
  )
}

function StandingCard() {
  const now = useNow()
  const { started } = useContractState()
  const { contract } = useAdmin()
  const done = contract.objectives.filter((o) => o.current >= o.target).length
  const you = standings.find((s) => s.isYou) || { rank: 14 }

  if (!started) {
    return (
      <div className="rounded-xl border border-line bg-surface p-3.5">
        <p className="text-xs text-muted">Contract #{contract.number}</p>
        <p className="mt-1 text-sm font-medium">Not started</p>
        <p className="tabular mt-1 text-xs text-muted">
          {hms(Math.max(0, contract.endsAt - now))} left
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
        <SegmentedBar done={done} total={contract.objectives.length} />
      </div>
      <div className="tabular mt-2.5 flex justify-between text-xs text-muted">
        <span>
          {done} / {contract.objectives.length}
        </span>
        <span>{hms(Math.max(0, contract.endsAt - now))} left</span>
      </div>
    </Link>
  )
}

function UserAuthWidget() {
  const { user, logout, switchRole, isAdmin } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <Link
        to="/login"
        className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs text-muted hover:border-line-strong hover:text-fg"
      >
        <div className="flex items-center gap-2">
          <LogIn className="size-4 text-accent" />
          <span className="font-semibold text-fg">Sign In</span>
        </div>
        <span className="text-[11px] text-accent font-medium">Demo Personas →</span>
      </Link>
    )
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
              isAdmin
                ? 'bg-hard/20 text-hard border border-hard/30'
                : 'bg-accent/20 text-accent border border-accent/30'
            }`}
          >
            {isAdmin ? <Shield className="size-3.5" /> : user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-fg">{user.name}</p>
            <p className="text-[10px] text-muted">#{user.tornId}</p>
          </div>
        </div>

        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isAdmin
              ? 'bg-hard/20 text-hard'
              : 'bg-accent/15 text-accent'
          }`}
        >
          {user.role}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-line text-[11px]">
        <button
          type="button"
          onClick={() => {
            const targetRole = isAdmin ? 'agent' : 'admin'
            switchRole(targetRole)
            if (targetRole === 'admin') navigate('/admin')
            else navigate('/')
          }}
          className="text-muted hover:text-accent font-medium"
        >
          Switch to {isAdmin ? 'Agent' : 'Admin'}
        </button>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          title="Sign out"
          className="text-muted hover:text-extreme"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { user, isAdmin } = useAuth()
  const mainRef = useRef<HTMLElement>(null)

  const isLoginPage = pathname === '/login'

  // Dynamic navigation items based on auth state & role:
  // - On Login screen or when logged out: ONLY show Dashboard, Archive, Leaderboard (NO Contract or Profile)
  // - When logged in as Admin: show Dashboard, Archive, Leaderboard, Admin Panel (NO player-specific Contract or Profile)
  // - When logged in as Agent: show Dashboard, Contract, Archive, Leaderboard, Profile
  const navItems = isLoginPage || !user
    ? [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/archive', label: 'Archive', icon: Archive, end: false },
        { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, end: false },
        { to: '/login', label: 'Sign In', icon: LogIn, end: false },
      ]
    : isAdmin
      ? [
          { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/admin', label: 'Admin Panel', icon: Shield, end: false },
          { to: '/archive', label: 'Archive', icon: Archive, end: false },
          { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, end: false },
        ]
      : [
          { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: '/contract', label: 'Contract', icon: ScrollText, end: false },
          { to: '/archive', label: 'Archive', icon: Archive, end: false },
          { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, end: false },
          { to: '/profile', label: 'Profile', icon: User, end: false },
        ]

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
          className="fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col gap-5 border-r border-line bg-bg p-4 transition-transform duration-150 data-[open=true]:translate-x-0 lg:static lg:z-auto lg:w-60 lg:shrink-0 lg:translate-x-0"
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
            {navItems.map(({ to, label, icon: Icon, end }) => (
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
                      className={`size-[18px] ${
                        isActive
                          ? label === 'Admin Panel'
                            ? 'text-hard'
                            : 'text-accent'
                          : ''
                      }`}
                    />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            {/* Standing card only shown for authenticated agents, NOT on login page or for admin */}
            {!isLoginPage && user && user.role === 'agent' && <StandingCard />}
            <UserAuthWidget />
          </div>
        </aside>

        {/* Main Content Area with Top Notch Announcement */}
        <main
          ref={mainRef}
          className="relative min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:overflow-y-auto lg:px-8"
        >
          {/* Top Notch Announcement Bar */}
          <NotchAnnouncementBar />

          <div className="mx-auto flex max-w-6xl flex-col gap-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
