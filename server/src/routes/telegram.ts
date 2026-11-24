import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { HttpError } from '../lib/errors.js'
import { verifyInitData } from '../lib/telegramAuth.js'

/** POST /api/telegram/auth — вход из Mini App: проверяет подпись initData и возвращает данные пользователя Telegram. */
export function telegramRouter(botToken: string) {
  const router = Router()
  router.post('/auth', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }), (req, res) => {
    const { init_data } = z.object({ init_data: z.string().max(4096) }).parse(req.body)
    const v = verifyInitData(init_data, botToken)
    if (!v) throw new HttpError(401, 'Подпись Telegram недействительна')
    res.json({ user: { id: v.user.id, first_name: v.user.first_name, last_name: v.user.last_name ?? null, username: v.user.username ?? null, lang: v.user.language_code?.startsWith('uz') ? 'uz' : 'ru' } })
  })
  return router
}
