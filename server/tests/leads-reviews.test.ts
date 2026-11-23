import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createMemoryStore } from '../src/lib/store.js'

const make = () => {
  const store = createMemoryStore()
  return { store, app: createApp(store) }
}

describe('POST /api/leads', () => {
  const valid = { name: 'Алишер', phone: '+998901234567', property_id: 3, message: 'Хочу посмотреть в субботу' }

  it('валидная заявка → 201 и попадает в хранилище', async () => {
    const { app, store } = make()
    const r = await request(app).post('/api/leads').send(valid)
    expect(r.status).toBe(201)
    const leads = await store.listLeads()
    expect(leads).toHaveLength(1)
    expect(leads[0]).toMatchObject({ name: 'Алишер', phone: '+998901234567', property_id: 3, status: 'new', source: 'site' })
  })

  it('телефон с пробелами и скобками нормализуется', async () => {
    const { app, store } = make()
    await request(app).post('/api/leads').send({ ...valid, phone: '+998 (90) 123-45-67' }).expect(201)
    expect((await store.listLeads())[0].phone).toBe('+998901234567')
  })

  it.each([['123'], ['+7901234567'], ['+99890123456'], ['+9989012345678'], ['998901234567'], ['']])('неверный телефон %j → 400', async (phone) => {
    const { app, store } = make()
    const r = await request(app).post('/api/leads').send({ ...valid, phone })
    expect(r.status).toBe(400)
    expect(r.body.details[0].field).toBe('phone')
    expect(await store.listLeads()).toHaveLength(0)
  })

  it('короткое имя → 400', async () => {
    const { app } = make()
    const r = await request(app).post('/api/leads').send({ ...valid, name: 'А' })
    expect(r.status).toBe(400)
    expect(r.body.details[0].field).toBe('name')
  })

  it('чужой источник и статус нельзя задать', async () => {
    const { app } = make()
    expect((await request(app).post('/api/leads').send({ ...valid, source: 'hack' })).status).toBe(400)
    const { app: app2, store } = make()
    await request(app2).post('/api/leads').send({ ...valid, status: 'closed' }).expect(201)
    expect((await store.listLeads())[0].status).toBe('new') // лишнее поле status игнорируется
  })

  it('заявки нельзя прочитать через публичный GET', async () => {
    const { app } = make()
    expect((await request(app).get('/api/leads')).status).toBe(404)
  })
})

describe('/api/reviews', () => {
  it('GET отдаёт демо-отзывы без служебных полей, новые сверху', async () => {
    const { app } = make()
    const r = await request(app).get('/api/reviews')
    expect(r.status).toBe(200)
    expect(r.body.length).toBeGreaterThan(0)
    expect(Object.keys(r.body[0]).sort()).toEqual(['author', 'created_at', 'id', 'rating', 'text'])
    const dates = r.body.map((x: { created_at: string }) => x.created_at)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('POST создаёт отзыв, он появляется в списке первым', async () => {
    const { app } = make()
    await request(app).post('/api/reviews').send({ rating: 5, text: 'Отличный сервис', author: 'Дилноза' }).expect(201)
    const list = (await request(app).get('/api/reviews')).body
    expect(list[0]).toMatchObject({ author: 'Дилноза', rating: 5, text: 'Отличный сервис' })
  })

  it.each([[0], [6], [3.5]])('оценка %s → 400', async (rating) => {
    const { app } = make()
    const r = await request(app).post('/api/reviews').send({ rating, text: 'Нормально' })
    expect(r.status).toBe(400)
  })

  it('пустой текст → 400', async () => {
    const { app } = make()
    expect((await request(app).post('/api/reviews').send({ rating: 4, text: ' ' })).status).toBe(400)
  })

  it('тональность и тему задать при создании нельзя', async () => {
    const { app, store } = make()
    await request(app).post('/api/reviews').send({ rating: 1, text: 'Плохо', sentiment: 'positive', topic: 'price' }).expect(201)
    const mine = (await store.listReviews(1))[0]
    expect(mine.sentiment).toBeNull()
    expect(mine.topic).toBeNull()
  })

  it('лимит: больше 5 отзывов в минуту → 429', async () => {
    const { app } = make()
    const codes: number[] = []
    for (let i = 0; i < 7; i++) codes.push((await request(app).post('/api/reviews').send({ rating: 5, text: 'Хорошо' })).status)
    expect(codes.slice(0, 5).every((c) => c === 201)).toBe(true)
    expect(codes).toContain(429)
  })
})
