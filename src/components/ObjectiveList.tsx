import { Check, Coins, Zap } from 'lucide-react'
import { categoryMeta } from '../lib/meta'
import type { Objective } from '../types'
import { DifficultyBadge, MiniBar } from './ui'

export default function ObjectiveList({
  objectives,
  preview = false,
  onVerify,
}: {
  objectives: (Objective & { partialReward?: number; status?: string })[]
  /** Read-only view before the agent has started: no progress, just goals. */
  preview?: boolean
  onVerify?: (index: number) => void
}) {
  return (
    <ol className="flex flex-col gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
      {objectives.map((o, idx) => {
        const done = !preview && (o.current >= o.target || o.status === 'verified')
        const Icon = categoryMeta[o.category]?.icon || Zap
        const partial = !preview && !done && o.target > 1
        const bounty = o.partialReward ? `$${(o.partialReward / 1000).toFixed(0)}k` : '$500k'

        return (
          <li
            key={o.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-3 sm:gap-4 sm:px-4 transition-colors ${
              done ? 'border-accent/30 bg-accent/5' : 'border-line bg-raised/50'
            }`}
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
              <div className="flex items-center gap-2">
                <p
                  className={`truncate text-sm font-medium ${
                    done ? 'text-fg font-semibold' : 'text-fg'
                  }`}
                >
                  {o.title}
                </p>
                {done && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                    <Coins className="size-3" />
                    +{bounty} Credited
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="size-3.5" aria-hidden />
                  {categoryMeta[o.category]?.label || o.category}
                </span>
                <DifficultyBadge difficulty={o.difficulty} />
                <span className="text-[11px] text-faint">
                  Bounty: <span className="font-medium text-muted">{bounty}</span>
                </span>
              </div>
            </div>

            <div className="w-24 shrink-0 text-right sm:w-32">
              {partial ? (
                <>
                  <p className="tabular mb-1.5 text-xs text-muted">
                    {o.current.toLocaleString('en-US')} /{' '}
                    {o.target.toLocaleString('en-US')}
                  </p>
                  <MiniBar value={o.current} max={o.target} />
                </>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <p className="tabular text-xs text-muted">
                    {preview
                      ? o.target > 1
                        ? `Goal ${o.target.toLocaleString('en-US')}`
                        : 'Goal 1'
                      : done
                        ? 'Verified'
                        : 'Not started'}
                  </p>
                  {!preview && !done && onVerify && (
                    <button
                      type="button"
                      onClick={() => onVerify(idx)}
                      className="rounded bg-raised border border-line px-2 py-0.5 text-[10px] text-muted hover:text-accent hover:border-accent/40"
                    >
                      Verify Test
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
