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

export interface Store {
  addLead(input: Omit<Lead, 'id' | 'status' | 'created_at'>): Promise<Lead>
  listLeads(): Promise<Lead[]>
  addReview(input: Pick<Review, 'author' | 'rating' | 'text'>): Promise<Review>
  listReviews(limit: number): Promise<Review[]>
}

export function createMemoryStore(): Store {
  const leads: Lead[] = []
  const reviews: Review[] = []
  let leadId = 0
  let reviewId = 0

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
    async listReviews(limit) {
      return [...reviews].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit)
    },
  }
}
