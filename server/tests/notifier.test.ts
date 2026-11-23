import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { createTelegramNotifier, leadText, type Notifier } from '../src/lib/notifier.js'
import { createMemoryStore, type Lead } from '../src/lib/store.js'

const lead: Lead = { id: 1, property_id: 7, name: 'Али <b>', phone: '+998901234567', message: 'в субботу', source: 'site', status: 'new', created_at: '' }

describe('текст уведомления', () => {
  it('содержит имя, телефон, ссылку на объект; HTML экранируется', () => {
    const t = leadText(lead, 'http://x.uz')
    expect(t).toContain('+998901234567')
    expect(t).toContain('http://x.uz/catalog/7')
    expect(t).toContain('Али &lt;b&gt;')
  })
})

describe('createTelegramNotifier', () => {
  it('отправляет в нужный чат, токен только в адресе запроса', async () => {
    const f = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    await createTelegramNotifier('T0KEN', '-100', f).newLead(lead)
    const [url, init] = f.mock.calls[0]
    expect(String(url)).toBe('https://api.telegram.org/botT0KEN/sendMessage')
    expect(JSON.parse((init as RequestInit).body as string).chat_id).toBe('-100')
  })

  it('сбой сети не бросает исключение', async () => {
    const f = vi.fn().mockRejectedValue(new Error('net'))
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(createTelegramNotifier('T', '1', f).newLead(lead)).resolves.toBeUndefined()
    expect(JSON.stringify(err.mock.calls)).not.toContain('botT')
    err.mockRestore()
  })
})

describe('вызовы из API', () => {
  const make = () => {
    const notifier: Notifier = { newLead: vi.fn().mockResolvedValue(undefined), negativeReview: vi.fn().mockResolvedValue(undefined) }
    return { notifier, app: createApp(createMemoryStore(), notifier) }
  }

  it('новая заявка → уведомление', async () => {
    const { app, notifier } = make()
    await request(app).post('/api/leads').send({ name: 'Алишер', phone: '+998901234567' }).expect(201)
    expect(notifier.newLead).toHaveBeenCalledTimes(1)
  })

  it('невалидная заявка → уведомления нет', async () => {
    const { app, notifier } = make()
    await request(app).post('/api/leads').send({ name: 'А', phone: '1' }).expect(400)
    expect(notifier.newLead).not.toHaveBeenCalled()
  })

  it('отзыв 1–2 звезды → уведомление, 5 звёзд → нет', async () => {
    const { app, notifier } = make()
    await request(app).post('/api/reviews').send({ rating: 5, text: 'отлично' }).expect(201)
    expect(notifier.negativeReview).not.toHaveBeenCalled()
    await request(app).post('/api/reviews').send({ rating: 1, text: 'плохо' }).expect(201)
    expect(notifier.negativeReview).toHaveBeenCalledTimes(1)
  })
})
