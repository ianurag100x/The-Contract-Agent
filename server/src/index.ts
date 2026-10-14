import http from 'node:http'
import { parse as parseUrl } from 'node:url'
import { handleApiRoute } from './routes.ts'
import { sqliteDb } from './sqlite.ts'

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const parsed = parseUrl(req.url || '/', true)
  const path = parsed.pathname || '/'
  const query = (parsed.query as Record<string, string>) || {}
  const method = req.method || 'GET'

  // Read request body if present
  let body: any = {}
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      const buffers: Buffer[] = []
      for await (const chunk of req) {
        buffers.push(chunk)
      }
      const raw = Buffer.concat(buffers).toString('utf-8')
      if (raw) {
        body = JSON.parse(raw)
      }
    } catch (err) {
      console.error('Error parsing request body:', err)
    }
  }

  // Helper response wrapper
  const resHelper = {
    status: (code: number) => ({
      json: (data: any) => {
        res.writeHead(code, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(data))
      },
      send: (data: any) => {
        res.writeHead(code, { 'Content-Type': 'text/plain' })
        res.end(String(data))
      },
    }),
  }

  try {
    const handled = await handleApiRoute(
      {
        method,
        path,
        query,
        body,
        headers: (req.headers as Record<string, string>) || {},
      },
      resHelper
    )

    if (!handled) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Endpoint not found' }))
    }
  } catch (err: any) {
    console.error('Unhandled API error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error', details: err?.message }))
  }
})

server.listen(PORT, () => {
  console.log(`[The Contract Agent] Backend API server running at http://localhost:${PORT}`)
  console.log(`[The Contract Agent] Verification Engine & Contract Scheduler active.`)

  // Background World Clock Scheduler: checks for scheduled contracts reaching starts_at
  setInterval(() => {
    try {
      const now = Date.now()
      const scheduledList = sqliteDb.prepare("SELECT * FROM contracts WHERE status = 'scheduled'").all() as any[]

      for (const sc of scheduledList) {
        const startTime = new Date(sc.starts_at).getTime()
        // If start time is reached or past
        if (!isNaN(startTime) && startTime <= now) {
          console.log(`[Scheduler] World clock reached start time for Contract #${sc.id}. Auto-activating contract...`)

          // Mark any current active/paused contract as completed
          sqliteDb.prepare(`
            UPDATE contracts
            SET status = 'completed', completed_at = datetime('now')
            WHERE status IN ('active', 'paused') AND id != ?
          `).run(sc.id)

          // Auto-activate the scheduled contract
          sqliteDb.prepare(`
            UPDATE contracts
            SET status = 'active'
            WHERE id = ?
          `).run(sc.id)

          // Ensure active agents have participant records
          const activeUsers = sqliteDb.prepare("SELECT * FROM users WHERE status = 'active'").all() as any[]
          const insertPart = sqliteDb.prepare(`
            INSERT OR IGNORE INTO contract_participants (
              id, contract_id, user_id, torn_user_id, torn_username, status, current_rank, progress, total_objectives, partial_rewards_earned, last_activity_at
            ) VALUES (?, ?, ?, ?, ?, 'active', 1, 0, ?, 0, 'Just now')
          `)
          activeUsers.forEach((u: any) => {
            insertPart.run(`part-${sc.id}-${u.id}`, sc.id, u.id, u.torn_user_id, u.torn_username, sc.max_objectives || 10)
          })

          console.log(`[Scheduler] Contract #${sc.id} is now ACTIVE and published to all agents.`)
        }
      }
    } catch (e) {
      // Ignore background ticker errors
    }
  }, 10_000)
})
