import { Radio } from 'lucide-react'
import { Card } from '../../ui'
import { adminApi } from '../../../lib/api'
import type { AdminContractSettings, Participant } from '../types'

interface TornSyncTabProps {
  contract: AdminContractSettings
  participants: Participant[]
  syncApiKey: string
  setSyncApiKey: (v: string) => void
  syncUserTarget: string
  setSyncUserTarget: (v: string) => void
  syncLimit: number
  setSyncLimit: (v: number) => void
  isSyncingTorn: boolean
  setIsSyncingTorn: (v: boolean) => void
  syncResult: any
  setSyncResult: (v: any) => void
}

export function TornSyncTab({
  contract,
  participants,
  syncApiKey,
  setSyncApiKey,
  syncUserTarget,
  setSyncUserTarget,
  syncLimit,
  setSyncLimit,
  isSyncingTorn,
  setIsSyncingTorn,
  syncResult,
  setSyncResult,
}: TornSyncTabProps) {
  return (
    <div className="space-y-6">
      <Card title="Torn API v2 Live Ingestion & Sync Pipeline (§7)">
        <div className="p-4 space-y-4 sm:p-5">
          <p className="text-xs text-muted leading-relaxed">
            Connects directly to Torn API v2 endpoint:{' '}
            <code className="text-accent bg-raised px-1 py-0.5 rounded">GET /v2/user/log</code> using Full Access / custom log key. Fetches real player activity logs and runs automatic pattern evaluation to credit partial bounties.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-fg">Torn API Key (Full Access)</label>
              <input
                type="password"
                value={syncApiKey}
                onChange={(e) => setSyncApiKey(e.target.value)}
                placeholder="Enter Torn API Key or leave empty for .env key"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-fg focus:border-accent"
              />
              <p className="mt-1 text-[11px] text-faint">
                Key is securely held in-memory and never logged.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-fg">Target Agent</label>
              <select
                value={syncUserTarget}
                onChange={(e) => setSyncUserTarget(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-fg"
              >
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Torn ID: #{p.tornId}) - {p.completedCount}/10 done
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-fg">Log Limit</label>
              <input
                type="number"
                value={syncLimit}
                onChange={(e) => setSyncLimit(parseInt(e.target.value, 10) || 20)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSyncingTorn}
              onClick={async () => {
                setIsSyncingTorn(true)
                try {
                  const res = await adminApi.syncTornLogs({
                    apiKey: syncApiKey || undefined,
                    userId: syncUserTarget,
                    contractId: contract.number,
                    limit: syncLimit,
                  })
                  setSyncResult(res)
                } catch (err) {
                  console.error(err)
                } finally {
                  setIsSyncingTorn(false)
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-ink hover:bg-accent/90"
            >
              <Radio className="size-3.5" />
              {isSyncingTorn ? 'Calling Torn API v2...' : 'Fetch Logs & Run Verification Engine'}
            </button>
          </div>

          {syncResult && (
            <div className="mt-4 rounded-xl border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="text-xs font-bold text-fg">
                  {syncResult.success ? '✓ Ingestion Succeeded' : 'Ingestion Response'}
                </span>
                <span className="text-xs text-muted">
                  {syncResult.logsFetched ?? 0} log lines fetched
                </span>
              </div>

              {syncResult.error ? (
                <div className="p-3 rounded-lg bg-extreme/10 border border-extreme/30 text-xs text-extreme">
                  <p className="font-bold">Torn API Error Code: {syncResult.error.code}</p>
                  <p className="mt-0.5">{syncResult.error.error || syncResult.message}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg bg-raised">
                      <p className="text-muted text-[11px]">Pattern Matches</p>
                      <p className="font-bold text-base text-accent">{syncResult.evaluation?.matchesFound ?? 0}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-raised">
                      <p className="text-muted text-[11px]">Objectives Completed</p>
                      <p className="font-bold text-base text-fg">{syncResult.evaluation?.objectivesCompleted?.length ?? 0}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-raised">
                      <p className="text-muted text-[11px]">Bounties Awarded</p>
                      <p className="font-bold text-base text-accent">+${((syncResult.evaluation?.bountiesAwarded ?? 0) / 1000).toFixed(0)}k</p>
                    </div>
                  </div>

                  {syncResult.sampleLogs && syncResult.sampleLogs.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-fg mb-1.5">Normalized Ingested Logs</p>
                      <div className="space-y-1.5">
                        {syncResult.sampleLogs.map((log: any, idx: number) => (
                          <div key={idx} className="p-2 rounded bg-raised/40 font-mono text-[11px] text-muted flex items-center justify-between">
                            <span className="truncate max-w-[85%]">{log.rawText}</span>
                            <span className="text-[10px] text-faint shrink-0">{log.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
