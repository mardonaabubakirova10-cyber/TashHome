import { z } from 'zod'
import type { Property } from './demoProperties.js'

export const ROOMS_MAX_OPTION = 6 // «6+» означает «6 и больше»
export const MAX_PAGE_SIZE = 50

const optNum = z.coerce.number().min(0).optional()

export const filtersSchema = z.object({
  deal: z.enum(['sale', 'rent']).optional(),
  district: z.string().trim().min(1).max(40).optional(),
  rooms: optNum,
  priceFrom: optNum,
  priceTo: optNum,
  areaFrom: optNum,
  landFrom: optNum,
  sort: z.enum(['default', 'price_asc', 'price_desc']).default('default'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(9),
})
export type PropertyFilters = z.infer<typeof filtersSchema>

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }

/** Фильтрация, сортировка и пагинация в памяти (демо-хранилище и тесты). */
export function applyFilters(all: Property[], f: PropertyFilters): Page<Property> {
  const res = all.filter(
    (x) =>
      (!f.deal || x.dealType === f.deal) &&
      (!f.district || x.districtId === f.district) &&
      (f.rooms === undefined || (f.rooms >= ROOMS_MAX_OPTION ? x.rooms >= ROOMS_MAX_OPTION : x.rooms === f.rooms)) &&
      (f.priceFrom === undefined || x.priceUsd >= f.priceFrom) &&
      (f.priceTo === undefined || x.priceUsd <= f.priceTo) &&
      (f.areaFrom === undefined || x.areaM2 >= f.areaFrom) &&
      (f.landFrom === undefined || x.landSotka >= f.landFrom),
  )
  if (f.sort === 'price_asc') res.sort((a, b) => a.priceUsd - b.priceUsd || a.id - b.id)
  else if (f.sort === 'price_desc') res.sort((a, b) => b.priceUsd - a.priceUsd || a.id - b.id)
  else res.sort((a, b) => a.id - b.id)
  const start = (f.page - 1) * f.pageSize
  return { items: res.slice(start, start + f.pageSize), total: res.length, page: f.page, pageSize: f.pageSize }
}

/** Те же условия в виде параметров PostgREST (Supabase). */
export function toPostgrestParams(f: PropertyFilters): URLSearchParams {
  const p = new URLSearchParams()
  p.set('status', 'eq.active')
  if (f.deal) p.set('deal_type', `eq.${f.deal}`)
  if (f.district) p.set('district_id', `eq.${f.district}`)
  if (f.rooms !== undefined) p.set('rooms', f.rooms >= ROOMS_MAX_OPTION ? `gte.${ROOMS_MAX_OPTION}` : `eq.${f.rooms}`)
  // цена «от» и «до» — два условия на одну колонку, поэтому через and=(…)
  const price: string[] = []
  if (f.priceFrom !== undefined) price.push(`price_usd.gte.${f.priceFrom}`)
  if (f.priceTo !== undefined) price.push(`price_usd.lte.${f.priceTo}`)
  if (price.length) p.set('and', `(${price.join(',')})`)
  if (f.areaFrom !== undefined) p.set('area_m2', `gte.${f.areaFrom}`)
  if (f.landFrom !== undefined) p.set('land_sotka', `gte.${f.landFrom}`)
  p.set('order', f.sort === 'price_asc' ? 'price_usd.asc,id.asc' : f.sort === 'price_desc' ? 'price_usd.desc,id.asc' : 'id.asc')
  p.set('limit', String(f.pageSize))
  p.set('offset', String((f.page - 1) * f.pageSize))
  return p
}
