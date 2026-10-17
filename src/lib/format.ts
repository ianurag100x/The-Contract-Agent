export const money = (n: number) => '$' + n.toLocaleString('en-US')

export function hms(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
}

/** "17h 39m" */
export function hm(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000))
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

export function duration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

export interface ContractTimerResult {
  remainingMs: number
  label: string
  text: string
  isFrozen: boolean
  status: string
}

export function getContractTimerState(
  contract: {
    status?: string
    endsAt?: number
    starts_at?: string
    startDate?: string
    remainingMs?: number
  } | null | undefined,
  now: number = Date.now()
): ContractTimerResult {
  if (!contract) {
    return { remainingMs: 0, label: 'Time Remaining', text: '00:00:00', isFrozen: true, status: 'none' }
  }

  const status = contract.status || 'draft'

  if (status === 'cancelled') {
    return {
      remainingMs: 0,
      label: 'Contract Cancelled',
      text: 'CANCELLED',
      isFrozen: true,
      status: 'cancelled',
    }
  }

  if (status === 'completed') {
    return {
      remainingMs: 0,
      label: 'Contract Completed',
      text: 'COMPLETED',
      isFrozen: true,
      status: 'completed',
    }
  }

  if (status === 'paused') {
    const frozenMs = contract.remainingMs !== undefined && contract.remainingMs !== null
      ? contract.remainingMs
      : Math.max(0, (contract.endsAt || 0) - now)
    return {
      remainingMs: Math.max(0, frozenMs),
      label: 'Time (PAUSED)',
      text: `${hms(Math.max(0, frozenMs))} (PAUSED)`,
      isFrozen: true,
      status: 'paused',
    }
  }

  if (status === 'scheduled') {
    const startTimeStr = contract.starts_at || contract.startDate
    const startTime = startTimeStr ? new Date(startTimeStr).getTime() : 0
    const untilStart = Math.max(0, startTime - now)
    return {
      remainingMs: untilStart,
      label: 'Starts In',
      text: untilStart > 0 ? `Starts in ${hms(untilStart)}` : 'Starting Soon',
      isFrozen: false,
      status: 'scheduled',
    }
  }

  if (status === 'draft') {
    return {
      remainingMs: 0,
      label: 'Contract Draft',
      text: 'DRAFT',
      isFrozen: true,
      status: 'draft',
    }
  }

  // Active / default
  // 1. Calculate time until 24:00:00 UTC (Torn City Time midnight reset)
  const utcNow = new Date(now)
  const endOfUtcDay = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate(), 23, 59, 59, 999)).getTime()

  // For standard daily contracts, anchor strictly to today's 24:00:00 UTC
  let rem = Math.max(0, endOfUtcDay - now)

  // If a specific custom endsAt is set that is within today's daily window, respect it
  if (contract.endsAt && typeof contract.endsAt === 'number' && contract.endsAt > now && contract.endsAt <= endOfUtcDay) {
    rem = Math.max(0, contract.endsAt - now)
  }

  return {
    remainingMs: rem,
    label: 'Time Remaining',
    text: hms(rem),
    isFrozen: false,
    status: 'active',
  }
}

