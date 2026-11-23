import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { getUsdRate, resetCurrencyCache } from '../src/lib/currency.js'
import { monthlyPayment } from '../src/lib/mortgage.js'

const app = createApp()

describe('health и ошибки', () => {
  it('GET /api/health → 200', async () => {
    const r = await request(app).get('/api/health')
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ status: 'ok' })
  })
  it('неизвестный путь → 404 JSON', async () => {
    const r = await request(app).get('/api/nope')
    expect(r.status).toBe(404)
    expect(r.body.error).toBeTruthy()
  })
  it('битый JSON → 400', async () => {
    const r = await request(app).post('/api/mortgage/calc').set('content-type', 'application/json').send('{oops')
    expect(r.status).toBe(400)
  })
})

describe('ипотека', () => {
  it('платёж совпадает с ручным расчётом', () => {
    // 100 000 при 12 % годовых на 1 год: 100000 * 0.01 / (1 - 1.01^-12) = 8884.88
    expect(monthlyPayment(100_000, 12, 1)).toBeCloseTo(8884.88, 2)
    expect(monthlyPayment(120_000, 0, 10)).toBe(1000) // без процентов просто делим на месяцы
  })
  it('POST /mortgage/calc: суммы сходятся, график полный', async () => {
    const r = await request(app).post('/api/mortgage/calc').send({ price: 150_000, down_percent: 30, term_years: 15, rate_percent: 24 })
    expect(r.status).toBe(200)
    expect(r.body.down_payment).toBe(45_000)
    expect(r.body.loan).toBe(105_000)
    expect(r.body.schedule).toHaveLength(180)
    expect(r.body.schedule.at(-1).balance).toBe(0)
    expect(Math.abs(r.body.overpayment - (r.body.total - r.body.loan))).toBeLessThanOrEqual(1)
  })
  it('неверные данные → 400 с описанием поля', async () => {
    const r = await request(app).post('/api/mortgage/calc').send({ price: -5, down_percent: 30, term_years: 15, rate_percent: 24 })
    expect(r.status).toBe(400)
    expect(r.body.details[0].field).toBe('price')
  })
  it('GET /mortgage/programs', async () => {
    const r = await request(app).get('/api/mortgage/programs')
    expect(r.body.length).toBeGreaterThan(0)
  })
})

describe('курс валют', () => {
  beforeEach(() => resetCurrencyCache())
  const ok = () => vi.fn(async () => ({ ok: true, json: async () => [{ Rate: '12150.5', Date: '23.11.2026' }] }))

  it('берёт курс ЦБ, второй запрос — из кеша', async () => {
    const f = ok()
    expect((await getUsdRate(f)).source).toBe('cbu.uz')
    const second = await getUsdRate(f)
    expect(second).toMatchObject({ rate: 12150.5, source: 'cache' })
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('если ЦБ недоступен и кеша нет — запасной курс', async () => {
    const r = await getUsdRate(async () => {
      throw new Error('нет сети')
    })
    expect(r.source).toBe('fallback')
    expect(r.rate).toBeGreaterThan(0)
  })
})

describe('оценка', () => {
  it('неверные данные → 400 до обращения к ml', async () => {
    const r = await request(app).post('/api/estimate').send({ district: 'moon' })
    expect(r.status).toBe(400)
  })
})
