import {
  db,
  type Contract,
  type ContractObjective,
  type ContractParticipant,
  type ObjectiveDefinition,
  type ParticipantObjective,
  type PlayerEvent,
  type RewardTransaction,
} from './db.ts'
import {
  compileLogPattern,
  testLogLine,
  stripPrefix,
  type CompiledPattern,
  type StoredLogPattern,
} from './patterns.ts'
import { type NormalizedLogEntry } from './torn.ts'
import { sqliteDb } from './sqlite.ts'

export class ContractEngine {
  /**
   * Balanced RNG Generator (4 Easy + 3 Medium + 2 Hard + 1 Extreme)
   */
  public generateBalancedObjectives(contractId: number): ContractObjective[] {
    const pool = db.get('objective_definitions').filter((d) => d.is_active && d.eligible_for_rng)

    const easies = pool.filter((o) => o.difficulty === 'easy').sort(() => 0.5 - Math.random())
    const mediums = pool.filter((o) => o.difficulty === 'medium').sort(() => 0.5 - Math.random())
    const hards = pool.filter((o) => o.difficulty === 'hard').sort(() => 0.5 - Math.random())
    const extremes = pool.filter((o) => o.difficulty === 'extreme').sort(() => 0.5 - Math.random())

    const chosen: ObjectiveDefinition[] = [
      ...easies.slice(0, 4),
      ...mediums.slice(0, 3),
      ...hards.slice(0, 2),
      ...extremes.slice(0, 1),
    ]

    const newContractObjectives: ContractObjective[] = chosen.map((def, idx) => ({
      id: `co-${contractId}-${idx + 1}-${Date.now().toString().slice(-4)}`,
      contract_id: contractId,
      objective_definition_id: def.id,
      objective_order: idx + 1,
      title: def.name,
      name: def.name,
      category: def.category,
      difficulty: def.difficulty,
      complexity: def.complexity || def.difficulty,
      target_value: def.default_target,
      partial_reward: def.default_partial_reward || 500000,
      bounty: def.bounty || def.default_partial_reward || 500000,
      agent_note: def.agent_note || '',
      verification: def.verification || 'log',
      metric: def.metric || 'count',
      log_patterns: def.log_patterns || [],
      verification_status: 'active',
      version: 1,
      created_at: new Date().toISOString(),
    }))

    // Save to database
    const allContractObjs = db.get('contract_objectives').filter((co) => co.contract_id !== contractId)
    db.set('contract_objectives', [...allContractObjs, ...newContractObjectives])

    return newContractObjectives
  }

