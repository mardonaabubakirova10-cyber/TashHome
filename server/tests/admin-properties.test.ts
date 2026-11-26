import { buildDemoProperties } from '../src/lib/demoProperties.js'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import type { AgentDeps } from '../src/ai/agent.js'
import { AiUnavailableError } from '../src/ai/gemini.js'
import { reindexProperty } from '../src/ai/reindex.js'
import { createApp } from '../src/app.js'
import { labelFor, propertyInput } from '../src/lib/adminProperty.js'
import type { Auth } from '../src/lib/auth.js'
import { buildStats } from '../src/lib/stats.js'
import { createMemoryStore } from '../src/lib/store.js'

const auth: Auth = { verify: async (t) => (t === 'm' ? { id: 'm', email: 'm@x.uz', role: 'manager' } : t === 'c' ? { id: 'c', email: null, role: 'client' } : null) }
const H = { Authorization: 'Bearer m' }

const valid = {
  deal_type: 'sale', title_ru: 'Новый дом', title_uz: 'Yangi uy', district_id: 'chilanzar', price_usd: 90000, area_m2: 120, land_sotka: 6,
  rooms: 4, floors: 2, building_type: 'brick', renovation: 'euro', year_built: 2015, photos: ['/houses/house-01.jpg'],
}

const make = (over: Partial<AgentDeps> = {}) => {
  const store = createMemoryStore()
  const deps = {
    estimate: vi.fn(async () => ({ predicted_price_usd: 100000 })),
    embedDocument: vi.fn(async () => [0.5, 0.5]),
    describeProperty: vi.fn(async () => ({ ru: 'Описание дома на русском языке', uz: 'Uyning oʻzbekcha tavsifi bor' })),
    ...over,
  } as unknown as AgentDeps
  return { store, deps, app: createApp(store, undefined, deps, undefined, auth) }
}

describe('схема дома', () => {
  it('принимает корректный дом и подставляет значения по умолчанию', () => {
    const r = propertyInput.parse({ ...valid, photos: undefined })
    expect(r.status).toBe('active')
    expect(r.photos).toEqual([])
    expect(r.address).toBeNull()
  })

  it.each([
    ['цена ноль', { price_usd: 0 }],
    ['комнат 0', { rooms: 0 }],
    ['район не из списка', { district_id: 'moon' }],
    ['фото javascript:', { photos: ['javascript:alert(1)'] }],
    ['фото data:', { photos: ['data:text/html;base64,AAAA'] }],
    ['фото http без s', { photos: ['http://x.uz/a.jpg'] }],
    ['слишком много фото', { photos: Array(13).fill('/houses/house-01.jpg') }],
    ['широта вне Узбекистана', { lat: 10 }],
  ])('отклоняет: %s', (_n, patch) => {
    expect(propertyInput.safeParse({ ...valid, ...patch }).success).toBe(false)
  })
})

describe('правка не затирает остальные поля', () => {
  it('в схеме правки нет значений по умолчанию', async () => {
    const { propertyPatch } = await import('../src/lib/adminProperty.js')
    expect(propertyPatch.parse({ price_usd: 5 })).toEqual({ price_usd: 5 })
    expect(propertyPatch.parse({})).toEqual({})
  })

  it('смена цены сохраняет статус и фото', async () => {
    const { app } = make()
    const photos = buildDemoProperties()[3].photos
    await request(app).patch('/api/admin/properties/4').set(H).send({ status: 'sold' }).expect(200)
    const r = await request(app).patch('/api/admin/properties/4').set(H).send({ price_usd: 111000 }).expect(200)
    expect(r.body.status).toBe('sold')
    expect(r.body.photos).toEqual(photos)
  })
})

describe('метка цены', () => {
  it('граница ±10 %', () => {
    expect(labelFor(89000, 100000)).toBe('below')
    expect(labelFor(95000, 100000)).toBe('fair')
    expect(labelFor(111000, 100000)).toBe('above')
  })
})

