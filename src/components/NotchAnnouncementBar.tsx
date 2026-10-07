import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronUp,
  Info,
  Megaphone,
  Wrench,
  X,
} from 'lucide-react'
import { useAdmin } from '../state/admin'

export default function NotchAnnouncementBar() {
  const { activeAnnouncement, dismissActiveAnnouncement } = useAdmin()
  const [expanded, setExpanded] = useState(false)

  if (!activeAnnouncement) return null

  const typeStyles = {
    Warning: {
      border: 'border-hard/40',
      bg: 'bg-hard/10',
      text: 'text-hard',
      glow: 'shadow-hard/20',
      icon: AlertTriangle,
    },
    Important: {
      border: 'border-extreme/40',
      bg: 'bg-extreme/10',
      text: 'text-extreme',
      glow: 'shadow-extreme/20',
      icon: Megaphone,
    },
    Maintenance: {
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      glow: 'shadow-cyan-500/20',
      icon: Wrench,
    },
    Information: {
      border: 'border-accent/40',
      bg: 'bg-accent/10',
      text: 'text-accent',
      glow: 'shadow-accent/20',
      icon: Info,
    },
  }[activeAnnouncement.type] || {
    border: 'border-accent/40',
    bg: 'bg-accent/10',
    text: 'text-accent',
    glow: 'shadow-accent/20',
    icon: Bell,
  }

  const Icon = typeStyles.icon

  return (
    <aside
      aria-label="Server Broadcast Announcement"
      className="sticky top-0 z-30 mx-auto -mt-2 mb-3 flex w-full max-w-3xl flex-col items-center justify-center px-4"
    >
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-2xl border ${typeStyles.border} bg-bg/95 backdrop-blur-md shadow-lg ${typeStyles.glow} transition-all duration-200`}
      >
        {/* Top Notch Pill Strip */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2">
          <div
            onClick={() => setExpanded(!expanded)}
            className="flex flex-1 cursor-pointer items-center gap-2.5 min-w-0"
          >
            {/* Live Indicator Pulse */}
            <span className="relative flex size-2 shrink-0">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  activeAnnouncement.type === 'Important'
                    ? 'bg-extreme'
                    : activeAnnouncement.type === 'Warning'
                      ? 'bg-hard'
                      : 'bg-accent'
                }`}
              />
              <span
                className={`relative inline-flex size-2 rounded-full ${
                  activeAnnouncement.type === 'Important'
                    ? 'bg-extreme'
                    : activeAnnouncement.type === 'Warning'
                      ? 'bg-hard'
                      : 'bg-accent'
                }`}
              />
            </span>

            {/* Badge Icon */}
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-md ${typeStyles.bg} ${typeStyles.text}`}
            >
              <Icon className="size-3.5" />
            </span>

            {/* Headline */}
            <div className="flex items-baseline gap-2 truncate text-xs">
              <span className={`font-bold tracking-tight ${typeStyles.text}`}>
                {activeAnnouncement.title}
              </span>
              <span className="hidden truncate text-muted sm:inline text-[11px]">
                — {activeAnnouncement.message}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-faint hidden md:inline">
              {activeAnnouncement.publishedAt}
            </span>

            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Collapse announcement' : 'Expand announcement'}
              className="rounded p-1 text-muted hover:text-fg"
            >
              {expanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={dismissActiveAnnouncement}
              aria-label="Dismiss announcement"
              title="Dismiss announcement"
              className="rounded p-1 text-muted hover:text-extreme"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Details Body */}
        {expanded && (
          <div className="border-t border-line/60 bg-raised/40 px-4 py-2.5 text-xs text-muted leading-relaxed">
            <p className="text-fg">{activeAnnouncement.message}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-faint">
              <span>Target: <strong className="text-muted">{activeAnnouncement.target}</strong> · Broadcasted via Overseer Command</span>
              <span>{activeAnnouncement.publishedAt}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
