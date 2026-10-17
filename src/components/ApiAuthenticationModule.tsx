import { useState } from 'react'
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { Card, Pill, buttonClass } from './ui'
import { profileApi } from '../lib/api'

interface ApiAuthenticationModuleProps {
  user: {
    id?: string
    torn_username?: string
    torn_user_id?: number
    torn_level?: number
    torn_api_key?: string | null
    hasApiKey?: boolean
    api_key_valid?: number
    api_key_last_verified?: string | null
  }
  onProfileUpdated?: () => void
}

export function ApiAuthenticationModule({
  user,
  onProfileUpdated,
}: ApiAuthenticationModuleProps) {
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  const isConfigured = Boolean(user.hasApiKey || user.torn_api_key)

  const handleSaveAndVerify = async () => {
    if (!apiKeyInput.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a valid Torn API Key.' })
      return
    }

    setIsVerifying(true)
    setFeedback(null)
    setTaskCheckResult(null)

    try {
      const res = await profileApi.saveApiKey(apiKeyInput.trim(), user.id || 'usr-4')
      if (res && res.valid) {
        setFeedback({
          type: 'success',
          message:
            res.message ||
            `API Key successfully authenticated! Confirmed agent identity: ${res.verifiedUser?.torn_username} (#${res.verifiedUser?.torn_user_id}).`,
        })
        setApiKeyInput('')
        if (onProfileUpdated) onProfileUpdated()
      } else {
        setFeedback({
          type: 'error',
          message:
            res?.error ||
            'Torn API returned an authentication error. Please verify that your API key is active and has appropriate permissions.',
        })
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error communicating with the authentication backend.',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRevoke = async () => {
    if (
      !confirm(
        'Are you sure you want to remove your API key? The Contract Agent will no longer be able to automatically detect task completions from your Torn logs.'
      )
    ) {
      return
    }

    setIsVerifying(true)
    setFeedback(null)
    setTaskCheckResult(null)

    try {
      const res = await profileApi.revokeApiKey(user.id || 'usr-4')
      if (res && res.success) {
        setFeedback({ type: 'info', message: 'Torn API Key removed successfully.' })
        if (onProfileUpdated) onProfileUpdated()
      } else {
        setFeedback({ type: 'error', message: 'Failed to remove API key.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to communicate with server.' })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Card
      title="Torn API Authentication & Key Management"
      action={
        isConfigured ? (
          <Pill tone="accent">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3" />
              API Connected
            </span>
          </Pill>
        ) : (
          <Pill tone="hard">
            <span className="flex items-center gap-1">
              <ShieldAlert className="size-3" />
              Key Required
            </span>
          </Pill>
        )
      }
    >
      <div className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
        <p className="text-xs text-muted leading-relaxed">
          The Contract Agent connects directly to the official <strong>Torn API v2</strong> to automatically evaluate your live combat, crime, and travel logs. Authenticating your API key enables autonomous task verification and instantaneous partial bounty payouts.
        </p>

        {/* Status Banner */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 text-xs ${
            isConfigured
              ? 'border-accent/40 bg-accent/5'
              : 'border-hard/40 bg-hard/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`grid size-8 place-items-center rounded-lg ${
                isConfigured
                  ? 'bg-accent/15 text-accent'
                  : 'bg-hard/20 text-hard'
              }`}
            >
              <Key className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-fg">
                {isConfigured
                  ? 'Official Torn API Key Linked'
                  : 'No API Key Connected'}
              </p>
              <p className="text-[11px] text-muted">
                {isConfigured
                  ? `Active Key: ${user.torn_api_key || '••••••••••••••••'} · Auto-sync enabled`
                  : 'Enter your Torn API key below to link your agent profile'}
              </p>
            </div>
          </div>

          {isConfigured && (
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isVerifying}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-muted hover:border-extreme hover:text-extreme"
                title="Revoke / Remove API Key"
              >
                <Trash2 className="size-3.5" />
                Remove Key
              </button>
            </div>
          )}
        </div>

        {/* Input & Form Controls */}
        <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <label className="block text-xs font-medium text-muted">
            {isConfigured ? 'Update Torn API Key' : 'Enter Torn API Key'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="Paste your 16-character Torn API key..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 pr-9 text-xs font-mono text-fg focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSaveAndVerify}
              disabled={isVerifying || !apiKeyInput.trim()}
              className={`${buttonClass()} text-xs py-2 px-4 shrink-0 disabled:opacity-50`}
            >
              {isVerifying ? 'Authenticating...' : isConfigured ? 'Update Key' : 'Authenticate Key'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-faint">
            <span>
              🔒 Your key is stored securely in your local environment and only used to verify your contract tasks.
            </span>
            <a
              href="https://www.torn.com/preferences.php#tab=api"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline shrink-0"
            >
              Get Torn API Key <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${
              feedback.type === 'success'
                ? 'border-accent/40 bg-accent/10 text-accent'
                : feedback.type === 'error'
                  ? 'border-extreme/40 bg-extreme/10 text-extreme'
                  : 'border-line bg-surface text-fg'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-accent" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-extreme" />
            ) : (
              <Sparkles className="size-4 shrink-0 mt-0.5 text-muted" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Danger Zone: API Key Removal & Account Deletion */}
        <div className="space-y-3 pt-3 border-t border-line text-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-fg">Account & Key Management</p>
              <p className="text-[11px] text-muted">
                Unlink your Torn API credentials or permanently remove your agent profile from the platform.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isConfigured && (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isVerifying}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:border-hard hover:text-hard"
              >
                <Trash2 className="size-3.5" />
                Remove Linked API Key
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                const confirmed = prompt(
                  `Type "DELETE" to permanently delete your agent profile (${user.torn_username || 'Agent'} #${user.torn_user_id || 'ID'}) and all contract records:`
                )
                if (confirmed === 'DELETE') {
                  setIsVerifying(true)
                  try {
                    const res = await profileApi.deleteAccount(user.id || 'usr-4')
                    if (res?.success) {
                      alert('Your agent profile and telemetry data have been deleted.')
                      localStorage.clear()
                      window.location.href = '/login'
                    } else {
                      alert((res as any)?.error || (res as any)?.message || 'Failed to delete account.')
                    }
                  } catch {
                    alert('Network error deleting account.')
                  } finally {
                    setIsVerifying(false)
                  }
                }
              }}
              disabled={isVerifying}
              className="inline-flex items-center gap-1.5 rounded-lg border border-extreme/30 bg-extreme/10 px-3 py-1.5 text-xs font-semibold text-extreme hover:bg-extreme/20"
            >
              <Trash2 className="size-3.5" />
              Delete Account Permanently
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}
