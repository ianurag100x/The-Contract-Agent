import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Fingerprint,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Zap,
  ArrowRight,
  Info,
} from 'lucide-react'
import { DEMO_PERSONAS, useAuth, type UserRole } from '../state/auth'
import { buttonClass, Card, Pill } from '../components/ui'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [apiKey, setApiKey] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('agent')
  const [customName, setCustomName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect target if redirected from a protected route
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const handleCustomLogin = (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      login(
        {
          id: `user-${Date.now()}`,
          name: customName.trim() || (selectedRole === 'admin' ? 'Overseer Admin' : 'Agent Player'),
          role: selectedRole,
          tornId: Math.floor(1000000 + Math.random() * 9000000),
        },
        apiKey || 'demo_key_9999'
      )
      setIsSubmitting(false)
      navigate(from, { replace: true })
    }, 300)
  }

  const handleDemoLogin = (role: UserRole) => {
    login(role)
    navigate(role === 'admin' ? '/admin' : from, { replace: true })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4 sm:py-8">
      {/* Brand Header */}
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink shadow-lg shadow-accent/10">
          <Fingerprint className="size-8" strokeWidth={2.25} />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          The Contract Agent
        </h1>
        <p className="mt-1 text-sm text-muted">
          Daily competitive mission engine & companion system for Torn.
        </p>
      </div>

      {/* Currently logged in alert if active */}
      {user && (
        <Card className="border-accent/30 bg-accent/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-accent/20 text-accent">
                <UserCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  Signed in as {user.name}
                </p>
                <p className="text-xs text-muted">
                  Role: <span className="uppercase font-medium text-fg">{user.role}</span> · Torn ID: #{user.tornId}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(user.role === 'admin' ? '/admin' : '/')}
              className={`${buttonClass()} text-xs py-1.5 px-3 min-h-8`}
            >
              Continue to {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </Card>
      )}

      {/* Quick 1-Click Demo Personas */}
      <Card
        title="Quick Demo Access"
        action={<Pill tone="accent">Instant Switch</Pill>}
      >
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          <p className="text-xs text-muted leading-relaxed">
            Test the companion without entering live credentials. Choose an agent identity or overseer administrator persona below.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('agent')}
              className="group flex flex-col items-start rounded-xl border border-line bg-raised/50 p-4 text-left transition-colors hover:border-accent hover:bg-surface"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-md bg-accent/10 text-accent">
                    <Zap className="size-4" />
                  </span>
                  <span className="text-sm font-semibold group-hover:text-accent">
                    {DEMO_PERSONAS.agent.name}
                  </span>
                </div>
                <Pill>Agent</Pill>
              </div>
              <p className="mt-2 text-xs text-muted">
                Torn ID: #{DEMO_PERSONAS.agent.tornId} · Standard daily contractor view with active objectives & progress.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent">
                Launch Agent Mode →
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="group flex flex-col items-start rounded-xl border border-line bg-raised/50 p-4 text-left transition-colors hover:border-hard hover:bg-surface"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-md bg-hard/10 text-hard">
                    <ShieldCheck className="size-4" />
                  </span>
                  <span className="text-sm font-semibold group-hover:text-hard">
                    {DEMO_PERSONAS.admin.name}
                  </span>
                </div>
                <Pill tone="neutral">Admin</Pill>
              </div>
              <p className="mt-2 text-xs text-muted">
                Torn ID: #{DEMO_PERSONAS.admin.tornId} · Full control over contract RNG generation, emergency pause, & objective pool.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-hard">
                Launch Admin Panel →
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* Standard API Key Credentials Form */}
      <Card title="Custom Authentication">
        <form onSubmit={handleCustomLogin} className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
          <div>
            <label htmlFor="apiKey" className="block text-xs font-medium text-muted">
              TORN API Key / Agent Token
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                id="apiKey"
                type="password"
                placeholder="Enter standard or custom API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-lg border border-line bg-raised/60 py-2.5 pl-10 pr-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <p className="mt-1 text-[11px] text-faint">
              Simulation mode accepts any string or blank key for custom agent names.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="customName" className="block text-xs font-medium text-muted">
                Custom Agent Name (Optional)
              </label>
              <input
                id="customName"
                type="text"
                placeholder="e.g. ShadowContractor"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-raised/60 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="roleSelect" className="block text-xs font-medium text-muted">
                Access Tier / Role
              </label>
              <select
                id="roleSelect"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="agent">Active Contractor (Agent)</option>
                <option value="admin">Contract Administrator (Overseer)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${buttonClass()} w-full`}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In with Key'}
            </button>
          </div>
        </form>
      </Card>

      {/* Security notice based on anti-abuse spec */}
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/50 p-4 text-xs text-muted">
        <Info className="size-4 shrink-0 text-accent mt-0.5" />
        <div>
          <p className="font-semibold text-fg">Anti-Abuse & Server Verification</p>
          <p className="mt-0.5 leading-relaxed text-muted">
            In compliance with The Contract specification, all player objectives are verified server-side through Torn API telemetry events. Client-side completion spoofing is strictly prevented.
          </p>
        </div>
      </div>
    </div>
  )
}
