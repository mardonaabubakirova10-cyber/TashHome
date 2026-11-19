import { PROPERTIES, type DealType, type Property } from '../data/properties'

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

export const ROOMS_MAX_OPTION = 6

export function applyFilters(f: Filters, items: Property[] = PROPERTIES): Property[] {
  const res = items.filter(
    (x) =>
      (!f.deal || x.dealType === f.deal) &&
      (!f.district || x.districtId === f.district) &&
      // последний вариант («6+») означает «6 и больше»
      (f.rooms === undefined || (f.rooms >= ROOMS_MAX_OPTION ? x.rooms >= ROOMS_MAX_OPTION : x.rooms === f.rooms)) &&
      (f.priceFrom === undefined || x.priceUsd >= f.priceFrom) &&
      (f.priceTo === undefined || x.priceUsd <= f.priceTo) &&
      (f.areaFrom === undefined || x.areaM2 >= f.areaFrom) &&
      (f.landFrom === undefined || x.landSotka >= f.landFrom),
  )
  if (f.sort === 'price_asc') res.sort((a, b) => a.priceUsd - b.priceUsd)
  if (f.sort === 'price_desc') res.sort((a, b) => b.priceUsd - a.priceUsd)
  return res
}
