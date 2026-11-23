import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

/** Ошибка с кодом ответа: сообщение показываем пользователю как есть. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Не найдено' })
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Неверные данные',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    })
    return
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  // Некорректный JSON в теле запроса
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Некорректный JSON' })
    return
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Слишком большой запрос' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
}