  /**
   * Evaluates a batch of normalized logs against active objectives for a participant.
   * Derives progress from log matches per §8.1 of specification.
   */
  public evaluateLogsForParticipant(params: {
    userId: string
    contractId: number
    logs: (NormalizedLogEntry | { rawText: string; occurredAt?: string })[]
    objectiveId?: string | number
    objectiveIndex?: number
  }): { matchesFound: number; objectivesCompleted: string[]; bountiesAwarded: number } {
    const { userId, contractId, logs, objectiveId, objectiveIndex } = params
    const contractObjectives = db.get('contract_objectives').filter((co) => co.contract_id === contractId && co.verification_status === 'active')
    const partObjectives = db.get('participant_objectives')
    const participants = db.get('contract_participants')
    let participant = participants.find((p) => p.contract_id === contractId && (p.user_id === userId || p.id === userId))

    // Fallback: Check SQLite for participant
    if (!participant) {
      try {
        let sqlitePart = sqliteDb.prepare('SELECT * FROM contract_participants WHERE contract_id = ? AND (user_id = ? OR id = ?)').get(contractId, userId, userId) as any
        if (!sqlitePart) {
          sqlitePart = sqliteDb.prepare('SELECT * FROM contract_participants WHERE contract_id = ? ORDER BY last_activity_at DESC LIMIT 1').get(contractId) as any
        }
        if (sqlitePart) {
          participant = {
            id: sqlitePart.id,
            contract_id: sqlitePart.contract_id,
            user_id: sqlitePart.user_id,
            torn_user_id: sqlitePart.torn_user_id,
            torn_username: sqlitePart.torn_username,
            status: sqlitePart.status || 'active',
            current_rank: sqlitePart.current_rank || 1,
            progress: sqlitePart.progress || 0,
            total_objectives: sqlitePart.total_objectives || 10,
            partial_rewards_earned: sqlitePart.partial_rewards_earned || 0,
            started_at: sqlitePart.started_at || new Date().toISOString(),
            last_activity_at: sqlitePart.last_activity_at || 'Just now',
          }
          participants.push(participant)
        }
      } catch {}
    }

    if (!participant) {
      // Auto-create participant for the active user if still missing
      try {
        const userRow = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
        const pId = `part-${contractId}-${userId}`
        participant = {
          id: pId,
          contract_id: contractId,
          user_id: userId,
          torn_user_id: userRow?.torn_user_id || 2849102,
          torn_username: userRow?.torn_username || 'Agent',
          status: 'active',
          current_rank: 1,
          progress: 0,
          total_objectives: 10,
          partial_rewards_earned: 0,
          started_at: new Date().toISOString(),
          last_activity_at: 'Just now',
        }
        participants.push(participant)
        sqliteDb.prepare(`
          INSERT OR IGNORE INTO contract_participants (
            id, contract_id, user_id, torn_user_id, torn_username, status, current_rank, progress, total_objectives, partial_rewards_earned, last_activity_at
          ) VALUES (?, ?, ?, ?, ?, 'active', 1, 0, 10, 0, 'Just now')
        `).run(pId, contractId, userId, participant.torn_user_id, participant.torn_username)
      } catch {}
    }

    if (!participant) {
      return { matchesFound: 0, objectivesCompleted: [], bountiesAwarded: 0 }
    }

    let matchesFound = 0
    let bountiesAwarded = 0
    const completedTitles: string[] = []

    // Retrieve active contract objectives from SQLite if present
    let rawObjs = contractObjectives
    try {
      const sqliteContractObjs = sqliteDb.prepare('SELECT * FROM contract_objectives WHERE contract_id = ? ORDER BY objective_order ASC').all(contractId) as any[]
      if (sqliteContractObjs && sqliteContractObjs.length > 0) {
        rawObjs = sqliteContractObjs.map((co) => ({
          ...co,
          target_value: co.target_value,
          metric: co.metric || 'count',
          log_patterns: (co.log_pattern || '')
            .split('\n')
            .map((l: string) => l.trim())
            .filter(Boolean)
            .map((t: string, pIdx: number) => ({ key: `pat_${co.id}_${pIdx + 1}`, template: t })),
        }))
      }
    } catch {}

    // When a specific task refresh is triggered, filter strictly to ONLY that objective
    const hasObjId = objectiveId !== undefined && objectiveId !== null && objectiveId !== ''
    const hasObjIdx = objectiveIndex !== undefined && objectiveIndex !== null && typeof objectiveIndex === 'number' && objectiveIndex >= 0

    if (hasObjId || hasObjIdx) {
      let filtered: any[] = []
      if (hasObjId) {
        const targetStr = String(objectiveId).trim().toLowerCase()
        const targetNum = parseInt(targetStr, 10)
        filtered = rawObjs.filter((co) => {
          if (String(co.id).toLowerCase() === targetStr) return true
          if (!isNaN(targetNum) && Number(co.objective_order) === targetNum) return true
          if (co.title && co.title.toLowerCase() === targetStr) return true
          if (co.objId && String(co.objId).toLowerCase() === targetStr) return true
          return false
        })
      }
      if (filtered.length === 0 && hasObjIdx) {
        const idx = objectiveIndex as number
        if (rawObjs[idx]) {
          filtered = [rawObjs[idx]]
        } else {
          const matchOrder = rawObjs.find((co) => Number(co.objective_order) === idx + 1)
          if (matchOrder) filtered = [matchOrder]
        }
      }
      if (filtered.length > 0) {
        rawObjs = filtered
      }
    }

    for (const co of rawObjs) {
      let patternsList: StoredLogPattern[] = co.log_patterns && co.log_patterns.length > 0
        ? [...co.log_patterns]
        : (co.log_pattern ? (co.log_pattern as string).split('\n').map((l, pIdx) => ({ key: `pat_${co.id}_${pIdx + 1}`, template: l.trim() })).filter(p => p.template) : [])

      // Fallback: Check active contract or definitions in DB if pattern is still empty
      if (patternsList.length === 0) {
        const activeC = db.get('contracts').find((c) => c.id === contractId) || db.get('contracts')[0]
        const cObj = activeC?.objectives?.find((o: any) => o.id === co.id || (o.title && co.title && o.title.trim().toLowerCase() === co.title.trim().toLowerCase()))
        if (cObj?.log_pattern) {
          patternsList.push({ key: `pat_${co.id}_fallback`, template: cObj.log_pattern })
        } else if (cObj?.log_patterns && cObj.log_patterns.length > 0) {
          patternsList.push(...cObj.log_patterns)
        } else {
          const def = db.get('objective_definitions').find((d) => d.name.trim().toLowerCase() === (co.title || co.name || '').trim().toLowerCase())
          if (def?.log_patterns && def.log_patterns.length > 0) {
            patternsList.push(...def.log_patterns)
          }
        }
      }

      // Skip manual verification objectives or empty patterns
      if (co.verification === 'manual' || patternsList.length === 0) {
        continue
      }

      // Find participant's progress on this objective
      let po = partObjectives.find((item) => item.participant_id === participant.id && item.contract_objective_id === co.id)
      
      // Also check SQLite for existing state
      if (!po) {
        try {
          const sqlitePo = sqliteDb.prepare('SELECT * FROM participant_objectives WHERE participant_id = ? AND contract_objective_id = ?').get(participant.id, co.id) as any
          if (sqlitePo) {
            po = {
              id: sqlitePo.id,
              participant_id: sqlitePo.participant_id,
              contract_id: contractId,
              contract_objective_id: co.id,
              title: sqlitePo.title || co.title,
              category: sqlitePo.category || co.category,
              difficulty: sqlitePo.difficulty || co.difficulty,
              status: sqlitePo.status,
              current_value: sqlitePo.current_value || 0,
              target_value: sqlitePo.target_value || co.target_value,
              partial_reward: sqlitePo.partial_reward || co.partial_reward || 500000,
              partial_reward_status: sqlitePo.partial_reward_status || 'unearned',
              started_at: participant.started_at,
              verification_attempts: 0,
            }
            partObjectives.push(po)
          }
        } catch {}
      }

      if (!po) {
        po = {
          id: `po-${participant.id}-${co.id}`,
          participant_id: participant.id,
          contract_id: contractId,
          contract_objective_id: co.id,
          title: co.title || co.name || 'Objective',
          category: co.category,
          difficulty: co.difficulty,
          status: 'in_progress',
          current_value: 0,
          target_value: co.target_value,
          partial_reward: co.partial_reward || co.bounty || 500000,
          partial_reward_status: 'unearned',
          started_at: participant.started_at,
          verification_attempts: 0,
        }
        partObjectives.push(po)
      }

      if (po.status === 'verified') {
        continue // Already verified
      }

      // Compile patterns
      const compiled: CompiledPattern[] = []
      for (const pat of patternsList) {
        try {
          compiled.push(compileLogPattern(pat))
        } catch (e) {
          console.warn(`Failed to compile pattern ${pat.key}:`, e)
        }
      }

      const metric = co.metric || 'count'
      const distinctSet = new Set<string>()
      let batchValue = 0

      for (const log of logs) {
        const res = testLogLine(log.rawText, compiled, metric)
        if (res.matched) {
          matchesFound++
          if (metric === 'count') {
            batchValue += 1
          } else if (metric === 'sum' && res.value !== undefined) {
            batchValue += res.value
          } else if (metric === 'distinct' && res.distinctKey) {
            distinctSet.add(res.distinctKey)
          }
        }
      }

      if (metric === 'distinct') {
        po.current_value = Math.max(po.current_value || 0, distinctSet.size)
      } else {
        po.current_value = Math.max(po.current_value || 0, batchValue)
      }

      // Check if target reached
      if (po.current_value >= po.target_value && po.status !== 'verified') {
        po.status = 'verified'
        po.verified_at = new Date().toISOString()
        po.completed_at = new Date().toISOString()
        completedTitles.push(po.title)

        // Award bounty
        const bountyVal = co.partial_reward || co.bounty || 500000
        if (bountyVal > 0 && po.partial_reward_status !== 'credited') {
          po.partial_reward_status = 'credited'
          bountiesAwarded += bountyVal

          const rewardTx: RewardTransaction = {
            id: `rw-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            user_id: userId,
            torn_user_id: participant.torn_user_id,
            torn_username: participant.torn_username,
            contract_id: contractId,
            reward_type: 'partial_objective',
            description: `Log-verified Bounty: "${po.title}"`,
            amount_cash: bountyVal,
            status: 'DELIVERED',
            issued_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            delivered_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            tx_id: `TX-LOG-${Math.floor(10000 + Math.random() * 90000)}`,
          }
          db.set('reward_transactions', [rewardTx, ...db.get('reward_transactions')])

          // Also insert into SQLite reward_transactions
          try {
            sqliteDb.prepare(`
              INSERT INTO reward_transactions (id, user_id, torn_user_id, torn_username, contract_id, reward_type, description, amount_cash, status, tx_id, issued_at)
              VALUES (?, ?, ?, ?, ?, 'partial_objective', ?, ?, 'DELIVERED', ?, 'Just now')
            `).run(
              rewardTx.id,
              userId,
              participant.torn_user_id,
              participant.torn_username,
              contractId,
              `Log-verified Bounty: "${po.title}"`,
              bountyVal,
              rewardTx.tx_id
            )
          } catch {}
        }
      }

      // Sync participant objective state into SQLite
      try {
        sqliteDb.prepare(`
          INSERT INTO participant_objectives (
            id, participant_id, contract_id, contract_objective_id, title, category, difficulty,
            status, current_value, target_value, partial_reward, partial_reward_status, verified_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            current_value = excluded.current_value,
            partial_reward_status = excluded.partial_reward_status,
            verified_at = COALESCE(excluded.verified_at, participant_objectives.verified_at)
        `).run(
          po.id,
          po.participant_id,
          contractId,
          co.id,
          po.title,
          co.category,
          co.difficulty,
          po.status,
          po.current_value,
          po.target_value,
          po.partial_reward || 500000,
          po.partial_reward_status,
          po.verified_at || null
        )
      } catch (err) {
        console.error('Error syncing participant_objective to SQLite:', err)
      }
    }

    db.set('participant_objectives', [...partObjectives])
    this.recalculateParticipantProgress(userId, contractId)

    // Sync updated participant progress and rank to SQLite
    try {
      const updatedPart = db.get('contract_participants').find((p) => p.contract_id === contractId && p.user_id === userId)
      if (updatedPart) {
        sqliteDb.prepare(`
          UPDATE contract_participants
          SET progress = ?,
              partial_rewards_earned = ?,
              status = ?,
              completed_at = ?,
              last_activity_at = 'Just now'
          WHERE id = ?
        `).run(
          updatedPart.progress,
          updatedPart.partial_rewards_earned || 0,
          updatedPart.status,
          updatedPart.completed_at || null,
          updatedPart.id
        )
      }
    } catch {}

    return { matchesFound, objectivesCompleted: completedTitles, bountiesAwarded }
  }

  /**
   * Ingest and verify player event with idempotent processing & partial award crediting
   */
  public ingestPlayerEvent(params: {
    userId: string
    tornUserId: number
    contractId: number
    contractObjectiveId: string
    deltaValue: number
    source: string
    idempotencyKey: string
  }): { success: boolean; verified: boolean; partialRewardEarned?: number } {
    // 1. Check idempotency
    const existingEvents = db.get('player_events')
    if (existingEvents.some((e) => e.idempotency_key === params.idempotencyKey)) {
      return { success: true, verified: false }
    }

    // 2. Log event
    const newEvent: PlayerEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: params.userId,
      torn_user_id: params.tornUserId,
      event_type: 'OBJECTIVE_PROGRESS',
      event_time: new Date().toISOString(),
      source: params.source,
      payload: { delta: params.deltaValue, objId: params.contractObjectiveId },
      idempotency_key: params.idempotencyKey,
      created_at: new Date().toISOString(),
    }
    db.set('player_events', [newEvent, ...existingEvents])

    // 3. Find participant objective
    const partObjectives = db.get('participant_objectives')
    const targetIdx = partObjectives.findIndex(
      (po) => po.contract_id === params.contractId && po.contract_objective_id === params.contractObjectiveId
    )

    if (targetIdx === -1) {
      return { success: false, verified: false }
    }

    const currentObj = partObjectives[targetIdx]
    const nextValue = currentObj.current_value + params.deltaValue
    const isNowVerified = nextValue >= currentObj.target_value && currentObj.status !== 'verified'

    let partialRewardGranted = 0

    if (isNowVerified) {
      currentObj.status = 'verified'
      currentObj.current_value = currentObj.target_value
      currentObj.verified_at = new Date().toISOString()
      currentObj.completed_at = new Date().toISOString()

      // Partial Reward System: Credit partial reward transaction
      if (currentObj.partial_reward > 0 && currentObj.partial_reward_status !== 'credited') {
        currentObj.partial_reward_status = 'credited'
        partialRewardGranted = currentObj.partial_reward

        const rewardTx: RewardTransaction = {
          id: `rw-prt-${Date.now()}`,
          user_id: params.userId,
          torn_user_id: params.tornUserId,
          torn_username: 'Agent',
          contract_id: params.contractId,
          reward_type: 'partial_objective',
          description: `Partial Objective Bounty: "${currentObj.title}" Verified`,
          amount_cash: currentObj.partial_reward,
          status: 'DELIVERED',
          issued_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          delivered_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tx_id: `TX-PRT-${Math.floor(10000 + Math.random() * 90000)}`,
        }
        db.set('reward_transactions', [rewardTx, ...db.get('reward_transactions')])
      }
    } else {
      currentObj.current_value = nextValue
      currentObj.status = 'in_progress'
    }

    partObjectives[targetIdx] = currentObj
    db.set('participant_objectives', [...partObjectives])

    // 4. Update overall participant record & rankings
    this.recalculateParticipantProgress(params.userId, params.contractId)

    return { success: true, verified: isNowVerified, partialRewardEarned: partialRewardGranted }
  }

  /**
   * Recalculate participant's verified count, rank, and check for 10/10 contract completion
   */
  public recalculateParticipantProgress(userId: string, contractId: number) {
    const participants = db.get('contract_participants')
    const pIdx = participants.findIndex((p) => p.contract_id === contractId && p.user_id === userId)
    if (pIdx === -1) return

    const p = participants[pIdx]
    const pObjs = db.get('participant_objectives').filter((po) => po.participant_id === p.id && po.contract_id === contractId)
    const verifiedCount = pObjs.filter((po) => po.status === 'verified').length
    const partialTotal = pObjs.filter((po) => po.status === 'verified').reduce((sum, po) => sum + (po.partial_reward || 0), 0)

    p.progress = verifiedCount
    p.partial_rewards_earned = partialTotal
    p.last_activity_at = 'Just now'

    // Check completion
    if (verifiedCount >= p.total_objectives && !p.completed_at) {
      p.completed_at = new Date().toISOString()
      p.status = 'completed'

      // Check if this makes them the grand winner
      const contract = db.get('contracts').find((c) => c.id === contractId)
      if (contract && contract.status === 'active') {
        const completedParticipants = participants.filter((part) => part.completed_at).sort((a, b) => (a.completed_at! > b.completed_at! ? 1 : -1))
        
        if (completedParticipants[0]?.id === p.id) {
          contract.winner_status = 'Verified Winner'
          contract.declared_winner = p.torn_username
          db.persist()
        }
      }
    }

    participants[pIdx] = p

    // Recalculate ranks across participants
    participants.sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress
      if (a.completed_at && b.completed_at) return a.completed_at > b.completed_at ? 1 : -1
      return 0
    })

    participants.forEach((part, index) => {
      part.current_rank = index + 1
    })

    db.set('contract_participants', [...participants])
  }

  /**
   * Evaluates and finalizes winners at 24:00 UTC (End of Day).
   * Ranks all participants based on objectives completed and completion time.
   * Awards grand prizes / top finishes and archives the contract.
   */
  public evaluateContractAtMidnight(contractId: number) {
    console.log(`[ContractEngine] Evaluating winners for Contract #${contractId} at end of UTC day...`)
    const nowIso = new Date().toISOString()

    // 1. Fetch participants from SQLite
    const participants = (sqliteDb.prepare(`
      SELECT * FROM contract_participants 
      WHERE contract_id = ?
      ORDER BY progress DESC, 
               CASE WHEN completed_at IS NOT NULL THEN completed_at ELSE '9999-12-31' END ASC,
               id ASC
    `).all(contractId) as any[]) || []

    if (participants.length === 0) {
      console.log(`[ContractEngine] Contract #${contractId} has no participants. Closing contract.`)
      sqliteDb.prepare(`
        UPDATE contracts 
        SET status = 'completed', completed_at = ?, winner_status = 'Completed (No Participants)', remaining_ms = 0
        WHERE id = ?
      `).run(nowIso, contractId)
      return { winner: null, rankings: [] }
    }

    // 2. Fetch contract details & reward configurations
    const contractRow = sqliteDb.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId) as any
    let rewards: any[] = []
    try {
      rewards = JSON.parse(contractRow?.reward_configuration || '[]')
    } catch {}

    // 3. Update participant ranks in SQLite
    const updateRankStmt = sqliteDb.prepare(`
      UPDATE contract_participants
      SET current_rank = ?, status = CASE WHEN progress >= total_objectives THEN 'completed' ELSE status END
      WHERE id = ?
    `)

    participants.forEach((p, idx) => {
      const rank = idx + 1
      p.current_rank = rank
      updateRankStmt.run(rank, p.id)
    })

    // 4. Determine Winner(s)
    const topParticipant = participants[0]
    let declaredWinner: string | null = null
    let winnerStatus = 'Completed (No Winner)'

    if (topParticipant && topParticipant.progress > 0) {
      declaredWinner = topParticipant.torn_username
      winnerStatus = 'Verified Winner'

      // Award 1st place prize if not already awarded
      const firstPlaceReward = rewards.find((r) => r.place === '1st' || r.place === '1' || r.rank === 1) || rewards[0]
      const prizeDesc = firstPlaceReward?.reward || '$10,000,000 + 1× Xanax'
      const cashMatch = prizeDesc.match(/\$([\d,]+)/)
      const cashAmount = cashMatch ? parseInt(cashMatch[1].replace(/,/g, ''), 10) : 10000000

      const existingReward = sqliteDb.prepare(`
        SELECT id FROM reward_transactions 
        WHERE contract_id = ? AND user_id = ? AND reward_type = 'final_winner'
      `).get(contractId, topParticipant.user_id)

      if (!existingReward) {
        const txId = `TX-WIN-${Math.floor(10000 + Math.random() * 90000)}`
        sqliteDb.prepare(`
          INSERT INTO reward_transactions (
            id, user_id, torn_user_id, torn_username, contract_id, reward_type, rank, description, amount_cash, items, status, tx_id, issued_at
          ) VALUES (?, ?, ?, ?, ?, 'final_winner', '#1', ?, ?, ?, 'DELIVERED', ?, 'Just now')
        `).run(
          `rw-win-${contractId}-${Date.now()}`,
          topParticipant.user_id,
          topParticipant.torn_user_id,
          topParticipant.torn_username,
          contractId,
          `Contract Grand Prize: ${prizeDesc}`,
          cashAmount,
          prizeDesc.includes('Xanax') ? '1× Xanax' : null,
          txId
        )
      }
    }

    // 5. Finalize contract status in SQLite
    sqliteDb.prepare(`
      UPDATE contracts 
      SET status = 'completed',
          completed_at = ?,
          winner_status = ?,
          declared_winner = ?,
          remaining_ms = 0
      WHERE id = ?
    `).run(nowIso, winnerStatus, declaredWinner, contractId)

    console.log(`[ContractEngine] Contract #${contractId} finalized. Winner: ${declaredWinner || 'None'}.`)
    return { winner: declaredWinner, rankings: participants }
  }
}

export const contractEngine = new ContractEngine()
