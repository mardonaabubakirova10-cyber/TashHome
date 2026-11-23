import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { analysisSchema, type ReviewAnalyzer } from '../src/ai/reviewAnalysis.js'
import type { AgentDeps } from '../src/ai/agent.js'
import { createApp } from '../src/app.js'
import type { Notifier } from '../src/lib/notifier.js'
import { createMemoryStore } from '../src/lib/store.js'

const make = (analyze: ReviewAnalyzer) => {
  const store = createMemoryStore()
  const notifier: Notifier = { newLead: vi.fn().mockResolvedValue(undefined), negativeReview: vi.fn().mockResolvedValue(undefined) }
  return { store, notifier, app: createApp(store, notifier, {} as AgentDeps, analyze) }
}
const post = (app: ReturnType<typeof make>['app'], rating: number, text: string) => request(app).post('/api/reviews').send({ rating, text }).expect(201)
const saved = async (store: ReturnType<typeof make>['store'], id: number) => (await store.listReviews(50)).find((r) => r.id === id)!

describe('разметка отзыва', () => {
  it('тональность и тема сохраняются в отзыве', async () => {
    const { app, store } = make(async () => ({ sentiment: 'positive', topic: 'service' }))
    const r = await post(app, 5, 'Быстро и удобно')
    await vi.waitFor(async () => expect((await saved(store, r.body.id)).topic).toBe('service'))
    expect((await saved(store, r.body.id)).sentiment).toBe('positive')
  })

  it('негативный текст при 5 звёздах всё равно уведомляет менеджеров', async () => {
    const { app, notifier } = make(async () => ({ sentiment: 'negative', topic: 'manager' }))
    await post(app, 5, 'Менеджер грубил, но ставлю 5')
    await vi.waitFor(() => expect(notifier.negativeReview).toHaveBeenCalledTimes(1))
    expect(vi.mocked(notifier.negativeReview).mock.calls[0][0]).toMatchObject({ sentiment: 'negative', topic: 'manager' })
  })

  it('позитивный отзыв не тревожит менеджеров', async () => {
    const { app, notifier, store } = make(async () => ({ sentiment: 'positive', topic: 'price' }))
    const r = await post(app, 5, 'Отлично')
    await vi.waitFor(async () => expect((await saved(store, r.body.id)).sentiment).toBe('positive'))
    expect(notifier.negativeReview).not.toHaveBeenCalled()
  })

  it('ИИ недоступен: отзыв сохранён, при 1 звезде уведомление по правилу оценки', async () => {
    const { app, notifier, store } = make(async () => null)
    const r = await post(app, 1, 'Ужасно')
    await vi.waitFor(() => expect(notifier.negativeReview).toHaveBeenCalledTimes(1))
    expect((await saved(store, r.body.id)).sentiment).toBeNull()
  })

  it('исключение в анализаторе не ломает ответ и не роняет сервер', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { app, notifier } = make(async () => {
      throw new Error('boom')
    })
    await post(app, 2, 'Плохо')
    await vi.waitFor(() => expect(notifier.negativeReview).toHaveBeenCalledTimes(1))
    err.mockRestore()
  })
})

describe('схема разметки', () => {
  it('отклоняет неизвестные значения', () => {
    expect(analysisSchema.safeParse({ sentiment: 'great', topic: 'service' }).success).toBe(false)
    expect(analysisSchema.safeParse({ sentiment: 'neutral', topic: 'weather' }).success).toBe(false)
    expect(analysisSchema.safeParse({ sentiment: 'neutral', topic: 'other' }).success).toBe(true)
  })
})
