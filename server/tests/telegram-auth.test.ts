import { createHmac } from 'node:crypto'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { config } from '../src/config.js'
import { createMemoryStore } from '../src/lib/store.js'
import { verifyInitData } from '../src/lib/telegramAuth.js'

const TOKEN = '123456:TEST-TOKEN'
const NOW = Date.UTC(2026, 10, 24, 12, 0, 0)

/** Строит initData так же, как это делает Telegram. */
function sign(fields: Record<string, string>, token = TOKEN) {
  const check = Object.entries(fields).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(token).digest()
  const hash = createHmac('sha256', secret).update(check).digest('hex')
  return new URLSearchParams({ ...fields, hash }).toString()
}
const user = JSON.stringify({ id: 777, first_name: 'Али', username: 'ali', language_code: 'uz' })
const fresh = { auth_date: String(Math.floor(NOW / 1000) - 60), query_id: 'AAH', user }

describe('verifyInitData', () => {
  it('принимает правильно подписанные данные', () => {
    const v = verifyInitData(sign(fresh), TOKEN, NOW)
    expect(v?.user).toMatchObject({ id: 777, first_name: 'Али', username: 'ali' })
  })

  it('отвергает чужой токен', () => {
    expect(verifyInitData(sign(fresh, 'OTHER:TOKEN'), TOKEN, NOW)).toBeNull()
  })

  it('отвергает подмену поля (другой пользователь с той же подписью)', () => {
    const forged = sign(fresh).replace(encodeURIComponent('"id":777'), encodeURIComponent('"id":1'))
    expect(forged).not.toBe(sign(fresh))
    expect(verifyInitData(forged, TOKEN, NOW)).toBeNull()
  })

  it('отвергает просроченные данные и время из будущего', () => {
    expect(verifyInitData(sign({ ...fresh, auth_date: String(Math.floor(NOW / 1000) - 3 * 86400) }), TOKEN, NOW)).toBeNull()
    expect(verifyInitData(sign({ ...fresh, auth_date: String(Math.floor(NOW / 1000) + 3600) }), TOKEN, NOW)).toBeNull()
  })

  it.each([['пустая строка', ''], ['без hash', 'user=%7B%7D&auth_date=1'], ['hash не hex', 'auth_date=1&hash=zzz'], ['мусор', 'a'.repeat(5000)]])('отвергает: %s', (_n, data) => {
    expect(verifyInitData(data, TOKEN, NOW)).toBeNull()
  })

  it('без токена бота ничего не проверяет', () => {
    expect(verifyInitData(sign(fresh), '', NOW)).toBeNull()
  })

  it('пользователь без id отвергается даже при верной подписи', () => {
    expect(verifyInitData(sign({ ...fresh, user: '{"first_name":"X"}' }), TOKEN, NOW)).toBeNull()
  })
})

describe('API Mini App', () => {
  const app = () => createApp(createMemoryStore())
  const withToken = (fn: () => Promise<void>) => async () => {
    const old = config.telegramToken
    config.telegramToken = TOKEN
    try {
      await fn()
    } finally {
      config.telegramToken = old
    }
  }

  it('POST /api/telegram/auth: верная подпись → пользователь, неверная → 401', withToken(async () => {
    const good = await request(app()).post('/api/telegram/auth').send({ init_data: sign({ ...fresh, auth_date: String(Math.floor(Date.now() / 1000) - 5) }) }).expect(200)
    expect(good.body.user).toMatchObject({ id: 777, first_name: 'Али', lang: 'uz' })
    await request(app()).post('/api/telegram/auth').send({ init_data: 'hash=' + 'a'.repeat(64) }).expect(401)
  }))

  it('заявка с действительной подписью получает источник miniapp и пометку Telegram', withToken(async () => {
    const store = createMemoryStore()
    const a = createApp(store)
    const init = sign({ ...fresh, auth_date: String(Math.floor(Date.now() / 1000) - 5) })
    await request(a).post('/api/leads').send({ name: 'Али', phone: '+998901234567', message: 'в субботу', init_data: init }).expect(201)
    const lead = (await store.listLeads())[0]
    expect(lead.source).toBe('miniapp')
    expect(lead.message).toBe('[Telegram @ali] в субботу')
  }))

  it('подделка источника с сайта не работает: подпись неверна → site', withToken(async () => {
    const store = createMemoryStore()
    const a = createApp(store)
    await request(a).post('/api/leads').send({ name: 'Али', phone: '+998901234567', source: 'assistant', init_data: 'hash=' + 'b'.repeat(64) }).expect(201)
    expect((await store.listLeads())[0].source).toBe('site')
    await request(a).post('/api/leads').send({ name: 'Али', phone: '+998901234567', source: 'bot' }).expect(201)
    expect((await store.listLeads())[1].source).toBe('site')
  }))
})
