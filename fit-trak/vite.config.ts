/// <reference types="vitest" />

import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

/** Keeps API keys on the dev machine only (not in VITE_* / not in the browser bundle). */
function devApiProxy(env: Record<string, string>): Plugin {
  return {
    name: 'fit-trak-dev-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || ''
        if (!rawUrl.startsWith('/api/dev/')) {
          next()
          return
        }
        try {
          if (rawUrl.startsWith('/api/dev/usda-search')) {
            if (req.method !== 'GET') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }
            const key = env.USDA_API_KEY
            if (!key) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'text/plain')
              res.end(
                'Missing USDA_API_KEY in .env.local (use this name, not VITE_USDA_API_KEY).'
              )
              return
            }
            const u = new URL(rawUrl, 'http://dev.local')
            const query = u.searchParams.get('query') || ''
            if (!query.trim()) {
              res.statusCode = 400
              res.end('Missing query')
              return
            }
            const params = new URLSearchParams({ query: query.trim(), api_key: key })
            const r = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`)
            const text = await r.text()
            res.statusCode = r.status
            res.setHeader('Content-Type', 'application/json')
            res.end(text)
            return
          }

          if (rawUrl.startsWith('/api/dev/openai-chat')) {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }
            const openaiKey = env.OPENAI_API_KEY
            if (!openaiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'text/plain')
              res.end(
                'Missing OPENAI_API_KEY in .env.local (use this name, not VITE_OPENAI_API_KEY).'
              )
              return
            }
            const rawBody = await readRequestBody(req)
            const json = JSON.parse(rawBody || '{}') as { prompt?: string }
            if (typeof json.prompt !== 'string' || !json.prompt.trim()) {
              res.statusCode = 400
              res.end('Missing prompt')
              return
            }
            const r = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openaiKey}`,
              },
              body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: json.prompt }],
              }),
            })
            const text = await r.text()
            if (!r.ok) {
              res.statusCode = r.status
              res.setHeader('Content-Type', 'application/json')
              res.end(text)
              return
            }
            const data = JSON.parse(text) as {
              choices?: Array<{ message?: { content?: string } }>
            }
            const content = data.choices?.[0]?.message?.content
            if (!content) {
              res.statusCode = 502
              res.setHeader('Content-Type', 'text/plain')
              res.end('No content in OpenAI response')
              return
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ content }))
            return
          }
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'text/plain')
          res.end(e instanceof Error ? e.message : 'Proxy error')
          return
        }
        next()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), legacy(), devApiProxy(env)],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
})
