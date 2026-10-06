import { Check } from 'lucide-react'
import { categoryMeta } from '../lib/meta'
import type { Objective } from '../types'
import { DifficultyBadge, MiniBar } from './ui'

export default function ObjectiveList({
  objectives,
  preview = false,
}: {
  objectives: Objective[]
  /** Read-only view before the agent has started: no progress, just goals. */
  preview?: boolean
}) {
  return (
    <ol className="flex flex-col gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
      {objectives.map((o) => {
        const done = !preview && o.current >= o.target
        const Icon = categoryMeta[o.category].icon
        const partial = !preview && !done && o.target > 1
        return (
          <li
            key={o.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-raised/50 px-3 py-3 sm:gap-4 sm:px-4"
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs tabular ${
                done
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line-strong text-muted'
              }`}
            >
              {done ? (
                <Check className="size-4" strokeWidth={3} aria-label="Complete" />
              ) : (
                String(o.id).padStart(2, '0')
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-medium ${
                  done ? 'text-muted' : 'text-fg'
                }`}
              >
                {o.title}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="size-3.5" aria-hidden />
                  {categoryMeta[o.category].label}
                </span>
                <DifficultyBadge difficulty={o.difficulty} />
              </div>
            </div>

            <div className="w-20 shrink-0 text-right sm:w-28">
              {partial ? (
                <>
                  <p className="tabular mb-1.5 text-xs text-muted">
                    {o.current.toLocaleString('en-US')} /{' '}
                    {o.target.toLocaleString('en-US')}
                  </p>
                  <MiniBar value={o.current} max={o.target} />
                </>
              ) : (
                <p className="tabular text-xs text-muted">
                  {preview
                    ? o.target > 1
                      ? `Goal ${o.target.toLocaleString('en-US')}`
                      : 'Goal 1'
                    : done
                      ? 'Verified'
                      : 'Not started'}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
