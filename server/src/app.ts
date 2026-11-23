import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { config } from './config.js'
import { errorHandler, notFound } from './lib/errors.js'
import { currencyRouter } from './routes/currency.js'
import { createMemoryStore, type Store } from './lib/store.js'
import { estimateRouter } from './routes/estimate.js'
import { leadsRouter } from './routes/leads.js'
import { reviewsRouter } from './routes/reviews.js'
import { mortgageRouter } from './routes/mortgage.js'

export function createApp(store: Store = createMemoryStore()) {
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
  app.use('/api/leads', leadsRouter(store))
  app.use('/api/reviews', reviewsRouter(store))

  app.use(notFound)
  app.use(errorHandler)
  return app
}
