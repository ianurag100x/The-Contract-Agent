import { db, type Contract, type ObjectiveDefinition, type SystemAnnouncement } from './db.ts'
import { contractEngine } from './engine.ts'
import { supabase, SUPABASE_CONFIG } from './supabase.ts'
import { sqliteDb } from './sqlite.ts'

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
    try {
      sqliteDb.prepare(`
        INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, entity_type, entity_id, details, ip, tone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `log-${Date.now()}`,
        'usr-admin-1',
        'Admin Overseer',
        action,
        entityType,
        entityId,
        details,
        req.headers['x-forwarded-for'] || '127.0.0.1',
        tone
      )
    } catch (e) {
      console.error('Audit log error:', e)
    }
  }

  // 1. Health Diagnostics (Section 15)
  if (urlPath === '/api/health' && method === 'GET') {
    res.status(200).json({
      status: 'ok',
      database: 'sqlite',
      subsystems: {
        tornApi: 'operational',
        verificationEngine: 'operational',
        database: 'operational (SQLite local WAL)',
        rewardSystem: 'operational',
        authentication: 'operational',
        backgroundJobs: 'operational',
        webSocket: 'operational',
      },
      metrics: {
        apiRequestsToday: 182452,
        failedRequests: 23,
        verificationErrors: 7,
        avgVerificationTime: '1.2 ms',
      },
    })
    return true
  }

  // 2. Platform Statistics (Section 1)
  if (urlPath === '/api/admin/stats' && method === 'GET') {
    try {
      const regCount = (sqliteDb.prepare('SELECT count(*) as count FROM users').get() as any)?.count || 0
      const actCount = (sqliteDb.prepare("SELECT count(*) as count FROM contract_participants WHERE status = 'active'").get() as any)?.count || 0
      const compCount = (sqliteDb.prepare("SELECT count(*) as count FROM contracts WHERE status = 'completed'").get() as any)?.count || 0
      const totalCash = (sqliteDb.prepare("SELECT sum(amount_cash) as total FROM reward_transactions WHERE status = 'DELIVERED'").get() as any)?.total || 0

      const formattedRewards = totalCash >= 1e9
        ? `$${(totalCash / 1e9).toFixed(2)}B`
        : totalCash >= 1e6
        ? `$${(totalCash / 1e6).toFixed(1)}M`
        : `$${totalCash.toLocaleString()}`

      res.status(200).json({
        registeredUsers: regCount,
        activeUsers: actCount,
        activeContractors: actCount,
        contractsCompleted: compCount,
        totalRewardsDistributed: formattedRewards,
        source: 'sqlite_local',
      })
      return true
    } catch (err) {
      console.error('Error fetching SQLite stats:', err)
    }
  }

  // 3. Current Contract (Section 2, 3)
  if (urlPath === '/api/admin/contract' && method === 'GET') {
    try {
      const contractRow = sqliteDb.prepare('SELECT * FROM contracts ORDER BY id DESC LIMIT 1').get() as any
      if (contractRow) {
        const objRows = sqliteDb.prepare('SELECT * FROM contract_objectives WHERE contract_id = ? ORDER BY objective_order ASC').all(contractRow.id) as any[]
        const partCount = ((sqliteDb.prepare('SELECT count(*) as count FROM contract_participants WHERE contract_id = ?').get(contractRow.id) as any)?.count || 0)

        res.status(200).json({
          id: contractRow.id,
          number: contractRow.id,
          status: contractRow.status,
          type: contractRow.type,
          winnerConfig: contractRow.winner_count,
          starts_at: contractRow.starts_at,
          endsAt: contractRow.ends_at,
          remainingMs: contractRow.status === 'paused'
            ? (contractRow.remaining_ms !== null && contractRow.remaining_ms !== undefined ? contractRow.remaining_ms : Math.max(0, contractRow.ends_at - Date.now()))
            : Math.max(0, contractRow.ends_at - Date.now()),
          maxObjectives: contractRow.max_objectives,
          participants: partCount,
          rewards: JSON.parse(contractRow.reward_configuration || '[]'),
          partialRewardsEnabled: Boolean(contractRow.partial_rewards_enabled),
          partialRewardPerObjective: contractRow.partial_reward_per_objective,
          winnerStatus: contractRow.winner_status,
          declaredWinner: contractRow.declared_winner,
          objectives: objRows.map((co) => {
            const rawPatterns = (co.log_pattern || '').split('\n').map((l: string) => l.trim()).filter(Boolean)
            return {
              id: co.objective_order,
              objId: co.id,
              title: co.title,
              category: co.category,
              difficulty: co.difficulty,
              complexity: co.complexity,
              target: co.target_value,
              partialReward: co.partial_reward,
              bounty: co.bounty,
              agent_note: co.agent_note,
              metric: co.metric,
              log_pattern: co.log_pattern,
              log_patterns: rawPatterns.map((p: string, pIdx: number) => ({
                key: `pat_${co.id}_${pIdx + 1}`,
                template: p,
              })),
              current: 0,
            }
          }),
        })
        return true
      } else {
        // Database is clean (0 contracts). Return null so frontend can create one fresh
        res.status(200).json(null)
        return true
      }
    } catch (err) {
      console.error('Error getting contract from SQLite:', err)
      res.status(200).json(null)
      return true
    }
  }

  // 3B. All Contracts for Admin List
  if (urlPath === '/api/admin/contracts' && method === 'GET') {
    try {
      const rows = sqliteDb.prepare('SELECT * FROM contracts ORDER BY id DESC').all() as any[]
      const mapped = rows.map((c) => {
        const objCount = ((sqliteDb.prepare('SELECT count(*) as count FROM contract_objectives WHERE contract_id = ?').get(c.id) as any)?.count || 0)
        const partCount = ((sqliteDb.prepare('SELECT count(*) as count FROM contract_participants WHERE contract_id = ?').get(c.id) as any)?.count || 0)
        return {
          id: c.id,
          number: c.id,
          status: c.status,
          type: c.type,
          winnerConfig: c.winner_count,
          starts_at: c.starts_at,
          endsAt: c.ends_at,
          remainingMs: c.status === 'paused'
            ? (c.remaining_ms !== null && c.remaining_ms !== undefined ? c.remaining_ms : Math.max(0, c.ends_at - Date.now()))
            : Math.max(0, c.ends_at - Date.now()),
          createdAt: c.created_at,
          participants: partCount,
          objectivesCount: objCount,
          rewards: JSON.parse(c.reward_configuration || '[]'),
          winnerStatus: c.winner_status,
          declaredWinner: c.declared_winner,
        }
      })
      res.status(200).json(mapped)
      return true
    } catch (err) {
      console.error('Error getting contracts list:', err)
      res.status(200).json([])
      return true
    }
  }

  // 3C. Specific Contract by ID for Admin
  if (urlPath.startsWith('/api/admin/contracts/') && method === 'GET') {
    const rawId = urlPath.replace('/api/admin/contracts/', '')
    const contractId = parseInt(rawId, 10)
    try {
      const contractRow = sqliteDb.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId) as any
      if (contractRow) {
        const objRows = sqliteDb.prepare('SELECT * FROM contract_objectives WHERE contract_id = ? ORDER BY objective_order ASC').all(contractRow.id) as any[]
        const partCount = ((sqliteDb.prepare('SELECT count(*) as count FROM contract_participants WHERE contract_id = ?').get(contractRow.id) as any)?.count || 0)

        res.status(200).json({
          id: contractRow.id,
          number: contractRow.id,
          status: contractRow.status,
          type: contractRow.type,
          winnerConfig: contractRow.winner_count,
          starts_at: contractRow.starts_at,
          endsAt: contractRow.ends_at,
          remainingMs: contractRow.status === 'paused'
            ? (contractRow.remaining_ms !== null && contractRow.remaining_ms !== undefined ? contractRow.remaining_ms : Math.max(0, contractRow.ends_at - Date.now()))
            : Math.max(0, contractRow.ends_at - Date.now()),
          maxObjectives: contractRow.max_objectives,
          participants: partCount,
          rewards: JSON.parse(contractRow.reward_configuration || '[]'),
          partialRewardsEnabled: Boolean(contractRow.partial_rewards_enabled),
          partialRewardPerObjective: contractRow.partial_reward_per_objective,
          winnerStatus: contractRow.winner_status,
          declaredWinner: contractRow.declared_winner,
          objectives: objRows.map((co) => {
            const rawPatterns = (co.log_pattern || '').split('\n').map((l: string) => l.trim()).filter(Boolean)
            return {
              id: co.objective_order,
              objId: co.id,
              title: co.title,
              category: co.category,
              difficulty: co.difficulty,
              complexity: co.complexity,
              target: co.target_value,
              partialReward: co.partial_reward,
              bounty: co.bounty,
              agent_note: co.agent_note,
              metric: co.metric,
              log_pattern: co.log_pattern,
              log_patterns: rawPatterns.map((p: string, pIdx: number) => ({
                key: `pat_${co.id}_${pIdx + 1}`,
                template: p,
              })),
              current: 0,
            }
          }),
        })
        return true
      } else {
        res.status(404).json({ error: 'Contract not found' })
        return true
      }
    } catch (err) {
      console.error('Error getting contract by ID:', err)
      res.status(500).json({ error: 'Failed to fetch contract' })
      return true
    }
  }

  if (urlPath === '/api/admin/contract' && method === 'PUT') {
    try {
      const contractRow = sqliteDb.prepare('SELECT id FROM contracts ORDER BY id DESC LIMIT 1').get() as any
      const contractId = contractRow ? contractRow.id : 1847

      // 1. Update contract properties in SQLite
      if (body.status || body.type || body.winner_count !== undefined || body.max_objectives !== undefined || body.maxObjectives !== undefined || body.partial_rewards_enabled !== undefined || body.partial_reward_per_objective !== undefined) {
        sqliteDb.prepare(`
          UPDATE contracts SET
            status = COALESCE(?, status),
            type = COALESCE(?, type),
            winner_count = COALESCE(?, winner_count),
            max_objectives = COALESCE(?, max_objectives),
            partial_rewards_enabled = COALESCE(?, partial_rewards_enabled),
            partial_reward_per_objective = COALESCE(?, partial_reward_per_objective)
          WHERE id = ?
        `).run(
          body.status || null,
          body.type || null,
          body.winner_count || body.winnerConfig || null,
          body.max_objectives || body.maxObjectives || null,
          body.partial_rewards_enabled !== undefined ? (body.partial_rewards_enabled ? 1 : 0) : null,
          body.partial_reward_per_objective || null,
          contractId
        )
      }

      // 2. If objectives array is sent, sync into contract_objectives in SQLite
      if (Array.isArray(body.objectives)) {
        // Delete current contract_objectives for this contract and re-insert
        sqliteDb.prepare('DELETE FROM contract_objectives WHERE contract_id = ?').run(contractId)

        const insertCo = sqliteDb.prepare(`
          INSERT INTO contract_objectives (
            id, contract_id, objective_definition_id, objective_order, title, category, difficulty, complexity,
            target_value, partial_reward, bounty, agent_note, metric, verification, log_pattern
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        body.objectives.forEach((obj: any, idx: number) => {
          const coId = obj.objId || `co-${contractId}-${idx + 1}`
          const order = idx + 1
          const title = obj.title || obj.name || `Task #${order}`
          const category = obj.category || 'general'
          const diff = obj.difficulty || 'easy'
          const comp = obj.complexity || diff
          const target = obj.target || 1
          const bounty = obj.bounty ?? obj.partialReward ?? 500000
          const pattern = obj.log_pattern || (obj.log_patterns && obj.log_patterns[0]?.template) || ''
          const note = obj.agent_note || ''
          const metric = obj.metric || 'count'

          insertCo.run(
            coId,
            contractId,
            obj.definitionId || `def-${order}`,
            order,
            title,
            category,
            diff,
            comp,
            target,
            bounty,
            bounty,
            note,
            metric,
            'log',
            pattern
          )
        })
      }

      logAudit('Updated Contract Properties', 'contract', `#${contractId}`, 'Saved updated contract parameters and tasks to SQLite.')
    } catch (err) {
      console.error('Error updating SQLite contract:', err)
    }

    const contracts = db.get('contracts')
    if (contracts.length > 0) {
      contracts[0] = { ...contracts[0], ...body }
      db.set('contracts', [...contracts])
      res.status(200).json({ success: true, contract: contracts[0] })
      return true
    }
    res.status(200).json({ success: true })
    return true
  }

  // 4. Contract Creation (Section 4)
  if (urlPath === '/api/admin/contract/create' && method === 'POST') {
    const requestedStatus = body.status || 'draft'
    const newContract: Contract = {
      id: Number(body.number) || 1848,
      status: requestedStatus as any,
      type: body.type || 'standard',
      starts_at: body.starts_at || new Date().toISOString(),
      ends_at: body.ends_at || (Date.now() + 24 * 3600 * 1000),
      max_objectives: body.max_objectives || 10,
      winner_count: body.winnerConfig || '1 winner',
      created_by: 'Admin',
      created_at: new Date().toISOString(),
      reward_configuration: body.rewards || [{ place: '1st', reward: '$10,000,000 + 1× Xanax' }],
      partial_rewards_enabled: false,
      partial_reward_per_objective: 0,
      settings: {},
      generation_method: 'manual',
    }

    // Sync into SQLite
    try {
      sqliteDb.prepare(`
        INSERT OR REPLACE INTO contracts (
          id, status, type, starts_at, ends_at, max_objectives, winner_count, created_by,
          reward_configuration, partial_rewards_enabled, partial_reward_per_objective, generation_method, winner_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        newContract.id,
        newContract.status,
        newContract.type,
        newContract.starts_at,
        newContract.ends_at,
        newContract.max_objectives,
        newContract.winner_count,
        newContract.created_by,
        JSON.stringify(newContract.reward_configuration),
        0,
        0,
        newContract.generation_method,
        'Awaiting Final Verification'
      )
    } catch (e) {
      console.error('Error syncing new contract to SQLite:', e)
    }

    logAudit('Created Contract', 'contract', `#${newContract.id}`, `Created contract tagged as ${newContract.status.toUpperCase()}.`, 'success')
    res.status(201).json({ success: true, contract: newContract })
    return true
  }

  // 5. Contract Emergency Controls (Section 3)
  if (urlPath === '/api/admin/contract/controls' && method === 'POST') {
    const { action, contractId, data } = body
    const cId = contractId || (sqliteDb.prepare('SELECT id FROM contracts ORDER BY id DESC LIMIT 1').get() as any)?.id || 1848
    const targetContract = sqliteDb.prepare('SELECT * FROM contracts WHERE id = ?').get(cId) as any

    if (!targetContract) {
      res.status(404).json({ error: 'Contract not found' })
      return true
    }

    const now = Date.now()
    let newStatus = targetContract.status
    let newEndsAt = targetContract.ends_at
    let newRemainingMs = targetContract.remaining_ms !== null && targetContract.remaining_ms !== undefined ? targetContract.remaining_ms : Math.max(0, targetContract.ends_at - now)
    let declaredWinner = targetContract.declared_winner
    let winnerStatus = targetContract.winner_status
    let completedAt = targetContract.completed_at

    switch (action) {
      case 'start':
      case 'resume': {
        newStatus = 'active'
        // If contract was paused, compute new ends_at based on stored remaining_ms
        const msToRun = newRemainingMs > 0 ? newRemainingMs : 24 * 3600 * 1000
        newEndsAt = now + msToRun
        newRemainingMs = msToRun
        logAudit('Resumed Contract', 'contract', `#${cId}`, 'Contract status set to ACTIVE.', 'success')
        break
      }
      case 'pause': {
        newStatus = 'paused'
        // Freeze remaining time in database
        newRemainingMs = Math.max(0, targetContract.ends_at - now)
        logAudit('Paused Contract', 'contract', `#${cId}`, `Contract timer and tasks paused with ${Math.round(newRemainingMs / 60000)}m remaining.`, 'warning')
        break
      }
      case 'extend': {
        const extMinutes = Number(data?.minutes) || 60
        const extMs = extMinutes * 60 * 1000
        if (targetContract.status === 'paused') {
          newRemainingMs = (newRemainingMs || 0) + extMs
        } else {
          newEndsAt = (newEndsAt > now ? newEndsAt : now) + extMs
          newRemainingMs = Math.max(0, newEndsAt - now)
        }
        logAudit('Extended Deadline', 'contract', `#${cId}`, `Added +${extMinutes} minutes to duration.`, 'warning')
        break
      }
      case 'end':
      case 'declare_winner': {
        newStatus = 'completed'
        completedAt = new Date().toISOString()
        declaredWinner = data?.winnerName && data.winnerName.trim() !== '' ? data.winnerName.trim() : null
        winnerStatus = declaredWinner ? 'Verified Winner' : 'Completed (No Winner)'
        newRemainingMs = 0
        logAudit('Ended Contract', 'contract', `#${cId}`, `Ended contract. Winner: ${declaredWinner || 'None declared'}.`, 'success')
        break
      }
      case 'cancel': {
        newStatus = 'cancelled'
        completedAt = new Date().toISOString()
        newRemainingMs = 0
        logAudit('Cancelled Contract', 'contract', `#${cId}`, 'Contract cancelled by admin.', 'danger')
        break
      }
      case 'reset': {
        // Reset progress of contract across all users/participants
        sqliteDb.prepare(`
          UPDATE contract_participants
          SET progress = 0, partial_rewards_earned = 0, current_rank = 1, last_activity_at = 'Just now'
          WHERE contract_id = ?
        `).run(cId)

        sqliteDb.prepare(`
          UPDATE participant_objectives
          SET status = 'in_progress', current_value = 0, partial_reward_status = 'unearned', verified_at = NULL
          WHERE contract_id = ?
        `).run(cId)

        logAudit('Reset Contract Progress', 'contract', `#${cId}`, 'Reset all participant progress to 0.', 'danger')
        break
      }
      case 'invalidate': {
        newStatus = 'invalid'
        logAudit('Invalidated Contract', 'contract', `#${cId}`, `Voided: ${data?.reason || 'Override'}`, 'danger')
        break
      }
    }

    try {
      sqliteDb.prepare(`
        UPDATE contracts SET
          status = ?,
          ends_at = ?,
          remaining_ms = ?,
          winner_status = ?,
          declared_winner = ?,
          completed_at = COALESCE(?, completed_at)
        WHERE id = ?
      `).run(newStatus, newEndsAt, newRemainingMs, winnerStatus, declaredWinner, completedAt, cId)
    } catch (e) {
      console.error('Error syncing control action to SQLite:', e)
    }

    const updated = sqliteDb.prepare('SELECT * FROM contracts WHERE id = ?').get(cId) as any
    res.status(200).json({ success: true, contract: updated })
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
    try {
      const participants = sqliteDb.prepare('SELECT * FROM contract_participants ORDER BY current_rank ASC').all() as any[]
      const pObjs = sqliteDb.prepare('SELECT * FROM participant_objectives').all() as any[]

      const enriched = participants.map((p) => {
        const objectives = pObjs.filter((po) => po.participant_id === p.id)
        return {
          ...p,
          name: p.torn_username,
          tornId: p.torn_user_id,
          rank: p.current_rank,
          completedCount: p.progress,
          totalCount: p.total_objectives,
          lastActive: p.last_activity_at,
          objectivesProgress: objectives.map((po, idx) => ({
            id: po.contract_objective_id || idx + 1,
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
    } catch (err) {
      console.error('Error fetching participants from SQLite:', err)
    }
  }

  // 8. Rewards Management & Partial Awards (Section 11, 15)
  if (urlPath === '/api/admin/rewards' && method === 'GET') {
    try {
      const rewards = sqliteDb.prepare('SELECT * FROM reward_transactions ORDER BY issued_at DESC').all() as any[]
      res.status(200).json(rewards)
      return true
    } catch (e) {
      res.status(200).json([])
      return true
    }
  }

  if (urlPath === '/api/admin/rewards/action' && method === 'POST') {
    const { id, action } = body
    try {
      const target = sqliteDb.prepare('SELECT * FROM reward_transactions WHERE id = ?').get(id) as any
      if (target) {
        const nextStatus = action === 'cancel' ? 'CANCELLED' : 'DELIVERED'
        const deliveredAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const txId = `TX-${Date.now().toString().slice(-5)}-TN`
        sqliteDb.prepare(`
          UPDATE reward_transactions SET status = ?, delivered_at = ?, tx_id = ? WHERE id = ?
        `).run(nextStatus, deliveredAt, txId, id)
        logAudit(action === 'cancel' ? 'Cancelled Reward' : 'Issued Reward', 'reward', id, `Updated reward status to ${nextStatus}.`)
        res.status(200).json({ success: true, reward: { ...target, status: nextStatus, delivered_at: deliveredAt, tx_id: txId } })
        return true
      }
    } catch (e) {
      console.error('Error updating reward in SQLite:', e)
    }
  }

  // 9. Users Directory & Moderation (Section 18, 19)
  if (urlPath === '/api/admin/users' && method === 'GET') {
    try {
      const users = sqliteDb.prepare("SELECT * FROM users WHERE role = 'agent'").all() as any[]
      res.status(200).json(users)
      return true
    } catch (e) {
      res.status(200).json([])
      return true
    }
  }

  if (urlPath.startsWith('/api/admin/users/') && urlPath.endsWith('/status') && method === 'POST') {
    const userId = urlPath.replace('/api/admin/users/', '').replace('/status', '')
    const { status } = body
    try {
      sqliteDb.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId)
      logAudit(`User ${status.toUpperCase()}`, 'user', userId, `Updated user moderation state to ${status}.`, status === 'banned' ? 'danger' : status === 'suspended' ? 'warning' : 'success')
      const target = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId)
      res.status(200).json({ success: true, user: target })
      return true
    } catch (e) {
      console.error('Error updating user status in SQLite:', e)
    }
  }

  // 10. Suspicious Activity (Section 17)
  if (urlPath === '/api/admin/suspicious' && method === 'GET') {
    try {
      const events = sqliteDb.prepare('SELECT * FROM security_events ORDER BY created_at DESC').all() as any[]
      res.status(200).json(events)
      return true
    } catch (e) {
      res.status(200).json([])
      return true
    }
  }

  if (urlPath.startsWith('/api/admin/suspicious/') && method === 'POST') {
    const secId = urlPath.replace('/api/admin/suspicious/', '').replace('/action', '')
    const { action } = body
    try {
      const nextStatus = action === 'clear' ? 'cleared' : 'investigating'
      const resolvedAt = action === 'clear' ? new Date().toISOString() : null
      sqliteDb.prepare('UPDATE security_events SET status = ?, resolved_at = ? WHERE id = ?').run(nextStatus, resolvedAt, secId)
      logAudit(action === 'clear' ? 'Cleared Suspicion' : 'Investigating Anomaly', 'security', secId, `Updated flag state.`)
      const target = sqliteDb.prepare('SELECT * FROM security_events WHERE id = ?').get(secId)
      res.status(200).json({ success: true, event: target })
      return true
    } catch (e) {
      console.error('Error updating security event in SQLite:', e)
    }
  }

  // 11. Alerts & Issues (Section 16)
  if (urlPath === '/api/admin/alerts' && method === 'GET') {
    try {
      const alerts = sqliteDb.prepare('SELECT * FROM system_alerts ORDER BY timestamp DESC').all() as any[]
      res.status(200).json(alerts)
      return true
    } catch (e) {
      res.status(200).json([])
      return true
    }
  }

  if (urlPath.startsWith('/api/admin/alerts/') && urlPath.endsWith('/resolve') && method === 'POST') {
    const alertId = urlPath.replace('/api/admin/alerts/', '').replace('/resolve', '')
    try {
      sqliteDb.prepare('UPDATE system_alerts SET resolved = 1 WHERE id = ?').run(alertId)
      logAudit('Resolved Alert', 'alert', alertId, `Resolved issue ${alertId}.`)
      const target = sqliteDb.prepare('SELECT * FROM system_alerts WHERE id = ?').get(alertId)
      res.status(200).json({ success: true, alert: target })
      return true
    } catch (e) {
      console.error('Error resolving alert in SQLite:', e)
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

  // ============================================================================
  // ADMIN SPEC WORKFLOWS: PATTERN TESTER & TORN SYNC (§6.8, §7, §10)
  // ============================================================================

  // 13A. Pattern Tester Tool (§6.8)
  if (urlPath === '/api/admin/patterns/test' && method === 'POST') {
    const { patterns = [], metric = 'count', target = 1, samples = [] } = body
    const { compileLogPattern, testLogLine } = await import('./patterns.ts')

    const compiled: any[] = []
    const compileErrors: string[] = []

    for (const p of patterns) {
      try {
        compiled.push(compileLogPattern(p))
      } catch (err: any) {
        compileErrors.push(`Pattern "${p.key || p.template}": ${err.message}`)
      }
    }

    if (compileErrors.length > 0) {
      res.status(422).json({ error: 'Pattern compilation failed', details: compileErrors })
      return true
    }

    let progressTotal = 0
    const distinctSet = new Set<string>()
    const sampleResults = samples.map((line: string) => {
      const match = testLogLine(line, compiled, metric)
      if (match.matched) {
        if (metric === 'count') {
          progressTotal += 1
        } else if (metric === 'sum' && match.value !== undefined) {
          progressTotal += match.value
        } else if (metric === 'distinct' && match.distinctKey) {
          distinctSet.add(match.distinctKey)
          progressTotal = distinctSet.size
        }
      }
      return {
        sample: line,
        cleaned: match.cleanedText,
        matched: match.matched,
        patternKey: match.patternKey,
        captures: match.captures,
        value: match.value,
        distinctKey: match.distinctKey,
        failedCondition: match.failedCondition,
      }
    })

    res.status(200).json({
      success: true,
      results: sampleResults,
      totalMatches: sampleResults.filter((s: any) => s.matched).length,
      progressTotal,
      targetReached: progressTotal >= target,
    })
    return true
  }

  // 13B. Live Torn Log Ingestion & Sync Pipeline (§7)
  if (urlPath === '/api/admin/torn/sync-user' && method === 'POST') {
    const { apiKey, userId = 'usr-4', contractId = 1847, limit = 20, cat } = body
    const { tornClient } = await import('./torn.ts')

    const response = await tornClient.getUserLogs({
      key: apiKey,
      limit,
      cat,
      comment: 'TheContractAgentSync',
    })

    if (response.error) {
      res.status(400).json({
        success: false,
        error: response.error,
        message: `Torn API returned error code ${response.error.code}: ${response.error.error}`,
      })
      return true
    }

    // Evaluate normalized logs against active contract objectives
    const evaluation = contractEngine.evaluateLogsForParticipant({
      userId,
      contractId,
      logs: response.logs,
    })

    logAudit(
      'Torn Logs Synced',
      'torn_sync',
      `User ${userId}`,
      `Fetched ${response.logs.length} logs. ${evaluation.matchesFound} pattern matches found. ${evaluation.objectivesCompleted.length} objectives verified.`
    )

    res.status(200).json({
      success: true,
      logsFetched: response.logs.length,
      evaluation,
      sampleLogs: response.logs.slice(0, 5),
    })
    return true
  }

  // 13C. Admin Manual Override on Agent Task (§10.2)
  if (urlPath === '/api/admin/participants/task-override' && method === 'POST') {
    const { userId, contractId = 1847, contractObjectiveId, action, reason } = body

    if (!reason) {
      res.status(400).json({ error: 'Reason is mandatory for manual overrides per spec §10.2' })
      return true
    }

    try {
      const target = sqliteDb.prepare(`
        SELECT * FROM participant_objectives
        WHERE contract_id = ? AND contract_objective_id = ?
      `).get(contractId, contractObjectiveId) as any

      if (!target) {
        res.status(404).json({ error: 'Participant objective not found in SQLite database' })
        return true
      }

      if (action === 'mark_completed') {
        sqliteDb.prepare(`
          UPDATE participant_objectives
          SET status = 'verified', current_value = target_value, verified_at = datetime('now'), partial_reward_status = 'credited'
          WHERE id = ?
        `).run(target.id)
        logAudit('Manual Force Complete', 'override', String(contractObjectiveId), `Admin marked objective complete. Reason: ${reason}`, 'warning')
      } else if (action === 'mark_uncompleted') {
        sqliteDb.prepare(`
          UPDATE participant_objectives
          SET status = 'in_progress', current_value = 0, verified_at = NULL, partial_reward_status = 'unearned'
          WHERE id = ?
        `).run(target.id)
        logAudit('Manual Force Incomplete', 'override', String(contractObjectiveId), `Admin marked objective incomplete. Reason: ${reason}`, 'danger')
      } else if (action === 'reset') {
        sqliteDb.prepare(`
          UPDATE participant_objectives
          SET status = 'pending', current_value = 0, verified_at = NULL, partial_reward_status = 'unearned'
          WHERE id = ?
        `).run(target.id)
        logAudit('Manual Reset', 'override', String(contractObjectiveId), `Admin reset objective progress. Reason: ${reason}`, 'danger')
      } else if (action === 'delete') {
        sqliteDb.prepare('DELETE FROM participant_objectives WHERE id = ?').run(target.id)
        logAudit('Manual Delete Task', 'override', String(contractObjectiveId), `Admin deleted task from participant. Reason: ${reason}`, 'danger')
      }

      // Recompute participant progress in SQLite
      const verifiedCount = (sqliteDb.prepare(`
        SELECT count(*) as count FROM participant_objectives
        WHERE participant_id = ? AND status = 'verified'
      `).get(target.participant_id) as any)?.count || 0

      const totalRewards = (sqliteDb.prepare(`
        SELECT sum(partial_reward) as total FROM participant_objectives
        WHERE participant_id = ? AND status = 'verified'
      `).get(target.participant_id) as any)?.total || 0

      sqliteDb.prepare(`
        UPDATE contract_participants
        SET progress = ?, partial_rewards_earned = ?
        WHERE id = ?
      `).run(verifiedCount, totalRewards, target.participant_id)

      res.status(200).json({ success: true, verifiedCount, totalRewards })
      return true
    } catch (err) {
      console.error('Error running task override in SQLite:', err)
      res.status(500).json({ error: String(err) })
      return true
    }
  }

  // 13D. Disburse Extra Bounty to Individual Agent
  if (urlPath === '/api/admin/participants/extra-bounty' && method === 'POST') {
    const { participantId, amount, reason } = body

    try {
      const participant = sqliteDb.prepare('SELECT * FROM contract_participants WHERE id = ?').get(participantId) as any
      if (participant) {
        const newEarned = (participant.partial_rewards_earned || 0) + (amount || 250000)
        sqliteDb.prepare('UPDATE contract_participants SET partial_rewards_earned = ? WHERE id = ?').run(newEarned, participant.id)

        const txId = `TX-EXB-${Math.floor(100000 + Math.random() * 900000)}`
        sqliteDb.prepare(`
          INSERT INTO reward_transactions (id, user_id, torn_user_id, torn_username, contract_id, reward_type, description, amount_cash, status, tx_id, issued_at)
          VALUES (?, ?, ?, ?, ?, 'threshold_bonus', ?, ?, 'DELIVERED', ?, 'Just now')
        `).run(
          `rw-extra-${Date.now()}`,
          participant.user_id,
          participant.torn_user_id,
          participant.torn_username,
          participant.contract_id,
          `Extra Overseer Bounty: ${reason || 'Performance Bonus'}`,
          amount || 250000,
          txId
        )

        logAudit('Awarded Extra Bounty', 'reward', participant.torn_username, `Granted +$${((amount || 250000) / 1000).toFixed(0)}k. Reason: ${reason}`, 'success')
        res.status(200).json({ success: true, newEarned, txId })
        return true
      }
    } catch (err) {
      console.error('Error in extra-bounty:', err)
    }
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

    try {
      const regCount = (sqliteDb.prepare('SELECT count(*) as count FROM users').get() as any)?.count || 0
      const actCount = (sqliteDb.prepare("SELECT count(*) as count FROM contract_participants WHERE status = 'active'").get() as any)?.count || 0
      const compCount = (sqliteDb.prepare("SELECT count(*) as count FROM contracts WHERE status = 'completed'").get() as any)?.count || 0
      const totalCash = (sqliteDb.prepare("SELECT sum(amount_cash) as total FROM reward_transactions WHERE status = 'DELIVERED'").get() as any)?.total || 0

      const annRows = sqliteDb.prepare('SELECT * FROM announcements WHERE is_active = 1 ORDER BY published_at DESC').all() as any[]
      const partRows = sqliteDb.prepare("SELECT * FROM contract_participants WHERE status = 'active' ORDER BY progress DESC LIMIT 10").all() as any[]

      const liveActivity = partRows.map((p, idx) => ({
        id: `act-${p.id}`,
        kind: p.progress === 10 ? 'win' : p.progress > 5 ? 'progress' : 'objective',
        who: p.torn_username,
        text: p.progress === 10 ? `won Contract #${p.contract_id}` : `completed ${p.progress}/10 objectives ($${((p.partial_rewards_earned || 0) / 1000).toFixed(0)}k earned)`,
        ago: `${(idx + 1) * 2}m ago`,
      }))

      res.status(200).json({
        globalStats: {
          registered: regCount,
          active: actCount,
          completed: compCount,
          rewardsPaid: formatCash(totalCash),
          source: 'sqlite_local',
        },
        activity: liveActivity,
        announcements: annRows.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.message,
          ago: a.published_at,
        })),
      })
      return true
    } catch (err) {
      console.error('Error fetching dashboard stats from SQLite:', err)
    }
  }

  // 16. Active Contract & User Progress Endpoint
  if (urlPath === '/api/contracts/active' && method === 'GET') {
    try {
      // Find the currently active or paused contract, or next scheduled contract. Draft contracts must NOT show on user end!
      let activeContract = sqliteDb.prepare("SELECT * FROM contracts WHERE status IN ('active', 'paused') ORDER BY id DESC LIMIT 1").get() as any
      if (!activeContract) {
        activeContract = sqliteDb.prepare("SELECT * FROM contracts WHERE status = 'scheduled' ORDER BY id DESC LIMIT 1").get() as any
      }
      if (!activeContract) {
        // Check latest completed or cancelled if nothing active
        activeContract = sqliteDb.prepare("SELECT * FROM contracts WHERE status IN ('completed', 'cancelled') ORDER BY id DESC LIMIT 1").get() as any
      }

      if (activeContract) {
        const contractObjs = sqliteDb.prepare('SELECT * FROM contract_objectives WHERE contract_id = ? ORDER BY objective_order ASC').all(activeContract.id) as any[]
        const participants = sqliteDb.prepare('SELECT * FROM contract_participants WHERE contract_id = ? ORDER BY progress DESC').all(activeContract.id) as any[]

        // Current player (Anurag / usr-4 by default)
        const currentUserId = req.query.userId || 'usr-4'
        const participant = participants.find((p) => p.user_id === currentUserId) || participants[0]
        const pObjs = participant
          ? (sqliteDb.prepare('SELECT * FROM participant_objectives WHERE participant_id = ?').all(participant.id) as any[])
          : []

        const standings = participants.map((p, idx) => ({
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
            status: activeContract.status,
            type: activeContract.type,
            startsAt: activeContract.starts_at,
            endsAt: activeContract.ends_at,
            remainingMs: activeContract.status === 'paused'
              ? (activeContract.remaining_ms !== null && activeContract.remaining_ms !== undefined ? activeContract.remaining_ms : Math.max(0, activeContract.ends_at - Date.now()))
              : Math.max(0, activeContract.ends_at - Date.now()),
            participants: participants.length,
            rewards: JSON.parse(activeContract.reward_configuration || '[]'),
            winnerStatus: activeContract.winner_status,
            declaredWinner: activeContract.declared_winner,
            partialRewardsEnabled: false,
            partialRewardPerObjective: 0,
            objectives: contractObjs.map((co, idx) => {
              const po = pObjs.find((item) => item.contract_objective_id === co.id)
              return {
                id: idx + 1,
                objId: co.id,
                title: co.title,
                category: co.category,
                difficulty: co.difficulty,
                complexity: co.complexity,
                target: co.target_value,
                current: po ? po.current_value : 0,
                partialReward: co.partial_reward,
                bounty: co.bounty,
                agent_note: co.agent_note,
                status: po ? po.status : 'in_progress',
                log_pattern: co.log_pattern,
                log_patterns: (co.log_pattern || '')
                  .split('\n')
                  .map((l: string) => l.trim())
                  .filter(Boolean)
                  .map((p: string, pIdx: number) => ({
                    key: `pat_${co.id}_${pIdx + 1}`,
                    template: p,
                  })),
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
    } catch (err) {
      console.error('Error in /api/contracts/active:', err)
    }
  }

  // 17. Verify Objective & Award Partial Bounty Endpoint
  if (urlPath === '/api/player/verify-objective' && method === 'POST') {
    const { userId = 'usr-4', contractId = 1847, objectiveIndex = 0 } = body

    try {
      const participant = sqliteDb.prepare('SELECT * FROM contract_participants WHERE contract_id = ? AND user_id = ?').get(contractId, userId) as any
      const contractObjs = sqliteDb.prepare('SELECT * FROM contract_objectives WHERE contract_id = ? ORDER BY objective_order ASC').all(contractId) as any[]
      const targetObj = contractObjs[objectiveIndex] || contractObjs[0]

      if (!participant) {
        // Create participant on the fly
        const user = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
        const pId = `part-${contractId}-${userId}`
        sqliteDb.prepare(`
          INSERT OR IGNORE INTO contract_participants (
            id, contract_id, user_id, torn_user_id, torn_username, status, current_rank, progress, total_objectives, partial_rewards_earned, last_activity_at
          ) VALUES (?, ?, ?, ?, ?, 'active', 1, 0, ?, 0, 'Just now')
        `).run(pId, contractId, userId, user?.torn_user_id || 2849102, user?.torn_username || 'Anurag', contractObjs.length)
      }

      const activeParticipant = sqliteDb.prepare('SELECT * FROM contract_participants WHERE contract_id = ? AND user_id = ?').get(contractId, userId) as any

      if (activeParticipant && targetObj) {
        let targetPo = sqliteDb.prepare('SELECT * FROM participant_objectives WHERE participant_id = ? AND contract_objective_id = ?').get(activeParticipant.id, targetObj.id) as any

        if (!targetPo) {
          const poId = `po-${activeParticipant.id}-${targetObj.id}`
          sqliteDb.prepare(`
            INSERT INTO participant_objectives (
              id, participant_id, contract_id, contract_objective_id, title, category, difficulty,
              status, current_value, target_value, partial_reward, partial_reward_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', 0, ?, ?, 'unearned')
          `).run(poId, activeParticipant.id, contractId, targetObj.id, targetObj.title, targetObj.category, targetObj.difficulty, targetObj.target_value, targetObj.partial_reward || 500000)
          targetPo = sqliteDb.prepare('SELECT * FROM participant_objectives WHERE id = ?').get(poId) as any
        }

        if (targetPo && targetPo.status !== 'verified') {
          // Update participant objective in SQLite
          sqliteDb.prepare(`
            UPDATE participant_objectives
            SET status = 'verified', current_value = target_value, partial_reward_status = 'credited', verified_at = datetime('now')
            WHERE id = ?
          `).run(targetPo.id)

          const newProgress = Math.min(10, activeParticipant.progress + 1)
          const newEarned = (activeParticipant.partial_rewards_earned || 0) + (targetObj.partial_reward || 500000)

          // Update participant progress in SQLite
          sqliteDb.prepare(`
            UPDATE contract_participants
            SET progress = ?, partial_rewards_earned = ?, last_activity_at = 'Just now'
            WHERE id = ?
          `).run(newProgress, newEarned, activeParticipant.id)

          // Insert Reward in SQLite
          const txId = `TX-PRT-${Math.floor(100000 + Math.random() * 900000)}`
          sqliteDb.prepare(`
            INSERT INTO reward_transactions (id, user_id, torn_user_id, torn_username, contract_id, reward_type, description, amount_cash, status, tx_id, issued_at)
            VALUES (?, ?, ?, ?, ?, 'partial_objective', ?, ?, 'DELIVERED', ?, 'Just now')
          `).run(
            `rw-${Date.now()}`,
            activeParticipant.user_id,
            activeParticipant.torn_user_id,
            activeParticipant.torn_username,
            contractId,
            `Partial Bounty: Objective "${targetObj.title}" verified`,
            targetObj.partial_reward || 500000,
            txId
          )

          logAudit('Objective Verified', 'objective', targetObj.id, `Player ${activeParticipant.torn_username} verified "${targetObj.title}" ($${((targetObj.partial_reward || 500000)/1000).toFixed(0)}k credited).`, 'success')

          res.status(200).json({
            success: true,
            progress: newProgress,
            partialRewardsEarned: newEarned,
            reward: {
              tx_id: txId,
              amount: targetObj.partial_reward || 500000,
            },
          })
          return true
        }
      }
    } catch (err) {
      console.error('Error verifying objective in SQLite:', err)
    }

    res.status(200).json({ success: true, message: 'Objective already verified or not found' })
    return true
  }

  // 18. Archive History Endpoint
  if (urlPath === '/api/contracts/history' && method === 'GET') {
    try {
      const completedContracts = sqliteDb.prepare("SELECT * FROM contracts WHERE status = 'completed' ORDER BY id DESC").all() as any[]
      const history = completedContracts.map((c) => {
        const objectives = sqliteDb.prepare('SELECT * FROM contract_objectives WHERE contract_id = ? ORDER BY objective_order ASC').all(c.id) as any[]
        const partCount = (sqliteDb.prepare('SELECT count(*) as count FROM contract_participants WHERE contract_id = ?').get(c.id) as any)?.count || 0
        return {
          number: c.id,
          date: c.starts_at || 'Recently',
          type: c.type,
          winner: c.declared_winner || 'None',
          minutes: 120,
          participants: partCount,
          objectives: objectives.map((co, idx) => ({
            id: idx + 1,
            title: co.title,
            category: co.category,
            difficulty: co.difficulty,
            target: co.target_value,
            current: co.target_value,
          })),
        }
      })
      res.status(200).json(history)
      return true
    } catch (e) {
      console.error('Error fetching archive history from SQLite:', e)
      res.status(200).json([])
      return true
    }
  }

  // 19. Leaderboard & Champions Endpoint
  if (urlPath === '/api/leaderboard' && method === 'GET') {
    try {
      const activeContract = sqliteDb.prepare("SELECT * FROM contracts WHERE status IN ('active', 'scheduled') ORDER BY id DESC LIMIT 1").get() as any
      const participants = activeContract
        ? (sqliteDb.prepare('SELECT * FROM contract_participants WHERE contract_id = ? ORDER BY progress DESC, current_rank ASC').all(activeContract.id) as any[])
        : []

      const standings = participants.map((p, idx) => ({
        rank: idx + 1,
        name: p.torn_username,
        completed: p.progress,
        partialEarned: p.partial_rewards_earned || 0,
        minutes: 180 + idx * 17,
        isYou: p.torn_username === 'Anurag',
      }))

      // Dynamically calculate champions from completed contracts in SQLite
      const championRows = sqliteDb.prepare(`
        SELECT 
          u.torn_username as name,
          COUNT(CASE WHEN c.declared_winner = u.torn_username THEN 1 END) as wins,
          COUNT(CASE WHEN cp.current_rank <= 3 AND cp.status = 'completed' THEN 1 END) as top3,
          COUNT(CASE WHEN cp.status = 'completed' THEN 1 END) as completed,
          110 as fastestMin
        FROM users u
        LEFT JOIN contract_participants cp ON u.id = cp.user_id
        LEFT JOIN contracts c ON cp.contract_id = c.id
        WHERE u.role = 'agent'
        GROUP BY u.id
        HAVING completed > 0 OR wins > 0
        ORDER BY wins DESC, top3 DESC, completed DESC
      `).all() as any[]

      res.status(200).json({
        contractNumber: activeContract?.id || null,
        standings,
        champions: championRows,
      })
      return true
    } catch (e) {
      console.error('Error fetching leaderboard from SQLite:', e)
      res.status(200).json({ contractNumber: null, standings: [], champions: [] })
      return true
    }
  }

  // 20. Player Profile & Statistics Endpoint
  if (urlPath === '/api/player/profile' && method === 'GET') {
    const currentUserId = req.query.userId || 'usr-4'
    let user = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId) as any
    if (!user) {
      user = sqliteDb.prepare("SELECT * FROM users WHERE torn_username = 'Anurag' LIMIT 1").get() as any
    }
    if (!user) {
      user = { id: 'usr-4', torn_user_id: 2849102, torn_username: 'Anurag', torn_level: 48, status: 'active', role: 'agent' }
    }

    const rewards = (sqliteDb.prepare('SELECT * FROM reward_transactions WHERE user_id = ? ORDER BY issued_at DESC').all(user.id) as any[]) || []
    const partialTotal = rewards
      .filter((r) => r.reward_type === 'partial_objective' && r.status === 'DELIVERED')
      .reduce((sum, r) => sum + (Number(r.amount_cash) || 0), 0)

    const completedContracts = (sqliteDb.prepare("SELECT count(*) as c FROM contract_participants WHERE user_id = ? AND status = 'completed'").get(user.id) as any)?.c || 0
    const enteredContracts = (sqliteDb.prepare('SELECT count(*) as c FROM contract_participants WHERE user_id = ?').get(user.id) as any)?.c || 0
    const verifiedObjs = (sqliteDb.prepare("SELECT count(*) as c FROM participant_objectives po JOIN contract_participants cp ON po.participant_id = cp.id WHERE cp.user_id = ? AND po.status = 'verified'").get(user.id) as any)?.c || 0

    res.status(200).json({
      user,
      stats: {
        started: enteredContracts,
        completed: completedContracts,
        wins: 0,
        top3: 0,
        objectives: verifiedObjs,
        totalPartialBounties: partialTotal,
        completionRate: enteredContracts > 0 ? `${((completedContracts / enteredContracts) * 100).toFixed(1)}%` : '0%',
        avgTime: '—',
        fastest: '—',
        bestFinish: '—',
      },
      rewards,
    })
    return true
  }

  // Unhandled API Route
  res.status(404).json({ error: `Not found: ${method} ${urlPath}` })
  return true
}
