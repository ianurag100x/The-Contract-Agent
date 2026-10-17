/**
 * Torn API Client & Log Normalizer
 * Connects to Torn v2 API: GET /user/log
 * Implements §7 of THE_CONTRACT_BACKEND_SPEC.md
 */

import { stripPrefix, parsePrefixTimestamp } from './patterns.ts'

export interface TornLogApiResponseItem {
  id: string
  timestamp: number
  details?: {
    id: number
    title: string
    category: string
  }
  data?: Record<string, any>
  params?: Record<string, any>
}

export interface TornLogApiResponse {
  log: TornLogApiResponseItem[]
  _metadata?: {
    links?: {
      prev?: string | null
      next?: string | null
    }
    nanostamp?: string
  }
  error?: {
    code: number
    error: string
  }
}

export interface NormalizedLogEntry {
  externalId: string
  occurredAt: string
  timestampEpoch: number
  category: string
  rawText: string
  raw: TornLogApiResponseItem
}

/**
 * Turns structured Torn v2 log objects into raw text representation:
 * `${title}: ${JSON.stringify(data)}`
 */
export function reconstructLogText(item: TornLogApiResponseItem): string {
  const title = (item as any).title || (item as any).log || item.details?.title || 'Unknown action'
  const data = item.data || (item as any).params || {}
  return `${title}: ${JSON.stringify(data)}`
}

/**
 * Normalizes Torn API log entry into system format.
 */
export function normalizeTornLog(item: TornLogApiResponseItem): NormalizedLogEntry {
  const date = new Date(item.timestamp * 1000)
  const canonicalText = reconstructLogText(item)

  return {
    externalId: item.id,
    occurredAt: date.toISOString(),
    timestampEpoch: item.timestamp,
    category: item.details?.category || 'General',
    rawText: canonicalText,
    raw: item,
  }
}

export class TornClient {
  private baseUrl: string
  private defaultKey?: string

  constructor(baseUrl = 'https://api.torn.com/v2', defaultKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.defaultKey = defaultKey || process.env.TORN_API_KEY
  }

