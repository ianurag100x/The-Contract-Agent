import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Load .env variables manually to avoid extra dependencies
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '../.env')

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8')
  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  })
}

export const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  isConfigured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
}

/**
 * Lightweight Supabase REST Client using standard global fetch.
 * Works without requiring additional heavy npm dependencies.
 */
export class SupabaseClient {
  private baseUrl: string
  private apiKey: string

  constructor(url: string, key: string) {
    this.baseUrl = url.replace(/\/$/, '')
    this.apiKey = key
  }

  private headers(prefer?: string) {
    const h: Record<string, string> = {
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
    if (prefer) {
      h['Prefer'] = prefer
    }
    return h
  }

  async select<T = any>(table: string, queryParams: string = 'select=*'): Promise<T[]> {
    if (!this.baseUrl || !this.apiKey) return []
    const url = `${this.baseUrl}/rest/v1/${table}?${queryParams}`
    const res = await fetch(url, {
      method: 'GET',
      headers: this.headers(),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Supabase select error on ${table}: ${err}`)
    }
    return res.json() as Promise<T[]>
  }

  async insert<T = any>(table: string, records: any | any[], upsert = false): Promise<T[]> {
    if (!this.baseUrl || !this.apiKey) return []
    const url = `${this.baseUrl}/rest/v1/${table}`
    const prefer = upsert ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(prefer),
      body: JSON.stringify(records),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Supabase insert error on ${table}: ${err}`)
    }
    return res.json() as Promise<T[]>
  }

  async update<T = any>(table: string, filterQuery: string, values: any): Promise<T[]> {
    if (!this.baseUrl || !this.apiKey) return []
    const url = `${this.baseUrl}/rest/v1/${table}?${filterQuery}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.headers('return=representation'),
      body: JSON.stringify(values),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Supabase update error on ${table}: ${err}`)
    }
    return res.json() as Promise<T[]>
  }

  async delete(table: string, filterQuery: string): Promise<void> {
    if (!this.baseUrl || !this.apiKey) return
    const url = `${this.baseUrl}/rest/v1/${table}?${filterQuery}`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers(),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Supabase delete error on ${table}: ${err}`)
    }
  }
  async count(table: string, queryParams: string = ''): Promise<number> {
    if (!this.baseUrl || !this.apiKey) return 0
    const query = queryParams ? `${queryParams}&select=id` : 'select=id'
    const url = `${this.baseUrl}/rest/v1/${table}?${query}`
    const res = await fetch(url, {
      method: 'HEAD',
      headers: this.headers('count=exact'),
    })
    if (!res.ok) {
      // Fallback to GET if HEAD isn't permitted
      const getRes = await fetch(url, {
        method: 'GET',
        headers: this.headers('count=exact'),
      })
      const range = getRes.headers.get('content-range')
      if (range && range.includes('/')) {
        const total = parseInt(range.split('/')[1], 10)
        if (!isNaN(total)) return total
      }
      const data = await getRes.json()
      return Array.isArray(data) ? data.length : 0
    }
    const range = res.headers.get('content-range')
    if (range && range.includes('/')) {
      const total = parseInt(range.split('/')[1], 10)
      if (!isNaN(total)) return total
    }
    return 0
  }

  async getLiveStats() {
    if (!SUPABASE_CONFIG.isConfigured) {
      return null
    }

    try {
      const [registeredCount, activeCount, completedCount, rewardsData] = await Promise.all([
        // 1. Registered Users Count
        this.count('users'),
        // 2. Active Contract Participants Count
        this.count('contract_participants', 'status=eq.active'),
        // 3. Completed Contracts Count
        this.count('contracts', 'status=eq.completed'),
        // 4. Delivered Reward Transactions Sum
        this.select<{ amount_cash: number }>('reward_transactions', 'select=amount_cash&status=eq.DELIVERED'),
      ])

      const totalRewards = (rewardsData || []).reduce((sum, r) => sum + (Number(r.amount_cash) || 0), 0)

      return {
        registered: registeredCount,
        active: activeCount,
        completed: completedCount,
        totalRewardsCash: totalRewards,
        source: 'supabase',
      }
    } catch (err) {
      console.warn('[Supabase] Error querying live stats, falling back to local engine:', err)
      return null
    }
  }
}

export const supabase = new SupabaseClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.serviceRoleKey || SUPABASE_CONFIG.anonKey
)

