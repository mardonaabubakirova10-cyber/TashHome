import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import type { Auth, AuthUser } from '../src/lib/auth.js'
import { createMemoryStore } from '../src/lib/store.js'

const users: Record<string, AuthUser> = {
  a: { id: 'user-a', email: 'a@x.uz', role: 'client' },
  b: { id: 'user-b', email: 'b@x.uz', role: 'client' },
}
const auth: Auth = { verify: async (t) => users[t] ?? null }
const make = () => createApp(createMemoryStore(), undefined, undefined, undefined, auth)
const as = (t: string) => ({ Authorization: `Bearer ${t}` })

describe('/api/me', () => {
  it('без входа → 401', async () => {
    await request(make()).get('/api/me').expect(401)
    await request(make()).get('/api/me/favorites').expect(401)
  })

  it('профиль вошедшего клиента', async () => {
    const r = await request(make()).get('/api/me').set(as('a')).expect(200)
    expect(r.body).toEqual({ id: 'user-a', email: 'a@x.uz', role: 'client' })
  })

  it('избранное сохраняется и читается, дубли и несуществующие дома отбрасываются', async () => {
    const app = make()
    const put = await request(app).put('/api/me/favorites').set(as('a')).send({ ids: [3, 5, 3, 99999] }).expect(200)
    expect(put.body.ids).toEqual([3, 5])
    expect((await request(app).get('/api/me/favorites').set(as('a'))).body.ids).toEqual([3, 5])
  })

  it('избранное одного пользователя не видно другому', async () => {
    const app = make()
    await request(app).put('/api/me/favorites').set(as('a')).send({ ids: [1, 2] }).expect(200)
    expect((await request(app).get('/api/me/favorites').set(as('b'))).body.ids).toEqual([])
  })

  it('неверные данные → 400', async () => {
    const app = make()
    await request(app).put('/api/me/favorites').set(as('a')).send({ ids: ['x'] }).expect(400)
    await request(app).put('/api/me/favorites').set(as('a')).send({ ids: Array(201).fill(1) }).expect(400)
    await request(app).put('/api/me/favorites').set(as('a')).send({}).expect(400)
  })
})
