import { buildDemoProperties, DEMO_DISTRICTS, type Property } from './demoProperties.js'
import { toAdminProperty, type AdminProperty, type PropertyInput, type PropertyListFilter, type PropertyPatch } from './adminProperty.js'
import { applyFilters, type Page, type PropertyFilters } from './propertyFilters.js'

export type District = { id: string; name_ru: string; name_uz: string; lat: number; lng: number }

/**
 * Хранилище заявок и отзывов. Пока без базы данных всё лежит в памяти процесса и теряется при перезапуске.
 * Интерфейс Store сделан так, чтобы на шаге подключения Supabase заменить только эту реализацию, а маршруты не трогать.
 */
export type Lead = {
  id: number
  property_id: number | null
  name: string
  phone: string
  message: string | null
  source: 'site' | 'miniapp' | 'bot' | 'assistant'
  status: 'new' | 'in_progress' | 'viewing' | 'closed' | 'rejected'
  created_at: string
}

export type Review = {
  id: number
  author: string | null
  rating: number
  text: string
  sentiment: 'positive' | 'neutral' | 'negative' | null // заполнит ИИ на шаге 5.8
  topic: string | null
  created_at: string
}

export type ChatRole = 'user' | 'assistant' | 'tool'
export type ChatMessage = { id: number; session_id: string; role: ChatRole; content: string | null; tool_calls: unknown | null; rating: number; latency_ms: number | null; created_at: string }
export type KbHit = { title: string; content: string; similarity: number }
/** Фильтры поиска домов ассистентом (структурные; смысловая часть идёт отдельно эмбеддингом). */
export type SearchFilters = { deal_type?: 'sale' | 'rent'; district_id?: string; min_price?: number; max_price?: number; min_rooms?: number; min_area?: number; min_land?: number }

export type LeadStatus = Lead['status']
export type LeadFilter = { status?: LeadStatus; page: number; pageSize: number }
export type ReviewFilter = { sentiment?: NonNullable<Review['sentiment']>; topic?: NonNullable<Review['topic']>; page: number; pageSize: number }
export type AdminPage<T> = { items: T[]; total: number; page: number; pageSize: number }

/** Сырые данные для дашборда: статистику считает чистая функция buildStats. */
export type StatsData = {
  leads: Array<{ created_at: string; source: Lead['source']; status: Lead['status'] }>
  reviews: Array<{ rating: number; sentiment: Review['sentiment']; topic: Review['topic'] }>
  properties: Array<{ district_id: string; status: AdminProperty['status'] }>
  chat: Array<{ role: ChatRole; content: string | null; tool_calls: unknown | null; rating: number; latency_ms: number | null; created_at: string }>
}

export interface Store {
  addLead(input: Omit<Lead, 'id' | 'status' | 'created_at'>): Promise<Lead>
  listLeads(): Promise<Lead[]>
  addReview(input: Pick<Review, 'author' | 'rating' | 'text'>): Promise<Review>
  listReviews(limit: number): Promise<Review[]>
  adminListLeads(f: LeadFilter): Promise<AdminPage<Lead>>
  adminUpdateLead(id: number, patch: { status: LeadStatus }): Promise<Lead | null>
  adminListReviews(f: ReviewFilter): Promise<AdminPage<Review>>
  adminListProperties(f: PropertyListFilter): Promise<AdminPage<AdminProperty>>
  adminGetProperty(id: number): Promise<AdminProperty | null>
  adminCreateProperty(input: PropertyInput): Promise<AdminProperty>
  adminUpdateProperty(id: number, patch: PropertyPatch): Promise<AdminProperty | null>
  setPropertyAnalysis(id: number, predicted: number | null, label: AdminProperty['price_label']): Promise<void>
  setPropertyEmbedding(id: number, vector: number[]): Promise<void>
  adminStatsData(): Promise<StatsData>
  setReviewAnalysis(id: number, sentiment: NonNullable<Review['sentiment']>, topic: NonNullable<Review['topic']>): Promise<void>
  listProperties(filters: PropertyFilters): Promise<Page<Property>>
  getProperty(id: number): Promise<Property | null>
  listDistricts(): Promise<District[]>
  /** Поиск для ассистента: с вектором — по смыслу, без вектора — только по фильтрам. */
  matchProperties(embedding: number[] | null, filters: SearchFilters, k: number): Promise<Property[]>
  matchKnowledge(embedding: number[], k: number): Promise<KbHit[]>
  createChatSession(channel: 'site' | 'miniapp' | 'bot'): Promise<string>
  chatSessionExists(id: string): Promise<boolean>
  addChatMessage(m: { session_id: string; role: ChatRole; content: string | null; tool_calls?: unknown; latency_ms?: number }): Promise<void>
  getChatHistory(session_id: string, limit: number): Promise<ChatMessage[]>
}

