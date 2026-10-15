import { Search } from 'lucide-react'
import { Card } from '../../ui'
import type { AdminUserRecord } from '../types'

interface UsersTabProps {
  filteredUsers: AdminUserRecord[]
  userSearch: string
  setUserSearch: (s: string) => void
  setSelectedUser: (u: AdminUserRecord) => void
  suspendUser: (id: string) => void
  restoreUser: (id: string) => void
}

export function UsersTab({
  filteredUsers,
  userSearch,
  setUserSearch,
  setSelectedUser,
  suspendUser,
  restoreUser,
}: UsersTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-xs text-muted">Total Registered</p>
          <p className="tabular mt-1 text-xl font-bold">12,482</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-xs text-muted">Active Today</p>
          <p className="tabular mt-1 text-xl font-bold text-accent">1,284</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-xs text-muted">Active This Week</p>
          <p className="tabular mt-1 text-xl font-bold">3,742</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-xs text-muted">Banned</p>
          <p className="tabular mt-1 text-xl font-bold text-extreme">14</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-xs text-muted">Suspended</p>
          <p className="tabular mt-1 text-xl font-bold text-hard">6</p>
        </div>
      </div>

      <Card
        title="18. Registered Users Directory"
        action={
          <div className="relative w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search user..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface py-1 pl-8 pr-2 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>
        }
      >
        <div className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-raised/50 text-muted">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-3 py-3">Contracts Entered</th>
                  <th className="px-3 py-3">Completed</th>
                  <th className="px-3 py-3">Wins / Top 3</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-raised/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-fg">{u.name}</p>
                      <p className="text-[10px] text-faint">Torn ID: #{u.tornId} · Joined {u.registeredDate}</p>
                    </td>
                    <td className="tabular px-3 py-3">{u.contractsEntered}</td>
                    <td className="tabular px-3 py-3 font-semibold text-accent">{u.contractsCompleted}</td>
                    <td className="tabular px-3 py-3">{u.wins} / {u.top3}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          u.status === 'active'
                            ? 'bg-accent/15 text-accent'
                            : u.status === 'suspended'
                              ? 'bg-hard/20 text-hard'
                              : 'bg-extreme/20 text-extreme'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="rounded border border-line bg-surface px-2.5 py-1 text-[11px] font-medium hover:border-accent"
                        >
                          History
                        </button>
                        {u.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => suspendUser(u.id)}
                            className="rounded border border-hard/30 bg-hard/10 px-2.5 py-1 text-[11px] font-semibold text-hard hover:bg-hard/20"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => restoreUser(u.id)}
                            className="rounded border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20"
                          >
                            Restore
                          </button>
                        )}
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
