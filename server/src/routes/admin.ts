import express, { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import type { AgentDeps } from '../ai/agent.js'
import { AiUnavailableError } from '../ai/gemini.js'
import { reindexProperty } from '../ai/reindex.js'
import { propertyInput, propertyPatch } from '../lib/adminProperty.js'
import { requireRole, type Auth } from '../lib/auth.js'
import { HttpError } from '../lib/errors.js'
import { MAX_IMAGE_BYTES, sniffImage } from '../lib/imageUpload.js'
import { buildStats } from '../lib/stats.js'
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
const propertyQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'sold', 'hidden']).optional(),
  deal: z.enum(['sale', 'rent']).optional(),
  page,
  pageSize,
})
const describeInput = propertyInput.pick({ deal_type: true, district_id: true, address: true, area_m2: true, land_sotka: true, rooms: true, floors: true, building_type: true, renovation: true, year_built: true })

const textBody = z.object({
  lang: z.enum(['ru', 'uz']),
  key: z.string().regex(/^home\.[A-Za-z0-9]+$/, 'Недопустимый ключ текста'),
  value: z.string().trim().max(600).nullable(), // null или пустая строка = вернуть стандартный текст
})

const idParam = (raw: string | string[] | undefined, what: string) => {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, `Неверный номер: ${what}`)
  return id
}

/** Служебные маршруты: доступны менеджерам и администраторам. */
export function adminRouter(store: Store, auth: Auth, deps?: AgentDeps) {
  const router = Router()
  router.use(requireRole(auth, 'manager', 'admin'))

  router.get('/me', (req, res) => {
    res.json({ id: req.user!.id, email: req.user!.email, role: req.user!.role })
  })

  // ---- заявки
  router.get('/leads', async (req, res) => {
    res.json(await store.adminListLeads(leadQuery.parse(req.query)))
  })

  router.patch('/leads/:id', async (req, res) => {
    const lead = await store.adminUpdateLead(idParam(req.params.id, 'заявки'), leadPatch.parse(req.body))
    if (!lead) throw new HttpError(404, 'Заявка не найдена')
    res.json(lead)
  })

  // ---- отзывы
  router.get('/reviews', async (req, res) => {
    res.json(await store.adminListReviews(reviewQuery.parse(req.query)))
  })

  // ---- дома
  router.get('/properties', async (req, res) => {
    res.json(await store.adminListProperties(propertyQuery.parse(req.query)))
  })

  router.get('/properties/:id', async (req, res) => {
    const p = await store.adminGetProperty(idParam(req.params.id, 'дома'))
    if (!p) throw new HttpError(404, 'Дом не найден')
    res.json(p)
  })

  router.post('/properties', async (req, res) => {
    const created = await store.adminCreateProperty(propertyInput.parse(req.body))
    res.status(201).json(created)
    if (deps) void reindexProperty(store, deps, created.id)
  })

  router.patch('/properties/:id', async (req, res) => {
    const id = idParam(req.params.id, 'дома')
    const patch = propertyPatch.parse(req.body)
    if (!Object.keys(patch).length) throw new HttpError(400, 'Нечего менять')
    const updated = await store.adminUpdateProperty(id, patch)
    if (!updated) throw new HttpError(404, 'Дом не найден')
    res.json(updated)
    if (deps) void reindexProperty(store, deps, id)
  })

  // загрузка фото: тело запроса — сам файл; тип определяем по содержимому
  router.post('/uploads', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }), express.raw({ type: () => true, limit: MAX_IMAGE_BYTES }), async (req, res) => {
    if (!deps) throw new HttpError(503, 'Загрузка недоступна')
    const data = req.body as Buffer
    const kind = Buffer.isBuffer(data) ? sniffImage(data) : null
    if (!kind) throw new HttpError(415, 'Нужен файл JPG, PNG или WebP')
    try {
      res.status(201).json({ url: await deps.uploadImage(data, kind.mime, kind.ext) })
    } catch {
      throw new HttpError(502, 'Не удалось сохранить фото, попробуйте ещё раз')
    }
  })

  // описание дома нейросетью: пользователь проверяет и правит текст сам, в базу он попадает только через сохранение
  router.post('/properties/describe', rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }), async (req, res) => {
    if (!deps) throw new HttpError(503, 'ИИ недоступен')
    const input = describeInput.parse(req.body)
    const district = (await store.listDistricts()).find((d) => d.id === input.district_id)
    try {
      res.json(await deps.describeProperty({ ...input, district_name: district?.name_ru }))
    } catch (e) {
      if (e instanceof AiUnavailableError) throw new HttpError(503, 'Не удалось сгенерировать описание, попробуйте позже')
      throw e
    }
  })

  // ---- тексты сайта
  router.get('/texts', async (_req, res) => {
    res.json(await store.listTexts())
  })
  router.put('/texts', async (req, res) => {
    const b = textBody.parse(req.body)
    await store.setText(b.lang, b.key, b.value ? b.value : null)
    res.json({ ok: true })
  })

  // ---- дашборд
  router.get('/stats', async (_req, res) => {
    res.json(buildStats(await store.adminStatsData()))
  })
  return router
}