  /**
   * Fetches user logs using GET /user/log.
   * If timeframe (from/to) is provided, it supports automatic pagination up to maxPages.
   */
  async getUserLogs(options: {
    key?: string
    limit?: number
    cat?: number
    from?: number
    to?: number
    comment?: string
    maxPages?: number
  }): Promise<{ logs: NormalizedLogEntry[]; raw: TornLogApiResponse; error?: { code: number; error: string } }> {
    const apiKey = options.key || this.defaultKey
    if (!apiKey) {
      return {
        logs: [],
        raw: { log: [] },
        error: { code: 2, error: 'TORN API key is missing. Configure key in .env or provide via request.' },
      }
    }

    const pageSize = options.limit || 100
    const maxPages = options.maxPages || 5 // Safety limit (up to 500 logs)
    let currentTo = options.to || Math.floor(Date.now() / 1000)
    const targetFrom = options.from

    const collectedLogs: TornLogApiResponseItem[] = []
    const seenIds = new Set<string>()
    let lastRawData: any = { log: [] }

    for (let page = 0; page < maxPages; page++) {
      const query = new URLSearchParams()
      query.set('limit', String(pageSize))
      query.set('key', apiKey)
      query.set('sort', 'DESC')
      if (options.cat) query.set('cat', String(options.cat))
      if (targetFrom) query.set('from', String(targetFrom))
      if (currentTo) query.set('to', String(currentTo))
      if (options.comment) query.set('comment', options.comment)

      const url = `${this.baseUrl}/user/log?${query.toString()}`

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            Authorization: `ApiKey ${apiKey}`,
          },
        })

        if (!res.ok) {
          const text = await res.text()
          if (page === 0) {
            return {
              logs: [],
              raw: { log: [] },
              error: { code: res.status, error: `TORN API HTTP Error: ${res.statusText} (${text})` },
            }
          }
          break
        }

        const data = (await res.json()) as TornLogApiResponse

        if (data.error) {
          if (page === 0) {
            return {
              logs: [],
              raw: data,
              error: data.error,
            }
          }
          break
        }

        lastRawData = data
        const rawBatch = Array.isArray(data)
          ? data
          : Array.isArray((data as any).log)
            ? (data as any).log
            : Array.isArray((data as any).logs)
              ? (data as any).logs
              : (data as any).log && typeof (data as any).log === 'object'
                ? Object.values((data as any).log)
                : []

        if (!rawBatch || rawBatch.length === 0) {
          break
        }

        let newRecordsInBatch = 0
        let oldestTimestamp = Infinity

        for (const item of rawBatch) {
          const idStr = String(item.id)
          if (!seenIds.has(idStr)) {
            seenIds.add(idStr)
            collectedLogs.push(item)
            newRecordsInBatch++
          }
          if (typeof item.timestamp === 'number' && item.timestamp < oldestTimestamp) {
            oldestTimestamp = item.timestamp
          }
        }

        // If batch is smaller than pageSize or no new records or reached targetFrom, stop
        if (rawBatch.length < pageSize || newRecordsInBatch === 0) {
          break
        }

        if (targetFrom && oldestTimestamp <= targetFrom) {
          break
        }

        // Advance next query window to 1 second before the oldest timestamp
        if (oldestTimestamp !== Infinity && oldestTimestamp > 0) {
          currentTo = oldestTimestamp - 1
        } else {
          break
        }
      } catch (err: any) {
        if (page === 0) {
          return {
            logs: [],
            raw: { log: [] },
            error: { code: 500, error: err?.message || 'Failed to connect to Torn API' },
          }
        }
        break
      }
    }

    // Sort logs descending by timestamp
    collectedLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    const normalized = collectedLogs.map((item: any) => normalizeTornLog(item))

    return {
      logs: normalized,
      raw: { ...lastRawData, log: collectedLogs },
    }
  }

  /**
   * Verifies an API key with Torn API v2 GET /user/basic (Swagger official endpoint for Public Access Key)
   * Also fallbacks to v2 /user/profile and v1 /user/?selections=basic
   */
  async verifyApiKey(key: string): Promise<{
    valid: boolean
    user?: { torn_user_id: number; torn_username: string; torn_level: number }
    error?: { code: number; error: string }
  }> {
    if (!key || !key.trim()) {
      return { valid: false, error: { code: 2, error: 'Key is empty or missing' } }
    }

    const trimmed = key.trim()

    // 1. Official Torn API v2: GET /user/basic (Public key required per Torn Swagger)
    // Response: { "profile": { "id": 1073741824, "name": "string", "level": 1073741824, "status": { ... } } }
    try {
      const urlBasic = `${this.baseUrl}/user/basic?key=${encodeURIComponent(trimmed)}&comment=TheContractAgentAuth&striptags=true`
      const resBasic = await fetch(urlBasic, {
        headers: {
          accept: 'application/json',
          Authorization: `ApiKey ${trimmed}`,
        },
      })

      if (resBasic.ok) {
        const data = (await resBasic.json()) as any
        if (data.error) {
          if (data.error.code === 2 || data.error.code === 16) {
            return { valid: false, error: data.error }
          }
        } else if (data.profile && (data.profile.id || data.profile.player_id)) {
          return {
            valid: true,
            user: {
              torn_user_id: Number(data.profile.id || data.profile.player_id),
              torn_username: data.profile.name || 'Agent',
              torn_level: Number(data.profile.level || 1),
            },
          }
        }
      }
    } catch {
      // Continue to next endpoint
    }

    // 2. Torn API v2: GET /user/profile
    try {
      const urlProfile = `${this.baseUrl}/user/profile?key=${encodeURIComponent(trimmed)}&comment=TheContractAgentAuth`
      const resProfile = await fetch(urlProfile, {
        headers: {
          accept: 'application/json',
          Authorization: `ApiKey ${trimmed}`,
        },
      })

      if (resProfile.ok) {
        const data = (await resProfile.json()) as any
        if (data.error) {
          if (data.error.code === 2 || data.error.code === 16) {
            return { valid: false, error: data.error }
          }
        } else if (data.profile && (data.profile.id || data.profile.player_id)) {
          return {
            valid: true,
            user: {
              torn_user_id: Number(data.profile.id || data.profile.player_id),
              torn_username: data.profile.name || 'Agent',
              torn_level: Number(data.profile.level || 1),
            },
          }
        }
      }
    } catch {
      // Continue to v1 fallback
    }

    // 3. Torn API v1: https://api.torn.com/user/?selections=basic
    try {
      const urlV1 = `https://api.torn.com/user/?selections=basic&key=${encodeURIComponent(trimmed)}&comment=TheContractAgentAuth`
      const resV1 = await fetch(urlV1)
      if (resV1.ok) {
        const dataV1 = (await resV1.json()) as any
        if (dataV1.error) {
          return { valid: false, error: dataV1.error }
        }
        if (dataV1.player_id && dataV1.name) {
          return {
            valid: true,
            user: {
              torn_user_id: Number(dataV1.player_id),
              torn_username: String(dataV1.name),
              torn_level: Number(dataV1.level || 1),
            },
          }
        }
      }
    } catch (err: any) {
      return { valid: false, error: { code: 500, error: err?.message || 'Failed to connect to Torn API' } }
    }

    return { valid: false, error: { code: 2, error: 'Torn API returned an authentication error. Please verify that your API key is active and has appropriate permissions.' } }
  }
}

export const tornClient = new TornClient()
