import type { ReactNode } from 'react'
import { difficultyMeta } from '../lib/meta'
import type { Difficulty } from '../types'

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function buttonClass(variant: 'primary' | 'secondary' = 'primary') {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors'
  return variant === 'primary'
    ? `${base} bg-accent text-accent-ink hover:bg-accent/90`
    : `${base} border border-line-strong text-fg hover:bg-raised`
}

/** Compact KPI row: cells separated by hairlines at any column count. */
export function StatStrip({
  items,
}: {
  items: { label: string; value: ReactNode }[]
}) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="bg-surface px-4 py-3.5 sm:px-5">
          <dt className="text-xs text-muted">{i.label}</dt>
          <dd className="tabular mt-1 text-xl font-semibold tracking-tight">
            {i.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle: string
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
      </div>
      {right}
    </div>
  )
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const m = difficultyMeta[difficulty]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${m.className}`}
      />
      {m.label}
    </span>
  )
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent'
}) {
  const tones = {
    neutral: 'border-line-strong bg-raised text-muted',
    accent: 'border-accent/30 bg-accent/10 text-accent',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/** Ten-step progress bar, as described in the spec. */
export function SegmentedBar({
  done,
  total,
}: {
  done: number
  total: number
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`${done} of ${total} objectives complete`}
      className="flex gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full ${
            i < done ? 'bg-accent' : 'bg-line-strong'
          }`}
        />
      ))}
    </div>
  )
}

export function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-1 w-full overflow-hidden rounded-full bg-line-strong"
    >
      <div className="h-full rounded-full bg-muted" style={{ width: `${pct}%` }} />
    </div>
  )
}
