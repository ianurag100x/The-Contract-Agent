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
    const isJson = res.headers.get('content-type')?.includes('application/json')
    if (!res.ok) {
      if (isJson) {
        const errorData = await res.json()
        return errorData as T
      }
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
  startContract: (contractId?: number, userId = 'usr-4') =>
    fetchJson<{ success: boolean; message: string }>('/player/start-contract', {
      method: 'POST',
      body: JSON.stringify({ contractId, userId }),
    }),
  leaveContract: (contractId?: number, userId = 'usr-4') =>
    fetchJson<{ success: boolean; message: string }>('/player/leave-contract', {
      method: 'POST',
      body: JSON.stringify({ contractId, userId }),
    }),
}

export const archiveApi = {
  getHistory: () => fetchJson<any[]>('/contracts/history'),
}

export const leaderboardApi = {
  getLeaderboard: () => fetchJson<{ contractNumber: number; standings: any[]; champions: any[] }>('/leaderboard'),
}

export const profileApi = {
  getProfile: (userId?: string) =>
    fetchJson<{ user: any; stats: any; rewards: any[] }>(`/player/profile${userId ? `?userId=${userId}` : ''}`),
  saveApiKey: (apiKey: string, userId = 'usr-4') =>
    fetchJson<{
      success: boolean
      valid: boolean
      maskedKey?: string
      verifiedUser?: { torn_user_id: number; torn_username: string; torn_level: number }
      verifiedAt?: string
      message?: string
      error?: string
    }>('/player/api-key', {
      method: 'POST',
      body: JSON.stringify({ apiKey, userId }),
    }),
  revokeApiKey: (userId = 'usr-4') =>
    fetchJson<{ success: boolean; message: string }>('/player/api-key', {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),
  deleteAccount: (userId = 'usr-4') =>
    fetchJson<{ success: boolean; message: string }>('/player/account', {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    }),
  checkTaskProgress: (contractId?: number, userId = 'usr-4', objectiveId?: string | number, objectiveIndex?: number) =>
    fetchJson<{
      success: boolean
      logsScanned: number
      evaluation: {
        matchesFound: number
        logsEvaluated: number
        objectivesCompleted: any[]
        partialRewardsCredited: number
      }
      sampleLogs: { occurredAt: string; text: string; category: string }[]
      error?: string
      message?: string
    }>('/player/check-progress', {
      method: 'POST',
      body: JSON.stringify({ contractId, userId, objectiveId, objectiveIndex }),
    }),
}

export const adminApi = {
  // Health & Stats
  getHealth: () => fetchJson<{ status: string; subsystems: Record<string, string>; metrics: Record<string, any> }>('/health'),
  getStats: () => fetchJson<{ registeredUsers: number; activeUsers: number; activeContractors: number; contractsCompleted: number; totalRewardsDistributed: string }>('/admin/stats'),

  // Contract
  getContract: () => fetchJson<any>('/admin/contract'),
  getContracts: () => fetchJson<any[]>('/admin/contracts'),
  getContractById: (id: number) => fetchJson<any>(`/admin/contracts/${id}`),
  updateContract: (data: any) => fetchJson<any>('/admin/contract', { method: 'PUT', body: JSON.stringify(data) }),
  createContract: (data: any) => fetchJson<any>('/admin/contract/create', { method: 'POST', body: JSON.stringify(data) }),
  deleteContract: (id: number) => fetchJson<any>(`/admin/contracts/${id}`, { method: 'DELETE' }),
  executeControl: (action: string, data?: any) => fetchJson<any>('/admin/contract/controls', { method: 'POST', body: JSON.stringify({ action, data }) }),

  // Objectives & Balanced Generator
  getObjectivePool: () => fetchJson<any[]>('/admin/objectives/pool'),
  generateBalancedObjectives: (contractId?: number) => fetchJson<any>('/admin/objectives/generate', { method: 'POST', body: JSON.stringify({ contractId }) }),
  swapObjective: (contractId: number, index: number, newDefId: string) => fetchJson<any>('/admin/objectives/swap', { method: 'POST', body: JSON.stringify({ contractId, index, newDefId }) }),
  invalidateObjective: (contractId: number, index: number, reason?: string) => fetchJson<any>('/admin/objectives/invalidate', { method: 'POST', body: JSON.stringify({ contractId, index, reason }) }),

  // Participants
  getParticipants: (contractId?: number) => fetchJson<any[]>(`/admin/participants${contractId ? `?contractId=${contractId}` : ''}`),

  // Rewards & Partial Bounties
  getRewards: () => fetchJson<any[]>('/admin/rewards'),
  executeRewardAction: (id: string, action: 'issue' | 'retry' | 'cancel') => fetchJson<any>('/admin/rewards/action', { method: 'POST', body: JSON.stringify({ id, action }) }),

  // Users & Agents
  getUsers: () => fetchJson<any[]>('/admin/users'),
  setUserStatus: (userId: string, status: string) => fetchJson<any>(`/admin/users/${userId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  deleteUser: (userId: string) => fetchJson<{ success: boolean; message: string }>(`/admin/users/${userId}`, { method: 'DELETE' }),
  checkUserApiKey: (userId: string) => fetchJson<{ success: boolean; valid: boolean; status: string; message?: string }>(`/admin/users/${userId}/check-api`, { method: 'POST' }),

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

  // Spec §6.8 Pattern Testing Tool
  testPattern: (data: { patterns: any[]; metric?: string; target?: number; samples: string[] }) =>
    fetchJson<any>('/admin/patterns/test', { method: 'POST', body: JSON.stringify(data) }),

  // Spec §7 Live Torn Logs Ingestion
  syncTornLogs: (data: { apiKey?: string; userId?: string; contractId?: number; limit?: number; cat?: number }) =>
    fetchJson<any>('/admin/torn/sync-user', { method: 'POST', body: JSON.stringify(data) }),

  // Spec §10.2 Admin Task Override
  taskOverride: (data: { userId?: string; participantId?: string; contractId?: number; contractObjectiveId: string; action: string; reason: string }) =>
    fetchJson<any>('/admin/participants/task-override', { method: 'POST', body: JSON.stringify(data) }),

  deleteParticipant: (participantId: string) =>
    fetchJson<{ success: boolean; message: string }>(`/admin/participants/${participantId}`, { method: 'DELETE' }),

  // Pull / Sync All Logs for all agents in contract
  syncAllLogs: (contractId: number) =>
    fetchJson<{
      success: boolean
      contractId: number
      syncedAgents: number
      logsScanned: number
      matchesFound: number
      objectivesCompleted: number
      errors: Array<{ agent: string; error: string }>
    }>('/admin/contracts/sync-all-logs', {
      method: 'POST',
      body: JSON.stringify({ contractId }),
    }),
}

