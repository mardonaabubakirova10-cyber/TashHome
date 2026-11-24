import { Router } from 'express'
import { z } from 'zod'
import { requireRole, type Auth } from '../lib/auth.js'
import type { Store } from '../lib/store.js'

/** Личный кабинет: профиль и избранное. Доступен любому вошедшему пользователю. */
export function meRouter(store: Store, auth: Auth) {
  const router = Router()
  router.use(requireRole(auth, 'client', 'manager', 'admin'))

  router.get('/', (req, res) => {
    res.json({ id: req.user!.id, email: req.user!.email, role: req.user!.role })
  })

  router.get('/favorites', async (req, res) => {
    res.json({ ids: await store.getFavorites(req.user!.id) })
  })

  router.put('/favorites', async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.number().int().positive()).max(200) }).parse(req.body)
    res.json({ ids: await store.setFavorites(req.user!.id, ids) })
  })
  return router
}