describe('/api/admin/properties', () => {
  it('создание → 201, пересчёт метки и вектора в фоне', async () => {
    const { app, store, deps } = make()
    const r = await request(app).post('/api/admin/properties').set(H).send({ ...valid, price_usd: 85000 }).expect(201)
    await vi.waitFor(async () => expect((await store.adminGetProperty(r.body.id))?.price_label).toBe('below')) // 85000 против 100000
    expect((await store.adminGetProperty(r.body.id))?.predicted_price_usd).toBe(100000)
    expect(deps.embedDocument).toHaveBeenCalledTimes(1)
  })

  it('невалидные данные → 400 с описанием полей', async () => {
    const { app } = make()
    const r = await request(app).post('/api/admin/properties').set(H).send({ ...valid, price_usd: -5 }).expect(400)
    expect(JSON.stringify(r.body.details)).toContain('price_usd')
  })

  it('правка и скрытие дома', async () => {
    const { app } = make()
    const r = await request(app).patch('/api/admin/properties/3').set(H).send({ status: 'hidden', price_usd: 123000 }).expect(200)
    expect(r.body).toMatchObject({ id: 3, status: 'hidden', price_usd: 123000 })
    const list = await request(app).get('/api/admin/properties?status=hidden').set(H).expect(200)
    expect(list.body.items.map((p: { id: number }) => p.id)).toEqual([3])
  })

  it('пустая правка → 400, несуществующий дом → 404', async () => {
    const { app } = make()
    await request(app).patch('/api/admin/properties/3').set(H).send({}).expect(400)
    await request(app).patch('/api/admin/properties/9999').set(H).send({ rooms: 3 }).expect(404)
    await request(app).get('/api/admin/properties/9999').set(H).expect(404)
  })

  it('поиск по названию и номеру, пагинация', async () => {
    const { app } = make()
    const all = await request(app).get('/api/admin/properties?pageSize=10').set(H)
    expect(all.body.total).toBe(100)
    expect(all.body.items).toHaveLength(10)
    const one = await request(app).get('/api/admin/properties?q=5').set(H)
    expect(one.body.items.length).toBeGreaterThan(0)
  })

  it('клиент и аноним не имеют доступа', async () => {
    const { app } = make()
    await request(app).get('/api/admin/properties').expect(401)
    await request(app).post('/api/admin/properties').set({ Authorization: 'Bearer c' }).send(valid).expect(403)
  })
})

describe('описание нейросетью', () => {
  const facts = { deal_type: 'sale', district_id: 'mirabad', area_m2: 150, land_sotka: 8, rooms: 5, floors: 2, building_type: 'brick', renovation: 'euro' }

  it('возвращает русский и узбекский текст', async () => {
    const { app } = make()
    const r = await request(app).post('/api/admin/properties/describe').set(H).send(facts).expect(200)
    expect(Object.keys(r.body).sort()).toEqual(['ru', 'uz'])
  })

  it('сбой ИИ → 503 с понятным сообщением', async () => {
    const { app } = make({ describeProperty: vi.fn().mockRejectedValue(new AiUnavailableError()) })
    const r = await request(app).post('/api/admin/properties/describe').set(H).send(facts).expect(503)
    expect(r.body.error).toContain('попробуйте позже')
  })

  it('неполные факты → 400', async () => {
    await request(make().app).post('/api/admin/properties/describe').set(H).send({ rooms: 3 }).expect(400)
  })
})

describe('reindexProperty', () => {
  it('аренда: метка очищается; ошибка ml-сервиса не бросает исключение', async () => {
    const store = createMemoryStore()
    await store.adminUpdateProperty(5, { deal_type: 'rent' })
    await reindexProperty(store, { estimate: vi.fn().mockRejectedValue(new Error('ml down')), embedDocument: vi.fn().mockResolvedValue([1]) }, 5)
    expect((await store.adminGetProperty(5))?.price_label).toBeNull()
    await store.adminUpdateProperty(6, { deal_type: 'sale' })
    await expect(reindexProperty(store, { estimate: vi.fn().mockRejectedValue(new Error('ml down')), embedDocument: vi.fn().mockRejectedValue(new Error('x')) }, 6)).resolves.toBeUndefined()
  })
})

