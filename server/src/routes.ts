import { db, type Contract, type ObjectiveDefinition, type SystemAnnouncement } from './db.ts'
import { contractEngine } from './engine.ts'
import { supabase, SUPABASE_CONFIG } from './supabase.ts'

export type RouteHandler = (
  req: { method: string; path: string; query: Record<string, string>; body: any; headers: Record<string, string> },
  res: { status: (code: number) => { json: (data: any) => void; send: (data: any) => void } }
) => Promise<boolean> | boolean

export async function handleApiRoute(
  req: { method: string; path: string; query: Record<string, string>; body: any; headers: Record<string, string> },
  res: { status: (code: number) => { json: (data: any) => void; send: (data: any) => void } }
): Promise<boolean> {
  const { method, path: urlPath, body } = req

  // Helper log
  const logAudit = (action: string, entityType: string, entityId: string, details: string, tone: 'normal' | 'warning' | 'danger' | 'success' = 'normal') => {
    const logs = db.get('admin_audit_logs')
    const newLog = {
      id: `log-${Date.now()}`,
      admin_id: 'usr-admin-1',
      admin_name: 'Admin Overseer',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip: req.headers['x-forwarded-for'] || '127.0.0.1',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tone,
    }
    db.set('admin_audit_logs', [newLog, ...logs])
  }

  // 1. Health Diagnostics (Section 15)
  if (urlPath === '/api/health' && method === 'GET') {
    res.status(200).json({
      status: 'ok',
      subsystems: {
        tornApi: 'operational',
        verificationEngine: 'operational',
        database: 'operational',
        rewardSystem: 'operational',
        authentication: 'operational',
        backgroundJobs: 'operational',
        webSocket: 'operational',
      },
      metrics: {
        apiRequestsToday: 182452,
        failedRequests: 23,
        verificationErrors: 7,
        avgVerificationTime: '1.8 sec',
      },
    })
    return true
  }

  // 2. Platform Statistics (Section 1)
  if (urlPath === '/api/admin/stats' && method === 'GET') {
    const supabaseStats = await supabase.getLiveStats()

    if (supabaseStats) {
      const formattedRewards = supabaseStats.totalRewardsCash >= 1e9
        ? `$${(supabaseStats.totalRewardsCash / 1e9).toFixed(2)}B`
        : supabaseStats.totalRewardsCash >= 1e6
        ? `$${(supabaseStats.totalRewardsCash / 1e6).toFixed(1)}M`
        : `$${supabaseStats.totalRewardsCash.toLocaleString()}`

      res.status(200).json({
        registeredUsers: supabaseStats.registered,
        activeUsers: supabaseStats.active,
        activeContractors: supabaseStats.active,
        contractsCompleted: supabaseStats.completed,
        totalRewardsDistributed: formattedRewards,
        source: 'supabase',
      })
      return true
    }

    const users = db.get('users')
    const contracts = db.get('contracts')
    const participants = db.get('contract_participants')
    const rewards = db.get('reward_transactions')

    const totalDistributed = rewards
      .filter((r) => r.status === 'DELIVERED')
      .reduce((sum, r) => sum + Number(r.amount_cash), 0)

    res.status(200).json({
      registeredUsers: users.length,
      activeUsers: participants.filter((p) => p.status === 'active').length,
      activeContractors: participants.filter((p) => p.status === 'active').length,
      contractsCompleted: contracts.filter((c) => c.status === 'completed').length,
      totalRewardsDistributed: `$${(totalDistributed / 1e6).toFixed(1)}M`,
      source: 'local_database',
    })
    return true
  }

  // 3. Current Contract (Section 2, 3)
  if (urlPath === '/api/admin/contract' && method === 'GET') {
    const contract = db.get('contracts')[0]
    const contractObjectives = db.get('contract_objectives').filter((co) => co.contract_id === contract.id)

    res.status(200).json({
      ...contract,
      objectives: contractObjectives.map((co) => ({
        id: co.objective_order,
        objId: co.id,
        title: co.title,
        category: co.category,
        difficulty: co.difficulty,
        target: co.target_value,
        partialReward: co.partial_reward,
        current: 0,
      })),
      participants: db.get('contract_participants').length + 477,
    })
    return true
  }

  if (urlPath === '/api/admin/contract' && method === 'PUT') {
    const contracts = db.get('contracts')
    if (contracts.length > 0) {
      contracts[0] = { ...contracts[0], ...body }
      db.set('contracts', [...contracts])
      logAudit('Updated Contract Properties', 'contract', `#${contracts[0].id}`, 'Modified contract configuration.')
      res.status(200).json({ success: true, contract: contracts[0] })
      return true
    }
  }

  // 4. Contract Creation (Section 4)
  if (urlPath === '/api/admin/contract/create' && method === 'POST') {
    const newContract: Contract = {
      id: body.number || 1848,
      status: body.status || 'scheduled',
      type: body.type || 'standard',
      starts_at: body.starts_at || 'Oct 8, 2026 — 12:00 AM',
      ends_at: Date.now() + 24 * 3600 * 1000,
      max_objectives: 10,
      winner_count: body.winnerConfig || '1 winner',
      created_by: 'Admin01',
      created_at: new Date().toISOString(),
      reward_configuration: body.rewards || [{ place: '1st', reward: '$10,000,000 + 1× Xanax' }],
      partial_rewards_enabled: body.partial_rewards_enabled ?? true,
      partial_reward_per_objective: body.partial_reward_per_objective || 500000,
      settings: {},
      generation_method: body.generation_method || 'random_balanced',
    }

    const contracts = db.get('contracts')
    db.set('contracts', [newContract, ...contracts])
    // Generate initial objectives for this contract
    contractEngine.generateBalancedObjectives(newContract.id)

    logAudit('Created Contract', 'contract', `#${newContract.id}`, `Scheduled new ${newContract.type.toUpperCase()} contract.`, 'success')
    res.status(201).json({ success: true, contract: newContract })
    return true
  }

  // 5. Contract Emergency Controls (Section 3)
  if (urlPath === '/api/admin/contract/controls' && method === 'POST') {
    const { action, contractId, data } = body
    const contracts = db.get('contracts')
    const c = contracts.find((item) => item.id === (contractId || 1847)) || contracts[0]

    if (!c) {
      res.status(404).json({ error: 'Contract not found' })
      return true
    }

    switch (action) {
      case 'start':
      case 'resume':
        c.status = 'active'
        logAudit('Resumed Contract', 'contract', `#${c.id}`, 'Contract resumed.')
        break
      case 'pause':
        c.status = 'paused'
        logAudit('Paused Contract', 'contract', `#${c.id}`, 'Contract temporarily paused.', 'warning')
        break
      case 'extend':
        c.ends_at += (data?.minutes || 60) * 60 * 1000
        logAudit('Extended Deadline', 'contract', `#${c.id}`, `Added +${data?.minutes || 60}m to contract duration.`, 'warning')
        break
      case 'end':
      case 'declare_winner':
        c.status = 'completed'
        c.winner_status = 'Verified Winner'
        c.declared_winner = data?.winnerName || 'PlayerA'
        logAudit('Declared Winner', 'contract', `#${c.id}`, `Officially declared ${c.declared_winner} as winner.`, 'success')
        break
      case 'cancel':
        c.status = 'cancelled'
        logAudit('Cancelled Contract', 'contract', `#${c.id}`, 'Contract aborted.', 'danger')
        break
      case 'invalidate':
        c.status = 'invalid'
        logAudit('Invalidated Contract', 'contract', `#${c.id}`, `Voided: ${data?.reason || 'API error'}`, 'danger')
        break
      case 'reset':
        // Restore factory contract
        c.status = 'active'
        c.ends_at = Date.now() + 18 * 3600 * 1000
        logAudit('Reset Contract', 'contract', `#${c.id}`, 'Reset contract to defaults.', 'warning')
        break
    }

    db.set('contracts', [...contracts])
    res.status(200).json({ success: true, contract: c })
    return true
  }

  // 6. Objectives Pool & Balanced Generator (Section 5, 6)
  if (urlPath === '/api/admin/objectives/pool' && method === 'GET') {
    res.status(200).json(db.get('objective_definitions'))
    return true
  }

  if (urlPath === '/api/admin/objectives/generate' && method === 'POST') {
    const contractId = body.contractId || 1847
    const newObjs = contractEngine.generateBalancedObjectives(contractId)
    logAudit('Balanced RNG Generation', 'objectives', `#${contractId}`, 'Generated 10 objectives (4E/3M/2H/1X) with partial reward bounties.', 'success')
    res.status(200).json({ success: true, objectives: newObjs })
    return true
  }

  if (urlPath === '/api/admin/objectives/swap' && method === 'POST') {
    const { contractId, index, newDefId } = body
    const def = db.get('objective_definitions').find((d) => d.id === newDefId)
    const contractObjectives = db.get('contract_objectives')
    const targetIdx = contractObjectives.findIndex((co) => co.contract_id === (contractId || 1847) && co.objective_order === index + 1)

    if (def && targetIdx !== -1) {
      contractObjectives[targetIdx] = {
        ...contractObjectives[targetIdx],
        objective_definition_id: def.id,
        title: def.name,
        category: def.category,
        difficulty: def.difficulty,
        target_value: def.default_target,
        partial_reward: def.default_partial_reward,
      }
      db.set('contract_objectives', [...contractObjectives])
      logAudit('Objective Swapped', 'objective', `Order #${index + 1}`, `Swapped for "${def.name}".`)
      res.status(200).json({ success: true, objective: contractObjectives[targetIdx] })
      return true
    }
  }

  if (urlPath === '/api/admin/objectives/invalidate' && method === 'POST') {
    const { contractId, index, reason } = body
    const pool = db.get('objective_definitions').filter((d) => d.is_active)
    const randomReplacement = pool[Math.floor(Math.random() * pool.length)]
    const contractObjectives = db.get('contract_objectives')
    const targetIdx = contractObjectives.findIndex((co) => co.contract_id === (contractId || 1847) && co.objective_order === index + 1)

    if (randomReplacement && targetIdx !== -1) {
      contractObjectives[targetIdx] = {
        ...contractObjectives[targetIdx],
        objective_definition_id: randomReplacement.id,
        title: randomReplacement.name,
        category: randomReplacement.category,
        difficulty: randomReplacement.difficulty,
        target_value: randomReplacement.default_target,
        partial_reward: randomReplacement.default_partial_reward,
      }
      db.set('contract_objectives', [...contractObjectives])
      logAudit('Emergency Invalidation', 'objective', `Order #${index + 1}`, `Invalidated (${reason || 'API error'}). Replaced with "${randomReplacement.name}".`, 'danger')
      res.status(200).json({ success: true, objective: contractObjectives[targetIdx] })
      return true
    }
  }

  // 7. Live Participants & Telemetry (Section 8, 9)
  if (urlPath === '/api/admin/participants' && method === 'GET') {
    const participants = db.get('contract_participants')
    const pObjs = db.get('participant_objectives')

    const enriched = participants.map((p) => {
      const objectives = pObjs.filter((po) => po.participant_id === p.id)
      return {
        ...p,
        completedCount: p.progress,
        totalCount: p.total_objectives,
        lastActive: p.last_activity_at,
        objectivesProgress: objectives.map((po, idx) => ({
          id: idx + 1,
          title: po.title,
          category: po.category,
          difficulty: po.difficulty,
          current: po.current_value,
          target: po.target_value,
          partialReward: po.partial_reward,
          partialRewardStatus: po.partial_reward_status,
          verifiedAt: po.verified_at,
          isSuspicious: p.status === 'suspicious' && idx > 2 && idx < 8,
        })),
      }
    })

    res.status(200).json(enriched)
    return true
  }

  // 8. Rewards Management & Partial Awards (Section 11, 15)
  if (urlPath === '/api/admin/rewards' && method === 'GET') {
    res.status(200).json(db.get('reward_transactions'))
    return true
  }

  if (urlPath === '/api/admin/rewards/action' && method === 'POST') {
    const { id, action } = body
    const rewards = db.get('reward_transactions')
    const target = rewards.find((r) => r.id === id)

    if (target) {
      if (action === 'issue' || action === 'retry') {
        target.status = 'DELIVERED'
        target.delivered_at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        target.tx_id = `TX-${Date.now().toString().slice(-5)}-TN`
        logAudit('Issued Reward', 'reward', id, `Delivered ${target.amount_cash ? '$' + target.amount_cash.toLocaleString() : target.description} to ${target.torn_username}.`, 'success')
      } else if (action === 'cancel') {
        target.status = 'CANCELLED'
        logAudit('Cancelled Reward', 'reward', id, `Cancelled reward delivery.`, 'danger')
      }
      db.set('reward_transactions', [...rewards])
      res.status(200).json({ success: true, reward: target })
      return true
    }
  }

  // 9. Users Directory & Moderation (Section 18, 19)
  if (urlPath === '/api/admin/users' && method === 'GET') {
    res.status(200).json(db.get('users'))
    return true
  }

  if (urlPath.startsWith('/api/admin/users/') && urlPath.endsWith('/status') && method === 'POST') {
    const userId = urlPath.replace('/api/admin/users/', '').replace('/status', '')
    const { status } = body
    const users = db.get('users')
    const target = users.find((u) => u.id === userId)

    if (target) {
      target.status = status
      db.set('users', [...users])
      logAudit(`User ${status.toUpperCase()}`, 'user', userId, `Updated user moderation state to ${status}.`, status === 'banned' ? 'danger' : status === 'suspended' ? 'warning' : 'success')
      res.status(200).json({ success: true, user: target })
      return true
    }
  }

  // 10. Suspicious Activity (Section 17)
  if (urlPath === '/api/admin/suspicious' && method === 'GET') {
    res.status(200).json(db.get('security_events'))
    return true
  }

  if (urlPath.startsWith('/api/admin/suspicious/') && method === 'POST') {
    const secId = urlPath.replace('/api/admin/suspicious/', '').replace('/action', '')
    const { action } = body
    const events = db.get('security_events')
    const target = events.find((e) => e.id === secId)

    if (target) {
      target.status = action === 'clear' ? 'cleared' : 'investigating'
      if (action === 'clear') target.resolved_at = new Date().toISOString()
      db.set('security_events', [...events])
      logAudit(action === 'clear' ? 'Cleared Suspicion' : 'Investigating Anomaly', 'security', secId, `Updated flag state.`)
      res.status(200).json({ success: true, event: target })
      return true
    }
  }

  // 11. Alerts & Issues (Section 16)
  if (urlPath === '/api/admin/alerts' && method === 'GET') {
    res.status(200).json(db.get('system_alerts'))
    return true
  }

  if (urlPath.startsWith('/api/admin/alerts/') && urlPath.endsWith('/resolve') && method === 'POST') {
    const alertId = urlPath.replace('/api/admin/alerts/', '').replace('/resolve', '')
    const alerts = db.get('system_alerts')
    const target = alerts.find((a) => a.id === alertId)

    if (target) {
      target.resolved = true
      db.set('system_alerts', [...alerts])
      logAudit('Resolved Alert', 'alert', alertId, `Resolved issue "${target.title}".`)
      res.status(200).json({ success: true, alert: target })
      return true
    }
  }

  // 12. Announcements & Notch Broadcasts (Section 13)
  if (urlPath === '/api/admin/announcements' && method === 'GET') {
    res.status(200).json(db.get('announcements'))
    return true
  }

  if (urlPath === '/api/admin/announcements' && method === 'POST') {
    const newAnn: SystemAnnouncement = {
      id: `ann-${Date.now()}`,
      title: body.title || 'Server Broadcast',
      message: body.message || 'Important update.',
      type: body.type || 'Warning',
      target: body.target || 'All users',
      published_at: 'Just now',
      is_active: true,
    }
    const announcements = db.get('announcements').map((a) => ({ ...a, is_active: false }))
    db.set('announcements', [newAnn, ...announcements])
    logAudit('Broadcast Announcement', 'announcement', newAnn.id, `Broadcasted "${newAnn.title}" to notch bar.`, 'success')
    res.status(201).json({ success: true, announcement: newAnn })
    return true
  }

  if (urlPath.startsWith('/api/admin/announcements/') && urlPath.endsWith('/toggle') && method === 'PUT') {
    const annId = urlPath.replace('/api/admin/announcements/', '').replace('/toggle', '')
    const announcements = db.get('announcements')
    const target = announcements.find((a) => a.id === annId)

    if (target) {
      target.is_active = !target.is_active
      db.set('announcements', [...announcements])
      res.status(200).json({ success: true, announcement: target })
      return true
    }
  }

  if (urlPath.startsWith('/api/admin/announcements/') && method === 'DELETE') {
    const annId = urlPath.replace('/api/admin/announcements/', '')
    const filtered = db.get('announcements').filter((a) => a.id !== annId)
    db.set('announcements', filtered)
    res.status(200).json({ success: true })
    return true
  }

  // 13. Audit Operations Ledger (Section 20)
  if (urlPath === '/api/admin/audit' && method === 'GET') {
    res.status(200).json(db.get('admin_audit_logs'))
    return true
  }

  // 14. Objective Progress Simulation Endpoint (with Partial Reward Testing)
  if (urlPath === '/api/player/progress' && method === 'POST') {
    const { userId, contractId, contractObjectiveId, deltaValue, idempotencyKey } = body
    const result = contractEngine.ingestPlayerEvent({
      userId: userId || 'usr-4',
      tornUserId: 2849102,
      contractId: contractId || 1847,
      contractObjectiveId: contractObjectiveId || 'co-1',
      deltaValue: deltaValue || 1,
      source: 'TORN API Telemetry',
      idempotencyKey: idempotencyKey || `sim-${Date.now()}`,
    })
    res.status(200).json(result)
    return true
  }

  // ============================================================================
  // PLAYER & PUBLIC DYNAMIC ENDPOINTS
  // ============================================================================

  // 15. Dashboard Overview Stats & Live Telemetry Feed
  if (urlPath === '/api/dashboard/stats' && method === 'GET') {
    const formatCash = (val: number) => {
      if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`
      if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
      if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`
      return `$${val.toLocaleString()}`
    }

    const announcements = db.get('announcements').filter((a) => a.is_active)
    const supabaseStats = await supabase.getLiveStats()

    let globalStats = {
      registered: 0,
      active: 0,
      completed: 0,
      rewardsPaid: '$0',
      source: 'local_database',
    }

    if (supabaseStats) {
      globalStats = {
        registered: supabaseStats.registered,
        active: supabaseStats.active,
        completed: supabaseStats.completed,
        rewardsPaid: formatCash(supabaseStats.totalRewardsCash),
        source: 'supabase',
      }
    } else {
      const users = db.get('users')
      const contracts = db.get('contracts')
      const participants = db.get('contract_participants')
      const rewards = db.get('reward_transactions')
      const totalRewards = rewards
        .filter((r) => r.status === 'DELIVERED')
        .reduce((sum, r) => sum + (Number(r.amount_cash) || 0), 0)

      globalStats = {
        registered: users.length,
        active: participants.filter((p) => p.status === 'active').length,
        completed: contracts.filter((c) => c.status === 'completed').length,
        rewardsPaid: formatCash(totalRewards),
        source: 'local_database',
      }
    }

    const participants = db.get('contract_participants')
    const activeParticipants = participants.filter((p) => p.status === 'active')
    const liveActivity = [
      ...activeParticipants.map((p, idx) => ({
        id: `act-${p.id}`,
        kind: p.progress === 10 ? 'win' : p.progress > 5 ? 'progress' : 'objective',
        who: p.torn_username,
        text: p.progress === 10 ? `won Contract #${p.contract_id}` : `completed ${p.progress}/10 objectives ($${((p.partial_rewards_earned || 0) / 1000).toFixed(0)}k earned)`,
        ago: `${(idx + 1) * 2}m ago`,
      })),
      { id: 'act-reward-1', kind: 'rank', who: 'PlayerA', text: 'moved into #1 with 9/10 objectives verified', ago: '8m ago' },
      { id: 'act-reward-2', kind: 'win', who: 'PlayerA', text: 'won Contract #1846 ($25,000,000 payout)', ago: '24h ago' },
    ]

    res.status(200).json({
      globalStats,
      activity: liveActivity,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.message,
        ago: a.published_at,
      })),
    })
    return true
  }

  // 16. Active Contract & User Progress Endpoint
  if (urlPath === '/api/contracts/active' && method === 'GET') {
    const contracts = db.get('contracts')
    const activeContract = contracts.find((c) => c.status === 'active') || contracts[0]
    const allObjectives = db.get('contract_objectives')
    const contractObjs = allObjectives.filter((o) => o.contract_id === activeContract.id)
    const participants = db.get('contract_participants').filter((p) => p.contract_id === activeContract.id)

    // Current player (Anurag / usr-4 by default)
    const currentUserId = req.query.userId || 'usr-4'
    const participant = participants.find((p) => p.user_id === currentUserId) || participants[0]
    const pObjs = db.get('participant_objectives').filter((po) => po.participant_id === participant?.id)

    const standings = participants
      .sort((a, b) => b.progress - a.progress)
      .map((p, idx) => ({
        rank: idx + 1,
        name: p.torn_username,
        completed: p.progress,
        partialEarned: p.partial_rewards_earned || 0,
        minutes: 180 + idx * 18,
        isYou: p.user_id === currentUserId || p.torn_username === 'Anurag',
      }))

    res.status(200).json({
      contract: {
        number: activeContract.id,
        type: activeContract.type,
        endsAt: activeContract.ends_at,
        participants: participants.length + 477,
        rewards: activeContract.reward_configuration.map((r) => ({ place: r.place, reward: r.reward })),
        partialRewardsEnabled: activeContract.partial_rewards_enabled,
        partialRewardPerObjective: activeContract.partial_reward_per_objective,
        objectives: contractObjs.map((co, idx) => {
          const po = pObjs.find((item) => item.contract_objective_id === co.id)
          return {
            id: idx + 1,
            objId: co.id,
            title: co.title,
            category: co.category,
            difficulty: co.difficulty,
            target: co.target_value,
            current: po ? po.current_value : 0,
            partialReward: co.partial_reward,
            status: po ? po.status : 'in_progress',
          }
        }),
      },
      participant: {
        id: participant?.id,
        username: participant?.torn_username || 'Agent',
        rank: standings.find((s) => s.isYou)?.rank || 14,
        progress: participant?.progress || 0,
        partialRewardsEarned: participant?.partial_rewards_earned || 0,
        status: participant?.status || 'active',
      },
      standings,
    })
    return true
  }

  // 17. Verify Objective & Award Partial Bounty Endpoint
  if (urlPath === '/api/player/verify-objective' && method === 'POST') {
    const { userId = 'usr-4', contractId = 1847, objectiveIndex = 0 } = body
    const participants = db.get('contract_participants')
    const participant = participants.find((p) => p.contract_id === contractId && p.user_id === userId)
    const contractObjectives = db.get('contract_objectives').filter((co) => co.contract_id === contractId)
    const targetObj = contractObjectives[objectiveIndex] || contractObjectives[0]

    if (participant && targetObj) {
      const pObjs = db.get('participant_objectives')
      const targetPo = pObjs.find((po) => po.participant_id === participant.id && po.contract_objective_id === targetObj.id)

      if (targetPo && targetPo.status !== 'verified') {
        targetPo.status = 'verified'
        targetPo.current_value = targetPo.target_value
        targetPo.partial_reward_status = 'credited'
        targetPo.verified_at = new Date().toISOString()
        
        participant.progress = Math.min(10, participant.progress + 1)
        participant.partial_rewards_earned = (participant.partial_rewards_earned || 0) + (targetObj.partial_reward || 500000)
        participant.last_activity_at = 'Just now'

        // Record Partial Reward Transaction
        const newReward = {
          id: `rw-${Date.now()}`,
          user_id: participant.user_id,
          torn_user_id: participant.torn_user_id,
          torn_username: participant.torn_username,
          contract_id: contractId,
          reward_type: 'partial_objective' as const,
          description: `Partial Bounty: Objective "${targetObj.title}" verified`,
          amount_cash: targetObj.partial_reward || 500000,
          status: 'DELIVERED' as const,
          issued_at: 'Just now',
          delivered_at: 'Just now',
          tx_id: `TX-PRT-${Math.floor(100000 + Math.random() * 900000)}`,
        }

        db.set('reward_transactions', [newReward, ...db.get('reward_transactions')])
        db.set('participant_objectives', [...pObjs])
        db.set('contract_participants', [...participants])

        logAudit('Objective Verified', 'objective', targetObj.id, `Player ${participant.torn_username} verified "${targetObj.title}" ($${((targetObj.partial_reward || 500000)/1000).toFixed(0)}k credited).`, 'success')

        res.status(200).json({
          success: true,
          progress: participant.progress,
          partialRewardsEarned: participant.partial_rewards_earned,
          reward: newReward,
        })
        return true
      }
    }

    res.status(200).json({ success: true, message: 'Objective already verified or not found' })
    return true
  }

  // 18. Archive History Endpoint
  if (urlPath === '/api/contracts/history' && method === 'GET') {
    const contracts = db.get('contracts')
    const completed = contracts.filter((c) => c.status === 'completed')
    const objectivePool = db.get('objective_definitions')

    const history = completed.map((c, idx) => ({
      number: c.id,
      date: c.starts_at,
      type: c.type,
      winner: c.declared_winner || 'PlayerA',
      minutes: 100 + (idx * 23) % 180,
      participants: 400 + (idx * 13) % 90,
      objectives: objectivePool.slice(0, 10).map((def, i) => ({
        id: i + 1,
        title: def.name,
        category: def.category,
        difficulty: def.difficulty,
        target: def.default_target,
        current: def.default_target,
      })),
    }))

    res.status(200).json(history)
    return true
  }

  // 19. Leaderboard & Champions Endpoint
  if (urlPath === '/api/leaderboard' && method === 'GET') {
    const participants = db.get('contract_participants')
    const activeContract = db.get('contracts').find((c) => c.status === 'active')

    const standings = participants
      .sort((a, b) => b.progress - a.progress)
      .map((p, idx) => ({
        rank: idx + 1,
        name: p.torn_username,
        completed: p.progress,
        partialEarned: p.partial_rewards_earned || 0,
        minutes: 180 + idx * 17,
        isYou: p.torn_username === 'Anurag',
      }))

    const champions = [
      { name: 'PlayerA', wins: 28, top3: 41, completed: 67, fastestMin: 102, earnings: '$345M' },
      { name: 'PlayerB', wins: 21, top3: 36, completed: 59, fastestMin: 111, earnings: '$280M' },
      { name: 'PlayerC', wins: 17, top3: 29, completed: 51, fastestMin: 123, earnings: '$210M' },
      { name: 'PlayerD', wins: 14, top3: 25, completed: 44, fastestMin: 140, earnings: '$175M' },
      { name: 'PlayerE', wins: 11, top3: 22, completed: 40, fastestMin: 151, earnings: '$130M' },
      { name: 'Anurag', wins: 8, top3: 14, completed: 29, fastestMin: 134, earnings: '$98.5M' },
    ]

    res.status(200).json({ contractNumber: activeContract?.id || 1847, standings, champions })
    return true
  }

  // 20. Player Profile & Statistics Endpoint
  if (urlPath === '/api/player/profile' && method === 'GET') {
    const users = db.get('users')
    const currentUserId = req.query.userId || 'usr-4'
    const user = users.find((u) => u.id === currentUserId) || users[3]
    const rewards = db.get('reward_transactions').filter((r) => r.user_id === user.id)
    const partialTotal = rewards
      .filter((r) => r.reward_type === 'partial_objective' && r.status === 'DELIVERED')
      .reduce((sum, r) => sum + (Number(r.amount_cash) || 0), 0)

    res.status(200).json({
      user,
      stats: {
        started: 37,
        completed: 29,
        wins: 8,
        top3: 14,
        objectives: 312,
        totalPartialBounties: partialTotal,
        completionRate: '78.4%',
        avgTime: '4h 21m',
        fastest: '2h 14m',
        bestFinish: '1st',
      },
      rewards,
    })
    return true
  }

  // Unhandled API Route
  res.status(404).json({ error: `Not found: ${method} ${urlPath}` })
  return true
}
