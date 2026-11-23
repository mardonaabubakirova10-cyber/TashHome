import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { noopNotifier, type Notifier } from '../lib/notifier.js'
import { noopAnalyzer, type ReviewAnalyzer } from '../ai/reviewAnalysis.js'
import type { Store } from '../lib/store.js'

const schema = z.object({
  author: z.string().trim().max(60).optional(),
  rating: z.number().int().min(1, 'Оценка от 1 до 5').max(5, 'Оценка от 1 до 5'),
  text: z.string().trim().min(3, 'Напишите хотя бы пару слов').max(2000),
})

export function reviewsRouter(store: Store, notifier: Notifier = noopNotifier, analyze: ReviewAnalyzer = noopAnalyzer) {
  const router = Router()

  // отзывы может оставить кто угодно, поэтому лимит на запись строже общего
  const writeLimit = rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false })

  router.get('/', async (_req, res) => {
    const list = await store.listReviews(12)
    // в публичный ответ идут только нужные сайту поля
    res.json(list.map((r) => ({ id: r.id, author: r.author, rating: r.rating, text: r.text, created_at: r.created_at })))
  })

  router.post('/', writeLimit, async (req, res) => {
    const data = schema.parse(req.body)
    const review = await store.addReview({ author: data.author || null, rating: data.rating, text: data.text })
    res.status(201).json({ id: review.id })
    // разметка и уведомление идут в фоне: клиент не ждёт ИИ, а сбой ИИ не мешает сохранению отзыва
    void (async () => {
      let analysis = null
      try {
        analysis = await analyze(review.text, review.rating)
        if (analysis) await store.setReviewAnalysis(review.id, analysis.sentiment, analysis.topic)
      } catch {
        console.error('Разметка отзыва не удалась')
      }
      // менеджерам: низкая оценка или негативный текст (если ИИ недоступен, работает только правило по оценке)
      if (review.rating <= 2 || analysis?.sentiment === 'negative') {
        await notifier.negativeReview({ ...review, sentiment: analysis?.sentiment ?? review.sentiment, topic: analysis?.topic ?? review.topic })
      }
    })()
  })
  return router
}