describe('buildStats', () => {
  const now = new Date('2026-11-24T12:00:00Z')
  const lead = (d: string, source = 'site', status = 'new') => ({ created_at: `${d}T10:00:00Z`, source, status }) as never
  const base = { leads: [], reviews: [], properties: [], chat: [] }

  it('заявки по дням: 30 точек, пустые дни нулями, недели сравниваются', () => {
    const s = buildStats({ ...base, leads: [lead('2026-11-24'), lead('2026-11-23', 'assistant'), lead('2026-11-15')] }, now)
    expect(s.leads.byDay).toHaveLength(30)
    expect(s.leads.byDay.at(-1)).toEqual({ date: '2026-11-24', count: 1 })
    expect(s.leads.last7).toBe(2)
    expect(s.leads.prev7).toBe(1)
    expect(s.leads.bySource).toEqual({ site: 2, assistant: 1 })
  })

  it('отзывы: средняя оценка и тональность', () => {
    const s = buildStats({ ...base, reviews: [{ rating: 5, sentiment: 'positive', topic: 'service' }, { rating: 2, sentiment: 'negative', topic: 'price' }] }, now)
    expect(s.reviews.avgRating).toBe(3.5)
    expect(s.reviews.bySentiment).toEqual({ positive: 1, negative: 1 })
  })

  it('ассистент: процент полезных, задержка, вопросы без ответа', () => {
    const t = '2026-11-24T10:00:00Z'
    const chat = [
      { role: 'assistant', content: 'не знаю', tool_calls: [{ name: 'search_knowledge', summary: '{"result":{"found":false}}' }], rating: -1, latency_ms: 3000, created_at: t },
      { role: 'user', content: 'какой налог на продажу?', tool_calls: null, rating: 0, latency_ms: null, created_at: t },
      { role: 'assistant', content: 'ответ', tool_calls: null, rating: 1, latency_ms: 1000, created_at: t },
      { role: 'user', content: 'привет', tool_calls: null, rating: 0, latency_ms: null, created_at: t },
    ] as never
    const s = buildStats({ ...base, chat }, now)
    expect(s.assistant).toMatchObject({ answers: 2, avgLatencyMs: 2000, up: 1, down: 1, helpfulPercent: 50 })
    expect(s.assistant.unanswered).toEqual([{ question: 'какой налог на продажу?', date: t }])
  })

  it('пустые данные не ломают расчёт', () => {
    const s = buildStats(base, now)
    expect(s.reviews.avgRating).toBeNull()
    expect(s.assistant.helpfulPercent).toBeNull()
  })
})

describe('/api/admin/stats', () => {
  it('отдаёт статистику сотруднику', async () => {
    const { app } = make()
    const r = await request(app).get('/api/admin/stats').set(H).expect(200)
    expect(r.body.properties.active).toBe(100)
    expect(r.body.leads.byDay).toHaveLength(30)
  })
})

describe('загрузка фото', () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)])
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 1)])

  it('JPG и PNG принимаются, возвращается адрес', async () => {
    const { app, deps } = make({ uploadImage: vi.fn().mockResolvedValue('https://x.supabase.co/storage/v1/object/public/property-photos/a.jpg') } as never)
    const r = await request(app).post('/api/admin/uploads').set(H).set('content-type', 'image/jpeg').send(jpeg).expect(201)
    expect(r.body.url).toMatch(/^https:\/\//)
    await request(app).post('/api/admin/uploads').set(H).set('content-type', 'application/octet-stream').send(png).expect(201)
    expect(deps.uploadImage).toHaveBeenCalledWith(expect.any(Buffer), 'image/png', 'png')
  })

  it('не картинка под видом картинки → 415 (проверяется содержимое, а не заголовок)', async () => {
    const { app } = make()
    await request(app).post('/api/admin/uploads').set(H).set('content-type', 'image/jpeg').send(Buffer.from('<html><script>alert(1)</script></html>')).expect(415)
  })

  it('больше 5 МБ → 413', async () => {
    const { app } = make()
    await request(app).post('/api/admin/uploads').set(H).set('content-type', 'image/jpeg').send(Buffer.concat([jpeg, Buffer.alloc(5 * 1024 * 1024)])).expect(413)
  })

  it('без входа → 401', async () => {
    await request(make().app).post('/api/admin/uploads').set('content-type', 'image/jpeg').send(jpeg).expect(401)
  })
})

