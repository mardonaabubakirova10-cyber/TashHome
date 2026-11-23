import { Router } from 'express'
import { z } from 'zod'
import { requireRole, type Auth } from '../lib/auth.js'
import { HttpError } from '../lib/errors.js'
import type { Store } from '../lib/store.js'

const page = z.coerce.number().int().min(1).default(1)
const pageSize = z.coerce.number().int().min(1).max(100).default(20)
const STATUSES = ['new', 'in_progress', 'viewing', 'closed', 'rejected'] as const
const leadQuery = z.object({ status: z.enum(STATUSES).optional(), page, pageSize })
const reviewQuery = z.object({
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  topic: z.enum(['service', 'price', 'property', 'manager', 'other']).optional(),
  page,
  pageSize,
})
const leadPatch = z.object({ status: z.enum(STATUSES) })

/** Служебные маршруты: заявки и отзывы доступны менеджерам и администраторам. */
export function adminRouter(store: Store, auth: Auth) {
  const router = Router()
  router.use(requireRole(auth, 'manager', 'admin'))

  router.get('/me', (req, res) => {
    res.json({ id: req.user!.id, email: req.user!.email, role: req.user!.role })
  })

  router.get('/leads', async (req, res) => {
    res.json(await store.adminListLeads(leadQuery.parse(req.query)))
  })

  router.patch('/leads/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Неверный номер заявки')
    const lead = await store.adminUpdateLead(id, leadPatch.parse(req.body))
    if (!lead) throw new HttpError(404, 'Заявка не найдена')
    res.json(lead)
  })

  router.get('/reviews', async (req, res) => {
    res.json(await store.adminListReviews(reviewQuery.parse(req.query)))
  })
  return router
}
