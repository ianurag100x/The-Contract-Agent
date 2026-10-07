const API_BASE = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    })
    if (!res.ok) {
      console.warn(`API error ${res.status} for ${url}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    // Graceful offline fallback
    console.warn(`API fetch failed for ${url}:`, err)
    return null
  }
}

export const dashboardApi = {
  getStats: () => fetchJson<{
    globalStats: { registered: number; active: number; completed: number; rewardsPaid: string }
    activity: { id: string; kind: 'objective' | 'rank' | 'progress' | 'win'; who: string; text: string; ago: string }[]
    announcements: { id: string; title: string; body: string; ago: string }[]
  }>('/dashboard/stats'),
}

export const contractApi = {
  getActive: (userId?: string) => fetchJson<{
    contract: any
    participant: any
    standings: any[]
  }>(`/contracts/active${userId ? `?userId=${userId}` : ''}`),
  verifyObjective: (objectiveIndex: number, userId?: string, contractId = 1847) =>
    fetchJson<{ success: boolean; progress: number; partialRewardsEarned: number; reward?: any }>(
      '/player/verify-objective',
      { method: 'POST', body: JSON.stringify({ objectiveIndex, userId, contractId }) }
    ),
}

export const archiveApi = {
  getHistory: () => fetchJson<any[]>('/contracts/history'),
}

export const leaderboardApi = {
  getLeaderboard: () => fetchJson<{ contractNumber: number; standings: any[]; champions: any[] }>('/leaderboard'),
}

export const profileApi = {
  getProfile: (userId?: string) => fetchJson<{ user: any; stats: any; rewards: any[] }>(`/player/profile${userId ? `?userId=${userId}` : ''}`),
}

export const adminApi = {
  // Health & Stats
  getHealth: () => fetchJson<{ status: string; subsystems: Record<string, string>; metrics: Record<string, any> }>('/health'),
  getStats: () => fetchJson<{ registeredUsers: number; activeUsers: number; activeContractors: number; contractsCompleted: number; totalRewardsDistributed: string }>('/admin/stats'),

  // Contract
  getContract: () => fetchJson<any>('/admin/contract'),
  updateContract: (data: any) => fetchJson<any>('/admin/contract', { method: 'PUT', body: JSON.stringify(data) }),
  createContract: (data: any) => fetchJson<any>('/admin/contract/create', { method: 'POST', body: JSON.stringify(data) }),
  executeControl: (action: string, data?: any) => fetchJson<any>('/admin/contract/controls', { method: 'POST', body: JSON.stringify({ action, data }) }),

  // Objectives & Balanced Generator
  getObjectivePool: () => fetchJson<any[]>('/admin/objectives/pool'),
  generateBalancedObjectives: (contractId?: number) => fetchJson<any>('/admin/objectives/generate', { method: 'POST', body: JSON.stringify({ contractId }) }),
  swapObjective: (contractId: number, index: number, newDefId: string) => fetchJson<any>('/admin/objectives/swap', { method: 'POST', body: JSON.stringify({ contractId, index, newDefId }) }),
  invalidateObjective: (contractId: number, index: number, reason?: string) => fetchJson<any>('/admin/objectives/invalidate', { method: 'POST', body: JSON.stringify({ contractId, index, reason }) }),

  // Participants
  getParticipants: () => fetchJson<any[]>('/admin/participants'),

  // Rewards & Partial Bounties
  getRewards: () => fetchJson<any[]>('/admin/rewards'),
  executeRewardAction: (id: string, action: 'issue' | 'retry' | 'cancel') => fetchJson<any>('/admin/rewards/action', { method: 'POST', body: JSON.stringify({ id, action }) }),

  // Users
  getUsers: () => fetchJson<any[]>('/admin/users'),
  setUserStatus: (userId: string, status: string) => fetchJson<any>(`/admin/users/${userId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),

  // Suspicious Activity
  getSuspicious: () => fetchJson<any[]>('/admin/suspicious'),
  executeSuspiciousAction: (id: string, action: 'investigate' | 'clear') => fetchJson<any>(`/admin/suspicious/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) }),

  // Alerts
  getAlerts: () => fetchJson<any[]>('/admin/alerts'),
  resolveAlert: (id: string) => fetchJson<any>(`/admin/alerts/${id}/resolve`, { method: 'POST' }),

  // Announcements & Notch Broadcasts
  getAnnouncements: () => fetchJson<any[]>('/admin/announcements'),
  publishAnnouncement: (ann: any) => fetchJson<any>('/admin/announcements', { method: 'POST', body: JSON.stringify(ann) }),
  toggleAnnouncement: (id: string) => fetchJson<any>(`/admin/announcements/${id}/toggle`, { method: 'PUT' }),
  deleteAnnouncement: (id: string) => fetchJson<any>(`/admin/announcements/${id}`, { method: 'DELETE' }),

  // Audit Logs
  getAuditLogs: () => fetchJson<any[]>('/admin/audit'),
}
