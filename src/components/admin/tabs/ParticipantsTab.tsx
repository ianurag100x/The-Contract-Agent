import { Card, SegmentedBar } from '../../ui'
import type { Participant } from '../types'

interface ParticipantsTabProps {
  filteredParticipants: Participant[]
  participantFilter: 'all' | 'active' | 'inactive' | 'completed' | 'suspicious' | 'error'
  setParticipantFilter: (filter: 'all' | 'active' | 'inactive' | 'completed' | 'suspicious' | 'error') => void
  setSelectedParticipant: (p: Participant) => void
}

export function ParticipantsTab({
  filteredParticipants,
  participantFilter,
  setParticipantFilter,
  setSelectedParticipant,
}: ParticipantsTabProps) {
  return (
    <div className="space-y-6">
      <Card
        title="8. Live Participants Telemetry & Partial Earnings"
        action={
          <div className="flex items-center gap-1.5">
            {(['all', 'active', 'inactive', 'completed', 'suspicious', 'error'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setParticipantFilter(f)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors ${
                  participantFilter === f
                    ? 'bg-raised text-fg border border-line-strong'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-raised/50 text-muted">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-3 py-3">Contractor</th>
                  <th className="px-3 py-3">Progress</th>
                  <th className="px-3 py-3">Partial Payouts</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredParticipants.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedParticipant(p)}
                    className="cursor-pointer hover:bg-raised/40"
                  >
                    <td className="tabular px-4 py-3 font-bold text-muted">#{p.rank}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-fg">{p.name}</p>
                      <p className="text-[10px] text-faint">Torn ID: #{p.tornId}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="tabular font-bold">{p.completedCount}/{p.totalCount}</span>
                        <div className="w-16">
                          <SegmentedBar done={p.completedCount} total={p.totalCount} />
                        </div>
                      </div>
                    </td>
                    <td className="tabular px-3 py-3 font-semibold text-accent">
                      +${((p.partialRewardsEarned || 0) / 1e6).toFixed(2)}M
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          p.status === 'active'
                            ? 'bg-accent/15 text-accent'
                            : p.status === 'suspicious'
                              ? 'bg-extreme/20 text-extreme'
                              : p.status === 'error'
                                ? 'bg-hard/20 text-hard'
                                : 'bg-raised text-muted'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Inspect →
                      </button>
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
