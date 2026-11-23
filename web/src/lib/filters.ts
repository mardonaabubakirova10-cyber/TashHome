import type { DealType } from '../data/properties'

export type Sort = 'default' | 'price_asc' | 'price_desc'

export type Filters = {
  deal?: DealType
  district?: string
  rooms?: number
  priceFrom?: number
  priceTo?: number
  areaFrom?: number
  landFrom?: number
  sort: Sort
  page: number
}

export const PAGE_SIZE = 9

const num = (v: string | null) => {
  if (v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function parseFilters(p: URLSearchParams): Filters {
  const deal = p.get('deal')
  const sort = p.get('sort')
  return {
    deal: deal === 'sale' || deal === 'rent' ? deal : undefined,
    district: p.get('district') || undefined,
    rooms: num(p.get('rooms')),
    priceFrom: num(p.get('priceFrom')),
    priceTo: num(p.get('priceTo')),
    areaFrom: num(p.get('areaFrom')),
    landFrom: num(p.get('landFrom')),
    sort: sort === 'price_asc' || sort === 'price_desc' ? sort : 'default',
    page: Math.max(1, Math.floor(num(p.get('page')) ?? 1)),
  }
}

/** Фильтры страницы → параметры запроса /api/properties. */
export const filtersToParams = (f: Filters) => ({
  deal: f.deal,
  district: f.district,
  rooms: f.rooms,
  priceFrom: f.priceFrom,
  priceTo: f.priceTo,
  areaFrom: f.areaFrom,
  landFrom: f.landFrom,
  sort: f.sort === 'default' ? undefined : f.sort,
  page: f.page,
  pageSize: PAGE_SIZE,
})