export function createMemoryStore(): Store {
  const leads: Lead[] = []
  const reviews: Review[] = []
  let leadId = 0
  let reviewId = 0
  const sessions = new Set<string>()
  const messages: ChatMessage[] = []
  const properties = buildDemoProperties()
  const adminProps: AdminProperty[] = properties.map(toAdminProperty)
  let propId = adminProps.length
  const embeddings = new Map<number, number[]>()

  // Демонстрационные отзывы, чтобы блок на сайте не был пустым
  const demo: Array<[string, number, string, number]> = [
    ['Азиза', 5, 'Нашли дом в Юнусабаде за неделю. Менеджер всё объяснил про документы и ипотеку.', 9],
    ['Бахтиёр', 4, 'Удобно, что сразу видно, дороже дом рынка или нет. Оценка цены совпала с оценщиком банка.', 5],
    ['Малика', 5, 'Ассистент подобрал варианты под мой бюджет и участок. Записали на просмотр в тот же день.', 2],
  ]
  for (const [author, rating, text, daysAgo] of demo) {
    reviews.push({
      id: ++reviewId,
      author,
      rating,
      text,
      sentiment: rating >= 4 ? 'positive' : null,
      topic: null,
      created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    })
  }

  return {
    async addLead(input) {
      const lead: Lead = { ...input, id: ++leadId, status: 'new', created_at: new Date().toISOString() }
      leads.push(lead)
      return lead
    },
    async listLeads() {
      return [...leads]
    },
    async addReview(input) {
      const review: Review = { ...input, id: ++reviewId, sentiment: null, topic: null, created_at: new Date().toISOString() }
      reviews.push(review)
      return review
    },
    async adminListLeads(f) {
      const list = leads.filter((l) => !f.status || l.status === f.status).sort((a, b) => b.id - a.id)
      return { items: list.slice((f.page - 1) * f.pageSize, f.page * f.pageSize), total: list.length, page: f.page, pageSize: f.pageSize }
    },
    async adminUpdateLead(id, patch) {
      const l = leads.find((x) => x.id === id)
      if (!l) return null
      l.status = patch.status
      return l
    },
    async adminListReviews(f) {
      const list = reviews.filter((r) => (!f.sentiment || r.sentiment === f.sentiment) && (!f.topic || r.topic === f.topic)).sort((a, b) => b.id - a.id)
      return { items: list.slice((f.page - 1) * f.pageSize, f.page * f.pageSize), total: list.length, page: f.page, pageSize: f.pageSize }
    },
    async adminListProperties(f) {
      const q = f.q?.trim().toLowerCase()
      const list = adminProps
        .filter((p) => (!f.status || p.status === f.status) && (!f.deal || p.deal_type === f.deal) && (!q || `${p.title_ru} ${p.address ?? ''} ${p.id}`.toLowerCase().includes(q)))
        .sort((a, b) => b.id - a.id)
      return { items: list.slice((f.page - 1) * f.pageSize, f.page * f.pageSize), total: list.length, page: f.page, pageSize: f.pageSize }
    },
    async adminGetProperty(id) {
      return adminProps.find((p) => p.id === id) ?? null
    },
    async adminCreateProperty(input) {
      const p: AdminProperty = { ...input, id: ++propId, predicted_price_usd: null, price_label: null }
      adminProps.push(p)
      return p
    },
    async adminUpdateProperty(id, patch) {
      const p = adminProps.find((x) => x.id === id)
      if (!p) return null
      Object.assign(p, patch)
      return p
    },
    async setPropertyAnalysis(id, predicted, label) {
      const p = adminProps.find((x) => x.id === id)
      if (p) Object.assign(p, { predicted_price_usd: predicted, price_label: label })
    },
    async setPropertyEmbedding(id, vector) {
      embeddings.set(id, vector)
    },
    async adminStatsData() {
      return {
        leads: leads.map((l) => ({ created_at: l.created_at, source: l.source, status: l.status })),
        reviews: reviews.map((r) => ({ rating: r.rating, sentiment: r.sentiment, topic: r.topic })),
        properties: adminProps.map((p) => ({ district_id: p.district_id, status: p.status })),
        chat: messages.map((m) => ({ role: m.role, content: m.content, tool_calls: m.tool_calls, rating: m.rating, latency_ms: m.latency_ms, created_at: m.created_at })),
      }
    },
    async setReviewAnalysis(id, sentiment, topic) {
      const r = reviews.find((x) => x.id === id)
      if (r) Object.assign(r, { sentiment, topic })
    },
    async listReviews(limit) {
      return [...reviews].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit)
    },
    async listProperties(filters) {
      return applyFilters(properties, filters)
    },
    async getProperty(id) {
      return properties.find((p) => p.id === id) ?? null
    },
    async matchProperties(_embedding, f, k) {
      // без базы векторов смысловой поиск недоступен: отбираем по фильтрам
      const page = applyFilters(properties, {
        deal: f.deal_type, district: f.district_id, rooms: undefined, priceFrom: f.min_price, priceTo: f.max_price,
        areaFrom: f.min_area, landFrom: f.min_land, sort: 'default', page: 1, pageSize: 50,
      })
      return page.items.filter((p) => f.min_rooms === undefined || p.rooms >= f.min_rooms).slice(0, k)
    },
    async matchKnowledge() {
      return []
    },
    async createChatSession() {
      const id = crypto.randomUUID()
      sessions.add(id)
      return id
    },
    async chatSessionExists(id) {
      return sessions.has(id)
    },
    async addChatMessage(m) {
      messages.push({ id: messages.length + 1, session_id: m.session_id, role: m.role, content: m.content, tool_calls: m.tool_calls ?? null, rating: 0, latency_ms: m.latency_ms ?? null, created_at: new Date().toISOString() })
    },
    async getChatHistory(session_id, limit) {
      return messages.filter((x) => x.session_id === session_id).slice(-limit)
    },
    async listDistricts() {
      return DEMO_DISTRICTS.map((d) => ({ id: d.id, name_ru: d.ru, name_uz: d.uz, lat: d.lat, lng: d.lng }))
    },
  }
}
