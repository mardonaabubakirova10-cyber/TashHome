import express, { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { MAX_AUDIO_BYTES, normalizeAudioType } from '../ai/transcribe.js'
import { AiUnavailableError } from '../ai/gemini.js'
import { HttpError } from '../lib/errors.js'

/** POST /api/transcribe — тело запроса само аудио (Content-Type audio/webm и т.п.), ответ {text}. */
export function transcribeRouter(transcribe: (audio: Buffer, mime: string) => Promise<string>) {
  const router = Router()
  router.use(rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }))
  router.post('/', express.raw({ type: () => true, limit: MAX_AUDIO_BYTES }), async (req, res) => {
    const mime = normalizeAudioType(req.headers['content-type'])
    if (!mime) throw new HttpError(415, 'Неподдерживаемый формат аудио')
    const audio = req.body as Buffer
    if (!Buffer.isBuffer(audio) || audio.length < 500) throw new HttpError(400, 'Запись пустая или слишком короткая')
    try {
      res.json({ text: await transcribe(audio, mime) })
    } catch (e) {
      if (e instanceof AiUnavailableError) throw new HttpError(503, 'Распознавание речи временно недоступно')
      throw e
    }
  })
  return router
}
