import type { Property } from './demoProperties.js'
import { toPostgrestParams } from './propertyFilters.js'
import type { District, Lead, Review, Store } from './store.js'

type Row = Record<string, any> // строка таблицы properties вместе с фото
const SELECT = 'select=*,property_photos(url,position)'

function toProperty(r: Row): Property {
  const photos: string[] = [...(r.property_photos ?? [])].sort((a: Row, b: Row) => a.position - b.position).map((x: Row) => x.url)
  return {
    id: r.id,
    dealType: r.deal_type,
    titleRu: r.title_ru,
    titleUz: r.title_uz,
    descriptionRu: r.description_ru ?? '',
    descriptionUz: r.description_uz ?? '',
    districtId: r.district_id,
    address: r.address ?? '',
    priceUsd: Number(r.price_usd),
    areaM2: Number(r.area_m2),
    landSotka: Number(r.land_sotka),
    rooms: r.rooms,
    floors: r.floors,
    buildingType: r.building_type,
    renovation: r.renovation,
    yearBuilt: r.year_built,
    lat: r.lat,
    lng: r.lng,
    photo: photos[0] ?? '',
    photos,
    predictedPriceUsd: r.predicted_price_usd === null ? null : Number(r.predicted_price_usd),
    priceLabel: r.price_label ?? null,
  }
}

/** Хранилище на Supabase через REST (PostgREST). Работает с ключом сервера, который обходит RLS. */
export function createSupabaseStore(url: string, serviceKey: string): Store {
  const base = `${url.replace(/\/$/, '')}/rest/v1`
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
    'user-agent': 'tashhome-server/1.0', // секретный ключ не принимается от «браузерных» запросов
  }

  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } })
    if (!res.ok) throw new Error(`Supabase ${res.status} ${path.split('?')[0]}`)
    return res.json() as Promise<T>
  }

  const insert = async <T>(table: string, row: object): Promise<T> => {
    const rows = await call<T[]>(`/${table}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) })
    return rows[0]
  }

  return {
    addLead: (input) => insert<Lead>('leads', input),
    listLeads: () => call<Lead[]>('/leads?select=*&order=created_at.desc'),
    addReview: (input) => insert<Review>('reviews', input),
    async listProperties(filters) {
      const params = toPostgrestParams(filters)
      const res = await fetch(`${base}/properties?${SELECT}&${params}`, { headers: { ...headers, Prefer: 'count=exact' } })
      if (!res.ok) throw new Error(`Supabase ${res.status} properties`)
      // Content-Range: 0-8/100, после слэша общее число подходящих записей
      const total = Number(res.headers.get('content-range')?.split('/')[1] ?? 0)
      const rows = (await res.json()) as Row[]
      return { items: rows.map(toProperty), total, page: filters.page, pageSize: filters.pageSize }
    },
    async getProperty(id) {
      const rows = await call<Row[]>(`/properties?${SELECT}&id=eq.${id}&status=eq.active&limit=1`)
      return rows[0] ? toProperty(rows[0]) : null
    },
    listDistricts: () => call<District[]>('/districts?select=id,name_ru,name_uz,lat,lng&order=name_ru.asc'),
    listReviews: (limit) => call<Review[]>(`/reviews?select=id,author,rating,text,sentiment,topic,created_at&order=created_at.desc&limit=${limit}`),
  }
}
