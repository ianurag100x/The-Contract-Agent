import { Card } from '../../ui'
import type { RewardRecord } from '../types'

interface RewardsTabProps {
  rewardsHistory: RewardRecord[]
  issueReward: (id: string) => void
  retryReward: (id: string) => void
  cancelReward: (id: string) => void
}

export function RewardsTab({
  rewardsHistory,
  issueReward,
  retryReward,
  cancelReward,
}: RewardsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">Total Distributed</p>
          <p className="tabular mt-1 text-2xl font-bold text-medium">
            ${((rewardsHistory.filter(r => r.status === 'delivered').reduce((s, r) => s + (r.amountCash || 0), 0)) / 1e6).toFixed(2)}M
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">Grand Prize Pool</p>
          <p className="tabular mt-1 text-2xl font-bold text-fg">$10.0M</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">Partial Bounties Pool</p>
          <p className="tabular mt-1 text-2xl font-bold text-accent">
            ${((rewardsHistory.filter(r => r.rewardType === 'partial_objective' && r.status === 'delivered').reduce((s, r) => s + (r.amountCash || 0), 0)) / 1e6).toFixed(2)}M
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">Failed Deliveries</p>
          <p className="tabular mt-1 text-2xl font-bold text-extreme">
            {rewardsHistory.filter(r => r.status === 'failed').length}
          </p>
        </div>
      </div>

      <Card title="11. Reward Distribution Ledger (Grand & Partial Bounties)">
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-raised/50 text-muted">
                <tr>
                  <th className="px-4 py-3">Contract</th>
                  <th className="px-3 py-3">Recipient</th>
                  <th className="px-3 py-3">Type / Category</th>
                  <th className="px-3 py-3">Reward Package</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rewardsHistory.map((r) => (
                  <tr key={r.id} className="hover:bg-raised/30">
                    <td className="tabular px-4 py-3 font-semibold text-fg">#{r.contractNumber}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-fg">{r.recipient}</p>
                      <p className="text-[10px] text-faint">Torn ID: #{r.tornId}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          r.rewardType === 'partial_objective'
                            ? 'bg-accent/15 text-accent'
                            : 'bg-medium/20 text-medium'
                        }`}
                      >
                        {r.rewardType === 'partial_objective' ? 'Partial Bounty' : 'Grand Prize'}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-fg">{r.reward}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          r.status === 'delivered'
                            ? 'bg-accent/15 text-accent'
                            : r.status === 'pending'
                              ? 'bg-medium/15 text-medium'
                              : 'bg-extreme/20 text-extreme'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {r.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => issueReward(r.id)}
                            className="rounded bg-accent px-2 py-1 text-[11px] font-bold text-accent-ink hover:bg-accent/90"
                          >
                            Issue Reward
                          </button>
                        )}
                        {r.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => retryReward(r.id)}
                            className="rounded bg-hard px-2 py-1 text-[11px] font-bold text-black hover:bg-hard/90"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => cancelReward(r.id)}
                          className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:text-extreme"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}
