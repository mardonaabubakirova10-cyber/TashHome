import { Router } from 'express'
import { z } from 'zod'
import type { Store } from '../lib/store.js'

// Телефон Узбекистана: +998 и девять цифр. Пробелы, скобки и дефисы разрешаем и убираем.
const phone = z
  .string()
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^\+998\d{9}$/, 'Телефон должен быть в формате +998XXXXXXXXX'))

const schema = z.object({
  property_id: z.number().int().positive().optional(),
  name: z.string().trim().min(2, 'Укажите имя').max(100),
  phone,
  message: z.string().trim().max(2000).optional(),
  source: z.enum(['site', 'miniapp', 'bot', 'assistant']).default('site'),
})

export function leadsRouter(store: Store) {
  const router = Router()
  router.post('/', async (req, res) => {
    const data = schema.parse(req.body)
    const lead = await store.addLead({
      property_id: data.property_id ?? null,
      name: data.name,
      phone: data.phone,
      message: data.message || null,
      source: data.source,
    })
    res.status(201).json({ id: lead.id })
  })
  return router
}
