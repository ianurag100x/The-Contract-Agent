import http from 'node:http'
import { parse as parseUrl } from 'node:url'
import { handleApiRoute } from './routes.ts'

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
  console.log(`[The Contract Agent] Verification Engine & Partial Award System active.`)
})
