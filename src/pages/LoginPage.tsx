import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Fingerprint,
  KeyRound,
  UserCheck,
  Zap,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
} from 'lucide-react'
import { useAuth } from '../state/auth'
import { buttonClass, Card, Pill } from '../components/ui'
import { profileApi } from '../lib/api'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Agent API Key input
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Admin access toggle (kept clean and compact per instructions)
  const [showAdminSection, setShowAdminSection] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState<string | null>(null)

  // Redirect target if redirected from a protected route
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  // Agent Login via Torn API verification
  const handleAgentLogin = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!apiKey.trim()) {
      setErrorMsg('Please enter your Torn API key.')
      return
    }

    setIsAuthenticating(true)

    try {
      // Authenticate directly with the backend and official Torn v2 GET /user/basic endpoint
      const res = await profileApi.saveApiKey(apiKey.trim(), 'usr-login')

      if (res && res.valid && res.verifiedUser) {
        const verified = res.verifiedUser
        setSuccessMsg(`Welcome, Agent ${verified.torn_username}! Torn ID #${verified.torn_user_id} verified.`)

        // Update application authentication state with confirmed Torn identity
        login(
          {
            id: (res as any).verifiedUser?.id || `usr-${verified.torn_user_id}`,
            name: verified.torn_username,
            role: 'agent',
            tornId: Number(verified.torn_user_id),
            apiKeyMasked: res.maskedKey,
          },
          apiKey.trim()
        )

        setTimeout(() => {
          navigate(from === '/admin' ? '/' : from, { replace: true })
        }, 600)
      } else {
        setErrorMsg(
          res?.error ||
            'Torn API returned an authentication error. Please verify that your API key is active and has appropriate permissions.'
        )
      }
    } catch {
      setErrorMsg('Network error communicating with authentication server.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Quick Demo Agent Login (Fallback for offline/preview)
  const handleDemoAgentLogin = () => {
    login('agent')
    navigate(from === '/admin' ? '/' : from, { replace: true })
  }

  // Admin / Overseer Login
  const handleAdminLogin = (e: FormEvent) => {
    e.preventDefault()
    setAdminError(null)
    if (adminPassword.trim() === 'overseer' || adminPassword.trim() === 'admin' || !adminPassword.trim()) {
      login('admin')
      navigate('/admin', { replace: true })
    } else {
      setAdminError('Invalid overseer passphrase. Default: overseer or admin.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-4 sm:py-8">
      {/* Brand Header */}
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink shadow-lg shadow-accent/10">
          <Fingerprint className="size-8" strokeWidth={2.25} />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl text-fg">
          The Contract Agent
        </h1>
        <p className="mt-1 text-sm text-muted">
          Autonomous daily contract engine & real-time log verification companion for Torn.
        </p>
      </div>

      {/* Currently logged in status banner */}
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

      {/* Primary Agent Sign-In Form (Agent & User Focused) */}
      <Card
        title="Agent Authentication"
        action={<Pill tone="accent">Torn API Verified</Pill>}
      >
        <form onSubmit={handleAgentLogin} className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
          <p className="text-xs text-muted leading-relaxed">
            Enter your Torn API key. Your Torn player identity (<strong>username</strong>, <strong>player ID</strong>, and <strong>level</strong>) will be fetched and registered automatically.
          </p>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="apiKey" className="block text-xs font-semibold text-fg">
                Torn API Key (Public / Minimal or Full)
              </label>
              <a
                href="https://www.torn.com/preferences.php#tab=api"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
              >
                Get API Key <ExternalLink className="size-3" />
              </a>
            </div>

            <div className="relative mt-1.5">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                placeholder="Paste your 16-character Torn API key..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                className="w-full rounded-lg border border-line bg-raised/60 py-2.5 pl-10 pr-10 font-mono text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-faint">
              Required to evaluate mission logs and credit partial bounties. Keys are kept safe and encrypted.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-extreme/40 bg-extreme/10 p-3 text-xs text-extreme">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-accent">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={isAuthenticating || !apiKey.trim()}
              className={`${buttonClass()} w-full py-2.5 text-xs font-bold disabled:opacity-50`}
            >
              {isAuthenticating ? 'Authenticating with Torn...' : 'Sign In as Agent'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
            <span className="text-muted">Want to test without a live key?</span>
            <button
              type="button"
              onClick={handleDemoAgentLogin}
              className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
            >
              <Zap className="size-3.5" />
              Quick Demo Agent
            </button>
          </div>
        </form>
      </Card>

      {/* Security notice based on anti-abuse spec */}
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/50 p-4 text-xs text-muted">
        <Info className="size-4 shrink-0 text-accent mt-0.5" />
        <div>
          <p className="font-semibold text-fg">Automatic Telemetry Verification</p>
          <p className="mt-0.5 leading-relaxed text-muted">
            All player objectives are verified server-side through Torn v2 event logs. Upon sign-in, your authenticated agent profile immediately joins ongoing contract competitions.
          </p>
        </div>
      </div>

      {/* Small Compact Admin Section at the Bottom */}
      <div className="rounded-xl border border-line bg-surface/40 p-3.5 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="size-3.5 text-muted" />
            <span className="font-medium text-muted">Administrator / Overseer Access</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAdminSection(!showAdminSection)}
            className="text-[11px] font-semibold text-muted hover:text-fg underline"
          >
            {showAdminSection ? 'Hide Overseer Login' : 'Admin Login →'}
          </button>
        </div>

        {showAdminSection && (
          <form onSubmit={handleAdminLogin} className="mt-3 pt-3 border-t border-line space-y-3">
            <p className="text-[11px] text-faint">
              Admin controls allow contract parameter adjustments, RNG balanced generation, emergency pause, and audit ledger reviews.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter overseer passphrase..."
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-fg focus:border-hard focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg border border-hard/40 bg-hard/15 px-3 py-1.5 text-xs font-semibold text-hard hover:bg-hard/25 shrink-0"
              >
                Enter Admin
              </button>
            </div>
            {adminError && <p className="text-[11px] text-extreme">{adminError}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