describe('тексты сайта', () => {
  it('публичный GET отдаёт изменённые тексты после правки в админке', async () => {
    const { app } = make()
    expect((await request(app).get('/api/texts').expect(200)).body).toEqual({ ru: {}, uz: {} })
    await request(app).put('/api/admin/texts').set(H).send({ lang: 'ru', key: 'home.heroLine1', value: 'Новый заголовок' }).expect(200)
    expect((await request(app).get('/api/texts')).body.ru).toEqual({ 'home.heroLine1': 'Новый заголовок' })
  })

  it('пустое значение возвращает стандартный текст', async () => {
    const { app } = make()
    await request(app).put('/api/admin/texts').set(H).send({ lang: 'uz', key: 'home.title', value: 'X' }).expect(200)
    await request(app).put('/api/admin/texts').set(H).send({ lang: 'uz', key: 'home.title', value: '' }).expect(200)
    expect((await request(app).get('/api/texts')).body.uz).toEqual({})
  })

  it.each([['чужой раздел', 'nav.home'], ['служебные символы', 'home.a;drop'], ['вложенный путь', 'home.a.b']])('недопустимый ключ отклоняется: %s', async (_n, key) => {
    await request(make().app).put('/api/admin/texts').set(H).send({ lang: 'ru', key, value: 'x' }).expect(400)
  })

  it('слишком длинный текст → 400, клиент не может менять тексты', async () => {
    const { app } = make()
    await request(app).put('/api/admin/texts').set(H).send({ lang: 'ru', key: 'home.title', value: 'я'.repeat(601) }).expect(400)
    await request(app).put('/api/admin/texts').set({ Authorization: 'Bearer c' }).send({ lang: 'ru', key: 'home.title', value: 'x' }).expect(403)
  })
})

describe('база знаний в админке', () => {
  const doc = { title: 'Налоги при покупке', content: 'Налоги и сборы при покупке дома зависят от стоимости объекта и действующего порядка. '.repeat(30) }
  const adminAuth: Auth = { verify: async (t) => (t === 'a' ? { id: 'a', email: null, role: 'admin' } : t === 'm' ? { id: 'm', email: null, role: 'manager' } : null) }
  const build = () => {
    const store = createMemoryStore()
    const deps = { embedMany: vi.fn(async (t: string[]) => t.map(() => [0.1])) } as unknown as AgentDeps
    return { deps, app: createApp(store, undefined, deps, undefined, adminAuth) }
  }
  const A = { Authorization: 'Bearer a' }

  it('документ разбивается на фрагменты, индексируется и появляется в списке; удаляется', async () => {
    const { app, deps } = build()
    const r = await request(app).post('/api/admin/kb').set(A).send(doc).expect(201)
    expect(r.body.chunks).toBeGreaterThan(1)
    expect(vi.mocked(deps.embedMany).mock.calls[0][0]).toHaveLength(r.body.chunks)
    expect((await request(app).get('/api/admin/kb').set(A)).body).toHaveLength(1)
    await request(app).delete(`/api/admin/kb/${r.body.id}`).set(A).expect(200)
    await request(app).delete(`/api/admin/kb/${r.body.id}`).set(A).expect(404)
  })

  it('менеджеру база знаний недоступна (403)', async () => {
    const { app } = build()
    await request(app).get('/api/admin/kb').set({ Authorization: 'Bearer m' }).expect(403)
    await request(app).post('/api/admin/kb').set({ Authorization: 'Bearer m' }).send(doc).expect(403)
  })

  it('слишком короткий текст и сбой ИИ', async () => {
    const { app, deps } = build()
    await request(app).post('/api/admin/kb').set(A).send({ title: 'Коротко', content: 'мало' }).expect(400)
    vi.mocked(deps.embedMany).mockRejectedValueOnce(new AiUnavailableError())
    const r = await request(app).post('/api/admin/kb').set(A).send(doc).expect(503)
    expect(r.body.error).toContain('попробуйте позже')
  })
})
