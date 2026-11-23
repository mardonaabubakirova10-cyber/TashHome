import { Router, type Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { runAgent, type AgentDeps } from '../ai/agent.js'
import { AiUnavailableError } from '../ai/gemini.js'
import type { Store } from '../lib/store.js'

const schema = z.object({
  session_id: z.string().uuid().optional(),
  message: z.string().trim().min(1, 'Напишите сообщение').max(1000, 'Сообщение слишком длинное'),
  lang: z.enum(['ru', 'uz']).default('ru'),
})

const HISTORY_LIMIT = 20

/** POST /api/chat — диалог с ассистентом, ответ потоком SSE: session, status, token, properties, done, error. */
export function chatRouter(store: Store, deps: AgentDeps) {
  const router = Router()
  router.use(rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }))

  router.post('/', async (req, res) => {
    const body = schema.parse(req.body) // ошибки валидации уходят обычным JSON 400

    let sessionId = body.session_id
    if (sessionId && !(await store.chatSessionExists(sessionId))) sessionId = undefined
    const isNew = !sessionId
    if (!sessionId) sessionId = await store.createChatSession('site')
    const history = isNew ? [] : await store.getChatHistory(sessionId, HISTORY_LIMIT)

    res.status(200).set({ 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' })
    res.flushHeaders()
    const send = (event: string, data: unknown) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }
    send('session', { id: sessionId })

    const started = Date.now()
    await store.addChatMessage({ session_id: sessionId, role: 'user', content: body.message })
    try {
      const result = await runAgent(
        {
          history: history.filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content).map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content! })),
          message: body.message,
          lang: body.lang,
          allowLead: history.length >= 2,
        },
        deps,
        (e) => {
          if (e.type === 'token') send('token', { text: e.text })
          else if (e.type === 'status') send('status', { tool: e.tool })
          else send('properties', { items: e.items })
        },
      )
      const latency = Date.now() - started
      await store.addChatMessage({ session_id: sessionId, role: 'assistant', content: result.text, tool_calls: result.tools.length ? result.tools : undefined, latency_ms: latency })
      send('done', { lead_created: result.leadCreated })
    } catch (e) {
      const unavailable = e instanceof AiUnavailableError
      if (!unavailable) console.error('chat:', e instanceof Error ? e.message : e)
      send('error', { code: unavailable ? 'ai_unavailable' : 'internal' })
    } finally {
      endStream(res)
    }
  })
  return router
}

function endStream(res: Response) {
  if (!res.writableEnded) res.end()
}
