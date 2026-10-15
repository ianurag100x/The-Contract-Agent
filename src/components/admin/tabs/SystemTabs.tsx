import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { Card, Pill, buttonClass } from '../../ui'
import type {
  SuspiciousActivityItem,
  AdminAlert,
  AdminAnnouncement,
  AuditLogEntry,
} from '../types'

// 1. Suspicious Tab
export function SuspiciousTab({
  suspiciousActivity,
  investigateSuspicious,
  clearSuspicious,
}: {
  suspiciousActivity: SuspiciousActivityItem[]
  investigateSuspicious: (id: string) => void
  clearSuspicious: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <Card
        title="17. Anti-Abuse & Suspicious Activity Tracker"
        action={<Pill tone="neutral">Server-Side Telemetry Guard</Pill>}
      >
        <div className="p-4 pt-0 sm:p-5 sm:pt-0 space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Automated detection flags abnormal patterns such as sub-second objective sequences, rapid IP alterations, or verification checksum mismatches.
          </p>

          <div className="space-y-3">
            {suspiciousActivity.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 text-xs space-y-2 ${
                  item.riskLevel === 'Critical' || item.riskLevel === 'High'
                    ? 'border-extreme/30 bg-extreme/5'
                    : 'border-hard/30 bg-hard/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-fg">{item.playerName}</span>
                    <span className="text-faint">#{item.tornId}</span>
                    <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted">
                      Contract #{item.contractNumber}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.riskLevel === 'Critical'
                        ? 'bg-extreme text-white'
                        : item.riskLevel === 'High'
                          ? 'bg-extreme/20 text-extreme'
                          : 'bg-hard/20 text-hard'
                    }`}
                  >
                    {item.riskLevel} Risk
                  </span>
                </div>

                <p className="text-muted leading-relaxed font-mono text-[11px] bg-bg/50 p-2 rounded-lg border border-line">
                  Event: {item.event}
                </p>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-faint">{item.timestamp}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => investigateSuspicious(item.id)}
                      className="rounded bg-surface border border-line px-2.5 py-1 font-semibold text-fg hover:border-hard"
                    >
                      Investigate
                    </button>
                    <button
                      type="button"
                      onClick={() => clearSuspicious(item.id)}
                      className="rounded bg-accent/15 text-accent border border-accent/30 px-2.5 py-1 font-semibold hover:bg-accent hover:text-accent-ink"
                    >
                      Clear Flag
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

// 2. Alerts Tab
export function AlertsTab({
  alerts,
  resolveAlert,
}: {
  alerts: AdminAlert[]
  resolveAlert: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <Card title="15 & 16. Alerts, Issues & System Health Diagnostics">
        <div className="p-4 pt-0 space-y-4 sm:p-5 sm:pt-0">
          <div className="space-y-3">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-4 text-xs space-y-2 ${
                  a.resolved
                    ? 'border-line bg-surface opacity-60'
                    : a.severity === 'danger'
                      ? 'border-extreme/40 bg-extreme/5'
                      : 'border-hard/40 bg-hard/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-fg flex items-center gap-2 text-sm">
                    <AlertTriangle className={`size-4 ${a.severity === 'danger' ? 'text-extreme' : 'text-hard'}`} />
                    {a.title}
                  </p>
                  <span className="text-xs text-faint">{a.timestamp}</span>
                </div>
                <p className="text-muted leading-relaxed">{a.description}</p>
                <div className="flex justify-end pt-1">
                  {!a.resolved ? (
                    <button
                      type="button"
                      onClick={() => resolveAlert(a.id)}
                      className="rounded bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink hover:bg-accent/90"
                    >
                      Resolve Issue
                    </button>
                  ) : (
                    <span className="text-xs text-accent font-semibold">✓ Resolved</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

// 3. Announcements Tab
export function AnnouncementsTab({
  announcements,
  activeAnnouncement,
  setShowAnnouncementModal,
  toggleAnnouncementActive,
  dismissActiveAnnouncement,
  deleteAnnouncement,
}: {
  announcements: AdminAnnouncement[]
  activeAnnouncement: AdminAnnouncement | null
  setShowAnnouncementModal: (show: boolean) => void
  toggleAnnouncementActive: (id: string) => void
  dismissActiveAnnouncement: () => void
  deleteAnnouncement: (id: string) => void
}) {
  return (
    <div className="space-y-6">
      <Card
        title="13. Top Notch Server Broadcasts & Announcements"
        action={
          <button
            type="button"
            onClick={() => setShowAnnouncementModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent/90"
          >
            <Plus className="size-3.5" />
            New Broadcast
          </button>
        }
      >
        <div className="p-4 pt-0 sm:p-5 sm:pt-0 space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Broadcast vital server news, maintenance notices, and contract updates directly into the top dynamic notch bar visible across all screens.
          </p>

          {/* Active Broadcast Preview */}
          {activeAnnouncement ? (
            <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-accent" />
                  </span>
                  <span className="text-xs font-bold text-accent uppercase tracking-wider">
                    Currently Broadcasting in Notch
                  </span>
                </div>
                <button
                  type="button"
                  onClick={dismissActiveAnnouncement}
                  className="text-xs text-muted hover:text-extreme font-medium"
                >
                  Turn Off Broadcast
                </button>
              </div>
              <div className="mt-2.5 space-y-1">
                <p className="text-sm font-bold text-fg">{activeAnnouncement.title}</p>
                <p className="text-xs text-muted leading-relaxed">{activeAnnouncement.message}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-faint">
                  <span>Type: <strong className="text-fg">{activeAnnouncement.type}</strong></span>
                  <span>Target: <strong className="text-fg">{activeAnnouncement.target}</strong></span>
                  <span>Published: {activeAnnouncement.publishedAt}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface p-4 text-center text-xs text-muted">
              No active broadcast currently broadcasting. Select an announcement below or create a new one to show in the top notch bar.
            </div>
          )}

          {/* Announcements History & Toggles */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-muted">Announcement History</h3>
            <div className="space-y-2.5">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 text-xs sm:flex-row sm:items-center ${
                    ann.isActive
                      ? 'border-accent/40 bg-raised/60'
                      : 'border-line bg-surface'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          ann.type === 'Important'
                            ? 'bg-extreme/20 text-extreme'
                            : ann.type === 'Warning'
                              ? 'bg-hard/20 text-hard'
                              : ann.type === 'Maintenance'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-accent/15 text-accent'
                        }`}
                      >
                        {ann.type}
                      </span>
                      <span className="font-bold text-fg truncate">{ann.title}</span>
                      <span className="text-[10px] text-faint">{ann.publishedAt}</span>
                    </div>
                    <p className="text-muted leading-relaxed line-clamp-1">{ann.message}</p>
                    <p className="text-[10px] text-faint">Audience: {ann.target}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleAnnouncementActive(ann.id)}
                      className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                        ann.isActive
                          ? 'bg-accent text-accent-ink hover:bg-accent/90'
                          : 'border border-line bg-raised text-muted hover:text-fg'
                      }`}
                    >
                      {ann.isActive ? '● Broadcasting' : 'Broadcast'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAnnouncement(ann.id)}
                      className="rounded p-1.5 text-muted hover:text-extreme"
                      title="Delete announcement"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// 4. Activity Logs Tab
export function ActivityTab({ auditLogs }: { auditLogs: AuditLogEntry[] }) {
  return (
    <div className="space-y-6">
      <Card title="20. Admin Activity & Operations Ledger">
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          <ul className="divide-y divide-line rounded-xl border border-line bg-raised/30">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex items-start justify-between gap-4 p-3.5 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-accent">{log.admin}</span>
                    <span className="text-muted">→</span>
                    <span className="font-semibold text-fg">{log.action}</span>
                    <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted">
                      {log.target}
                    </span>
                  </div>
                  <p className="text-muted leading-relaxed">{log.details}</p>
                </div>
                <span className="tabular shrink-0 text-[11px] text-faint">
                  {log.timestamp}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  )
}

// 5. Settings Tab
export function SettingsTab() {
  return (
    <div className="space-y-6">
      <Card title="21. Global System & Competition Settings">
        <div className="p-4 pt-0 space-y-6 sm:p-5 sm:pt-0">
          {/* General */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-fg">General Settings</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-muted">Daily Reset Time</label>
                <input
                  type="text"
                  defaultValue="00:00:00 TCT"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted">Contract Duration</label>
                <input
                  type="text"
                  defaultValue="24 Hours"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted">Max Objectives / Day</label>
                <input
                  type="number"
                  defaultValue={10}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                />
              </div>
            </div>
          </div>

          {/* Competition */}
          <div className="space-y-3 pt-3 border-t border-line">
            <h3 className="text-sm font-semibold text-fg">Competition & Verification</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-muted">API Polling Interval</label>
                <input
                  type="text"
                  defaultValue="5 seconds"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted">Retry Limit on Error</label>
                <input
                  type="number"
                  defaultValue={3}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted">Leaderboard Visibility</label>
                <select className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg">
                  <option>Public / Live</option>
                  <option>Delayed by 5m</option>
                  <option>Private</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => alert('Settings saved successfully.')}
              className={`${buttonClass()} text-xs py-1.5 px-4`}
            >
              Save Settings
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
