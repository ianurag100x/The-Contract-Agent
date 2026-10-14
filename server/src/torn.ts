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
 * Turns structured Torn v2 log objects into canonical text representations
 * for pattern matching if raw textual title is formatted.
 */
export function reconstructLogText(item: TornLogApiResponseItem): string {
  const title = item.details?.title || 'Unknown action'
  const data = item.data || {}

  // If Torn provides specific action descriptions in data:
  if (title === 'Crime success' && data.crime_action) {
    return `You committed a crime: ${data.crime_action}`
  }
  if (title === 'Crime success item gain (new)' && data.crime_action) {
    return `You succeeded in crime: ${data.crime_action}`
  }
  if (title === 'Bazaar buy' && data.seller) {
    return `You bought items from bazaar seller ${data.seller}`
  }
  if (title === 'Trade initiate incoming' && data.user) {
    return `Trade initiate incoming with user ${data.user}`
  }
  if (title === 'Racing finish custom race' && data.position) {
    return `Finished custom race in position ${data.position}`
  }

  // Generic fallback if standard message syntax
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
   * Fetches user logs using GET /user/log
   * Query params: limit, cat, from, to, key
   */
  async getUserLogs(options: {
    key?: string
    limit?: number
    cat?: number
    from?: number
    to?: number
    comment?: string
  }): Promise<{ logs: NormalizedLogEntry[]; raw: TornLogApiResponse; error?: { code: number; error: string } }> {
    const apiKey = options.key || this.defaultKey
    if (!apiKey) {
      return {
        logs: [],
        raw: { log: [] },
        error: { code: 2, error: 'TORN API key is missing. Configure key in .env or provide via request.' },
      }
    }

    const query = new URLSearchParams()
    query.set('limit', String(options.limit || 20))
    query.set('key', apiKey)
    if (options.cat) query.set('cat', String(options.cat))
    if (options.from) query.set('from', String(options.from))
    if (options.to) query.set('to', String(options.to))
    if (options.comment) query.set('comment', options.comment)

    const url = `${this.baseUrl}/user/log?${query.toString()}`

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      })

      if (!res.ok) {
        const text = await res.text()
        return {
          logs: [],
          raw: { log: [] },
          error: { code: res.status, error: `TORN API HTTP Error: ${res.statusText} (${text})` },
        }
      }

      const data = (await res.json()) as TornLogApiResponse

      if (data.error) {
        return {
          logs: [],
          raw: data,
          error: data.error,
        }
      }

      const rawLogs = data.log || []
      const normalized = rawLogs.map((item) => normalizeTornLog(item))

      return {
        logs: normalized,
        raw: data,
      }
    } catch (err: any) {
      return {
        logs: [],
        raw: { log: [] },
        error: { code: 500, error: err?.message || 'Failed to connect to Torn API' },
      }
    }
  }
}

export const tornClient = new TornClient()
