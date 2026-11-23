import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { buildDemoProperties } from '../src/lib/demoProperties.js'
import { applyFilters, filtersSchema, toPostgrestParams } from '../src/lib/propertyFilters.js'

const app = createApp()
const parse = (q: object) => filtersSchema.parse(q)
const all = buildDemoProperties()

describe('демо-набор', () => {
  it('100 домов, у каждого 4 фото, цены и площади положительные', () => {
    expect(all).toHaveLength(100)
    for (const p of all) {
      expect(p.photos).toHaveLength(4)
      expect(p.priceUsd).toBeGreaterThan(0)
      expect(p.areaM2).toBeGreaterThan(0)
    }
  })
})

describe('applyFilters', () => {
  it('rooms и district оставляют только подходящие дома', () => {
    const district = all.find((p) => p.rooms === 4)!.districtId
    const r = applyFilters(all, parse({ rooms: 4, district, pageSize: 50 }))
    expect(r.items.length).toBeGreaterThan(0)
    expect(r.items.every((p) => p.rooms === 4 && p.districtId === district)).toBe(true)
  })

  it('«6+» значит 6 и больше', () => {
    const r = applyFilters(all, parse({ rooms: 6, pageSize: 50 }))
    expect(r.items.every((p) => p.rooms >= 6)).toBe(true)
  })

  it('диапазон цены и сортировка по возрастанию', () => {
    const r = applyFilters(all, parse({ deal: 'sale', priceFrom: 60000, priceTo: 120000, sort: 'price_asc', pageSize: 50 }))
    const prices = r.items.map((p) => p.priceUsd)
    expect(prices.every((x) => x >= 60000 && x <= 120000)).toBe(true)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('пагинация: total общий, страницы не пересекаются', () => {
    const p1 = applyFilters(all, parse({ page: 1, pageSize: 10 }))
    const p2 = applyFilters(all, parse({ page: 2, pageSize: 10 }))
    expect(p1.total).toBe(100)
    expect(p1.items).toHaveLength(10)
    expect(p1.items.some((a) => p2.items.some((b) => b.id === a.id))).toBe(false)
  })
})

describe('toPostgrestParams', () => {
  it('переводит фильтры в параметры запроса', () => {
    const p = toPostgrestParams(parse({ deal: 'sale', rooms: 6, priceFrom: 1000, priceTo: 5000, sort: 'price_desc', page: 3, pageSize: 9 }))
    expect(p.get('deal_type')).toBe('eq.sale')
    expect(p.get('rooms')).toBe('gte.6')
    expect(p.get('and')).toBe('(price_usd.gte.1000,price_usd.lte.5000)')
    expect(p.get('order')).toBe('price_usd.desc,id.asc')
    expect(p.get('offset')).toBe('18')
  })
})

describe('GET /api', () => {
  it('/properties?rooms=4&district=… возвращает только подходящие', async () => {
    const district = all.find((p) => p.rooms === 4)!.districtId
    const r = await request(app).get(`/api/properties?rooms=4&district=${district}`)
    expect(r.status).toBe(200)
    expect(r.body.items.length).toBeGreaterThan(0)
    expect(r.body.items.every((p: { rooms: number; districtId: string }) => p.rooms === 4 && p.districtId === district)).toBe(true)
  })

  it('неверный фильтр → 400', async () => {
    await request(app).get('/api/properties?sort=abc').expect(400)
    await request(app).get('/api/properties?pageSize=1000').expect(400)
  })

  it('/properties/:id: найден, не найден, неверный', async () => {
    expect((await request(app).get('/api/properties/5')).body.id).toBe(5)
    await request(app).get('/api/properties/9999').expect(404)
    await request(app).get('/api/properties/abc').expect(400)
  })

  it('/districts возвращает 12 районов', async () => {
    const r = await request(app).get('/api/districts')
    expect(r.body).toHaveLength(12)
  })
})
