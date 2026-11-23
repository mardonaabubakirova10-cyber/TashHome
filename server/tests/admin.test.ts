import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import type { AgentDeps } from '../src/ai/agent.js'
import { createApp } from '../src/app.js'
import { createSupabaseAuth, type Auth, type AuthUser } from '../src/lib/auth.js'
import { createMemoryStore } from '../src/lib/store.js'

const users: Record<string, AuthUser> = {
  'tok-admin': { id: 'a', email: 'a@x.uz', role: 'admin' },
  'tok-manager': { id: 'm', email: 'm@x.uz', role: 'manager' },
  'tok-client': { id: 'c', email: 'c@x.uz', role: 'client' },
}
const auth: Auth = { verify: async (t) => users[t] ?? null }

const make = () => {
  const store = createMemoryStore()
  return { store, app: createApp(store, undefined, {} as AgentDeps, undefined, auth) }
}
const as = (token: string) => ({ Authorization: `Bearer ${token}` })

describe('доступ к /api/admin', () => {
  it('без токена → 401', async () => {
    await request(make().app).get('/api/admin/leads').expect(401)
  })

  it('неверный токен → 401', async () => {
    await request(make().app).get('/api/admin/leads').set(as('nope')).expect(401)
  })

  it('клиент → 403', async () => {
    await request(make().app).get('/api/admin/leads').set(as('tok-client')).expect(403)
  })

  it('менеджер и администратор → 200', async () => {
    const { app } = make()
    await request(app).get('/api/admin/leads').set(as('tok-manager')).expect(200)
    const me = await request(app).get('/api/admin/me').set(as('tok-admin')).expect(200)
    expect(me.body).toMatchObject({ role: 'admin', email: 'a@x.uz' })
  })

  it('по умолчанию (без Auth) никого не пускает', async () => {
    const { createApp: create } = await import('../src/app.js')
    await request(create(createMemoryStore())).get('/api/admin/leads').set(as('tok-admin')).expect(401)
  })
})

describe('заявки', () => {
  const seed = async (store: ReturnType<typeof createMemoryStore>) => {
    await store.addLead({ property_id: 1, name: 'Алишер', phone: '+998901234567', message: null, source: 'site' })
    await store.addLead({ property_id: null, name: 'Малика', phone: '+998931112233', message: 'позвоните', source: 'assistant' })
  }

  it('список с пагинацией, новые первыми', async () => {
    const { app, store } = make()
    await seed(store)
    const r = await request(app).get('/api/admin/leads?pageSize=1').set(as('tok-manager')).expect(200)
    expect(r.body.total).toBe(2)
    expect(r.body.items).toHaveLength(1)
    expect(r.body.items[0].name).toBe('Малика')
  })

  it('смена статуса и фильтр по статусу', async () => {
    const { app, store } = make()
    await seed(store)
    const upd = await request(app).patch('/api/admin/leads/1').set(as('tok-manager')).send({ status: 'viewing' }).expect(200)
    expect(upd.body.status).toBe('viewing')
    const list = await request(app).get('/api/admin/leads?status=viewing').set(as('tok-manager')).expect(200)
    expect(list.body.items.map((l: { id: number }) => l.id)).toEqual([1])
  })

  it('неверный статус → 400, несуществующая заявка → 404, неверный номер → 400', async () => {
    const { app } = make()
    await request(app).patch('/api/admin/leads/1').set(as('tok-manager')).send({ status: 'bad' }).expect(400)
    await request(app).patch('/api/admin/leads/99').set(as('tok-manager')).send({ status: 'closed' }).expect(404)
    await request(app).patch('/api/admin/leads/abc').set(as('tok-manager')).send({ status: 'closed' }).expect(400)
  })

  it('клиент не может менять заявки', async () => {
    await request(make().app).patch('/api/admin/leads/1').set(as('tok-client')).send({ status: 'closed' }).expect(403)
  })
})

describe('отзывы для сотрудников', () => {
  it('фильтр по тональности; в ответе есть sentiment и topic', async () => {
    const { app, store } = make()
    const r = await store.addReview({ author: 'X', rating: 1, text: 'плохо' })
    await store.setReviewAnalysis(r.id, 'negative', 'service')
    const res = await request(app).get('/api/admin/reviews?sentiment=negative').set(as('tok-admin')).expect(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0]).toMatchObject({ sentiment: 'negative', topic: 'service' })
  })

  it('публичный список отзывов не раскрывает разметку', async () => {
    const { app } = make()
    const res = await request(app).get('/api/reviews').expect(200)
    for (const r of res.body) expect(Object.keys(r)).not.toContain('sentiment')
  })
})

describe('createSupabaseAuth', () => {
  const resp = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
  const uid = '123e4567-e89b-12d3-a456-426614174000'

  it('возвращает роль из profiles', async () => {
    const f = vi.fn().mockResolvedValueOnce(resp({ id: uid, email: 'a@x.uz' })).mockResolvedValueOnce(resp([{ role: 'manager' }]))
    expect(await createSupabaseAuth('http://s', 'k', f).verify('t')).toEqual({ id: uid, email: 'a@x.uz', role: 'manager' })
  })

  it('недействительный токен → null, до profiles дело не доходит', async () => {
    const f = vi.fn().mockResolvedValue(resp({}, 401))
    expect(await createSupabaseAuth('http://s', 'k', f).verify('bad')).toBeNull()
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('нет строки профиля → client', async () => {
    const f = vi.fn().mockResolvedValueOnce(resp({ id: uid })).mockResolvedValueOnce(resp([]))
    expect((await createSupabaseAuth('http://s', 'k', f).verify('t'))?.role).toBe('client')
  })

  it('сбой сети → null, не исключение', async () => {
    const f = vi.fn().mockRejectedValue(new Error('net'))
    expect(await createSupabaseAuth('http://s', 'k', f).verify('t')).toBeNull()
  })

  it('идентификатор не в формате uuid отвергается (защита от подстановки в запрос)', async () => {
    const f = vi.fn().mockResolvedValue(resp({ id: "x') or ('1'='1" }))
    expect(await createSupabaseAuth('http://s', 'k', f).verify('t')).toBeNull()
  })
})
