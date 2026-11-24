import { Router } from 'express'
import type { Store } from '../lib/store.js'

/** GET /api/texts — тексты сайта, изменённые в админке. Публичный, без секретов; браузер кеширует на минуту. */
export function textsRouter(store: Store) {
  const router = Router()
  router.get('/', async (_req, res) => {
    res.set('cache-control', 'public, max-age=60')
    try {
      res.json(await store.listTexts())
    } catch {
      res.json({ ru: {}, uz: {} }) // таблицы ещё нет или база недоступна: сайт работает на стандартных текстах
    }
  })
  return router
}
