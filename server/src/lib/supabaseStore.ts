import type { Property } from './demoProperties.js'
import { toPostgrestParams } from './propertyFilters.js'
import { vectorLiteral } from './supabaseRest.js'
import type { AdminProperty, PropertyInput, PropertyPatch } from './adminProperty.js'
import type { BotUser, ChatMessage, District, KbDoc, KbHit, Lead, Review, SiteTexts, StatsData, Store } from './store.js'

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

const toAdmin = (r: Row): AdminProperty => ({
  id: r.id,
  deal_type: r.deal_type,
  title_ru: r.title_ru,
  title_uz: r.title_uz,
  description_ru: r.description_ru ?? null,
  description_uz: r.description_uz ?? null,
  district_id: r.district_id,
  address: r.address ?? null,
  lat: r.lat ?? null,
  lng: r.lng ?? null,
  price_usd: Number(r.price_usd),
  area_m2: Number(r.area_m2),
  land_sotka: Number(r.land_sotka),
  rooms: r.rooms,
  floors: r.floors,
  building_type: r.building_type,
  renovation: r.renovation,
  year_built: r.year_built ?? null,
  status: r.status,
  predicted_price_usd: r.predicted_price_usd === null || r.predicted_price_usd === undefined ? null : Number(r.predicted_price_usd),
  price_label: r.price_label ?? null,
  photos: [...(r.property_photos ?? [])].sort((a: Row, b: Row) => a.position - b.position).map((x: Row) => x.url),
})

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
    async matchProperties(embedding, filters, k) {
      if (!embedding) {
        const page = await this.listProperties({
          deal: filters.deal_type, district: filters.district_id, rooms: undefined, priceFrom: filters.min_price, priceTo: filters.max_price,
          areaFrom: filters.min_area, landFrom: filters.min_land, sort: 'default', page: 1, pageSize: 50,
        })
        return page.items.filter((p) => filters.min_rooms === undefined || p.rooms >= filters.min_rooms).slice(0, k)
      }
      const hits = await call<Array<{ id: number }>>('/rpc/match_properties', {
        method: 'POST',
        body: JSON.stringify({ query_embedding: vectorLiteral(embedding), filters, k }),
      })
      if (!hits.length) return []
      const rows = await call<Row[]>(`/properties?${SELECT}&id=in.(${hits.map((h) => h.id).join(',')})`)
      const byId = new Map(rows.map((r) => [r.id, toProperty(r)]))
      return hits.map((h) => byId.get(h.id)).filter((p): p is Property => Boolean(p)) // порядок как в выдаче поиска (по близости)
    },
    async matchKnowledge(embedding, k) {
      const hits = await call<Array<{ document_id: number; content: string; similarity: number }>>('/rpc/match_kb_chunks', {
        method: 'POST',
        body: JSON.stringify({ query_embedding: vectorLiteral(embedding), k }),
      })
      if (!hits.length) return []
      const docs = await call<Array<{ id: number; title: string }>>(`/kb_documents?select=id,title&id=in.(${[...new Set(hits.map((h) => h.document_id))].join(',')})`)
      const title = new Map(docs.map((d) => [d.id, d.title]))
      return hits.map((h): KbHit => ({ title: title.get(h.document_id) ?? 'База знаний', content: h.content, similarity: h.similarity }))
    },
    async createChatSession(channel) {
      return (await insert<{ id: string }>('chat_sessions', { channel })).id
    },
    async chatSessionExists(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return false
      return (await call<unknown[]>(`/chat_sessions?select=id&id=eq.${id}&limit=1`)).length > 0
    },
    async addChatMessage(m) {
      await insert('chat_messages', { session_id: m.session_id, role: m.role, content: m.content, tool_calls: m.tool_calls ?? null, latency_ms: m.latency_ms ?? null })
    },
    async getChatHistory(session_id, limit) {
      const rows = await call<ChatMessage[]>(`/chat_messages?select=*&session_id=eq.${session_id}&order=id.desc&limit=${limit}`)
      return rows.reverse()
    },
    listDistricts: () => call<District[]>('/districts?select=id,name_ru,name_uz,lat,lng&order=name_ru.asc'),
    async adminListLeads(f) {
      const q = new URLSearchParams({ select: '*', order: 'id.desc', limit: String(f.pageSize), offset: String((f.page - 1) * f.pageSize) })
      if (f.status) q.set('status', `eq.${f.status}`)
      const res = await fetch(`${base}/leads?${q}`, { headers: { ...headers, Prefer: 'count=exact' } })
      if (!res.ok) throw new Error(`Supabase ${res.status} leads`)
      return { items: (await res.json()) as Lead[], total: Number(res.headers.get('content-range')?.split('/')[1] ?? 0), page: f.page, pageSize: f.pageSize }
    },
    async adminGetLead(id) {
      return (await call<Lead[]>(`/leads?select=*&id=eq.${id}&limit=1`))[0] ?? null
    },
    async adminUpdateLead(id, patch) {
      const rows = await call<Lead[]>(`/leads?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) })
      return rows[0] ?? null
    },
    async adminListReviews(f) {
      const q = new URLSearchParams({ select: '*', order: 'id.desc', limit: String(f.pageSize), offset: String((f.page - 1) * f.pageSize) })
      if (f.sentiment) q.set('sentiment', `eq.${f.sentiment}`)
      if (f.topic) q.set('topic', `eq.${f.topic}`)
      const res = await fetch(`${base}/reviews?${q}`, { headers: { ...headers, Prefer: 'count=exact' } })
      if (!res.ok) throw new Error(`Supabase ${res.status} reviews`)
      return { items: (await res.json()) as Review[], total: Number(res.headers.get('content-range')?.split('/')[1] ?? 0), page: f.page, pageSize: f.pageSize }
    },
    async adminListProperties(f) {
      const q = new URLSearchParams({ select: '*,property_photos(url,position)', order: 'id.desc', limit: String(f.pageSize), offset: String((f.page - 1) * f.pageSize) })
      if (f.status) q.set('status', `eq.${f.status}`)
      if (f.deal) q.set('deal_type', `eq.${f.deal}`)
      const term = f.q?.trim().replace(/[^\p{L}\p{N} -]/gu, '') // запятые и скобки в поиск не пускаем: они управляют фильтром PostgREST
      if (term) q.set('or', /^\d+$/.test(term) ? `(id.eq.${term},title_ru.ilike.*${term}*)` : `(title_ru.ilike.*${term}*,address.ilike.*${term}*)`)
      const res = await fetch(`${base}/properties?${q}`, { headers: { ...headers, Prefer: 'count=exact' } })
      if (!res.ok) throw new Error(`Supabase ${res.status} properties`)
      return { items: ((await res.json()) as Row[]).map(toAdmin), total: Number(res.headers.get('content-range')?.split('/')[1] ?? 0), page: f.page, pageSize: f.pageSize }
    },
    async adminGetProperty(id) {
      const rows = await call<Row[]>(`/properties?${SELECT}&id=eq.${id}&limit=1`)
      return rows[0] ? toAdmin(rows[0]) : null
    },
    async adminCreateProperty(input: PropertyInput) {
      const { photos, ...row } = input
      const created = await insert<Row>('properties', row)
      if (photos.length) await insert('property_photos', photos.map((url, position) => ({ property_id: created.id, url, position })))
      return (await this.adminGetProperty(created.id))!
    },
    async adminUpdateProperty(id, patch: PropertyPatch) {
      const { photos, ...row } = patch
      if (Object.keys(row).length) {
        const rows = await call<Row[]>(`/properties?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) })
        if (!rows.length) return null
      }
      if (photos) {
        await call(`/property_photos?property_id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => undefined)
        if (photos.length) await insert('property_photos', photos.map((url, position) => ({ property_id: id, url, position })))
      }
      return this.adminGetProperty(id)
    },
    async setPropertyAnalysis(id, predicted, label) {
      await call(`/properties?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ predicted_price_usd: predicted, price_label: label }) }).catch(() => undefined)
    },
    async setPropertyEmbedding(id, vector) {
      await call(`/properties?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ search_embedding: vectorLiteral(vector) }) }).catch(() => undefined)
    },
    async adminStatsData(): Promise<StatsData> {
      const since = new Date(Date.now() - 90 * 86_400_000).toISOString()
      const [leads, reviews, properties, chat] = await Promise.all([
        call<StatsData['leads']>(`/leads?select=created_at,source,status&created_at=gte.${since}&limit=5000`),
        call<StatsData['reviews']>('/reviews?select=rating,sentiment,topic&limit=5000'),
        call<StatsData['properties']>('/properties?select=district_id,status&limit=5000'),
        call<StatsData['chat']>(`/chat_messages?select=role,content,tool_calls,rating,latency_ms,created_at&created_at=gte.${since}&order=id.desc&limit=3000`),
      ])
      return { leads, reviews, properties, chat }
    },
    async adminListKb() {
      const docs = await call<Array<{ id: number; title: string; source_file: string | null; created_at: string }>>('/kb_documents?select=id,title,source_file,created_at&order=id.desc')
      const chunks = await call<Array<{ document_id: number }>>('/kb_chunks?select=document_id&limit=20000')
      const n = new Map<number, number>()
      for (const c of chunks) n.set(c.document_id, (n.get(c.document_id) ?? 0) + 1)
      return docs.map((d): KbDoc => ({ ...d, chunks: n.get(d.id) ?? 0 }))
    },
    async adminAddKb(title, chunks) {
      const doc = await insert<{ id: number; created_at: string }>('kb_documents', { title })
      await insert('kb_chunks', chunks.map((c) => ({ document_id: doc.id, content: c.content, embedding: vectorLiteral(c.embedding) })))
      return { id: doc.id, title, source_file: null, chunks: chunks.length, created_at: doc.created_at }
    },
    async adminDeleteKb(id) {
      const rows = await call<unknown[]>(`/kb_documents?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } })
      return rows.length > 0 // фрагменты удаляются каскадом
    },
    async getBotUser(chatId) {
      const rows = await call<BotUser[]>(`/bot_users?select=*&chat_id=eq.${chatId}&limit=1`)
      return rows[0] ?? null
    },
    async saveBotUser(u) {
      const rows = await call<BotUser[]>('/bot_users?on_conflict=chat_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(u) })
      return rows[0]
    },
    async saveBotThread(groupMessageId, clientChatId) {
      await call('/bot_threads?on_conflict=group_message_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ group_message_id: groupMessageId, client_chat_id: clientChatId }) })
    },
    async getBotThread(groupMessageId) {
      const rows = await call<Array<{ client_chat_id: number }>>(`/bot_threads?select=client_chat_id&group_message_id=eq.${groupMessageId}&limit=1`)
      return rows[0]?.client_chat_id ?? null
    },
    async getFavorites(userId) {
      return (await call<Array<{ property_id: number }>>(`/favorites?select=property_id&user_id=eq.${userId}&order=created_at.asc`)).map((r) => r.property_id)
    },
    async setFavorites(userId, ids) {
      const unique = [...new Set(ids)]
      const existing = unique.length ? (await call<Array<{ id: number }>>(`/properties?select=id&id=in.(${unique.join(',')})`)).map((r) => r.id) : []
      const valid = unique.filter((id) => existing.includes(id))
      await call(`/favorites?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => undefined)
      if (valid.length) await insert('favorites', valid.map((property_id) => ({ user_id: userId, property_id })))
      return valid
    },
    async listTexts() {
      const rows = await call<Array<{ key: string; lang: 'ru' | 'uz'; value: string }>>('/site_texts?select=key,lang,value')
      const out: SiteTexts = { ru: {}, uz: {} }
      for (const r of rows) out[r.lang][r.key] = r.value
      return out
    },
    async setText(lang, key, value) {
      if (value === null) {
        await call(`/site_texts?lang=eq.${lang}&key=eq.${encodeURIComponent(key)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => undefined)
        return
      }
      await call('/site_texts?on_conflict=key,lang', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key, lang, value, updated_at: new Date().toISOString() }) }).catch(() => undefined)
    },
    async setReviewAnalysis(id, sentiment, topic) {
      await call(`/reviews?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ sentiment, topic }), headers: { Prefer: 'return=minimal' } }).catch(() => undefined)
    },
    listReviews: (limit) => call<Review[]>(`/reviews?select=id,author,rating,text,sentiment,topic,created_at&order=created_at.desc&limit=${limit}`),
  }
}
