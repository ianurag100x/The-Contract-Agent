import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Key,
  Pause,
  Play,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { Card, Pill, buttonClass } from '../../ui'
import type { AdminUserRecord } from '../types'

interface AgentsTabProps {
  agents: AdminUserRecord[]
  agentSearch: string
  setAgentSearch: (s: string) => void
  setSelectedAgent?: (u: AdminUserRecord) => void
  suspendAgent: (id: string) => void
  restoreAgent: (id: string) => void
  deleteAgent: (id: string) => Promise<void>
  refreshAgentApiKey: (id: string) => Promise<any>
  refreshAgents: () => Promise<void>
}

export function AgentsTab({
  agents,
  agentSearch,
  setAgentSearch,
  suspendAgent,
  restoreAgent,
  deleteAgent,
  refreshAgentApiKey,
  refreshAgents,
}: AgentsTabProps) {
  const [filter, setFilter] = useState<'all' | 'contract' | 'no-contract' | 'working' | 'paused'>('all')
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [isRefreshingList, setIsRefreshingList] = useState(false)

  // Filter agents without duplicates
  const filtered = agents.filter((a) => {
    // Search query match
    const q = agentSearch.trim().toLowerCase()
    const matchesSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      String(a.tornId).includes(q)

    if (!matchesSearch) return false

    if (filter === 'contract') return Boolean(a.hasActiveContract)
    if (filter === 'no-contract') return !a.hasActiveContract
    if (filter === 'working') return a.apiStatus === 'working'
    if (filter === 'paused') return a.apiStatus === 'paused' || a.apiStatus === 'invalid'

    return true
  })

  const totalAgents = agents.length
  const agentsWithContract = agents.filter((a) => a.hasActiveContract).length
  const agentsWithoutContract = totalAgents - agentsWithContract
  const activeApiWorking = agents.filter((a) => a.apiStatus === 'working').length

  const handleRefreshKey = async (agentId: string) => {
    setRefreshingId(agentId)
    try {
      await refreshAgentApiKey(agentId)
    } finally {
      setRefreshingId(null)
    }
  }

  const handleDelete = async (agent: AdminUserRecord) => {
    if (
      !confirm(
        `Are you sure you want to delete agent "${agent.name}" (#${agent.tornId})? This will delete their registration and account data.`
      )
    ) {
      return
    }
    await deleteAgent(agent.id)
  }

  const handleRefreshAll = async () => {
    setIsRefreshingList(true)
    try {
      await refreshAgents()
    } finally {
      setIsRefreshingList(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary strip */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-xs text-muted">Registered Agents</p>
          <p className="tabular mt-1 text-2xl font-bold text-fg">{totalAgents}</p>
          <p className="mt-0.5 text-[11px] text-faint">Unique Torn accounts</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-xs text-muted">In Active Contract</p>
          <p className="tabular mt-1 text-2xl font-bold text-accent">{agentsWithContract}</p>
          <p className="mt-0.5 text-[11px] text-faint">Currently competing</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-xs text-muted">No Contract</p>
          <p className="tabular mt-1 text-2xl font-bold text-muted">{agentsWithoutContract}</p>
          <p className="mt-0.5 text-[11px] text-faint">Available / standby</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-xs text-muted">Working API Keys</p>
          <p className="tabular mt-1 text-2xl font-bold text-medium">{activeApiWorking}</p>
          <p className="mt-0.5 text-[11px] text-faint">Validated pipelines</p>
        </div>
      </div>

      <Card
        title="Agent Directory & Platform Authentication"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-44 sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search agent or Torn ID..."
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface py-1 pl-8 pr-2 text-xs text-fg focus:border-accent focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshingList}
              title="Refresh Agent Roster"
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-muted hover:border-line-strong hover:text-fg disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isRefreshingList ? 'animate-spin text-accent' : ''}`} />
              Sync
            </button>
          </div>
        }
      >
        <div className="p-4 pt-0 sm:p-5 sm:pt-0 space-y-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-3">
            {[
              { id: 'all', label: `All Agents (${totalAgents})` },
              { id: 'contract', label: `In Contract (${agentsWithContract})` },
              { id: 'no-contract', label: `No Contract (${agentsWithoutContract})` },
              { id: 'working', label: `API Working (${activeApiWorking})` },
              { id: 'paused', label: 'API Paused / Invalid' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as any)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  filter === tab.id
                    ? 'bg-raised text-fg border border-line-strong'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-raised/50 text-muted">
                <tr>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-3 py-3">Contract Status</th>
                  <th className="px-3 py-3">Platform Joined</th>
                  <th className="px-3 py-3">API Status</th>
                  <th className="px-3 py-3">Account State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                      No matching agents found in directory.
                    </td>
                  </tr>
                ) : (
                  filtered.map((agent) => {
                    const isRefreshing = refreshingId === agent.id

                    return (
                      <tr key={agent.id} className="hover:bg-raised/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface border border-line font-bold text-fg">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-semibold text-fg flex items-center gap-1.5">
                                {agent.name}
                              </p>
                              <p className="text-[10px] text-faint">
                                Torn ID: #{agent.tornId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          {agent.hasActiveContract ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                              Active in #{agent.activeContractNumber || 'Contract'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-muted">
                              No Contract
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-muted">
                          <span className="text-xs text-fg block">
                            {agent.registeredDate}
                          </span>
                          <span className="text-[10px] text-faint">
                            Last active: {agent.lastActive}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="inline-flex items-center gap-2">
                            {agent.apiStatus === 'working' ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 border border-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent">
                                <CheckCircle2 className="size-3" />
                                Working
                              </span>
                            ) : agent.apiStatus === 'paused' ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-hard/10 border border-hard/20 px-2 py-0.5 text-[11px] font-semibold text-hard">
                                <Pause className="size-3" />
                                Paused
                              </span>
                            ) : agent.apiStatus === 'invalid' ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-extreme/10 border border-extreme/20 px-2 py-0.5 text-[11px] font-semibold text-extreme">
                                Invalid Key
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-raised border border-line px-2 py-0.5 text-[11px] text-muted">
                                Not Configured
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRefreshKey(agent.id)}
                              disabled={isRefreshing}
                              title="Test and Refresh Torn API key status"
                              className="rounded p-1 text-muted hover:text-accent hover:bg-raised transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`size-3 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
                            </button>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              agent.status === 'active'
                                ? 'bg-accent/15 text-accent'
                                : agent.status === 'suspended'
                                  ? 'bg-hard/20 text-hard'
                                  : 'bg-extreme/20 text-extreme'
                            }`}
                          >
                            {agent.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {agent.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => suspendAgent(agent.id)}
                                className="rounded border border-hard/30 bg-hard/10 px-2 py-1 text-[11px] font-semibold text-hard hover:bg-hard/20 transition-colors"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => restoreAgent(agent.id)}
                                className="rounded border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors"
                              >
                                Restore
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDelete(agent)}
                              title="Delete Agent from platform"
                              className="rounded border border-line bg-surface p-1 text-muted hover:border-extreme hover:text-extreme transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}
