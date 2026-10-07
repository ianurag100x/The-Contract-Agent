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
      category: def.category,
      difficulty: def.difficulty,
      target_value: def.default_target,
      partial_reward: def.default_partial_reward || 500000,
      verification_status: 'active',
      created_at: new Date().toISOString(),
    }))

    // Save to database
    const allContractObjs = db.get('contract_objectives').filter((co) => co.contract_id !== contractId)
    db.set('contract_objectives', [...allContractObjs, ...newContractObjectives])

    return newContractObjectives
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
}

export const contractEngine = new ContractEngine()
