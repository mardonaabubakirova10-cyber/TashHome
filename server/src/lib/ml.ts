import { config } from '../config.js'
import { HttpError } from './errors.js'

// Бесплатный ml-сервис засыпает: пока он просыпается, Render отвечает ошибкой сразу, поэтому пробуем ещё раз
const WAKING = new Set([429, 502, 503, 504])
const WAIT_TOTAL = 70_000
const PAUSE = 4_000

type Options = { fetchImpl?: typeof fetch; totalMs?: number; pauseMs?: number }

/** POST /predict в ml-сервис с ожиданием пробуждения. Кидает HttpError 502/503, если оценку получить не удалось. */
export async function predictPrice(params: unknown, o: Options = {}): Promise<Response> {
  const doFetch = o.fetchImpl ?? fetch
  const deadline = Date.now() + (o.totalMs ?? WAIT_TOTAL)
  const pause = o.pauseMs ?? PAUSE
  for (;;) {
    let res: Response | null = null
    try {
      res = await doFetch(`${config.mlUrl}/predict`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
      })
    } catch {
      /* нет связи или таймаут: попробуем ещё, пока есть время */
    }
    if (res?.ok) return res
    if (res && !WAKING.has(res.status)) throw new HttpError(502, 'Сервис оценки вернул ошибку')
    if (Date.now() + pause >= deadline) {
      throw res ? new HttpError(502, 'Сервис оценки вернул ошибку') : new HttpError(503, 'Сервис оценки недоступен')
    }
    await new Promise((resolve) => setTimeout(resolve, pause))
  }
}
