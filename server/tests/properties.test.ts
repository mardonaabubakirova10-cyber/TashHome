import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { buildDemoProperties, OWN_PHOTOS, PHOTO_TIERS, photoTier } from '../src/lib/demoProperties.js'
import { applyFilters, filtersSchema, toPostgrestParams } from '../src/lib/propertyFilters.js'

const app = createApp()
const parse = (q: object) => filtersSchema.parse(q)
const all = buildDemoProperties()

describe('демо-набор', () => {
  it('100 домов, у каждого есть фото, цены и площади положительные', () => {
    expect(all).toHaveLength(100)
    for (const p of all) {
      expect(p.photos).toHaveLength(OWN_PHOTOS[p.id] ? 1 : 4)
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

describe('фото соответствуют дому', () => {
  const tierOf = (url: string) => (Object.entries(PHOTO_TIERS).find(([, list]) => (list as readonly string[]).includes(url)) ?? ['?'])[0]

  it('у домов из общего набора 4 разных фото', () => {
    for (const p of all.filter((x) => !OWN_PHOTOS[x.id])) expect(new Set(p.photos).size).toBe(4)
  })

  it('свои фото фасадов стоят у первых 13 домов и не повторяются', () => {
    const first = all.slice(0, 13)
    expect(first.map((p) => p.photo)).toEqual(first.map((p) => OWN_PHOTOS[p.id]))
    expect(new Set(Object.values(OWN_PHOTOS)).size).toBe(13)
  })

  it('главное фото из класса дома или соседнего класса', () => {
    const near: Record<string, string[]> = { premium: ['premium', 'classic'], classic: ['classic', 'premium', 'mid2'], mid2: ['mid2', 'classic', 'mid1'], mid1: ['mid1', 'mid2', 'simple1'], simple1: ['simple1', 'mid1'] }
    for (const p of all.filter((x) => !OWN_PHOTOS[x.id])) expect(near[photoTier({ floors: p.floors, renovation: p.renovation, areaM2: p.areaM2 })]).toContain(tierOf(p.photo))
  })

  it('дизайнерский ремонт с 2+ этажами — премиум, одноэтажный без ремонта — простой класс', () => {
    expect(photoTier({ floors: 3, renovation: 'designer', areaM2: 200 })).toBe('premium')
    expect(photoTier({ floors: 1, renovation: 'none', areaM2: 80 })).toBe('simple1')
    expect(photoTier({ floors: 1, renovation: 'none', areaM2: 150 })).toBe('simple1')
  })

  it('особняки не достаются домам без ремонта и одноэтажным', () => {
    for (const p of all.filter((x) => !OWN_PHOTOS[x.id])) {
      if (p.floors === 1) expect(['premium', 'classic']).not.toContain(tierOf(p.photo))
      if (p.renovation === 'none') expect(tierOf(p.photo)).not.toBe('premium')
    }
  })
})
