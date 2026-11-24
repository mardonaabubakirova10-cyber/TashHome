import { Router } from 'express'
import { z } from 'zod'
import { noopNotifier, type Notifier } from '../lib/notifier.js'
import { verifyInitData } from '../lib/telegramAuth.js'
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
  source: z.enum(['site', 'miniapp', 'bot', 'assistant']).default('site'), // принимается для совместимости, но источник определяет сервер
  init_data: z.string().max(4096).optional(), // подпись Telegram Mini App
})

export function leadsRouter(store: Store, notifier: Notifier = noopNotifier, botToken = '') {
  const router = Router()
  router.post('/', async (req, res) => {
    const data = schema.parse(req.body)
    // Источник определяет сервер: «miniapp» только при действительной подписи Telegram, всё остальное с сайта считается «site»
    const tg = data.init_data ? verifyInitData(data.init_data, botToken) : null
    const who = tg ? `[Telegram ${tg.user.username ? '@' + tg.user.username : 'id ' + tg.user.id}]` : ''
    const lead = await store.addLead({
      property_id: data.property_id ?? null,
      name: data.name,
      phone: data.phone,
      message: [who, data.message].filter(Boolean).join(' ') || null,
      source: tg ? 'miniapp' : 'site',
    })
    void notifier.newLead(lead) // не ждём Telegram: клиент получает ответ сразу
    res.status(201).json({ id: lead.id })
  })
  return router
}
