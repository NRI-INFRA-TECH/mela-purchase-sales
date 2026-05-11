import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = join(__dirname, 'dist', 'client')
const PORT = parseInt(process.env.PORT || '3006', 10)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.mjs':  'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.webp': 'image/webp',
  '.txt':  'text/plain',
}

const { default: handler } = await import('./dist/server/server.js')

async function tryStatic(urlPath, res) {
  try {
    let filePath = join(CLIENT_DIR, decodeURIComponent(urlPath.split('?')[0]))
    const s = await stat(filePath)
    if (s.isDirectory()) filePath = join(filePath, 'index.html')
    const content = await readFile(filePath)
    const mime = MIME[extname(filePath)] || 'application/octet-stream'
    // immutable cache for hashed assets
    const cache = filePath.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': cache })
    res.end(content)
    return true
  } catch {
    return false
  }
}

createServer(async (req, res) => {
  // Serve static client assets first
  if (await tryStatic(req.url, res)) return

  try {
    const host = req.headers.host || `localhost:${PORT}`
    const url = new URL(req.url, `http://${host}`)

    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body =
      chunks.length && req.method !== 'GET' && req.method !== 'HEAD'
        ? Buffer.concat(chunks)
        : undefined

    const headers = {}
    for (const [k, v] of Object.entries(req.headers)) {
      if (k === 'connection') continue
      headers[k] = Array.isArray(v) ? v.join(', ') : v
    }

    const request = new Request(url.toString(), { method: req.method, headers, body })
    const response = await handler.fetch(request, {}, { waitUntil: () => {} })

    const outHeaders = {}
    for (const [k, v] of response.headers.entries()) outHeaders[k] = v

    res.writeHead(response.status, outHeaders)

    if (response.body) {
      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.writeHead(500)
    res.end('Internal Server Error')
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`sales-purchase server running on port ${PORT}`)
})
