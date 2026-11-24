import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { config } from './config.js'
import { errorHandler, notFound } from './lib/errors.js'
import { currencyRouter } from './routes/currency.js'
import { createMemoryStore, type Store } from './lib/store.js'
import { noopNotifier, type Notifier } from './lib/notifier.js'
import { estimateRouter } from './routes/estimate.js'
import { leadsRouter } from './routes/leads.js'
import { reviewsRouter } from './routes/reviews.js'
import { createAgentDeps } from './ai/deps.js'
import type { AgentDeps } from './ai/agent.js'
import { transcribeRouter } from './routes/transcribe.js'
import { noopAnalyzer, type ReviewAnalyzer } from './ai/reviewAnalysis.js'
import { denyAllAuth, type Auth } from './lib/auth.js'
import { adminRouter } from './routes/admin.js'
import { textsRouter } from './routes/texts.js'
import { telegramRouter } from './routes/telegram.js'
import { meRouter } from './routes/me.js'
import { chatRouter } from './routes/chat.js'
import { catalogRouter } from './routes/properties.js'
import { mortgageRouter } from './routes/mortgage.js'

export function createApp(store: Store = createMemoryStore(), notifier: Notifier = noopNotifier, agentDeps: AgentDeps = createAgentDeps(store, notifier), reviewAnalyzer: ReviewAnalyzer = noopAnalyzer, auth: Auth = denyAllAuth, mount?: (app: express.Express) => void) {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors({ origin: config.webOrigin.split(',') }))
  app.use(express.json({ limit: '100kb' }))
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })
  app.use('/api/mortgage', mortgageRouter)
  app.use('/api/currency', currencyRouter)
  app.use('/api/estimate', estimateRouter)
  app.use('/api', catalogRouter(store))
  app.use('/api/transcribe', transcribeRouter(agentDeps.transcribe))
  app.use('/api/chat', chatRouter(store, agentDeps))
  app.use('/api/me', meRouter(store, auth))
  app.use('/api/texts', textsRouter(store))
  app.use('/api/admin', adminRouter(store, auth, agentDeps))
  app.use('/api/telegram', telegramRouter(config.telegramToken))
  app.use('/api/leads', leadsRouter(store, notifier, config.telegramToken))
  app.use('/api/reviews', reviewsRouter(store, notifier, reviewAnalyzer))

  mount?.(app) // дополнительные маршруты (вебхук Telegram) до обработчика «не найдено»
  app.use(notFound)
  app.use(errorHandler)
  return app
}
